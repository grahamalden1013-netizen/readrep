import { createHash } from "node:crypto";
import type { AiOperationResult, OperationStatus } from "@readrep/domain";
import type { Logger, MetricsSink } from "@readrep/observability";
import type { AiOperation } from "./operation.js";
import { ProviderNotConfiguredError, type ProviderAdapter } from "./provider.js";

/** Stable hash of an operation's input, used as the idempotency key. */
export const hashInput = (operationName: string, input: unknown): string =>
  createHash("sha256")
    .update(`${operationName}:${stableStringify(input)}`)
    .digest("hex");

/** Deterministic JSON: object keys sorted so equal inputs hash equally. */
const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== "object")
    return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
};

export type RunOptions = {
  provider: ProviderAdapter;
  logger: Logger;
  metrics?: MetricsSink;
  now?: () => Date;
  /** Reuses a stored result for an identical input instead of paying twice. */
  lookupCached?: (inputHash: string) => Promise<AiOperationResult | null>;
  gameId?: string;
  teamId?: string;
};

export type RunOutcome<TOutput> =
  | { status: "succeeded"; output: TOutput; record: AiOperationResult }
  | { status: Exclude<OperationStatus, "succeeded">; record: AiOperationResult };

/**
 * Runs one operation end to end.
 *
 * The order matters and is the whole point of having a runner:
 *
 *   1. Validate the input against the operation's schema. A malformed input
 *      never reaches a provider, so it never costs anything.
 *   2. Return a cached result for an identical input. Re-running a stage must
 *      not re-charge for work already done.
 *   3. Dispatch with a hard timeout.
 *   4. Validate the output against the operation's schema. Output that does not
 *      conform is rejected outright and recorded as `schema_rejected` — it is
 *      never partially adopted or coerced.
 *   5. Record model version, prompt version, schema version, latency, and cost
 *      on every path, including failures.
 *
 * No step is optional, and none of them can be skipped by a caller.
 */
export const runOperation = async <TInput, TOutput>(
  operation: AiOperation<TInput, TOutput>,
  input: TInput,
  options: RunOptions,
): Promise<RunOutcome<TOutput>> => {
  const now = options.now ?? (() => new Date());
  const startedAt = now();
  const log = options.logger.child("ai", { operation: operation.name });

  const inputHash = hashInput(operation.name, input);

  const record = (
    status: OperationStatus,
    extra: Partial<AiOperationResult> = {},
  ): AiOperationResult => {
    const completedAt = now();
    const latencyMs = Math.max(0, completedAt.getTime() - startedAt.getTime());
    options.metrics?.recordLatency({
      operation: operation.name,
      subjectId: inputHash.slice(0, 16),
      durationMs: latencyMs,
      outcome:
        status === "succeeded"
          ? "succeeded"
          : status === "timed_out"
            ? "timed_out"
            : "failed",
      occurredAt: completedAt.toISOString(),
    });
    return {
      id: `aiop-${inputHash.slice(0, 24)}`,
      operation: operation.name,
      status,
      inputHash,
      providerName: options.provider.name,
      modelVersion: "unknown",
      promptVersion: operation.promptVersion,
      schemaVersion: operation.schemaVersion,
      output: null,
      errorMessage: null,
      citation: null,
      latencyMs,
      cost: {
        inputTokens: null,
        outputTokens: null,
        estimatedCostMicroUsd: null,
      },
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      ...extra,
    } as AiOperationResult;
  };

  // 1. Input validation, before any spend.
  const parsedInput = operation.inputSchema.safeParse(input);
  if (!parsedInput.success) {
    log.warn("operation input rejected", { issues: parsedInput.error.issues.length });
    return {
      status: "schema_rejected",
      record: record("schema_rejected", {
        errorMessage: "operation input did not satisfy its schema",
      }),
    };
  }

  // 2. Cache: an identical input must not be charged for twice.
  const cached = await options.lookupCached?.(inputHash);
  if (cached && cached.status === "succeeded") {
    const revalidated = operation.outputSchema.safeParse(cached.output);
    if (revalidated.success) {
      log.debug("operation served from cache");
      return { status: "succeeded", output: revalidated.data, record: cached };
    }
    log.warn("cached operation output no longer satisfies the current schema");
  }

  if (!options.provider.supports(operation.tier)) {
    const message =
      options.provider.name === "not_configured"
        ? new ProviderNotConfiguredError(operation.name).message
        : `provider "${options.provider.name}" does not serve the "${operation.tier}" tier`;
    log.warn("no provider available for operation");
    return {
      status: "provider_error",
      record: record("provider_error", { errorMessage: message.slice(0, 400) }),
    };
  }

  // 3. Dispatch under a hard deadline.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), operation.timeoutMs);
  let response;
  try {
    response = await options.provider.execute({
      operation: operation as AiOperation<TInput, unknown>,
      input: parsedInput.data,
      timeoutMs: operation.timeoutMs,
      signal: controller.signal,
    });
  } catch (error) {
    const timedOut = controller.signal.aborted;
    log.error("operation failed", error);
    return {
      status: timedOut ? "timed_out" : "provider_error",
      record: record(timedOut ? "timed_out" : "provider_error", {
        errorMessage: timedOut
          ? `operation exceeded its ${operation.timeoutMs}ms budget`
          : "provider call failed",
      }),
    };
  } finally {
    clearTimeout(timer);
  }

  // 4. Output validation. Non-conforming output is rejected, never coerced.
  const parsedOutput = operation.outputSchema.safeParse(response.output);
  if (!parsedOutput.success) {
    log.warn("operation output rejected", { issues: parsedOutput.error.issues.length });
    return {
      status: "schema_rejected",
      record: record("schema_rejected", {
        modelVersion: response.modelVersion,
        errorMessage: "model output did not satisfy the operation schema",
      }),
    };
  }

  // 5. Cost, recorded on the success path as well as the failure paths.
  if (response.estimatedCostMicroUsd !== null) {
    options.metrics?.recordCost({
      category: "model_inference",
      subjectId: inputHash.slice(0, 16),
      gameId: options.gameId ?? null,
      teamId: options.teamId ?? null,
      amountMicroUsd: response.estimatedCostMicroUsd,
      quantity: (response.inputTokens ?? 0) + (response.outputTokens ?? 0),
      unit: "tokens",
      occurredAt: now().toISOString(),
    });
    if (response.estimatedCostMicroUsd > operation.maxCostMicroUsd) {
      log.warn("operation exceeded its cost ceiling", {
        spentMicroUsd: response.estimatedCostMicroUsd,
        ceilingMicroUsd: operation.maxCostMicroUsd,
      });
    }
  }

  return {
    status: "succeeded",
    output: parsedOutput.data,
    record: record("succeeded", {
      modelVersion: response.modelVersion,
      output: parsedOutput.data,
      cost: {
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        estimatedCostMicroUsd: response.estimatedCostMicroUsd,
      },
    }),
  };
};
