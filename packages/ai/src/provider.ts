import type { AiOperation, ModelTier } from "./operation";

/** What a provider reports back about one call. */
export type ProviderResponse = {
  /** Raw, unvalidated. The runner validates before anything adopts it. */
  output: unknown;
  modelVersion: string;
  inputTokens: number | null;
  outputTokens: number | null;
  estimatedCostMicroUsd: number | null;
};

export type ProviderRequest<TInput> = {
  operation: AiOperation<TInput, unknown>;
  input: TInput;
  /** Deadline in milliseconds. Providers must abort rather than overrun. */
  timeoutMs: number;
  signal: AbortSignal;
};

/**
 * The seam between ReadRep and any model vendor.
 *
 * Product logic depends on this interface and never on a vendor SDK, so
 * swapping providers is an adapter change rather than a rewrite. An adapter's
 * only job is to send a request and return raw output; it never decides whether
 * output is acceptable.
 */
export type ProviderAdapter = {
  name: string;
  /** Which tiers this adapter can serve. The runner refuses to over-promise. */
  supports(tier: ModelTier): boolean;
  execute<TInput>(request: ProviderRequest<TInput>): Promise<ProviderResponse>;
};

/** Thrown when an operation is requested and no provider is configured. */
export class ProviderNotConfiguredError extends Error {
  readonly operationName: string;
  constructor(operationName: string) {
    super(
      `No AI provider is configured for "${operationName}". ReadRep Phase 0 makes no model calls; ` +
        `wiring a provider is Phase 3/4 work and requires credentials that this repository does not hold.`,
    );
    this.name = "ProviderNotConfiguredError";
    this.operationName = operationName;
  }
}

/**
 * The Phase 0 default.
 *
 * It fails loudly. It does not return a plausible-looking stub, because a stub
 * that looks like analysis is exactly the "fake automated experience" the
 * blueprint rules out — a caller would have no way to tell invented output from
 * real output.
 */
export const notConfiguredProvider: ProviderAdapter = {
  name: "not_configured",
  supports: () => false,
  execute: async ({ operation }) => {
    throw new ProviderNotConfiguredError(operation.name);
  },
};

/**
 * A provider that replays fixed responses, for tests and evaluation runs.
 *
 * Every response it returns is still validated by the runner against the
 * operation's output schema, so a fixture cannot encode a shape the real system
 * would reject.
 */
export const createScriptedProvider = (
  responses: Readonly<Record<string, ProviderResponse>>,
): ProviderAdapter => ({
  name: "scripted",
  supports: () => true,
  execute: async ({ operation }) => {
    const response = responses[operation.name];
    if (!response) throw new ProviderNotConfiguredError(operation.name);
    return response;
  },
});
