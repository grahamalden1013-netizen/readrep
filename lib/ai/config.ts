import { AiError } from "./errors";

/**
 * Whether the OpenAI key is present. Only reports presence — never the value.
 * Lives apart from the provider so it can be checked without pulling the SDK in.
 */
export function isAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

/** Throws `AiError("not-configured")` when the key is absent. */
export function assertAiConfigured(): void {
  if (!isAiConfigured()) {
    throw new AiError("not-configured", "OPENAI_API_KEY is not set on this server.");
  }
}
