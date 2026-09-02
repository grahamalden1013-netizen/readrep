import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseEnv } from "@/lib/env";
import { createClient, requireUserId } from "@/lib/supabase/server";
import type { ConfirmedReference } from "@/lib/ai/game-analysis/reference";

export type GameJobStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
export type GameJobStage =
  | "queued"
  | "preparing"
  | "locating-player"
  | "reviewing-possessions"
  | "finding-decisions"
  | "building-reps"
  | "ranking"
  | "done"
  | "failed";

export type GameAnalysisJob = {
  id: string;
  ownerId: string;
  gameId: string;
  videoAssetId: string | null;
  playbackId: string | null;
  target: { jerseyNumber: string; teamColor: string; marker: string | null };
  targetReference: ConfirmedReference[];
  status: GameJobStatus;
  stage: GameJobStage;
  progressNote: string | null;
  cursor: Record<string, unknown>;
  durationSeconds: number | null;
  coachProfileVersion: number | null;
  discoveryModel: string | null;
  reasoningModel: string | null;
  promptVersion: string | null;
  liveSpanCount: number | null;
  possessionCount: number | null;
  analyzedCount: number | null;
  candidateCount: number | null;
  rejectedCount: number | null;
  approvedCount: number | null;
  discoveryCalls: number | null;
  reasoningCalls: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  estimatedCostUsd: number | null;
  attempts: number;
  errorCode: string | null;
  errorMessageSafe: string | null;
  heartbeatAt: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
};

const JOB_SELECT =
  "id, owner_id, game_id, video_asset_id, playback_id, target_jersey_number, target_team_color, target_marker, target_reference, status, stage, progress_note, cursor, duration_seconds, coach_profile_version, discovery_model, reasoning_model, prompt_version, live_span_count, possession_count, analyzed_count, candidate_count, rejected_count, approved_count, discovery_calls, reasoning_calls, input_tokens, output_tokens, estimated_cost_usd, attempts, error_code, error_message_safe, heartbeat_at, created_at, started_at, completed_at, updated_at";

/* eslint-disable @typescript-eslint/no-explicit-any */
function toJob(row: any): GameAnalysisJob {
  return {
    id: row.id,
    ownerId: row.owner_id,
    gameId: row.game_id,
    videoAssetId: row.video_asset_id,
    playbackId: row.playback_id,
    target: { jerseyNumber: row.target_jersey_number, teamColor: row.target_team_color, marker: row.target_marker },
    targetReference: Array.isArray(row.target_reference) ? row.target_reference : [],
    status: row.status,
    stage: row.stage,
    progressNote: row.progress_note,
    cursor: (row.cursor as Record<string, unknown>) ?? {},
    durationSeconds: row.duration_seconds,
    coachProfileVersion: row.coach_profile_version,
    discoveryModel: row.discovery_model,
    reasoningModel: row.reasoning_model,
    promptVersion: row.prompt_version,
    liveSpanCount: row.live_span_count,
    possessionCount: row.possession_count,
    analyzedCount: row.analyzed_count,
    candidateCount: row.candidate_count,
    rejectedCount: row.rejected_count,
    approvedCount: row.approved_count,
    discoveryCalls: row.discovery_calls,
    reasoningCalls: row.reasoning_calls,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    estimatedCostUsd: row.estimated_cost_usd,
    attempts: row.attempts,
    errorCode: row.error_code,
    errorMessageSafe: row.error_message_safe,
    heartbeatAt: row.heartbeat_at,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

async function client(): Promise<SupabaseClient> {
  if (!supabaseEnv) throw new Error("Supabase is not configured.");
  const c = await createClient();
  if (!c) throw new Error("Supabase client unavailable.");
  return c as unknown as SupabaseClient;
}

export const gameAnalysisJobs = {
  async create(input: {
    gameId: string;
    videoAssetId: string | null;
    playbackId: string;
    durationSeconds: number | null;
    target: { jerseyNumber: string; teamColor: string; marker: string | null };
    targetReference: ConfirmedReference[];
    coachProfileVersion: number | null;
  }): Promise<GameAnalysisJob> {
    const c = await client();
    const ownerId = await requireUserId();
    const { data, error } = await c
      .from("ai_game_analysis_jobs")
      .insert({
        owner_id: ownerId,
        game_id: input.gameId,
        video_asset_id: input.videoAssetId,
        playback_id: input.playbackId,
        duration_seconds: input.durationSeconds,
        target_jersey_number: input.target.jerseyNumber,
        target_team_color: input.target.teamColor,
        target_marker: input.target.marker,
        target_reference: input.targetReference,
        coach_profile_version: input.coachProfileVersion,
        status: "queued",
        stage: "queued",
      })
      .select(JOB_SELECT)
      .single();
    if (error) {
      if (error.code === "23505") throw Object.assign(new Error("active"), { code: "duplicate" });
      throw new Error("Could not create the analysis job.");
    }
    return toJob(data);
  },

  async get(id: string): Promise<GameAnalysisJob | null> {
    const c = await client();
    const { data } = await c.from("ai_game_analysis_jobs").select(JOB_SELECT).eq("id", id).maybeSingle();
    return data ? toJob(data) : null;
  },

  async latestForGame(gameId: string): Promise<GameAnalysisJob | null> {
    const c = await client();
    const { data } = await c
      .from("ai_game_analysis_jobs")
      .select(JOB_SELECT)
      .eq("game_id", gameId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data ? toJob(data) : null;
  },

  async update(id: string, patch: Record<string, unknown>): Promise<GameAnalysisJob> {
    const c = await client();
    const { data, error } = await c
      .from("ai_game_analysis_jobs")
      .update(patch)
      .eq("id", id)
      .select(JOB_SELECT)
      .single();
    if (error) throw new Error("Could not update the analysis job.");
    return toJob(data);
  },

  async heartbeat(id: string): Promise<void> {
    const c = await client();
    await c.from("ai_game_analysis_jobs").update({ heartbeat_at: new Date().toISOString() }).eq("id", id);
  },

  /** Record a clean, user-safe failure. Never stores raw provider detail. */
  async markFailedSafe(id: string, errorCode: string, errorMessageSafe: string): Promise<void> {
    const c = await client();
    await c
      .from("ai_game_analysis_jobs")
      .update({
        status: "failed",
        stage: "failed",
        completed_at: new Date().toISOString(),
        error_code: errorCode.slice(0, 64),
        error_message_safe: errorMessageSafe.slice(0, 400),
      })
      .eq("id", id)
      .in("status", ["queued", "running"]);
  },

  async cancel(id: string): Promise<void> {
    const c = await client();
    await c
      .from("ai_game_analysis_jobs")
      .update({ status: "cancelled", stage: "failed", completed_at: new Date().toISOString() })
      .eq("id", id)
      .in("status", ["queued", "running"]);
  },

  /**
   * Optimistic single-worker lease. Bumps `heartbeat_at` only when the job is
   * queued/running and its last heartbeat is stale (or never set). Returns the
   * fresh job when the lease is acquired, else null — a second concurrent tick
   * simply backs off, so a window is never analysed twice.
   */
  async lease(id: string, staleMs: number): Promise<GameAnalysisJob | null> {
    const c = await client();
    const cutoff = new Date(Date.now() - staleMs).toISOString();
    const { data, error } = await c
      .from("ai_game_analysis_jobs")
      .update({ heartbeat_at: new Date().toISOString() })
      .eq("id", id)
      .in("status", ["queued", "running"])
      .or(`heartbeat_at.is.null,heartbeat_at.lt.${cutoff}`)
      .select(JOB_SELECT);
    if (error || !data || data.length === 0) return null;
    return toJob(data[0]);
  },

  async countActiveForOwner(): Promise<number> {
    const c = await client();
    const { count } = await c
      .from("ai_game_analysis_jobs")
      .select("id", { count: "exact", head: true })
      .in("status", ["queued", "running"]);
    return count ?? 0;
  },
};

// --- candidate reps -----------------------------------------------------

export type CandidateStatus = "pending_review" | "approved" | "edited" | "rejected" | "needs_attention";

export type CandidateRepRow = {
  id: string;
  analysisJobId: string;
  gameId: string;
  clipStartSeconds: number;
  decisionSeconds: number;
  clipEndSeconds: number;
  title: string | null;
  skillCategory: string | null;
  difficulty: "easy" | "medium" | "hard" | null;
  situation: string | null;
  prompt: string | null;
  answerChoices: { id: string; text: string }[];
  bestReadChoiceId: string | null;
  actualDecisionChoiceId: string | null;
  actualDecision: string | null;
  outcome: string | null;
  coachingExplanation: string | null;
  visibleEvidence: { timestampSeconds: number; observation: string }[];
  basketballInferences: { statement: string; confidence: number }[];
  coachPreferenceBasis: { questionId: string; influence: string }[];
  involvement: string | null;
  uncertainty: string[];
  playerIdConfidence: number | null;
  decisionConfidence: number | null;
  teachingValueScore: number | null;
  rank: number | null;
  status: CandidateStatus;
  rejectionReason: string | null;
  publishedRepId: string | null;
  targetJerseyNumber: string;
  targetTeamColor: string;
  /** Human basketball-quality review verdicts (never change the candidate content). */
  reviewPlayerVerdict: "correct" | "wrong" | null;
  reviewDecisionVerdict: "real" | "not-meaningful" | null;
  reviewBadPause: boolean;
  reviewNotes: string | null;
  // --- strict-decision (prompt v2) evidence ---
  possessionSummary: string | null;
  actualAction: string | null;
  plausibleAlternatives: { action: string; visibleEvidence: string }[];
  whyThisIsNotRoutine: string | null;
  whyThePauseIsBeforeCommitment: string | null;
};

export type CandidateReviewEval = {
  playerVerdict?: "correct" | "wrong" | null;
  decisionVerdict?: "real" | "not-meaningful" | null;
  badPause?: boolean;
  notes?: string | null;
};

const CAND_SELECT =
  "id, analysis_job_id, game_id, clip_start_seconds, decision_seconds, clip_end_seconds, title, skill_category, difficulty, situation, prompt, answer_choices, best_read_choice_id, actual_decision_choice_id, actual_decision, outcome, coaching_explanation, visible_evidence, basketball_inferences, coach_preference_basis, involvement, uncertainty, player_identification_confidence, decision_confidence, teaching_value_score, rank, status, rejection_reason, published_rep_id, target_jersey_number, target_team_color, review_player_verdict, review_decision_verdict, review_bad_pause, review_notes, possession_summary, actual_action, plausible_alternatives, why_not_routine, why_pause_before_commit";

const CHOICE_LETTERS = ["A", "B", "C", "D"];

/**
 * Read-time migration: older drafts stored model-invented choice ids (which
 * could exceed 8 chars). Re-key them to A/B/C/D by position and remap the
 * best-read / actual-decision pointers, so the review UI and re-ranking always
 * see clean ids regardless of when the row was written.
 */
function normalizeChoices(raw: unknown, bestId: unknown, actualId: unknown) {
  const list: { id: string; text: string }[] = Array.isArray(raw)
    ? raw.filter((c) => c && typeof c.text === "string").map((c) => ({ id: String(c.id ?? ""), text: c.text }))
    : [];
  const alreadyClean = list.every((c, i) => c.id === CHOICE_LETTERS[i]);
  if (alreadyClean) {
    return {
      answerChoices: list,
      bestReadChoiceId: typeof bestId === "string" ? bestId : null,
      actualDecisionChoiceId: typeof actualId === "string" ? actualId : null,
    };
  }
  const oldToNew = new Map(list.map((c, i) => [c.id, CHOICE_LETTERS[i]]));
  return {
    answerChoices: list.map((c, i) => ({ id: CHOICE_LETTERS[i], text: c.text })),
    bestReadChoiceId: (typeof bestId === "string" && oldToNew.get(bestId)) || null,
    actualDecisionChoiceId: (typeof actualId === "string" && oldToNew.get(actualId)) || null,
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function toCandidate(row: any): CandidateRepRow {
  const choices = normalizeChoices(row.answer_choices, row.best_read_choice_id, row.actual_decision_choice_id);
  return {
    id: row.id,
    analysisJobId: row.analysis_job_id,
    gameId: row.game_id,
    clipStartSeconds: row.clip_start_seconds,
    decisionSeconds: row.decision_seconds,
    clipEndSeconds: row.clip_end_seconds,
    title: row.title,
    skillCategory: row.skill_category,
    difficulty: row.difficulty,
    situation: row.situation,
    prompt: row.prompt,
    answerChoices: choices.answerChoices,
    bestReadChoiceId: choices.bestReadChoiceId,
    actualDecisionChoiceId: choices.actualDecisionChoiceId,
    actualDecision: row.actual_decision,
    outcome: row.outcome,
    coachingExplanation: row.coaching_explanation,
    visibleEvidence: Array.isArray(row.visible_evidence) ? row.visible_evidence : [],
    basketballInferences: Array.isArray(row.basketball_inferences) ? row.basketball_inferences : [],
    coachPreferenceBasis: Array.isArray(row.coach_preference_basis) ? row.coach_preference_basis : [],
    involvement: row.involvement,
    uncertainty: Array.isArray(row.uncertainty) ? row.uncertainty : [],
    playerIdConfidence: row.player_identification_confidence,
    decisionConfidence: row.decision_confidence,
    teachingValueScore: row.teaching_value_score,
    rank: row.rank,
    status: row.status,
    rejectionReason: row.rejection_reason,
    publishedRepId: row.published_rep_id,
    targetJerseyNumber: row.target_jersey_number,
    targetTeamColor: row.target_team_color,
    reviewPlayerVerdict: row.review_player_verdict ?? null,
    reviewDecisionVerdict: row.review_decision_verdict ?? null,
    reviewBadPause: row.review_bad_pause ?? false,
    reviewNotes: row.review_notes ?? null,
    possessionSummary: row.possession_summary ?? null,
    actualAction: row.actual_action ?? null,
    plausibleAlternatives: Array.isArray(row.plausible_alternatives) ? row.plausible_alternatives : [],
    whyThisIsNotRoutine: row.why_not_routine ?? null,
    whyThePauseIsBeforeCommitment: row.why_pause_before_commit ?? null,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export const candidateReps = {
  async insert(rows: Record<string, unknown>[]): Promise<void> {
    if (rows.length === 0) return;
    const c = await client();
    const { error } = await c.from("ai_candidate_reps").insert(rows);
    if (error) throw new Error("Could not save candidate reps.");
  },

  async listForJob(jobId: string): Promise<CandidateRepRow[]> {
    const c = await client();
    const { data } = await c
      .from("ai_candidate_reps")
      .select(CAND_SELECT)
      .eq("analysis_job_id", jobId)
      .order("rank", { ascending: true, nullsFirst: false });
    return (data ?? []).map(toCandidate);
  },

  async listPendingForJob(jobId: string): Promise<CandidateRepRow[]> {
    const c = await client();
    const { data } = await c
      .from("ai_candidate_reps")
      .select(CAND_SELECT)
      .eq("analysis_job_id", jobId)
      .in("status", ["pending_review", "needs_attention"])
      .order("rank", { ascending: true, nullsFirst: false });
    return (data ?? []).map(toCandidate);
  },

  async get(id: string): Promise<CandidateRepRow | null> {
    const c = await client();
    const { data } = await c.from("ai_candidate_reps").select(CAND_SELECT).eq("id", id).maybeSingle();
    return data ? toCandidate(data) : null;
  },

  async update(id: string, patch: Record<string, unknown>): Promise<CandidateRepRow> {
    const c = await client();
    const { data, error } = await c.from("ai_candidate_reps").update(patch).eq("id", id).select(CAND_SELECT).single();
    if (error) throw new Error("Could not update the candidate.");
    return toCandidate(data);
  },

  async setRank(id: string, rank: number, status: CandidateStatus): Promise<void> {
    const c = await client();
    await c.from("ai_candidate_reps").update({ rank, status }).eq("id", id);
  },

  /** Store the coach's review verdicts. Never touches candidate content or status. */
  async setEval(id: string, e: CandidateReviewEval): Promise<CandidateRepRow> {
    const c = await client();
    const patch: Record<string, unknown> = { reviewed_at: new Date().toISOString() };
    if ("playerVerdict" in e) patch.review_player_verdict = e.playerVerdict ?? null;
    if ("decisionVerdict" in e) patch.review_decision_verdict = e.decisionVerdict ?? null;
    if ("badPause" in e) patch.review_bad_pause = Boolean(e.badPause);
    if ("notes" in e) patch.review_notes = e.notes?.slice(0, 2000) ?? null;
    const { data, error } = await c
      .from("ai_candidate_reps")
      .update(patch)
      .eq("id", id)
      .select(CAND_SELECT)
      .single();
    if (error) throw new Error("Could not save the review.");
    return toCandidate(data);
  },
};
