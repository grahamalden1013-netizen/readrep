/**
 * Conservative controls for the AI Rep Copilot. Every number here is a
 * deliberate cost / privacy / latency bound, not a guess — see docs/ai-rep-copilot.md.
 * These are shared by the frame source, the provider and the server action so
 * they cannot drift apart.
 */

/** A clip shorter than this cannot hold a readable decision. */
export const MIN_CLIP_SECONDS = 5;
/** Past this, frame sampling spreads too thin and cost climbs with no payoff. */
export const MAX_CLIP_SECONDS = 20;

/** Hard ceiling on frames sent in one request. */
export const MAX_FRAMES = 18;
/** Below this we do not have enough coverage to say anything useful. */
export const MIN_FRAMES = 8;

/**
 * Reading a jersey number needs the source resolution, not a broadcast frame.
 * The test asset stores 852px, so that is as detailed as Mux can serve; combined
 * with the provider's `detail: "high"` this keeps numbers legible. A single webp
 * frame at this width is ~40-70 KB.
 */
export const FRAME_WIDTH = 852;
/** Never request more than this from Mux even if a caller overrides FRAME_WIDTH. */
export const MAX_FRAME_WIDTH = 1280;

/**
 * Total encoded image payload for one analysis. 18 webp frames at 640px run
 * ~0.7 MB in practice; 6 MB is a generous ceiling that still refuses a runaway
 * request (e.g. a provider returning PNGs) well before it reaches the model.
 */
export const MAX_TOTAL_IMAGE_BYTES = 6 * 1024 * 1024;
/** A single frame over this is treated as a retrieval failure. */
export const MAX_SINGLE_IMAGE_BYTES = 1.5 * 1024 * 1024;

/** Per-frame fetch from the CDN. */
export const FRAME_FETCH_TIMEOUT_MS = 8_000;
/** Whole-batch budget for retrieving every frame. */
export const FRAME_BATCH_TIMEOUT_MS = 30_000;
/** One OpenAI Responses call. */
export const PROVIDER_TIMEOUT_MS = 120_000;

/** At most one analysis in flight per account. */
export const MAX_CONCURRENT_JOBS_PER_USER = 1;
/** Plus a spacing limit so a loop cannot burn the budget. */
export const MAX_JOBS_PER_USER_PER_HOUR = 20;
/** Minimum gap between two analyses from the same account. */
export const USER_COOLDOWN_MS = 8_000;

export const DEFAULT_REP_MODEL = "gpt-5.6-terra";
export const DEFAULT_REP_MODEL_FALLBACK = "gpt-5.1";

/**
 * Per-1M-token prices in USD, used only for the labelled cost *estimate*.
 * Override with OPENAI_REP_PRICE_INPUT / OPENAI_REP_PRICE_OUTPUT (USD per 1M).
 * These are estimates — do not present analysis as free.
 */
export const MODEL_PRICING: Record<string, { inputPerMTok: number; outputPerMTok: number }> = {
  "gpt-5.6-terra": { inputPerMTok: 1.25, outputPerMTok: 10 },
  "gpt-5.1": { inputPerMTok: 1.25, outputPerMTok: 10 },
  "gpt-5": { inputPerMTok: 1.25, outputPerMTok: 10 },
};
/**
 * Confidence gates. Below the target-identification threshold the draft is not
 * presented as reliable; below the overall threshold one-click form population
 * is blocked and stronger warnings are required.
 */
export const TARGET_ID_CONFIDENCE_MIN = 0.55;
export const OVERALL_CONFIDENCE_MIN = 0.5;
export const OVERALL_CONFIDENCE_APPLY_MIN = 0.6;
