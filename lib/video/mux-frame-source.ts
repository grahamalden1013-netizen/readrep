import "server-only";
import { AiError } from "@/lib/ai/errors";
import {
  FRAME_BATCH_TIMEOUT_MS,
  FRAME_FETCH_TIMEOUT_MS,
  FRAME_WIDTH,
  MAX_FRAMES,
  MAX_FRAME_WIDTH,
  MAX_SINGLE_IMAGE_BYTES,
  MAX_TOTAL_IMAGE_BYTES,
  MIN_FRAMES,
} from "@/lib/ai/limits";
import {
  planFrameTimestamps,
  type FrameSource,
  type SampleFramesInput,
  type SampledFrame,
} from "./frame-source";

const MUX_IMAGE_HOST = "https://image.mux.com";

/**
 * Fetch one Mux thumbnail as a base64 data URL, server-side. Returns null on any
 * miss (timeout, non-200, empty, oversized). The signed/URL detail never leaves
 * this function. Used by both the clip Copilot and full-game discovery.
 */
export async function fetchMuxFrame(
  playbackId: string,
  timeSeconds: number,
  width: number,
  timeoutMs = 8_000,
): Promise<SampledFrame | null> {
  if (!playbackId || /^https?:/i.test(playbackId)) return null;
  const w = Math.min(1280, Math.max(240, Math.round(width)));
  const url = `${MUX_IMAGE_HOST}/${encodeURIComponent(playbackId)}/thumbnail.webp?time=${Math.max(
    0,
    timeSeconds,
  ).toFixed(2)}&width=${w}&fit_mode=preserve`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: "no-store" });
    if (!response.ok) return null;
    const buffer = new Uint8Array(await response.arrayBuffer());
    if (buffer.length === 0 || buffer.length > MAX_SINGLE_IMAGE_BYTES) return null;
    const mimeType = (response.headers.get("content-type") ?? "image/webp").split(";")[0].trim() || "image/webp";
    return {
      timestampSeconds: Math.max(0, timeSeconds),
      dataUrl: `data:${mimeType};base64,${Buffer.from(buffer).toString("base64")}`,
      byteLength: buffer.length,
      width: w,
      mimeType,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Pulls still frames from Mux's public thumbnail endpoint, server-side.
 *
 * `image.mux.com/{playbackId}/thumbnail.webp?time=<s>&width=<px>` needs no
 * credentials for a public playback policy. If playback ever becomes signed,
 * only this class changes (it would mint a short-lived token here) — the token
 * and the signed URL never leave the server and never appear in an error.
 */
export class MuxFrameSource implements FrameSource {
  readonly kind = "mux" as const;
  private readonly width: number;

  constructor(options?: { width?: number }) {
    this.width = Math.min(MAX_FRAME_WIDTH, Math.max(320, options?.width ?? FRAME_WIDTH));
  }

  async sampleFrames(input: SampleFramesInput): Promise<SampledFrame[]> {
    const { clipStartSeconds, decisionSeconds, clipEndSeconds } = input;
    if (!(clipStartSeconds >= 0 && decisionSeconds > clipStartSeconds && clipEndSeconds > decisionSeconds)) {
      throw new AiError("invalid-clip", "The clip window is out of order.");
    }
    if (!input.playbackId || /^https?:/i.test(input.playbackId)) {
      throw new AiError("frames-unavailable", "No usable playback id for this game's video.");
    }

    const timestamps = planFrameTimestamps(
      { clipStartSeconds, decisionSeconds, clipEndSeconds },
      MAX_FRAMES,
    );
    if (timestamps.length < MIN_FRAMES) {
      throw new AiError("frames-unavailable", "This clip is too short to sample enough frames.");
    }

    const batch = new AbortController();
    const batchTimer = setTimeout(() => batch.abort(), FRAME_BATCH_TIMEOUT_MS);

    const frames: SampledFrame[] = [];
    let totalBytes = 0;
    try {
      // Sequential on purpose: keeps memory flat and lets us stop the moment the
      // payload budget is reached.
      for (const t of timestamps) {
        if (batch.signal.aborted) break;
        const frame = await this.fetchFrame(input.playbackId, t, batch.signal);
        if (!frame) continue;
        if (totalBytes + frame.byteLength > MAX_TOTAL_IMAGE_BYTES) break;
        totalBytes += frame.byteLength;
        frames.push(frame);
      }
    } finally {
      clearTimeout(batchTimer);
    }

    if (frames.length < MIN_FRAMES) {
      throw new AiError(
        "frames-unavailable",
        `Only ${frames.length} of ${timestamps.length} frames could be retrieved for this clip.`,
      );
    }

    frames.sort((a, b) => a.timestampSeconds - b.timestampSeconds);
    return frames;
  }

  private async fetchFrame(
    playbackId: string,
    timeSeconds: number,
    parentSignal: AbortSignal,
  ): Promise<SampledFrame | null> {
    const url = `${MUX_IMAGE_HOST}/${encodeURIComponent(playbackId)}/thumbnail.webp?time=${timeSeconds.toFixed(
      2,
    )}&width=${this.width}&fit_mode=preserve`;

    const perFrame = new AbortController();
    const timer = setTimeout(() => perFrame.abort(), FRAME_FETCH_TIMEOUT_MS);
    const onParentAbort = () => perFrame.abort();
    parentSignal.addEventListener("abort", onParentAbort, { once: true });

    try {
      const response = await fetch(url, { signal: perFrame.signal, cache: "no-store" });
      if (!response.ok) return null;
      const buffer = new Uint8Array(await response.arrayBuffer());
      if (buffer.length === 0 || buffer.length > MAX_SINGLE_IMAGE_BYTES) return null;

      const contentType = response.headers.get("content-type") ?? "image/webp";
      const mimeType = contentType.split(";")[0].trim() || "image/webp";
      const base64 = Buffer.from(buffer).toString("base64");

      return {
        timestampSeconds: timeSeconds,
        dataUrl: `data:${mimeType};base64,${base64}`,
        byteLength: buffer.length,
        width: this.width,
        mimeType,
      };
    } catch {
      // Timeout / network — a per-frame miss, not a fatal error. Never surface
      // the URL (it identifies the asset) in the caller's error message.
      return null;
    } finally {
      clearTimeout(timer);
      parentSignal.removeEventListener("abort", onParentAbort);
    }
  }
}
