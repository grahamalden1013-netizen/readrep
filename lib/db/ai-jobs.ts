import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AiError } from "@/lib/ai/errors";
import type { AiErrorCode } from "@/lib/ai/errors";
import { createClient, requireUserId } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/env";

export type AiJobStatus = "queued" | "running" | "completed" | "failed";
export type AiJobPhase =
  | "queued"
  | "preparing-frames"
  | "studying"
  | "building-draft"
  | "done"
  | "failed";

export type AiRepJob = {
  id: string;
  gameId: string;
  videoAssetId: string | null;
  status: AiJobStatus;
  phase: AiJobPhase;
  clipStartSeconds: number;
  decisionSeconds: number;
  clipEndSeconds: number;
  targetJerseyNumber: string;
  targetTeamColor: string;
  provider: string;
  model: string | null;
  modelFallbackUsed: boolean;
  promptVersion: string;
  /** Validated + gated result, or null. Shape from `lib/ai/schemas`. */
  result: unknown;
  warnings: string[];
  errorCode: string | null;
  errorMessageSafe: string | null;
  frameCount: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  estimatedCostUsd: number | null;
  latencyMs: number | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
};

type Row = {
  id: string;
  owner_id: string;
  game_id: string;
  video_asset_id: string | null;
  status: AiJobStatus;
  phase: AiJobPhase;
  clip_start_seconds: number;
  decision_seconds: number;
  clip_end_seconds: number;
  target_jersey_number: string;
  target_team_color: string;
  provider: string;
  model: string | null;
  model_fallback_used: boolean;
  prompt_version: string;
  result_json: unknown;
  warnings_json: unknown;
  error_code: string | null;
  error_message_safe: string | null;
  frame_count: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  estimated_cost_usd: number | null;
  latency_ms: number | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
};

const SELECT =
  "id, game_id, video_asset_id, status, phase, clip_start_seconds, decision_seconds, clip_end_seconds, target_jersey_number, target_team_color, provider, model, model_fallback_used, prompt_version, result_json, warnings_json, error_code, error_message_safe, frame_count, input_tokens, output_tokens, total_tokens, estimated_cost_usd, latency_ms, created_at, started_at, completed_at, updated_at";

function toJob(row: Row): AiRepJob {
  return {
    id: row.id,
    gameId: row.game_id,
    videoAssetId: row.video_asset_id,
    status: row.status,
    phase: row.phase,
    clipStartSeconds: row.clip_start_seconds,
    decisionSeconds: row.decision_seconds,
    clipEndSeconds: row.clip_end_seconds,
    targetJerseyNumber: row.target_jersey_number,
    targetTeamColor: row.target_team_color,
    provider: row.provider,
    model: row.model,
    modelFallbackUsed: row.model_fallback_used,
    promptVersion: row.prompt_version,
    result: row.result_json ?? null,
    warnings: Array.isArray(row.warnings_json) ? (row.warnings_json as string[]) : [],
    errorCode: row.error_code,
    errorMessageSafe: row.error_message_safe,
    frameCount: row.frame_count,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    totalTokens: row.total_tokens,
    estimatedCostUsd: row.estimated_cost_usd,
    latencyMs: row.latency_ms,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Read/RLS-scoped access: no extra `auth.getUser()`. Row-level security on
 * `ai_rep_analysis_jobs` already restricts every row to `owner_id = auth.uid()`
 * via the session cookie the client carries, so a signed-out or wrong-account
 * caller simply sees nothing.
 */
async function db(): Promise<{ client: SupabaseClient }> {
  if (!supabaseEnv) {
    throw new AiError("not-configured", "AI drafting needs Supabase configured for durable jobs.");
  }
  const client = await createClient();
  if (!client) throw new AiError("not-configured", "Supabase client unavailable.");
  return { client: client as unknown as SupabaseClient };
}

/** Write path that stamps `owner_id`: needs the authenticated user id once. */
async function dbWithOwner(): Promise<{ client: SupabaseClient; ownerId: string }> {
  const { client } = await db();
  const ownerId = await requireUserId();
  return { client, ownerId };
}

export type CreateAiJobInput = {
  gameId: string;
  videoAssetId: string | null;
  clipStartSeconds: number;
  decisionSeconds: number;
  clipEndSeconds: number;
  targetJerseyNumber: string;
  targetTeamColor: string;
  promptVersion: string;
};

export const aiJobs = {
  /** Inserts a queued job. A concurrent job for the identical clip fails with `duplicate-job`. */
  async create(input: CreateAiJobInput): Promise<AiRepJob> {
    const { client, ownerId } = await dbWithOwner();
    const { data, error } = await client
      .from("ai_rep_analysis_jobs")
      .insert({
        owner_id: ownerId,
        game_id: input.gameId,
        video_asset_id: input.videoAssetId,
        status: "queued",
        clip_start_seconds: input.clipStartSeconds,
        decision_seconds: input.decisionSeconds,
        clip_end_seconds: input.clipEndSeconds,
        target_jersey_number: input.targetJerseyNumber,
        target_team_color: input.targetTeamColor,
        provider: "openai",
        prompt_version: input.promptVersion,
      })
      .select(SELECT)
      .single<Row>();

    if (error) {
      if (error.code === "23505") {
        throw new AiError("duplicate-job", "An analysis for this exact clip is already running.");
      }
      throw new AiError("storage-failed", "Could not create the analysis job.");
    }
    return toJob(data);
  },

  async get(id: string): Promise<AiRepJob | null> {
    const { client } = await db();
    const { data, error } = await client
      .from("ai_rep_analysis_jobs")
      .select(SELECT)
      .eq("id", id)
      .maybeSingle<Row>();
    if (error) throw new AiError("storage-failed", "Could not load the analysis job.");
    return data ? toJob(data) : null;
  },

  async markRunning(id: string): Promise<void> {
    const { client } = await db();
    const { error } = await client
      .from("ai_rep_analysis_jobs")
      .update({ status: "running", phase: "preparing-frames", started_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "queued");
    if (error) throw new AiError("storage-failed", "Could not start the analysis job.");
  },

  async setPhase(id: string, phase: AiJobPhase): Promise<void> {
    const { client } = await db();
    await client.from("ai_rep_analysis_jobs").update({ phase }).eq("id", id).eq("status", "running");
  },

  async markCompleted(
    id: string,
    patch: {
      result: unknown;
      warnings: string[];
      model: string;
      modelFallbackUsed: boolean;
      frameCount: number;
      inputTokens: number | null;
      outputTokens: number | null;
      totalTokens: number | null;
      estimatedCostUsd: number | null;
      latencyMs: number;
    },
  ): Promise<AiRepJob> {
    const { client } = await db();
    const { data, error } = await client
      .from("ai_rep_analysis_jobs")
      .update({
        status: "completed",
        phase: "done",
        completed_at: new Date().toISOString(),
        result_json: patch.result,
        warnings_json: patch.warnings,
        model: patch.model,
        model_fallback_used: patch.modelFallbackUsed,
        frame_count: patch.frameCount,
        input_tokens: patch.inputTokens,
        output_tokens: patch.outputTokens,
        total_tokens: patch.totalTokens,
        estimated_cost_usd: patch.estimatedCostUsd,
        latency_ms: patch.latencyMs,
        error_code: null,
        error_message_safe: null,
      })
      .eq("id", id)
      .select(SELECT)
      .single<Row>();
    if (error) throw new AiError("storage-failed", "Could not save the analysis result.");
    return toJob(data);
  },

  async markFailed(
    id: string,
    patch: {
      errorCode: AiErrorCode;
      errorMessageSafe: string;
      warnings?: string[];
      model?: string | null;
      frameCount?: number | null;
      latencyMs?: number | null;
    },
  ): Promise<AiRepJob> {
    const { client } = await db();
    const { data, error } = await client
      .from("ai_rep_analysis_jobs")
      .update({
        status: "failed",
        phase: "failed",
        completed_at: new Date().toISOString(),
        error_code: patch.errorCode,
        error_message_safe: patch.errorMessageSafe,
        warnings_json: patch.warnings ?? [],
        model: patch.model ?? null,
        frame_count: patch.frameCount ?? null,
        latency_ms: patch.latencyMs ?? null,
      })
      .eq("id", id)
      .select(SELECT)
      .single<Row>();
    if (error) throw new AiError("storage-failed", "Could not record the analysis failure.");
    return toJob(data);
  },

  /** Most recent job of any status for a game — used to recover state after a refresh. */
  async latestForGame(gameId: string): Promise<AiRepJob | null> {
    const { client } = await db();
    const { data, error } = await client
      .from("ai_rep_analysis_jobs")
      .select(SELECT)
      .eq("game_id", gameId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<Row>();
    if (error) throw new AiError("storage-failed", "Could not load recent analyses.");
    return data ? toJob(data) : null;
  },

  /** Most recent completed job for the exact clip, so a repeat click can reuse it. */
  async latestCompletedForClip(
    gameId: string,
    clip: { clipStartSeconds: number; decisionSeconds: number; clipEndSeconds: number },
  ): Promise<AiRepJob | null> {
    const { client } = await db();
    const { data, error } = await client
      .from("ai_rep_analysis_jobs")
      .select(SELECT)
      .eq("game_id", gameId)
      .eq("status", "completed")
      .eq("clip_start_seconds", clip.clipStartSeconds)
      .eq("decision_seconds", clip.decisionSeconds)
      .eq("clip_end_seconds", clip.clipEndSeconds)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<Row>();
    if (error) throw new AiError("storage-failed", "Could not check for an existing analysis.");
    return data ? toJob(data) : null;
  },

  /** Count of the caller's jobs since `sinceIso`, for rate limiting. */
  async countSince(sinceIso: string): Promise<number> {
    const { client } = await db();
    const { count, error } = await client
      .from("ai_rep_analysis_jobs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sinceIso);
    if (error) throw new AiError("storage-failed", "Could not check the analysis rate limit.");
    return count ?? 0;
  },

  async countActive(): Promise<number> {
    const { client } = await db();
    const { count, error } = await client
      .from("ai_rep_analysis_jobs")
      .select("id", { count: "exact", head: true })
      .in("status", ["queued", "running"]);
    if (error) throw new AiError("storage-failed", "Could not check for a running analysis.");
    return count ?? 0;
  },

  /**
   * Fail any of the caller's queued/running jobs whose start is older than
   * `staleBeforeIso` — a dead process (deploy, crash) otherwise blocks the
   * one-at-a-time concurrency limit forever. Returns how many were reclaimed.
   */
  async abandonStale(staleBeforeIso: string): Promise<number> {
    const { client } = await db();
    const { data, error } = await client
      .from("ai_rep_analysis_jobs")
      .update({
        status: "failed",
        phase: "failed",
        completed_at: new Date().toISOString(),
        error_code: "timeout",
        error_message_safe: "The analysis stalled before it finished. Retry.",
      })
      .in("status", ["queued", "running"])
      .lt("created_at", staleBeforeIso)
      .select("id");
    if (error) throw new AiError("storage-failed", "Could not clear a stalled analysis.");
    return data?.length ?? 0;
  },
};
