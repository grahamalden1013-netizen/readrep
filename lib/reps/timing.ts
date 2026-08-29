import type { Rep } from "./schema";

export type TimingIssue = { field: "clipStartMs" | "decisionPauseMs" | "clipEndMs"; message: string };

export type RepTiming = Pick<Rep, "clipStartMs" | "decisionPauseMs" | "clipEndMs">;

/**
 * Enforces 0 <= clipStart < decisionPause < clipEnd <= duration.
 *
 * The schema already guarantees the ordering; this adds the video-length bound,
 * which the schema cannot know, and returns per-field messages for the studio.
 * `durationMs` is null when the provider has not reported a duration yet, in
 * which case only the ordering is checked.
 */
export function validateRepTiming(timing: RepTiming, durationMs: number | null): TimingIssue[] {
  const issues: TimingIssue[] = [];

  if (!Number.isFinite(timing.clipStartMs) || timing.clipStartMs < 0) {
    issues.push({ field: "clipStartMs", message: "Clip start cannot be negative." });
  }
  if (timing.decisionPauseMs <= timing.clipStartMs) {
    issues.push({ field: "decisionPauseMs", message: "The decision has to come after the clip starts." });
  }
  if (timing.clipEndMs <= timing.decisionPauseMs) {
    issues.push({ field: "clipEndMs", message: "The clip has to end after the decision." });
  }
  if (durationMs !== null && timing.clipEndMs > durationMs) {
    issues.push({ field: "clipEndMs", message: "The clip cannot end after the video does." });
  }
  if (durationMs !== null && timing.clipStartMs > durationMs) {
    issues.push({ field: "clipStartMs", message: "The clip cannot start after the video ends." });
  }

  return issues;
}

/** mm:ss.t — precise enough to place a decision frame, short enough to scan. */
export function formatTimecode(ms: number): string {
  const safe = Math.max(0, ms);
  const minutes = Math.floor(safe / 60000);
  const seconds = Math.floor((safe % 60000) / 1000);
  const tenths = Math.floor((safe % 1000) / 100);
  return `${minutes}:${String(seconds).padStart(2, "0")}.${tenths}`;
}
