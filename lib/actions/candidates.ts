"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getBackend } from "@/lib/db";
import { candidateReps, gameAnalysisJobs, type CandidateRepRow } from "@/lib/db/game-analysis";
import { validateRepDraft } from "@/lib/reps/draft";
import { MIN_POST_DECISION_SECONDS, MIN_PRE_DECISION_SECONDS } from "@/lib/ai/game-analysis/limits";
import { summariseReview, type ReviewSummary } from "@/lib/reps/review-summary";
import { SKILL_CATEGORIES, type Rep } from "@/lib/reps/schema";
import { getGame } from "@/lib/store";
import { getVideoDurationMs } from "@/lib/video/playback";
import { startSessionForGame } from "./session";
import { requireOwnerWhenSupabase, withAuthedAction } from "./guard";
import type { ActionResult } from "./result";

const idSchema = z.string().min(1).max(64);

/**
 * The pre/post-decision context invariant. Checked at every gate: the model's
 * own validation, coach approval, coach edit, and session publish. Returns a
 * short reason code, or null when the clip is fine.
 */
function clipContextIssue(start: number, decision: number, end: number): string | null {
  if (!(start < decision && decision < end)) return "clip-timing-out-of-order";
  if (decision - start < MIN_PRE_DECISION_SECONDS) return "insufficient-pre-decision-context";
  if (end - decision < MIN_POST_DECISION_SECONDS) return "insufficient-post-decision-footage";
  return null;
}

// ---------------------------------------------------------------------------
// Review views. This is the COACH — the recommended answer is theirs to see.
// The "why" block is collapsed in the UI; it never reaches the player.
// ---------------------------------------------------------------------------
export type CandidateReviewView = {
  id: string;
  jobId: string;
  gameId: string;
  rank: number | null;
  status: CandidateRepRow["status"];
  target: { jerseyNumber: string; teamColor: string };
  clip: { startSeconds: number; decisionSeconds: number; endSeconds: number };
  title: string;
  skillCategory: string | null;
  difficulty: "easy" | "medium" | "hard" | null;
  situation: string;
  prompt: string;
  choices: { id: string; text: string }[];
  recommendedChoiceId: string | null;
  actualChoiceId: string | null;
  actualDecision: string | null;
  outcome: string | null;
  explanation: string | null;
  why: {
    involvement: string | null;
    possessionSummary: string | null;
    actualAction: string | null;
    plausibleAlternatives: { action: string; visibleEvidence: string }[];
    whyNotRoutine: string | null;
    whyPauseBeforeCommitment: string | null;
    evidence: { timestampSeconds: number; observation: string }[];
    inferences: { statement: string; confidence: number }[];
    coachPreferences: { questionId: string; influence: string }[];
    uncertainty: string[];
    playerIdConfidence: number | null;
    decisionConfidence: number | null;
  };
  review: {
    playerVerdict: "correct" | "wrong" | null;
    decisionVerdict: "real" | "not-meaningful" | null;
    badPause: boolean;
    notes: string | null;
  };
};

function toReviewView(row: CandidateRepRow, jobId: string): CandidateReviewView {
  return {
    id: row.id,
    jobId,
    gameId: row.gameId,
    rank: row.rank,
    status: row.status,
    target: { jerseyNumber: row.targetJerseyNumber, teamColor: row.targetTeamColor },
    clip: {
      startSeconds: row.clipStartSeconds,
      decisionSeconds: row.decisionSeconds,
      endSeconds: row.clipEndSeconds,
    },
    title: row.title ?? "Decision moment",
    skillCategory: row.skillCategory,
    difficulty: row.difficulty,
    situation: row.situation ?? "",
    prompt: row.prompt ?? "",
    choices: row.answerChoices,
    recommendedChoiceId: row.bestReadChoiceId,
    actualChoiceId: row.actualDecisionChoiceId,
    actualDecision: row.actualDecision,
    outcome: row.outcome,
    explanation: row.coachingExplanation,
    why: {
      involvement: row.involvement,
      possessionSummary: row.possessionSummary,
      actualAction: row.actualAction,
      plausibleAlternatives: row.plausibleAlternatives,
      whyNotRoutine: row.whyThisIsNotRoutine,
      whyPauseBeforeCommitment: row.whyThePauseIsBeforeCommitment,
      evidence: row.visibleEvidence,
      inferences: row.basketballInferences,
      coachPreferences: row.coachPreferenceBasis,
      uncertainty: row.uncertainty,
      playerIdConfidence: row.playerIdConfidence,
      decisionConfidence: row.decisionConfidence,
    },
    review: {
      playerVerdict: row.reviewPlayerVerdict,
      decisionVerdict: row.reviewDecisionVerdict,
      badPause: row.reviewBadPause,
      notes: row.reviewNotes,
    },
  };
}

export async function listCandidatesForReview(
  jobId: string,
): Promise<
  ActionResult<{ candidates: CandidateReviewView[]; approved: number; total: number; summary: ReviewSummary }>
> {
  return withAuthedAction(async () => {
    const id = idSchema.safeParse(jobId);
    if (!id.success) return { ok: false, error: "That review could not be found." };
    const rows = await candidateReps.listForJob(id.data);
    const visible = rows.filter((r) => r.status !== "rejected");
    return {
      ok: true,
      data: {
        candidates: visible.map((r) => toReviewView(r, id.data)),
        approved: rows.filter((r) => r.status === "approved" || r.status === "edited").length,
        total: visible.length,
        summary: summariseReview(rows),
      },
    };
  });
}

const evalSchema = z.object({
  candidateId: idSchema,
  playerVerdict: z.enum(["correct", "wrong"]).nullable().optional(),
  decisionVerdict: z.enum(["real", "not-meaningful"]).nullable().optional(),
  badPause: z.boolean().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

/** Save one of the five review controls / notes. Does not change status or content. */
export async function setCandidateEval(input: z.input<typeof evalSchema>): Promise<ActionResult<null>> {
  return withAuthedAction(async () => {
    await requireOwnerWhenSupabase();
    const parsed = evalSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "That review input was not recognised." };
    const { candidateId, ...e } = parsed.data;
    const row = await candidateReps.get(candidateId);
    if (!row) return { ok: false, error: "That moment could not be found." };
    await candidateReps.setEval(candidateId, e);
    revalidatePath(`/games/${row.gameId}/review`);
    return { ok: true, data: null };
  });
}

// ---------------------------------------------------------------------------
// Approve / reject / edit — a candidate can only become a published rep by an
// explicit coach approve. Nothing here auto-publishes.
// ---------------------------------------------------------------------------
export async function approveCandidate(candidateId: string): Promise<ActionResult<null>> {
  return withAuthedAction(async () => {
    await requireOwnerWhenSupabase();
    const id = idSchema.safeParse(candidateId);
    if (!id.success) return { ok: false, error: "That moment could not be found." };
    const row = await candidateReps.get(id.data);
    if (!row) return { ok: false, error: "That moment could not be found." };

    const issue = clipContextIssue(row.clipStartSeconds, row.decisionSeconds, row.clipEndSeconds);
    if (issue) {
      await candidateReps.update(id.data, { status: "needs_attention", rejection_reason: issue });
      revalidatePath(`/games/${row.gameId}/review`);
      return {
        ok: false,
        error:
          issue === "insufficient-pre-decision-context"
            ? "This moment doesn't show enough before the decision. Edit its timing (earlier start) before approving."
            : "This moment's clip timing needs an edit before it can be approved.",
      };
    }

    await candidateReps.update(id.data, { status: "approved", rejection_reason: null });
    revalidatePath(`/games/${row.gameId}/review`);
    return { ok: true, data: null };
  });
}

export async function rejectCandidate(
  candidateId: string,
  reason?: string,
): Promise<ActionResult<null>> {
  return withAuthedAction(async () => {
    await requireOwnerWhenSupabase();
    const id = idSchema.safeParse(candidateId);
    if (!id.success) return { ok: false, error: "That moment could not be found." };
    const row = await candidateReps.get(id.data);
    if (!row) return { ok: false, error: "That moment could not be found." };
    await candidateReps.update(id.data, {
      status: "rejected",
      rejection_reason: (reason ?? "Not useful for this player.").slice(0, 300),
    });
    revalidatePath(`/games/${row.gameId}/review`);
    return { ok: true, data: null };
  });
}

const editSchema = z.object({
  candidateId: idSchema,
  title: z.string().trim().min(1).max(80).optional(),
  situation: z.string().trim().min(1).max(240).optional(),
  prompt: z.string().trim().min(1).max(240).optional(),
  choices: z.array(z.object({ id: z.string().min(1).max(8), text: z.string().trim().min(1).max(120) })).min(2).max(4).optional(),
  recommendedChoiceId: z.string().min(1).max(8).optional(),
  explanation: z.string().trim().min(1).max(600).optional(),
  clip: z
    .object({
      startSeconds: z.number().nonnegative(),
      decisionSeconds: z.number().nonnegative(),
      endSeconds: z.number().nonnegative(),
    })
    .optional(),
});

export async function editCandidate(input: z.input<typeof editSchema>): Promise<ActionResult<null>> {
  return withAuthedAction(async () => {
    await requireOwnerWhenSupabase();
    const parsed = editSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your edits." };
    const data = parsed.data;
    const row = await candidateReps.get(data.candidateId);
    if (!row) return { ok: false, error: "That moment could not be found." };

    // Re-check the pre/post-decision context on whatever timing will be saved.
    const timing = data.clip
      ? { start: data.clip.startSeconds, decision: data.clip.decisionSeconds, end: data.clip.endSeconds }
      : { start: row.clipStartSeconds, decision: row.decisionSeconds, end: row.clipEndSeconds };
    const issue = clipContextIssue(timing.start, timing.decision, timing.end);
    if (issue === "clip-timing-out-of-order") return { ok: false, error: "The clip timing is out of order." };
    if (issue === "insufficient-pre-decision-context") {
      return { ok: false, error: `Keep at least ${MIN_PRE_DECISION_SECONDS}s between the clip start and the decision.` };
    }
    if (issue === "insufficient-post-decision-footage") {
      return { ok: false, error: `Keep at least ${MIN_POST_DECISION_SECONDS}s of footage after the decision.` };
    }
    const choices = data.choices ?? row.answerChoices;
    const recommended = data.recommendedChoiceId ?? row.bestReadChoiceId;
    if (recommended && !choices.some((c) => c.id === recommended)) {
      return { ok: false, error: "The best read must be one of the choices." };
    }

    await candidateReps.update(data.candidateId, {
      status: "edited",
      title: data.title ?? row.title,
      situation: data.situation ?? row.situation,
      prompt: data.prompt ?? row.prompt,
      answer_choices: choices,
      best_read_choice_id: recommended,
      coaching_explanation: data.explanation ?? row.coachingExplanation,
      ...(data.clip
        ? {
            clip_start_seconds: data.clip.startSeconds,
            decision_seconds: data.clip.decisionSeconds,
            clip_end_seconds: data.clip.endSeconds,
          }
        : {}),
    });
    revalidatePath(`/games/${row.gameId}/review`);
    return { ok: true, data: null };
  });
}

// ---------------------------------------------------------------------------
// Publish approved candidates as reps, then open a player session.
// ---------------------------------------------------------------------------
function truncate(value: string | null | undefined, max: number, fallback: string): string {
  const v = (value ?? "").trim();
  if (!v) return fallback;
  return v.length > max ? `${v.slice(0, max - 1).trimEnd()}…` : v;
}

function firstSentence(value: string | null | undefined, max: number, fallback: string): string {
  const v = (value ?? "").trim();
  if (!v) return fallback;
  const dot = v.search(/[.!?]\s/);
  const s = dot > 10 ? v.slice(0, dot + 1) : v;
  return truncate(s, max, fallback);
}

function candidateToRep(row: CandidateRepRow, order: number): Rep {
  const choices = row.answerChoices.slice(0, 4).map((c) => ({ id: c.id, label: truncate(c.text, 120, "Option") }));
  const ids = choices.map((c) => c.id);
  const correct = row.bestReadChoiceId && ids.includes(row.bestReadChoiceId) ? row.bestReadChoiceId : ids[0];
  const actual =
    row.actualDecisionChoiceId && ids.includes(row.actualDecisionChoiceId) ? row.actualDecisionChoiceId : correct;
  const category = (SKILL_CATEGORIES as readonly string[]).includes(row.skillCategory ?? "")
    ? (row.skillCategory as Rep["category"])
    : "help-recognition";

  return {
    id: `rep_${randomUUID()}`,
    gameId: row.gameId,
    order,
    status: "published",
    publishedAt: new Date().toISOString(),
    title: truncate(row.title, 80, "Decision moment"),
    category,
    difficulty: row.difficulty ?? "medium",
    clipStartMs: Math.round(row.clipStartSeconds * 1000),
    decisionPauseMs: Math.round(row.decisionSeconds * 1000),
    clipEndMs: Math.round(row.clipEndSeconds * 1000),
    situation: truncate(row.situation, 240, "Live possession."),
    prompt: truncate(row.prompt, 240, "What is the best read here?"),
    choices,
    correctChoiceId: correct,
    actualChoiceId: actual,
    actualOutcome: truncate(row.outcome, 160, "See the film for what happened."),
    explanation: truncate(row.coachingExplanation, 600, "Read the help and take the highest-value option."),
    coachingCue: firstSentence(row.coachingExplanation, 120, "Read the help before you commit."),
  };
}

export async function buildSessionFromApproved(
  jobId: string,
): Promise<ActionResult<{ sessionId: string; published: number; skipped: number }>> {
  return withAuthedAction(async () => {
    await requireOwnerWhenSupabase();
    const id = idSchema.safeParse(jobId);
    if (!id.success) return { ok: false, error: "That review could not be found." };

    const job = await gameAnalysisJobs.get(id.data);
    if (!job) return { ok: false, error: "That review could not be found." };

    const rows = (await candidateReps.listForJob(id.data)).filter(
      (r) => r.status === "approved" || r.status === "edited",
    );
    if (rows.length === 0) {
      return { ok: false, error: "Approve at least one moment before starting a session." };
    }

    const game = await getGame(job.gameId);
    if (!game) return { ok: false, error: "That game could not be found." };
    const durationMs = getVideoDurationMs(game);
    const backend = await getBackend();

    // Re-running review replaces the reps a previous build published from
    // analysis for this game — matched by published_rep_id — but never touches
    // reps a coach authored by hand in the studio.
    const priorPublished = new Set(
      (await candidateReps.listForJob(id.data)).map((r) => r.publishedRepId).filter((v): v is string => Boolean(v)),
    );
    const existing = await backend.listReps(job.gameId, { includeDrafts: true });
    const kept = existing.filter((rep) => !priorPublished.has(rep.id));
    for (const rep of existing) {
      if (priorPublished.has(rep.id)) await backend.deleteRep(rep.id);
    }

    let order = kept.length === 0 ? 1 : Math.max(...kept.map((r) => r.order)) + 1;
    let published = 0;
    let skipped = 0;
    for (const row of rows) {
      // Final gate: the pre/post-decision context invariant, before publishing.
      const contextIssue = clipContextIssue(row.clipStartSeconds, row.decisionSeconds, row.clipEndSeconds);
      if (contextIssue) {
        skipped += 1;
        await candidateReps.update(row.id, { status: "needs_attention", rejection_reason: contextIssue });
        continue;
      }
      const rep = candidateToRep(row, order);
      const issues = validateRepDraft(rep, durationMs);
      if (issues.length > 0) {
        skipped += 1;
        await candidateReps.update(row.id, { status: "needs_attention", rejection_reason: issues[0].message });
        continue;
      }
      await backend.saveRep(rep);
      await candidateReps.update(row.id, { published_rep_id: rep.id });
      order += 1;
      published += 1;
    }

    if (published === 0) {
      return { ok: false, error: "None of the approved moments could be published. Edit their timing and retry." };
    }

    await gameAnalysisJobs.update(id.data, { approved_count: published });

    const session = await startSessionForGame(job.gameId);
    if (!session.ok) return session;
    revalidatePath("/dashboard");
    return { ok: true, data: { sessionId: session.data.sessionId, published, skipped } };
  });
}
