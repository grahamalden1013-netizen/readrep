import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type * as z from "zod/v4";

/**
 * The only place in the app that talks to a model provider.
 *
 * Everything above this file works in terms of a validated TypeScript object,
 * so swapping providers means rewriting this file and nothing else. This module
 * imports `server-only`: if a client component ever pulls it in, the build
 * fails rather than shipping an API key to a browser.
 */

/** Chosen once at module load so a request can't flip modes mid-flight. */
export type ProviderMode =
  /** A real API key is present. Calls hit the provider. */
  | "live"
  /** Explicitly requested fake intelligence, for automated tests only. */
  | "mock"
  /** No key configured. The app must say so rather than pretend. */
  | "unconfigured";

const MODEL = "claude-opus-5";

export function providerMode(): ProviderMode {
  if (process.env.READREP_AI_MODE === "mock") return "mock";
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  return key ? "live" : "unconfigured";
}

export function isConfigured(): boolean {
  return providerMode() === "live";
}

/** What the UI needs to explain an unconfigured install honestly. */
export const REQUIRED_ENV_VAR = "ANTHROPIC_API_KEY";

export type GenerateFailure = {
  ok: false;
  mode: ProviderMode;
  /**
   * `unconfigured` — no key; the caller must show the setup state.
   * `refusal`      — the model declined; not retryable with the same input.
   * `rate_limit`   — retryable later.
   * `invalid_output` — the model answered but not in the required shape.
   * `provider_error` / `network` — upstream trouble.
   */
  kind: "unconfigured" | "refusal" | "rate_limit" | "invalid_output" | "provider_error" | "network";
  message: string;
};

export type GenerateSuccess<T> = {
  ok: true;
  mode: ProviderMode;
  data: T;
  usage: { inputTokens: number; outputTokens: number } | null;
};

export type GenerateResult<T> = GenerateSuccess<T> | GenerateFailure;

export type GenerateRequest<T> = {
  system: string;
  /** Alternating conversation. The caller owns history trimming. */
  messages: { role: "user" | "assistant"; content: string }[];
  schema: z.ZodType<T>;
  maxTokens?: number;
  effort?: "low" | "medium" | "high";
  /** Used only in mock mode; ignored when a real key is present. */
  mockKey?: string;
};

/**
 * A deterministic stand-in used by automated tests. Registering a responder
 * does nothing unless READREP_AI_MODE=mock, so a stray import can never
 * downgrade a production install to fake intelligence.
 */
export type MockResponder = (req: {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
  mockKey?: string;
}) => unknown | Promise<unknown>;

let mockResponder: MockResponder | null = null;

export function setMockResponder(responder: MockResponder | null) {
  mockResponder = responder;
}

let client: Anthropic | null = null;

function getClient(): Anthropic {
  // Lazily constructed so importing this module never requires a key.
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

export async function generateStructured<T>(
  req: GenerateRequest<T>,
): Promise<GenerateResult<T>> {
  const mode = providerMode();

  if (mode === "unconfigured") {
    return {
      ok: false,
      mode,
      kind: "unconfigured",
      message: `${REQUIRED_ENV_VAR} is not set, so ReadRep has no model to think with.`,
    };
  }

  if (mode === "mock") {
    if (!mockResponder) {
      return {
        ok: false,
        mode,
        kind: "unconfigured",
        message: "READREP_AI_MODE=mock is set but no mock responder is registered.",
      };
    }
    let raw: unknown;
    try {
      raw = await mockResponder({
        system: req.system,
        messages: req.messages,
        mockKey: req.mockKey,
      });
    } catch (error) {
      // Mirrors a real upstream failure so failure handling is exercised by
      // the same code path in tests.
      return { ok: false, mode, ...classify(error) };
    }
    const parsed = req.schema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        mode,
        kind: "invalid_output",
        message: describeZodError(parsed.error),
      };
    }
    return { ok: true, mode, data: parsed.data, usage: null };
  }

  try {
    const response = await getClient().messages.parse({
      model: MODEL,
      max_tokens: req.maxTokens ?? 8000,
      thinking: { type: "adaptive" },
      output_config: {
        effort: req.effort ?? "medium",
        format: zodOutputFormat(req.schema),
      },
      system: [{ type: "text", text: req.system, cache_control: { type: "ephemeral" } }],
      messages: req.messages,
    });

    if (response.stop_reason === "refusal") {
      return {
        ok: false,
        mode,
        kind: "refusal",
        message: "The model declined to answer this turn.",
      };
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
      usage: {
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
    return {
      kind: "unconfigured",
      message: `${REQUIRED_ENV_VAR} was rejected by the provider.`,
    };
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return { kind: "network", message: "Could not reach the model provider." };
  }
  if (error instanceof Anthropic.APIError) {
    return { kind: "provider_error", message: `Provider error (${error.status ?? "unknown"}).` };
  }
  // A schema mismatch surfaces here as a ZodError from `.parse()`.
  if (error && typeof error === "object" && "issues" in error) {
    return { kind: "invalid_output", message: describeZodError(error as z.ZodError) };
  }
  return { kind: "provider_error", message: "The model call failed." };
}

function describeZodError(error: z.ZodError): string {
  const first = error.issues[0];
  if (!first) return "The model returned output that failed validation.";
  const path = first.path.join(".") || "(root)";
  return `Model output failed validation at ${path}: ${first.message}`;
}
