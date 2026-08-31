import { MAX_FRAMES, MIN_FRAMES } from "@/lib/ai/limits";

/** One still frame, already fetched and normalised, ready for a model input. */
export type SampledFrame = {
  timestampSeconds: number;
  /** base64 data: URI. */
  dataUrl: string;
  byteLength: number;
  width: number;
  mimeType: string;
};

export type FrameClip = {
  clipStartSeconds: number;
  decisionSeconds: number;
  clipEndSeconds: number;
};

export type SampleFramesInput = FrameClip & {
  /** Public Mux playback id (or provider-equivalent). Never a signed URL. */
  playbackId: string;
};

export interface FrameSource {
  readonly kind: "mux";
  /**
   * Returns chronological, deduped frames for the clip. Throws
   * `AiError("frames-unavailable" | "invalid-clip" | ...)` on failure. Never
   * persists bytes; never puts credentials or URLs in an error.
   */
  sampleFrames(input: SampleFramesInput): Promise<SampledFrame[]>;
}

/**
 * Chronological timestamps (seconds) to sample, weighted toward the decision.
 *
 * Coverage: clip-start context, offensive + defensive alignment before the
 * decision (the 25/50/75% points), a dense burst around the decision itself,
 * the immediate action after, and the outcome near clip end.
 *
 * Guarantees: sorted ascending, deduped (100 ms grid), every value clamped to
 * [clipStart, clipEnd], at least `MIN_FRAMES` and at most `maxFrames`.
 */
export function planFrameTimestamps(clip: FrameClip, maxFrames = MAX_FRAMES): number[] {
  const { clipStartSeconds: start, decisionSeconds: decision, clipEndSeconds: end } = clip;
  if (!(start >= 0 && decision > start && end > decision)) {
    return [];
  }

  const before = decision - start;
  const after = end - decision;

  const candidates = [
    start,
    start + before * 0.25,
    start + before * 0.5,
    start + before * 0.75,
    decision - 1.5,
    decision - 0.75,
    decision - 0.25,
    decision,
    decision + 0.25,
    decision + 0.75,
    decision + 1.5,
    decision + after * 0.25,
    decision + after * 0.5,
    decision + after * 0.75,
    end,
  ];

  // Clamp, round to a 100 ms grid, dedupe, sort.
  const grid = new Map<number, number>();
  for (const raw of candidates) {
    const clamped = Math.min(end, Math.max(start, raw));
    const key = Math.round(clamped * 10); // 100 ms buckets
    if (!grid.has(key)) grid.set(key, Math.round(clamped * 100) / 100);
  }
  let times = [...grid.values()].sort((a, b) => a - b);

  // If dedupe (very short clips) left us thin, fill evenly between start and end.
  if (times.length < Math.min(MIN_FRAMES, maxFrames)) {
    const want = Math.min(MIN_FRAMES, maxFrames);
    const filled = new Map<number, number>();
    for (let i = 0; i < want; i += 1) {
      const t = start + ((end - start) * i) / (want - 1);
      filled.set(Math.round(t * 10), Math.round(t * 100) / 100);
    }
    for (const t of times) filled.set(Math.round(t * 10), t);
    times = [...filled.values()].sort((a, b) => a - b);
  }

  // Never exceed the ceiling: keep the decision-dense middle, thin the ends.
  if (times.length > maxFrames) {
    const keepAroundDecision = times.filter((t) => Math.abs(t - decision) <= 1.6);
    const rest = times.filter((t) => Math.abs(t - decision) > 1.6);
    const slots = maxFrames - keepAroundDecision.length;
    const thinned: number[] = [];
    if (slots > 0 && rest.length > 0) {
      const step = rest.length / slots;
      for (let i = 0; i < slots; i += 1) thinned.push(rest[Math.floor(i * step)]);
    }
    times = [...new Set([...thinned, ...keepAroundDecision])].sort((a, b) => a - b);
  }

  return times;
}
