import "server-only";
import { fetchMuxFrame } from "@/lib/video/mux-frame-source";
import { DISCOVERY_BATCH_SIZE, DISCOVERY_FRAME_WIDTH, MAX_DISCOVERY_CALLS } from "./limits";
import { classifyLiveGame, type LiveFrameVerdict } from "./discovery-provider";
import {
  buildPossessionWindows,
  discoveryTimestamps,
  spansFromVerdicts,
  type LiveSpan,
  type PossessionWindow,
} from "./segments";

export { buildPossessionWindows, discoveryTimestamps, spansFromVerdicts };
export type { LiveSpan, PossessionWindow };

/**
 * Stage A. Probe the game on a coarse grid, classify each probe frame with the
 * cheap model in batches, and return merged live-play spans. Used by the
 * one-shot script path; the durable worker runs its own chunked version.
 */
export async function findLiveSpans(
  playbackId: string,
  durationSeconds: number,
  onProgress?: (done: number, total: number) => Promise<void> | void,
): Promise<{
  spans: LiveSpan[];
  calls: number;
  usage: { input: number; output: number };
  model: string;
  probed: number;
}> {
  const timestamps = discoveryTimestamps(durationSeconds);
  const verdicts: LiveFrameVerdict[] = [];
  let calls = 0;
  let usageIn = 0;
  let usageOut = 0;
  let modelUsed = "";

  for (let i = 0; i < timestamps.length && calls < MAX_DISCOVERY_CALLS; i += DISCOVERY_BATCH_SIZE) {
    const batchTs = timestamps.slice(i, i + DISCOVERY_BATCH_SIZE);
    const probes: { timestampSeconds: number; dataUrl: string }[] = [];
    for (const t of batchTs) {
      const f = await fetchMuxFrame(playbackId, t, DISCOVERY_FRAME_WIDTH, 6_000);
      if (f) probes.push({ timestampSeconds: t, dataUrl: f.dataUrl });
    }
    if (probes.length === 0) continue;

    const { verdicts: v, usage, model } = await classifyLiveGame(probes);
    verdicts.push(...v);
    calls += 1;
    usageIn += usage.input;
    usageOut += usage.output;
    modelUsed = model;
    await onProgress?.(Math.min(i + DISCOVERY_BATCH_SIZE, timestamps.length), timestamps.length);
  }

  return {
    spans: spansFromVerdicts(verdicts),
    calls,
    usage: { input: usageIn, output: usageOut },
    model: modelUsed,
    probed: verdicts.length,
  };
}
