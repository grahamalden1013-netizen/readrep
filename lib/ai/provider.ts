import Anthropic from "@anthropic-ai/sdk";

/**
 * Provider abstraction for NGN's AI services.
 *
 * The whole application must run with no API key configured — every service
 * falls back to a deterministic local implementation. `isAIConfigured()` is the
 * single switch, and UI surfaces read it to label output honestly.
 */

export const AI_MODEL = "claude-opus-5";

let client: Anthropic | null = null;

export function isAIConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

export type JsonSchema = Record<string, unknown>;

/**
 * Ask Claude for a JSON object matching `schema`.
 *
 * Returns `null` on any failure — no key, a refusal, a transport error, or
 * unparseable output — so every caller can fall back to its local
 * implementation instead of surfacing an error to a student mid-debate.
 */
export async function generateJSON<T>({
  system,
  prompt,
  schema,
  maxTokens = 4000,
}: {
  system: string;
  prompt: string;
  schema: JsonSchema;
  maxTokens?: number;
}): Promise<T | null> {
  if (!isAIConfigured()) return null;

  try {
    const response = await getClient().messages.create({
      model: AI_MODEL,
      max_tokens: maxTokens,
      system,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema },
      },
      messages: [{ role: "user", content: prompt }],
    });

    // A safety refusal is a legitimate outcome, not an exception; fall back.
    if (response.stop_reason === "refusal") return null;

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

    if (!text.trim()) return null;
    return JSON.parse(text) as T;
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      console.error(`[ngn/ai] Anthropic API error ${error.status}:`, error.message);
    } else {
      console.error("[ngn/ai] generateJSON failed:", error);
    }
    return null;
  }
}

/** Plain-text generation, used by the explainer panel. */
export async function generateText({
  system,
  prompt,
  maxTokens = 1200,
}: {
  system: string;
  prompt: string;
  maxTokens?: number;
}): Promise<string | null> {
  if (!isAIConfigured()) return null;

  try {
    const response = await getClient().messages.create({
      model: AI_MODEL,
      max_tokens: maxTokens,
      system,
      thinking: { type: "adaptive" },
      output_config: { effort: "low" },
      messages: [{ role: "user", content: prompt }],
    });

    if (response.stop_reason === "refusal") return null;

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    return text || null;
  } catch (error) {
    console.error("[ngn/ai] generateText failed:", error);
    return null;
  }
}
