import { AiError } from "./errors";
import { MAX_CLIP_SECONDS, MIN_CLIP_SECONDS } from "./limits";

export type ClipMs = {
  clipStartMs: number;
  decisionPauseMs: number;
  clipEndMs: number;
};

export type ClipSeconds = {
  clipStartSeconds: number;
  decisionSeconds: number;
  clipEndSeconds: number;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Turns the Studio timing (ms) into a validated seconds clip for AI drafting.
 * Throws a typed `AiError` the server action surfaces safely.
 */
export function validateAiClip(input: ClipMs, durationSeconds: number | null): ClipSeconds {
  const clipStartSeconds = round2(input.clipStartMs / 1000);
  const decisionSeconds = round2(input.decisionPauseMs / 1000);
  const clipEndSeconds = round2(input.clipEndMs / 1000);

  if (
    !(
      clipStartSeconds >= 0 &&
      decisionSeconds > clipStartSeconds &&
      clipEndSeconds > decisionSeconds
    )
  ) {
    throw new AiError("invalid-clip", "Set clip start, decision and clip end in order.");
  }
  if (durationSeconds !== null && clipEndSeconds > durationSeconds + 0.5) {
    throw new AiError("invalid-clip", "The clip runs past the end of the video.");
  }

  const length = clipEndSeconds - clipStartSeconds;
  if (length < MIN_CLIP_SECONDS) {
    throw new AiError("clip-too-short", `AI drafting needs at least ${MIN_CLIP_SECONDS}s of clip.`);
  }
  if (length > MAX_CLIP_SECONDS) {
    throw new AiError("clip-too-long", `Trim the clip to ${MAX_CLIP_SECONDS}s or less for AI drafting.`);
  }

  return { clipStartSeconds, decisionSeconds, clipEndSeconds };
}
