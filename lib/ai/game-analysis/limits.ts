/**
 * Cost / time bounds for a full-game analysis. Every number is a deliberate
 * ceiling, documented in docs/full-game-analysis.md.
 */

/** A game longer than this is refused for analysis. */
export const MAX_GAME_SECONDS = 60 * 60; // 60 min
/** Ignore the first/last slivers where the broadcast is never live play. */
export const GAME_EDGE_TRIM_SECONDS = 8;

// --- Stage A: cheap live/dead classification ------------------------------
/** One probe frame every N seconds across the game. */
export const DISCOVERY_SAMPLE_INTERVAL_SECONDS = 12;
/** Frames per cheap-model call. */
export const DISCOVERY_BATCH_SIZE = 12;
/** Never exceed this many cheap calls for one game. */
export const MAX_DISCOVERY_CALLS = 40;
/** Probe frame width — small; we only need "is this live basketball". */
export const DISCOVERY_FRAME_WIDTH = 480;
/** Bridge a single dead sample between two live ones. */
export const LIVE_SPAN_GAP_TOLERANCE = 1;

// --- Stage B: possession windows ---------------------------------------
export const POSSESSION_WINDOW_SECONDS = 18;
export const POSSESSION_WINDOW_OVERLAP_SECONDS = 4;
export const MIN_POSSESSION_WINDOW_SECONDS = 8;

// --- Stage C/D: expensive per-possession reasoning --------------------
/** Hard cap on expensive reasoning calls for one game. */
export const MAX_REASONING_CALLS = 20;
/** Frames sent per possession to the reasoning model. */
export const POSSESSION_FRAMES = 14;
export const POSSESSION_FRAME_WIDTH = 852;

// --- Stage F: output --------------------------------------------------
export const TARGET_CANDIDATE_MIN = 5;
export const TARGET_CANDIDATE_MAX = 10;
/** Never surface more than this many to review even if more pass. */
export const MAX_CANDIDATES = 12;

// --- Confidence gates -------------------------------------------------
export const CANDIDATE_ID_CONFIDENCE_MIN = 0.55;
export const CANDIDATE_DECISION_CONFIDENCE_MIN = 0.5;
/** Below this a candidate is kept but flagged `needs_attention`. */
export const CANDIDATE_FLAG_CONFIDENCE = 0.62;

// --- Job durability -------------------------------------------------
/** A running job with no heartbeat for this long is reclaimable. */
export const JOB_STALE_MS = 4 * 60_000;
export const MAX_JOB_ATTEMPTS = 4;
/** Whole-analysis wall-clock ceiling; past it the job fails cleanly. */
export const JOB_WALL_CLOCK_MS = 20 * 60_000;

// --- Models --------------------------------------------------------
export const DEFAULT_DISCOVERY_MODEL = "gpt-5-nano";
/** Reasoning model = the rep-drafting model (env OPENAI_REP_MODEL). */

// --- Pricing (USD / 1M tokens) — labelled ESTIMATE only ---------------
export const GAME_MODEL_PRICING: Record<string, { in: number; out: number }> = {
  "gpt-5-nano": { in: 0.05, out: 0.4 },
  "gpt-5-mini": { in: 0.25, out: 2 },
  "gpt-5.1": { in: 1.25, out: 10 },
  "gpt-5.6-terra": { in: 1.25, out: 10 },
  "gpt-5": { in: 1.25, out: 10 },
};

export function priceFor(model: string): { in: number; out: number } {
  return GAME_MODEL_PRICING[model] ?? GAME_MODEL_PRICING["gpt-5.6-terra"];
}
