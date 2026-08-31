/**
 * Normalised, browser-safe failures for the AI Rep Copilot.
 *
 * Modelled on `VideoProviderError`: a small code set plus a message that is
 * always safe to show a coach. The raw provider response, the API key, Mux
 * URLs and stack details never reach `.message` or `.toUserMessage()`.
 */

export const AI_ERROR_CODES = [
  // configuration — the coach cannot fix these, an operator must
  "not-configured", // OPENAI_API_KEY missing
  "model-unavailable", // configured model rejected by the account
  "quota", // billing / quota exhausted
  // transient — retry is reasonable
  "rate-limited",
  "timeout",
  "provider-unavailable",
  "frames-unavailable", // could not retrieve enough Mux frames
  // request problems — the coach can adjust the clip
  "video-not-ready",
  "invalid-clip",
  "clip-too-long",
  "clip-too-short",
  // analysis outcomes — not errors of the system, results of the evidence
  "target-not-visible",
  "low-confidence",
  // integrity
  "invalid-output", // model returned something that failed Zod
  "duplicate-job",
  "rate-exceeded",
  "unauthorized",
  "not-found",
  "storage-failed",
] as const;

export type AiErrorCode = (typeof AI_ERROR_CODES)[number];

export class AiError extends Error {
  readonly code: AiErrorCode;
  /** True when a fresh attempt (same or adjusted clip) could succeed. */
  readonly retryable: boolean;

  constructor(code: AiErrorCode, message: string, options?: { retryable?: boolean }) {
    super(message);
    this.name = "AiError";
    this.code = code;
    this.retryable = options?.retryable ?? DEFAULT_RETRYABLE.has(code);
  }

  /** Configuration errors are an operator problem; everything else the coach can act on. */
  get kind(): "configuration" | "transient" | "request" | "analysis" | "integrity" {
    if (CONFIG_CODES.has(this.code)) return "configuration";
    if (TRANSIENT_CODES.has(this.code)) return "transient";
    if (REQUEST_CODES.has(this.code)) return "request";
    if (ANALYSIS_CODES.has(this.code)) return "analysis";
    return "integrity";
  }

  /** Never includes secrets, URLs or raw provider payloads. */
  toUserMessage(): string {
    switch (this.code) {
      case "not-configured":
        return "AI drafting is not configured on this server.";
      case "model-unavailable":
        return "The configured AI model is not available to this account. An operator needs to check the model setting.";
      case "quota":
        return "The AI provider account is out of quota. An operator needs to top it up.";
      case "rate-limited":
        return "The AI provider is rate limiting us. Try again in a moment.";
      case "timeout":
        return "The AI analysis took too long. Try again, or pick a shorter clip.";
      case "provider-unavailable":
        return "The AI provider could not be reached. Try again in a moment.";
      case "frames-unavailable":
        return "We could not pull enough clear frames from this clip. Pick a moment with steadier footage.";
      case "video-not-ready":
        return "This game's video is still processing. Wait for it to finish, then try again.";
      case "invalid-clip":
        return "The clip window is not valid. Set clip start, decision and clip end in order.";
      case "clip-too-long":
        return "That clip is too long for AI drafting. Trim it to a single possession.";
      case "clip-too-short":
        return "That clip is too short for AI drafting. Give it a few more seconds of context.";
      case "target-not-visible":
        return "We couldn't reliably identify the target player in this clip. Choose a moment where the jersey number or player is clearer.";
      case "low-confidence":
        return "The analysis was too uncertain to fill the form. Try a clearer clip, or use the evidence and warnings as notes.";
      case "invalid-output":
        return "The AI returned a result we could not use. Try regenerating.";
      case "duplicate-job":
        return "An analysis for this exact clip is already running.";
      case "rate-exceeded":
        return "You've run several analyses recently. Give it a minute before the next one.";
      case "unauthorized":
        return "You do not have access to this game.";
      case "not-found":
        return "That analysis could not be found.";
      case "storage-failed":
        return "We could not save the analysis. Try again.";
    }
  }
}

const CONFIG_CODES = new Set<AiErrorCode>(["not-configured", "model-unavailable", "quota"]);
const TRANSIENT_CODES = new Set<AiErrorCode>([
  "rate-limited",
  "timeout",
  "provider-unavailable",
  "frames-unavailable",
  "storage-failed",
]);
const REQUEST_CODES = new Set<AiErrorCode>([
  "video-not-ready",
  "invalid-clip",
  "clip-too-long",
  "clip-too-short",
  "unauthorized",
  "not-found",
]);
const ANALYSIS_CODES = new Set<AiErrorCode>(["target-not-visible", "low-confidence"]);
const DEFAULT_RETRYABLE = new Set<AiErrorCode>([
  "rate-limited",
  "timeout",
  "provider-unavailable",
  "frames-unavailable",
  "invalid-output",
  "storage-failed",
  "low-confidence",
]);

/**
 * Collapse anything thrown during analysis into an AiError without leaking
 * internals. An OpenAI SDK error carries a `status`; map the useful ones.
 */
export function toAiError(cause: unknown): AiError {
  if (cause instanceof AiError) return cause;

  const status =
    typeof cause === "object" && cause !== null && "status" in cause
      ? Number((cause as { status?: unknown }).status)
      : undefined;
  const providerCode =
    typeof cause === "object" && cause !== null && "code" in cause
      ? String((cause as { code?: unknown }).code ?? "")
      : "";

  if (status === 401 || providerCode === "invalid_api_key") {
    return new AiError("not-configured", "AI provider credentials were rejected.");
  }
  if (status === 403 || providerCode === "model_not_found" || status === 404) {
    return new AiError("model-unavailable", "The configured AI model is not available.");
  }
  if (status === 429 || providerCode === "insufficient_quota") {
    return providerCode === "insufficient_quota"
      ? new AiError("quota", "AI provider quota exhausted.")
      : new AiError("rate-limited", "AI provider rate limit hit.");
  }
  if (status !== undefined && status >= 500) {
    return new AiError("provider-unavailable", "AI provider returned a server error.");
  }
  if (cause instanceof Error && /timeout|aborted|ETIMEDOUT|abort/i.test(cause.message)) {
    return new AiError("timeout", "AI analysis timed out.");
  }
  return new AiError("provider-unavailable", "AI analysis could not be completed.");
}
