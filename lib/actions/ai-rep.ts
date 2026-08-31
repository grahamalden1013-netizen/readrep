"use server";

import { z } from "zod";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { AI_ERROR_CODES, AiError, toAiError, type AiErrorCode } from "@/lib/ai/errors";
import { getRepAiProvider } from "@/lib/ai";
import { isAiConfigured } from "@/lib/ai/config";
import {
  MAX_CONCURRENT_JOBS_PER_USER,
  MAX_JOBS_PER_USER_PER_HOUR,
  PROVIDER_TIMEOUT_MS,
} from "@/lib/ai/limits";
import { estimateCost } from "@/lib/ai/cost";
import { PROMPT_VERSION } from "@/lib/ai/prompts";
import { validateAiClip } from "@/lib/ai/clip";
import {
  mapAiResultToStudioForm,
  validateAiRepResult,
  type AiRepResult,
  type StudioFormDraft,
} from "@/lib/ai/schemas";
import { aiJobs, type AiJobPhase, type AiRepJob } from "@/lib/db/ai-jobs";
import { getGame } from "@/lib/store";
import { MuxFrameSource } from "@/lib/video/mux-frame-source";
import { requireOwnerWhenSupabase, withAuthedAction } from "./guard";
import type { ActionResult } from "./result";

const inputSchema = z.object({
  gameId: z.string().min(1).max(64),
  clipStartMs: z.number().int().min(0),
  decisionPauseMs: z.number().int().min(0),
  clipEndMs: z.number().int().min(0),
  /** Ignore any completed result for this exact clip and analyse again. */
  regenerate: z.boolean().optional(),
});

export type DraftRepWithAiInput = z.infer<typeof inputSchema>;

export type AiRepDraftView = {
  jobId: string;
  gameId: string;
  status: AiRepJob["status"];
  phase: AiJobPhase;
  target: { jerseyNumber: string; teamColor: string };
  clip: { clipStartSeconds: number; decisionSeconds: number; clipEndSeconds: number };
  /** completed jobs only */
  result?: AiRepResult;
  usable?: boolean;
  applyAllowed?: boolean;
  gateReasons?: string[];
  warnings?: string[];
  /** present only when applyAllowed */
  formDraft?: StudioFormDraft | null;
  metadata?: {
    provider: string;
    model: string | null;
    modelFallbackUsed: boolean;
    promptVersion: string;
    latencyMs: number | null;
    frameCount: number | null;
    inputTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
    estimatedCostUsd: number | null;
    costIsEstimate: true;
  };
  /** failed jobs only */
  errorCode?: string | null;
  errorMessage?: string | null;
  retryable?: boolean;
  createdAt: string;
  completedAt: string | null;
};

/** A queued/running job with no progress for this long is treated as dead. */
const STALE_JOB_MS = PROVIDER_TIMEOUT_MS + 60_000;

function isStale(job: AiRepJob): boolean {
  if (job.status !== "queued" && job.status !== "running") return false;
  const since = new Date(job.startedAt ?? job.createdAt).getTime();
  return Date.now() - since > STALE_JOB_MS;
}

/** Job row -> client view. Never leaks raw provider data, keys or URLs. */
function toView(job: AiRepJob): AiRepDraftView {
  const base: AiRepDraftView = {
    jobId: job.id,
    gameId: job.gameId,
    status: job.status,
    phase: job.phase,
    target: { jerseyNumber: job.targetJerseyNumber, teamColor: job.targetTeamColor },
    clip: {
      clipStartSeconds: job.clipStartSeconds,
      decisionSeconds: job.decisionSeconds,
      clipEndSeconds: job.clipEndSeconds,
    },
    createdAt: job.createdAt,
    completedAt: job.completedAt,
  };

  if (job.status === "completed" && job.result && typeof job.result === "object") {
    const stored = job.result as {
      result?: AiRepResult;
      usable?: boolean;
      applyAllowed?: boolean;
      gateReasons?: string[];
    };
    const result = stored.result;
    return {
      ...base,
      result,
      usable: stored.usable ?? false,
      applyAllowed: stored.applyAllowed ?? false,
      gateReasons: stored.gateReasons ?? [],
      warnings: job.warnings,
      formDraft: stored.applyAllowed && result ? mapAiResultToStudioForm(result) : null,
      metadata: {
        provider: job.provider,
        model: job.model,
        modelFallbackUsed: job.modelFallbackUsed,
        promptVersion: job.promptVersion,
        latencyMs: job.latencyMs,
        frameCount: job.frameCount,
        inputTokens: job.inputTokens,
        outputTokens: job.outputTokens,
        totalTokens: job.totalTokens,
        estimatedCostUsd: job.estimatedCostUsd,
        costIsEstimate: true,
      },
    };
  }

  if (job.status === "failed") {
    const code = AI_ERROR_CODES.includes(job.errorCode as AiErrorCode)
      ? (job.errorCode as AiErrorCode)
      : null;
    return {
      ...base,
      errorCode: job.errorCode,
      errorMessage: job.errorMessageSafe,
      warnings: job.warnings,
      retryable: code ? new AiError(code, "").retryable : true,
    };
  }

  return base;
}

// ---------------------------------------------------------------------------
// draftRepWithAI — the coach's "Draft with AI" click.
//
// Authenticates, confirms ownership + a ready Mux video, validates the clip,
// rate-limits, dedupes, then creates the durable job and hands the heavy work
// (frames -> OpenAI -> validate -> store) to `after()` so the click returns
// promptly. Studio polls `getAiRepJob(jobId)` for honest phases and the result,
// which also survives a page refresh.
// ---------------------------------------------------------------------------
export async function draftRepWithAI(
  input: DraftRepWithAiInput,
): Promise<ActionResult<AiRepDraftView>> {
  return withAuthedAction(() => draftRepWithAiInner(input));
}

async function draftRepWithAiInner(
  rawInput: DraftRepWithAiInput,
): Promise<ActionResult<AiRepDraftView>> {
  const parsed = inputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, error: "The clip window is not valid." };
  const input = parsed.data;

  try {
    if (!isAiConfigured()) {
      throw new AiError("not-configured", "OPENAI_API_KEY is not set on this server.");
    }
    await requireOwnerWhenSupabase();

    const game = await getGame(input.gameId);
    if (!game) throw new AiError("not-found", "That game could not be found.");
    const asset = game.videoAsset;
    if (!asset || asset.provider !== "mux") {
      throw new AiError("video-not-ready", "This game has no Mux video to analyse.");
    }
    if (asset.status !== "ready" || !asset.playbackId) {
      throw new AiError("video-not-ready", "This game's video is not ready yet.");
    }

    const clip = validateAiClip(
      { clipStartMs: input.clipStartMs, decisionPauseMs: input.decisionPauseMs, clipEndMs: input.clipEndMs },
      asset.durationSeconds,
    );

    // Reuse a completed analysis for the identical clip — no new spend.
    if (!input.regenerate) {
      const existing = await aiJobs.latestCompletedForClip(input.gameId, clip);
      if (existing) return { ok: true, data: toView(existing) };
    }

    // Reclaim a dead job so it cannot wedge the one-at-a-time limit, then gate.
    await aiJobs.abandonStale(new Date(Date.now() - STALE_JOB_MS).toISOString());
    const hourAgoIso = new Date(Date.now() - 3_600_000).toISOString();
    if ((await aiJobs.countSince(hourAgoIso)) >= MAX_JOBS_PER_USER_PER_HOUR) {
      throw new AiError("rate-exceeded", "You've run several analyses recently. Give it a minute.");
    }
    if ((await aiJobs.countActive()) >= MAX_CONCURRENT_JOBS_PER_USER) {
      throw new AiError("duplicate-job", "An analysis is already running. Wait for it to finish.");
    }

    let job: AiRepJob;
    try {
      job = await aiJobs.create({
        gameId: input.gameId,
        videoAssetId: asset.assetId,
        clipStartSeconds: clip.clipStartSeconds,
        decisionSeconds: clip.decisionSeconds,
        clipEndSeconds: clip.clipEndSeconds,
        targetJerseyNumber: game.identity.jerseyNumber,
        targetTeamColor: game.identity.teamColor,
        promptVersion: PROMPT_VERSION,
      });
    } catch (cause) {
      if (cause instanceof AiError && cause.code === "duplicate-job") {
        const done = await aiJobs.latestCompletedForClip(input.gameId, clip);
        if (done) return { ok: true, data: toView(done) };
      }
      throw cause;
    }

    const jobId = job.id;
    const target = {
      jerseyNumber: game.identity.jerseyNumber,
      teamColor: game.identity.teamColor,
      marker: game.identity.marker ?? null,
    };
    const playbackId = asset.playbackId;

    // Heavy work runs after the response is flushed. The job row is the source
    // of truth; the client polls it.
    after(async () => {
      await runAiRepJob(jobId, { gameId: input.gameId, clip, target, playbackId }).catch(() => undefined);
    });

    return { ok: true, data: toView(job) };
  } catch (cause) {
    const err = cause instanceof AiError ? cause : toAiError(cause);
    return { ok: false, error: err.toUserMessage() };
  }
}

type RunContext = {
  gameId: string;
  clip: { clipStartSeconds: number; decisionSeconds: number; clipEndSeconds: number };
  target: { jerseyNumber: string; teamColor: string; marker: string | null };
  playbackId: string;
};

/** The worker: frames -> provider -> validate -> store. Every failure lands as a
 *  safe `markFailed`, never an unhandled rejection or a leaked provider payload. */
async function runAiRepJob(jobId: string, ctx: RunContext): Promise<void> {
  const startedAt = Date.now();
  let frameCount = 0;
  let modelUsed: string | null = null;

  try {
    await aiJobs.markRunning(jobId);

    const frames = await new MuxFrameSource().sampleFrames({
      playbackId: ctx.playbackId,
      clipStartSeconds: ctx.clip.clipStartSeconds,
      decisionSeconds: ctx.clip.decisionSeconds,
      clipEndSeconds: ctx.clip.clipEndSeconds,
    });
    frameCount = frames.length;

    await aiJobs.setPhase(jobId, "studying");
    const outcome = await getRepAiProvider().analyzePossession({
      target: ctx.target,
      clip: ctx.clip,
      frames: frames.map((f) => ({
        timestampSeconds: f.timestampSeconds,
        dataUrl: f.dataUrl,
        byteLength: f.byteLength,
        width: f.width,
        mimeType: f.mimeType,
      })),
    });
    modelUsed = outcome.metadata.model;

    await aiJobs.setPhase(jobId, "building-draft");
    const validation = validateAiRepResult(outcome.raw, ctx.clip);
    const cost = estimateCost(outcome.metadata.model, outcome.metadata.usage);

    await aiJobs.markCompleted(jobId, {
      result: {
        result: validation.result,
        usable: validation.usable,
        applyAllowed: validation.applyAllowed,
        gateReasons: validation.gateReasons,
      },
      warnings: validation.warnings,
      model: outcome.metadata.model,
      modelFallbackUsed: outcome.metadata.modelFallbackUsed,
      frameCount,
      inputTokens: outcome.metadata.usage.inputTokens,
      outputTokens: outcome.metadata.usage.outputTokens,
      totalTokens: outcome.metadata.usage.totalTokens,
      estimatedCostUsd: cost.usd,
      latencyMs: outcome.metadata.latencyMs,
    });
  } catch (cause) {
    const err = toAiError(cause);
    await aiJobs
      .markFailed(jobId, {
        errorCode: err.code,
        errorMessageSafe: err.toUserMessage(),
        model: modelUsed,
        frameCount: frameCount || null,
        latencyMs: Date.now() - startedAt,
      })
      .catch(() => undefined);
  } finally {
    revalidatePath(`/studio/${ctx.gameId}`);
  }
}

/**
 * Server-Component helper: the most recent analysis for this game, as a view,
 * so Studio can restore AI state after a refresh. Null when AI is off or nothing
 * has been run.
 */
export async function getLatestAiRepJobForGame(gameId: string): Promise<AiRepDraftView | null> {
  if (!isAiConfigured()) return null;
  try {
    const parsed = z.string().min(1).max(64).safeParse(gameId);
    if (!parsed.success) return null;
    const job = await aiJobs.latestForGame(parsed.data);
    if (!job) return null;
    if (isStale(job)) {
      return toView({
        ...job,
        status: "failed",
        phase: "failed",
        errorCode: "timeout",
        errorMessageSafe: "The analysis stalled before it finished. Retry.",
      });
    }
    return toView(job);
  } catch {
    return null;
  }
}

/**
 * Poll target + refresh recovery. Current view of a job the caller owns.
 * Ownership is enforced by row-level security on the job table — this is called
 * every few seconds while an analysis runs, so it deliberately does not add a
 * second `auth.getUser()` round-trip on top of what the proxy already does.
 */
export async function getAiRepJob(jobId: string): Promise<ActionResult<AiRepDraftView>> {
  return withAuthedAction(async () => {
    const id = z.string().min(1).max(64).safeParse(jobId);
    if (!id.success) return { ok: false, error: "That analysis could not be found." };
    try {
      const job = await aiJobs.get(id.data);
      if (!job) return { ok: false, error: "That analysis could not be found." };
      if (isStale(job)) {
        const failed = await aiJobs
          .markFailed(job.id, {
            errorCode: "timeout",
            errorMessageSafe: "The analysis stalled before it finished. Retry.",
          })
          .catch(() => null);
        return { ok: true, data: toView(failed ?? job) };
      }
      return { ok: true, data: toView(job) };
    } catch (cause) {
      const err = cause instanceof AiError ? cause : toAiError(cause);
      return { ok: false, error: err.toUserMessage() };
    }
  });
}

