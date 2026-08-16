import "server-only";

import type * as z from "zod/v4";

/**
 * The provider-agnostic seam.
 *
 * Nothing above this file knows what an Anthropic client looks like. The
 * interview engine asks for a validated object of a given shape and gets back
 * a discriminated result. Swapping providers means writing a new module
 * alongside `anthropic.ts` and changing `getProvider()`.
 *
 * `server-only` means a client component importing this fails the build rather
 * than shipping an API key to a browser.
 */

export type ProviderMode =
  /** Real credentials present. Calls hit the provider. */
  | "live"
  /** Explicitly requested scripted responses, for automated tests only. */
  | "mock"
  /** No credentials. The app must say so rather than fake intelligence. */
  | "unconfigured";

export type GenerateFailure = {
  ok: false;
  mode: ProviderMode;
  kind: "unconfigured" | "refusal" | "rate_limit" | "invalid_output" | "provider_error" | "network";
  message: string;
};

export type GenerateSuccess<T> = {
  ok: true;
  mode: ProviderMode;
  data: T;
  /** Recorded on the turn so every question is traceable. */
  meta: {
    provider: string;
    model: string;
    latencyMs: number;
    inputTokens: number | null;
    outputTokens: number | null;
  };
};

export type GenerateResult<T> = GenerateSuccess<T> | GenerateFailure;

export type GenerateRequest<T> = {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
  schema: z.ZodType<T>;
  maxTokens?: number;
  effort?: "low" | "medium" | "high";
  /** Used only in mock mode; ignored when real credentials are present. */
  mockKey?: string;
};

export type AiProvider = {
  /** Stored on each turn alongside the model and prompt version. */
  readonly name: string;
  readonly model: string;
  readonly mode: ProviderMode;
  generate<T>(req: GenerateRequest<T>): Promise<GenerateResult<T>>;
};

/**
 * A deterministic stand-in for automated tests. Registering a responder does
 * nothing unless READREP_AI_MODE=mock, so a stray import can never downgrade a
 * real install to fake intelligence.
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

export function getMockResponder(): MockResponder | null {
  return mockResponder;
}

export function describeZodError(error: z.ZodError): string {
  const first = error.issues[0];
  if (!first) return "The model returned output that failed validation.";
  const path = first.path.join(".") || "(root)";
  return `Model output failed validation at ${path}: ${first.message}`;
}
