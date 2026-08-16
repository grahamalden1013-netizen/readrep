import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type * as z from "zod/v4";

import {
  describeZodError,
  getMockResponder,
  type AiProvider,
  type GenerateFailure,
  type GenerateRequest,
  type GenerateResult,
  type ProviderMode,
} from "@/lib/ai/provider";

/**
 * The Anthropic implementation of the provider seam.
 *
 * This is the only file in ReadRep that imports the Anthropic SDK or reads its
 * credentials. Structured output goes through `messages.parse()` with a JSON
 * schema derived from the caller's Zod schema — not a "please return JSON"
 * instruction in prose — so malformed output is a typed failure rather than a
 * parsing adventure.
 */

/** Server-only. Never prefix with NEXT_PUBLIC_. */
export const API_KEY_VAR = "ANTHROPIC_API_KEY";

/** Configurable so quality, latency and cost can change without a rewrite. */
export const MODEL_VAR = "ANTHROPIC_INTERVIEW_MODEL";

/**
 * The Coach Interview is the highest-value reasoning ReadRep does — one bad
 * extraction costs the coach a redundant question and costs every future film
 * read its accuracy. It defaults to the strongest available model.
 */
export const DEFAULT_MODEL = "claude-opus-5";

export function interviewModel(): string {
  return process.env[MODEL_VAR]?.trim() || DEFAULT_MODEL;
}

export function providerMode(): ProviderMode {
  if (process.env.READREP_AI_MODE === "mock") return "mock";
  return process.env[API_KEY_VAR]?.trim() ? "live" : "unconfigured";
}

export function isConfigured(): boolean {
  return providerMode() === "live";
}

let client: Anthropic | null = null;

function getClient(): Anthropic {
  // Lazy, so importing this module never requires a key.
  client ??= new Anthropic({ apiKey: process.env[API_KEY_VAR] });
  return client;
}

async function generate<T>(req: GenerateRequest<T>): Promise<GenerateResult<T>> {
  const mode = providerMode();
  const model = interviewModel();
  const startedAt = Date.now();

  if (mode === "unconfigured") {
    return {
      ok: false,
      mode,
      kind: "unconfigured",
      message: `${API_KEY_VAR} is not set, so ReadRep has no model to think with.`,
    };
  }

  if (mode === "mock") {
    const responder = getMockResponder();
    if (!responder) {
      return {
        ok: false,
        mode,
        kind: "unconfigured",
        message: "READREP_AI_MODE=mock is set but no mock responder is registered.",
      };
    }

    let raw: unknown;
    try {
      raw = await responder({ system: req.system, messages: req.messages, mockKey: req.mockKey });
    } catch (error) {
      // Same classification path as a real outage, so failure handling is
      // exercised by the code that actually runs in production.
      return { ok: false, mode, ...classify(error) };
    }

    const parsed = req.schema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, mode, kind: "invalid_output", message: describeZodError(parsed.error) };
    }

    return {
      ok: true,
      mode,
      data: parsed.data,
      meta: {
        provider: "mock",
        model: `mock:${model}`,
        latencyMs: Date.now() - startedAt,
        inputTokens: null,
        outputTokens: null,
      },
    };
  }

  try {
    const response = await getClient().messages.parse({
      model,
      max_tokens: req.maxTokens ?? 8000,
      thinking: { type: "adaptive" },
      output_config: {
        effort: req.effort ?? "medium",
        format: zodOutputFormat(req.schema),
      },
      // The instructions and the coverage framework are stable across a
      // conversation; caching the prefix keeps repeated turns cheap.
      system: [{ type: "text", text: req.system, cache_control: { type: "ephemeral" } }],
      messages: req.messages,
    });

    if (response.stop_reason === "refusal") {
      return { ok: false, mode, kind: "refusal", message: "The model declined to answer this turn." };
    }

    if (response.parsed_output == null) {
      return {
        ok: false,
        mode,
        kind: "invalid_output",
        message:
          response.stop_reason === "max_tokens"
            ? "The model ran out of room before finishing a complete answer."
            : "The model did not return output in the required shape.",
      };
    }

    return {
      ok: true,
      mode,
      data: response.parsed_output as T,
      meta: {
        provider: "anthropic",
        model,
        latencyMs: Date.now() - startedAt,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  } catch (error) {
    return { ok: false, mode, ...classify(error) };
  }
}

function classify(error: unknown): { kind: GenerateFailure["kind"]; message: string } {
  if (error instanceof Anthropic.RateLimitError) {
    return { kind: "rate_limit", message: "The model is rate limited right now." };
  }
  if (error instanceof Anthropic.AuthenticationError) {
    return { kind: "unconfigured", message: `${API_KEY_VAR} was rejected by the provider.` };
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return { kind: "network", message: "Could not reach the model provider." };
  }
  if (error instanceof Anthropic.APIError) {
    // Anthropic returns account problems as ordinary 400s, so the status alone
    // is not enough to tell "you're out of credit" from "that model doesn't
    // exist". Surface the upstream text — it names the actual problem, and it
    // never contains credentials.
    const detail = typeof error.message === "string" ? error.message : "";
    const lower = detail.toLowerCase();

    if (lower.includes("credit balance") || lower.includes("billing")) {
      return {
        kind: "provider_error",
        message: `Anthropic billing: ${detail} Add credit at console.anthropic.com/settings/billing.`,
      };
    }
    if (lower.includes("model") && (lower.includes("not_found") || lower.includes("not found"))) {
      return {
        kind: "provider_error",
        message: `Model "${interviewModel()}" is not available to this account. Set ${MODEL_VAR} to one that is.`,
      };
    }
    return {
      kind: "provider_error",
      message: `Anthropic error ${error.status ?? "unknown"}: ${detail || "no detail given"}`,
    };
  }
  if (error && typeof error === "object" && "issues" in error) {
    return { kind: "invalid_output", message: describeZodError(error as z.ZodError) };
  }
  return { kind: "provider_error", message: "The model call failed." };
}

/** The provider the interview engine talks to. */
export function getProvider(): AiProvider {
  const mode = providerMode();
  return {
    name: mode === "mock" ? "mock" : "anthropic",
    model: interviewModel(),
    mode,
    generate,
  };
}
