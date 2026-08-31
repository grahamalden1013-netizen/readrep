import "server-only";
import { assertAiConfigured } from "./config";
import { OpenAiRepProvider } from "./openai-provider";
import type { RepAiProvider } from "./provider";

export { isAiConfigured } from "./config";

/**
 * The one place an OpenAI client is constructed. Throws `AiError("not-configured")`
 * when the key is absent so callers surface a clean configuration error.
 */
export function getRepAiProvider(): RepAiProvider {
  assertAiConfigured();
  return new OpenAiRepProvider(process.env.OPENAI_API_KEY!.trim());
}

export { AiError } from "./errors";
export type { RepAiProvider } from "./provider";
