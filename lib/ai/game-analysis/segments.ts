/**
 * Pure geometry for the discovery pipeline: where to probe, how to merge probe
 * verdicts into live-play spans, and how to cut spans into possession windows.
 * No I/O, no `server-only` — imported by both the worker and the tests.
 */
import {
  DISCOVERY_SAMPLE_INTERVAL_SECONDS,
  GAME_EDGE_TRIM_SECONDS,
  LIVE_SPAN_GAP_TOLERANCE,
  MIN_POSSESSION_WINDOW_SECONDS,
  POSSESSION_WINDOW_OVERLAP_SECONDS,
  POSSESSION_WINDOW_SECONDS,
} from "./limits";

export type LiveSpan = { startSeconds: number; endSeconds: number };
export type PossessionWindow = { startSeconds: number; endSeconds: number };
export type SpanVerdict = { timestampSeconds: number; liveGame: boolean };

/** Evenly spaced probe timestamps across the game (edges trimmed). */
export function discoveryTimestamps(durationSeconds: number): number[] {
  const start = GAME_EDGE_TRIM_SECONDS;
  const end = Math.max(start + 1, durationSeconds - GAME_EDGE_TRIM_SECONDS);
  const out: number[] = [];
  for (let t = start; t <= end; t += DISCOVERY_SAMPLE_INTERVAL_SECONDS) out.push(Math.round(t * 10) / 10);
  return out;
}

/**
 * Merge a sorted list of frame verdicts into live spans. A single dead sample
 * between two live ones is bridged; a span shorter than one sample interval is
 * dropped.
 */
export function spansFromVerdicts(verdicts: SpanVerdict[]): LiveSpan[] {
  const sorted = [...verdicts].sort((a, b) => a.timestampSeconds - b.timestampSeconds);
  const spans: LiveSpan[] = [];
  let runStart: number | null = null;
  let lastLive: number | null = null;
  let deadStreak = 0;

  const step = DISCOVERY_SAMPLE_INTERVAL_SECONDS;
  for (const v of sorted) {
    if (v.liveGame) {
      if (runStart === null) runStart = v.timestampSeconds - step / 2;
      lastLive = v.timestampSeconds;
      deadStreak = 0;
    } else if (runStart !== null) {
      deadStreak += 1;
      if (deadStreak > LIVE_SPAN_GAP_TOLERANCE) {
        spans.push({ startSeconds: runStart, endSeconds: (lastLive ?? runStart) + step / 2 });
        runStart = null;
        lastLive = null;
        deadStreak = 0;
      }
    }
  }
  if (runStart !== null) {
    spans.push({ startSeconds: runStart, endSeconds: (lastLive ?? runStart) + step / 2 });
  }

  return spans.filter((s) => s.endSeconds - s.startSeconds >= step);
}

/**
 * Cut each live span into overlapping possession-sized windows so a decision has
 * context on both sides. Windows shorter than the minimum are dropped; a short
 * span becomes a single window.
 */
export function buildPossessionWindows(spans: LiveSpan[]): PossessionWindow[] {
  const windows: PossessionWindow[] = [];
  const stride = POSSESSION_WINDOW_SECONDS - POSSESSION_WINDOW_OVERLAP_SECONDS;

  for (const span of spans) {
    const length = span.endSeconds - span.startSeconds;
    if (length < MIN_POSSESSION_WINDOW_SECONDS) continue;
    if (length <= POSSESSION_WINDOW_SECONDS) {
      windows.push({ startSeconds: round(span.startSeconds), endSeconds: round(span.endSeconds) });
      continue;
    }
    for (let s = span.startSeconds; s < span.endSeconds - MIN_POSSESSION_WINDOW_SECONDS; s += stride) {
      const end = Math.min(span.endSeconds, s + POSSESSION_WINDOW_SECONDS);
      if (end - s >= MIN_POSSESSION_WINDOW_SECONDS) {
        windows.push({ startSeconds: round(s), endSeconds: round(end) });
      }
    }
  }
  return windows;
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
