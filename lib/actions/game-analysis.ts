"use server";

import { after } from "next/server";
import { z } from "zod";
import { AiError, toAiError } from "@/lib/ai/errors";
import { isAiConfigured } from "@/lib/ai/config";
import { MAX_GAME_SECONDS } from "@/lib/ai/game-analysis/limits";
import { confirmedReferenceSetSchema } from "@/lib/ai/game-analysis/reference";
import { scoutTeamColorCandidates } from "@/lib/ai/game-analysis/scout";
import { runAnalysisTick } from "@/lib/ai/game-analysis/worker";
import { getCoachingProfile } from "@/lib/db/coaching-profile";
import { COACHING_PROFILE_VERSION, isProfileComplete } from "@/lib/coaching/profile";
import { gameAnalysisJobs, type GameAnalysisJob } from "@/lib/db/game-analysis";
import { getGame } from "@/lib/store";
import { requireOwnerWhenSupabase, withAuthedAction } from "./guard";
import type { ActionResult } from "./result";

const MUX_IMAGE_HOST = "https://image.mux.com";

/** Public-playback thumbnail URL. Safe for the browser — no credentials, no signing. */
function thumbUrl(playbackId: string, timeSeconds: number, width = 640): string {
  const t = Math.max(0, Math.round(timeSeconds * 10) / 10);
  return `${MUX_IMAGE_HOST}/${encodeURIComponent(playbackId)}/thumbnail.webp?time=${t}&width=${width}&fit_mode=preserve`;
}

/** Public-playback animated preview (looping 3-5s). No credentials, no signing. */
function previewUrl(playbackId: string, startSeconds: number, endSeconds: number, width = 640): string {
  const s = Math.max(0, Math.round(startSeconds * 10) / 10);
  const e = Math.max(s + 1, Math.round(endSeconds * 10) / 10);
  return `${MUX_IMAGE_HOST}/${encodeURIComponent(playbackId)}/animated.webp?start=${s}&end=${e}&width=${width}&fps=15`;
}

// ---------------------------------------------------------------------------
// Client-facing view of a job. Never leaks cursor internals, tokens, prompts,
// DB ids beyond the job id, raw provider errors, or coach-profile answers.
// ---------------------------------------------------------------------------
export type GameAnalysisView = {
  jobId: string;
  gameId: string;
  status: GameAnalysisJob["status"];
  stage: GameAnalysisJob["stage"];
  /** One calm human sentence — the only progress text the player UI shows. */
  note: string;
  target: { jerseyNumber: string; teamColor: string };
  candidateCount: number;
  approvedCount: number;
  createdAt: string;
  completedAt: string | null;
  /** failed jobs only */
  errorMessage: string | null;
  canRetry: boolean;
};

const STAGE_NOTES: Record<GameAnalysisJob["stage"], string> = {
  queued: "Getting ready",
  preparing: "Preparing the game",
  "locating-player": "Finding your player",
  "reviewing-possessions": "Reviewing possessions",
  "finding-decisions": "Finding decision moments",
  "building-reps": "Building your reps",
  ranking: "Building your reps",
  done: "Ready for review",
  failed: "We hit a snag",
};

function toView(job: GameAnalysisJob): GameAnalysisView {
  return {
    jobId: job.id,
    gameId: job.gameId,
    status: job.status,
    stage: job.stage,
    note: job.status === "failed" ? "We hit a snag" : STAGE_NOTES[job.stage] ?? "Working on it",
    target: { jerseyNumber: job.target.jerseyNumber, teamColor: job.target.teamColor },
    candidateCount: job.candidateCount ?? 0,
    approvedCount: job.approvedCount ?? 0,
    createdAt: job.createdAt,
    completedAt: job.completedAt,
    errorMessage: job.status === "failed" ? job.errorMessageSafe ?? "The analysis stopped early." : null,
    canRetry: job.status === "failed" || job.status === "cancelled",
  };
}

// ---------------------------------------------------------------------------
// Scout for the player before analysis. Scans the whole game for live basketball
// where the target team colour is visible, and returns candidate moments as a
// preview clip + a still to click on. Never asserts identity.
// ---------------------------------------------------------------------------
export type PlayerScoutCandidate = {
  id: string;
  timestampSeconds: number;
  /** Looping 3-5s preview around the moment. */
  previewUrl: string;
  /** High-res still for the coach to click the player on. */
  stillUrl: string;
  /** Width the still is served at, so the client can map click -> normalized point. */
  stillWidth: number;
};

export async function scoutPlayerCandidates(
  gameId: string,
): Promise<ActionResult<{ candidates: PlayerScoutCandidate[] }>> {
  return withAuthedAction(async () => {
    await requireOwnerWhenSupabase();
    const id = z.string().min(1).max(64).safeParse(gameId);
    if (!id.success) return { ok: false, error: "That game could not be found." };

    try {
      if (!isAiConfigured()) {
        return { ok: false, error: "Analysis is not configured on this server." };
      }
      const game = await getGame(id.data);
      const asset = game?.videoAsset;
      if (!game || !asset || asset.provider !== "mux" || asset.status !== "ready" || !asset.playbackId) {
        return { ok: false, error: "This game's video is not ready yet." };
      }
      const duration = asset.durationSeconds ?? 0;
      if (duration < 30) return { ok: false, error: "This video is too short to analyse." };

      const scout = await scoutTeamColorCandidates(
        asset.playbackId,
        duration,
        game.identity.teamColor,
        game.identity.jerseyNumber,
      );

      const STILL_WIDTH = 960;
      const candidates: PlayerScoutCandidate[] = scout.candidates.map((c) => ({
        id: `t${Math.round(c.timestampSeconds)}`,
        timestampSeconds: c.timestampSeconds,
        previewUrl: previewUrl(asset.playbackId!, c.previewStartSeconds, c.previewEndSeconds, 640),
        stillUrl: thumbUrl(asset.playbackId!, c.timestampSeconds, STILL_WIDTH),
        stillWidth: STILL_WIDTH,
      }));

      if (candidates.length === 0) {
        return {
          ok: false,
          error: `We couldn't find clear footage of ${game.identity.teamColor} #${game.identity.jerseyNumber} in this game. Try clearer film.`,
        };
      }
      return { ok: true, data: { candidates } };
    } catch (cause) {
      const err = cause instanceof AiError ? cause : toAiError(cause);
      return { ok: false, error: err.toUserMessage() };
    }
  });
}

// ---------------------------------------------------------------------------
// Start a full-game analysis. One durable job; the heavy work is a self-chaining
// bounded tick that survives the browser closing.
// ---------------------------------------------------------------------------
const startSchema = z.object({
  gameId: z.string().min(1).max(64),
  jerseyNumber: z.string().trim().min(1).max(3),
  teamColor: z.string().trim().min(2).max(24),
  marker: z.string().trim().max(80).optional(),
  /** 2-3 coach-confirmed sightings, at least one with the number readable. */
  confirmedReferences: confirmedReferenceSetSchema,
});

export type StartGameAnalysisInput = z.input<typeof startSchema>;

export async function startGameAnalysis(
  input: StartGameAnalysisInput,
): Promise<ActionResult<GameAnalysisView>> {
  return withAuthedAction(async () => {
    const parsed = startSchema.safeParse(input);
    if (!parsed.success) {
      const first = parsed.error.issues[0]?.message;
      return {
        ok: false,
        error:
          first && /jersey number|reference/i.test(first)
            ? first
            : "Confirm your player on 2–3 clips before analysing.",
      };
    }
    const data = parsed.data;

    try {
      if (!isAiConfigured()) {
        throw new AiError("not-configured", "Analysis is not configured on this server.");
      }
      await requireOwnerWhenSupabase();

      const game = await getGame(data.gameId);
      if (!game) throw new AiError("not-found", "That game could not be found.");
      const asset = game.videoAsset;
      if (!asset || asset.provider !== "mux" || asset.status !== "ready" || !asset.playbackId) {
        throw new AiError("video-not-ready", "This game's video is not ready to analyse.");
      }
      if ((asset.durationSeconds ?? 0) > MAX_GAME_SECONDS) {
        throw new AiError("video-not-ready", "This game is longer than analysis supports.");
      }

      const profile = await getCoachingProfile().catch(() => null);

      // Resume an existing active job for the same target instead of duplicating.
      const latest = await gameAnalysisJobs.latestForGame(data.gameId);
      if (
        latest &&
        (latest.status === "queued" || latest.status === "running") &&
        latest.target.jerseyNumber === data.jerseyNumber &&
        latest.target.teamColor.toLowerCase() === data.teamColor.toLowerCase()
      ) {
        after(() => runChain(latest.id));
        return { ok: true, data: toView(latest) };
      }

      let job: GameAnalysisJob;
      try {
        job = await gameAnalysisJobs.create({
          gameId: data.gameId,
          videoAssetId: asset.assetId,
          playbackId: asset.playbackId,
          durationSeconds: asset.durationSeconds,
          target: {
            jerseyNumber: data.jerseyNumber,
            teamColor: data.teamColor.toLowerCase(),
            marker: data.marker?.trim() || null,
          },
          targetReference: data.confirmedReferences.map((r) => ({
            ...r,
            jerseyColor: r.jerseyColor.toLowerCase(),
          })),
          coachProfileVersion: isProfileComplete(profile) ? COACHING_PROFILE_VERSION : null,
        });
      } catch (cause) {
        if ((cause as { code?: string })?.code === "duplicate") {
          const existing = await gameAnalysisJobs.latestForGame(data.gameId);
          if (existing) {
            after(() => runChain(existing.id));
            return { ok: true, data: toView(existing) };
          }
        }
        throw cause;
      }

      after(() => runChain(job.id));
      return { ok: true, data: toView(job) };
    } catch (cause) {
      const err = cause instanceof AiError ? cause : toAiError(cause);
      return { ok: false, error: err.toUserMessage() };
    }
  });
}

/**
 * Drive the bounded tick to completion, re-scheduling itself after each step so
 * no single continuation runs for more than one stage. Survives the client
 * leaving; a stale chain is picked back up by {@link getGameAnalysisJob}.
 */
async function runChain(jobId: string): Promise<void> {
  try {
    const result = await runAnalysisTick(jobId);
    if (!result.done) {
      after(() => runChain(jobId));
    }
  } catch {
    // A crashed tick leaves the job leased; the next poll reclaims it.
  }
}

// ---------------------------------------------------------------------------
// Poll + refresh recovery.
// ---------------------------------------------------------------------------
export async function getGameAnalysisJob(jobId: string): Promise<ActionResult<GameAnalysisView>> {
  return withAuthedAction(async () => {
    const id = z.string().min(1).max(64).safeParse(jobId);
    if (!id.success) return { ok: false, error: "That analysis could not be found." };
    try {
      const job = await gameAnalysisJobs.get(id.data);
      if (!job) return { ok: false, error: "That analysis could not be found." };

      // Nudge a running job whose worker chain has died (deploy, crash, browser
      // close). The lease inside the tick prevents double processing.
      if (job.status === "queued" || job.status === "running") {
        after(() => runChain(job.id));
      }
      return { ok: true, data: toView(job) };
    } catch (cause) {
      const err = cause instanceof AiError ? cause : toAiError(cause);
      return { ok: false, error: err.toUserMessage() };
    }
  });
}

/** Server-component helper: latest analysis for a game, or null. */
export async function getLatestGameAnalysisForGame(gameId: string): Promise<GameAnalysisView | null> {
  if (!isAiConfigured()) return null;
  try {
    const id = z.string().min(1).max(64).safeParse(gameId);
    if (!id.success) return null;
    const job = await gameAnalysisJobs.latestForGame(id.data);
    return job ? toView(job) : null;
  } catch {
    return null;
  }
}

export async function cancelGameAnalysis(jobId: string): Promise<ActionResult<null>> {
  return withAuthedAction(async () => {
    await requireOwnerWhenSupabase();
    const id = z.string().min(1).max(64).safeParse(jobId);
    if (!id.success) return { ok: false, error: "That analysis could not be found." };
    await gameAnalysisJobs.cancel(id.data);
    return { ok: true, data: null };
  });
}

export async function retryGameAnalysis(jobId: string): Promise<ActionResult<GameAnalysisView>> {
  return withAuthedAction(async () => {
    await requireOwnerWhenSupabase();
    const id = z.string().min(1).max(64).safeParse(jobId);
    if (!id.success) return { ok: false, error: "That analysis could not be found." };
    const prev = await gameAnalysisJobs.get(id.data);
    if (!prev) return { ok: false, error: "That analysis could not be found." };

    const job = await gameAnalysisJobs.update(id.data, {
      status: "queued",
      stage: "queued",
      progress_note: "Getting ready",
      error_code: null,
      error_message_safe: null,
      started_at: null,
      completed_at: null,
      heartbeat_at: null,
      cursor: {},
      attempts: (prev.attempts ?? 0) + 1,
    });
    after(() => runChain(job.id));
    return { ok: true, data: toView(job) };
  });
}
