import "server-only";
import { toAiError } from "@/lib/ai/errors";
import { fetchMuxFrame } from "@/lib/video/mux-frame-source";
import { getCoachingProfile } from "@/lib/db/coaching-profile";
import { gameAnalysisJobs, candidateReps, type GameAnalysisJob } from "@/lib/db/game-analysis";
import {
  DISCOVERY_BATCH_SIZE,
  DISCOVERY_FRAME_WIDTH,
  JOB_STALE_MS,
  JOB_WALL_CLOCK_MS,
  MAX_DISCOVERY_CALLS,
  MAX_REASONING_CALLS,
  POSSESSION_FRAME_WIDTH,
  priceFor,
} from "./limits";
import { classifyLiveGame, type LiveFrameVerdict } from "./discovery-provider";
import {
  buildPossessionWindows,
  discoveryTimestamps,
  spansFromVerdicts,
  type LiveSpan,
  type PossessionWindow,
} from "./segments";
import type { CandidateDraft, ReferenceFrame } from "./possession";
import { analyzeWindowToTerminal, summariseLedger, type WindowLedgerEntry } from "./coverage";
import { dedupeAndRank } from "./rank";
import { CANDIDATE_PROMPT_VERSION } from "./schema";

/** One tick does at most this much expensive work before yielding + re-chaining. */
const DISCOVERY_BATCHES_PER_TICK = 3;
const POSSESSIONS_PER_TICK = 1;

type Phase = "discovery" | "windows" | "possessions" | "rank";

type Rejection = { window: PossessionWindow; reason: string; detail: string };

type Cursor = {
  phase: Phase;
  probeIndex: number;
  verdicts: LiveFrameVerdict[];
  spans: LiveSpan[];
  windows: PossessionWindow[];
  /** Next window to analyse. Monotonic — a window is never revisited. */
  possessionIndex: number;
  reasoningCalls: number;
  retries: number;
  rejections: Rejection[];
  /** One terminal entry per processed window. length === windows.length when done. */
  ledger: WindowLedgerEntry[];
};

function initialCursor(): Cursor {
  return {
    phase: "discovery",
    probeIndex: 0,
    verdicts: [],
    spans: [],
    windows: [],
    possessionIndex: 0,
    reasoningCalls: 0,
    retries: 0,
    rejections: [],
    ledger: [],
  };
}

function readCursor(job: GameAnalysisJob): Cursor {
  const c = job.cursor as Partial<Cursor> | undefined;
  if (!c || typeof c.phase !== "string") return initialCursor();
  return { ...initialCursor(), ...c } as Cursor;
}

export type TickResult = { done: boolean; stage: GameAnalysisJob["stage"]; note: string };

/**
 * Advance one durable analysis job by one bounded step. Safe to call repeatedly
 * and concurrently: it leases the job for {@link JOB_STALE_MS}, does one stage's
 * worth of work, checkpoints a resumable cursor, and returns whether the job is
 * finished. The caller (a server action) re-chains it via `after()` until done.
 */
export async function runAnalysisTick(jobId: string): Promise<TickResult> {
  const leased = await gameAnalysisJobs.lease(jobId, JOB_STALE_MS);
  if (!leased) {
    const current = await gameAnalysisJobs.get(jobId);
    return {
      done: !current || current.status === "completed" || current.status === "failed" || current.status === "cancelled",
      stage: current?.stage ?? "failed",
      note: "busy",
    };
  }
  let job = leased;

  // Terminal already?
  if (job.status === "completed" || job.status === "failed" || job.status === "cancelled") {
    return { done: true, stage: job.stage, note: job.status };
  }

  // Wall-clock ceiling.
  const startedMs = job.startedAt ? new Date(job.startedAt).getTime() : Date.now();
  if (Date.now() - startedMs > JOB_WALL_CLOCK_MS) {
    await gameAnalysisJobs.markFailedSafe(jobId, "timeout", "The analysis ran longer than expected and was stopped.");
    return { done: true, stage: "failed", note: "wall-clock" };
  }

  if (!job.playbackId || !job.durationSeconds) {
    await gameAnalysisJobs.markFailedSafe(jobId, "video-not-ready", "This game's video is not ready to analyse.");
    return { done: true, stage: "failed", note: "no-video" };
  }

  if (job.status === "queued") {
    job = await gameAnalysisJobs.update(jobId, {
      status: "running",
      stage: "preparing",
      started_at: job.startedAt ?? new Date().toISOString(),
      progress_note: "Preparing the game",
      discovery_model: process.env.OPENAI_DISCOVERY_MODEL?.trim() || "gpt-5-nano",
      reasoning_model: process.env.OPENAI_REP_MODEL?.trim() || null,
      prompt_version: CANDIDATE_PROMPT_VERSION,
    });
  }

  const cursor = readCursor(job);

  try {
    switch (cursor.phase) {
      case "discovery":
        return await stepDiscovery(job, cursor);
      case "windows":
        return await stepWindows(job, cursor);
      case "possessions":
        return await stepPossessions(job, cursor);
      case "rank":
        return await stepRank(job, cursor);
      default:
        return await stepDiscovery(job, { ...cursor, phase: "discovery" });
    }
  } catch (cause) {
    const err = toAiError(cause);
    await gameAnalysisJobs.markFailedSafe(jobId, err.code, err.toUserMessage()).catch(() => undefined);
    return { done: true, stage: "failed", note: err.code };
  }
}

// --- Stage A: live-play discovery ---------------------------------------

async function stepDiscovery(job: GameAnalysisJob, cursor: Cursor): Promise<TickResult> {
  const timestamps = discoveryTimestamps(job.durationSeconds!);
  let index = cursor.probeIndex;
  let calls = job.discoveryCalls ?? 0;
  let usageIn = job.inputTokens ?? 0;
  let usageOut = job.outputTokens ?? 0;
  let cost = job.estimatedCostUsd ?? 0;
  const verdicts = [...cursor.verdicts];

  for (let b = 0; b < DISCOVERY_BATCHES_PER_TICK && index < timestamps.length && calls < MAX_DISCOVERY_CALLS; b += 1) {
    const batchTs = timestamps.slice(index, index + DISCOVERY_BATCH_SIZE);
    const probes: { timestampSeconds: number; dataUrl: string }[] = [];
    for (const t of batchTs) {
      const f = await fetchMuxFrame(job.playbackId!, t, DISCOVERY_FRAME_WIDTH, 6_000);
      if (f) probes.push({ timestampSeconds: t, dataUrl: f.dataUrl });
    }
    index += batchTs.length;
    if (probes.length === 0) continue;

    const res = await classifyLiveGame(probes);
    verdicts.push(...res.verdicts);
    calls += 1;
    usageIn += res.usage.input;
    usageOut += res.usage.output;
    const p = priceFor(res.model);
    cost += (res.usage.input / 1e6) * p.in + (res.usage.output / 1e6) * p.out;
  }

  const discoveryDone = index >= timestamps.length || calls >= MAX_DISCOVERY_CALLS;

  if (!discoveryDone) {
    await gameAnalysisJobs.update(job.id, {
      stage: "locating-player",
      progress_note: "Finding your player",
      cursor: { ...cursor, phase: "discovery", probeIndex: index, verdicts },
      discovery_calls: calls,
      input_tokens: usageIn,
      output_tokens: usageOut,
      estimated_cost_usd: round4(cost),
    });
    return { done: false, stage: "locating-player", note: `probed ${index}/${timestamps.length}` };
  }

  const spans = spansFromVerdicts(verdicts);
  await gameAnalysisJobs.update(job.id, {
    stage: "reviewing-possessions",
    progress_note: "Reviewing possessions",
    cursor: { ...cursor, phase: "windows", probeIndex: index, verdicts, spans },
    discovery_calls: calls,
    live_span_count: spans.length,
    input_tokens: usageIn,
    output_tokens: usageOut,
    estimated_cost_usd: round4(cost),
  });
  return { done: false, stage: "reviewing-possessions", note: `${spans.length} live spans` };
}

// --- Stage B: possession windows --------------------------------------

async function stepWindows(job: GameAnalysisJob, cursor: Cursor): Promise<TickResult> {
  const all = buildPossessionWindows(cursor.spans);
  // Keep every window. When the reasoning budget is smaller than the window
  // count (normal cost-capped runs) the possession step spreads its calls
  // evenly; when the budget covers them all (the acceptance baseline) every
  // window is analysed.
  const windows =
    all.length <= MAX_REASONING_CALLS ? all : evenSample(all, MAX_REASONING_CALLS);

  await gameAnalysisJobs.update(job.id, {
    stage: "finding-decisions",
    progress_note: `Reviewed 0 / ${windows.length}`,
    possession_count: windows.length,
    cursor: { ...cursor, phase: "possessions", windows, possessionIndex: 0, reasoningCalls: 0, ledger: [] },
  });
  return { done: false, stage: "finding-decisions", note: `${windows.length} windows` };
}

// --- Stage C/D/E: per-possession reasoning ---------------------------

async function stepPossessions(job: GameAnalysisJob, cursor: Cursor): Promise<TickResult> {
  const { windows } = cursor;
  let idx = cursor.possessionIndex;
  let reasoningCalls = cursor.reasoningCalls;
  let retries = cursor.retries;
  let candidateCount = job.candidateCount ?? 0;
  let usageIn = job.inputTokens ?? 0;
  let usageOut = job.outputTokens ?? 0;
  let cost = job.estimatedCostUsd ?? 0;
  const rejections = [...cursor.rejections];
  const ledger = [...cursor.ledger];
  const covered = new Set(ledger.map((e) => e.index));

  // Budget mode: fewer reasoning calls allowed than windows. Full coverage:
  // the cap is >= the window count, so every window gets analysed.
  const budgetCapped = MAX_REASONING_CALLS < windows.length;

  const profile = await getCoachingProfile().catch(() => null);
  const referenceFrames = await loadReferenceFrames(job);
  const refHint = referenceHint(job);

  for (
    let n = 0;
    n < POSSESSIONS_PER_TICK && idx < windows.length && (!budgetCapped || reasoningCalls < MAX_REASONING_CALLS);
    n += 1, idx += 1
  ) {
    if (covered.has(idx)) continue; // never analyse the same window twice

    const window = windows[idx];
    const wr = await analyzeWindowToTerminal(
      idx,
      window,
      job.playbackId!,
      { jerseyNumber: job.target.jerseyNumber, teamColor: job.target.teamColor, marker: job.target.marker },
      referenceFrames,
      profile,
      refHint,
    );

    reasoningCalls += 1;
    retries += wr.retries;
    usageIn += wr.usage.input;
    usageOut += wr.usage.output;
    if (wr.model) {
      const p = priceFor(wr.model);
      cost += (wr.usage.input / 1e6) * p.in + (wr.usage.output / 1e6) * p.out;
    }
    ledger.push(wr.ledger);
    covered.add(idx);

    if (wr.analyzed && (wr.analyzed.kind === "candidate" || wr.analyzed.kind === "flagged")) {
      candidateCount += 1;
      await candidateReps.insert([
        candidateRow(
          job,
          wr.analyzed.draft,
          wr.analyzed.kind === "flagged" ? "needs_attention" : "pending_review",
          wr.analyzed.verifier ?? null,
        ),
      ]);
    } else {
      rejections.push({ window, reason: wr.ledger.outcome, detail: wr.ledger.reason });
    }

    await gameAnalysisJobs.heartbeat(job.id);
  }

  // Not done until every window has a terminal ledger entry — unless a
  // cost-capped run has spent its reasoning budget.
  const coverageComplete = ledger.length >= windows.length;
  const possessionsDone = coverageComplete || (budgetCapped && reasoningCalls >= MAX_REASONING_CALLS);
  const summary = summariseLedger(ledger);

  await gameAnalysisJobs.update(job.id, {
    stage: possessionsDone ? "ranking" : "finding-decisions",
    progress_note: possessionsDone ? "Building your reps" : `Reviewed ${ledger.length} / ${windows.length}`,
    analyzed_count: ledger.length,
    candidate_count: candidateCount,
    rejected_count: ledger.length - summary["valid-decision"],
    reasoning_calls: reasoningCalls,
    input_tokens: usageIn,
    output_tokens: usageOut,
    estimated_cost_usd: round4(cost),
    cursor: {
      ...cursor,
      phase: possessionsDone ? "rank" : "possessions",
      possessionIndex: idx,
      reasoningCalls,
      retries,
      rejections,
      ledger,
    },
  });
  return {
    done: false,
    stage: possessionsDone ? "ranking" : "finding-decisions",
    note: `${ledger.length}/${windows.length} windows · ${summary["valid-decision"]} decisions`,
  };
}

// --- Stage F: dedupe + rank + finish --------------------------------

async function stepRank(job: GameAnalysisJob, cursor: Cursor): Promise<TickResult> {
  const rows = await candidateReps.listForJob(job.id);
  const live = rows.filter((r) => r.status === "pending_review" || r.status === "needs_attention");

  const drafts = live.map(
    (r): CandidateDraft & { id: string } => ({
      id: r.id,
      clipStartSeconds: r.clipStartSeconds,
      decisionSeconds: r.decisionSeconds,
      clipEndSeconds: r.clipEndSeconds,
      title: r.title,
      skillCategory: (r.skillCategory as CandidateDraft["skillCategory"]) ?? null,
      difficulty: r.difficulty,
      situation: r.situation,
      prompt: r.prompt,
      answerChoices: r.answerChoices,
      bestReadChoiceId: r.bestReadChoiceId,
      actualDecisionChoiceId: r.actualDecisionChoiceId,
      actualDecision: r.actualDecision,
      outcome: r.outcome,
      coachingExplanation: r.coachingExplanation,
      visibleEvidence: r.visibleEvidence,
      basketballInferences: r.basketballInferences,
      coachPreferenceBasis: r.coachPreferenceBasis,
      involvement: r.involvement,
      uncertainty: r.uncertainty,
      playerIdConfidence: r.playerIdConfidence ?? 0,
      decisionConfidence: r.decisionConfidence ?? 0,
      teachingValue: r.teachingValueScore ?? 0,
      decisionTags: [],
      warnings: [],
      targetEvidence: r.visibleEvidence,
      possessionSummary: r.possessionSummary ?? null,
      actualAction: r.actualAction ?? r.actualDecision,
      actualActionSeconds: r.actualActionSeconds ?? null,
      visibleOutcome: r.outcome,
      visibleOutcomeSeconds: r.visibleOutcomeSeconds ?? null,
      plausibleAlternatives: (r.plausibleAlternatives ?? []).map((a) => ({
        action: a.action,
        atSeconds: typeof a.atSeconds === "number" ? a.atSeconds : r.decisionSeconds,
        visibleEvidence: a.visibleEvidence,
      })),
      whyThisIsNotRoutine: r.whyThisIsNotRoutine ?? null,
      whyThePauseIsBeforeCommitment: r.whyThePauseIsBeforeCommitment ?? null,
    }),
  );

  // `id` rides along on each draft object; dedupeAndRank spreads it through.
  const ranked = dedupeAndRank(drafts as CandidateDraft[]) as unknown as (CandidateDraft & {
    id: string;
    rank: number;
  })[];
  const keptIds = new Set(ranked.map((r) => r.id));

  for (const r of ranked) {
    await candidateReps.update(r.id, { rank: r.rank });
  }
  let dropped = 0;
  for (const r of live) {
    if (!keptIds.has(r.id)) {
      dropped += 1;
      await candidateReps.update(r.id, {
        status: "rejected",
        rejection_reason: "Very similar to a stronger moment already in the queue.",
      });
    }
  }

  await gameAnalysisJobs.update(job.id, {
    status: "completed",
    stage: "done",
    progress_note: "Ready for review",
    completed_at: new Date().toISOString(),
    candidate_count: ranked.length,
    rejected_count: cursor.rejections.length + dropped,
  });
  return { done: true, stage: "done", note: `${ranked.length} reps ready` };
}

// --- helpers --------------------------------------------------------

/**
 * Build the reference image set the analyzer follows the player with: each
 * coach-made crop, plus the full frame it came from and frames ~2s before/after
 * for continuity — so the player can be tracked when the number is turned away.
 * Capped so token cost stays bounded.
 */
async function loadReferenceFrames(job: GameAnalysisJob): Promise<ReferenceFrame[]> {
  const out: ReferenceFrame[] = [];
  const refs = job.targetReference.slice(0, 3);
  for (const ref of refs) {
    if (typeof ref.crop === "string" && ref.crop.startsWith("data:image/")) {
      out.push({ timestampSeconds: ref.timestampSeconds, dataUrl: ref.crop });
    }
  }
  const adjacentOffsets = refs.length <= 2 ? [-2, 0, 2] : [0];
  for (const ref of refs) {
    for (const dt of adjacentOffsets) {
      const t = Math.max(0, ref.timestampSeconds + dt);
      const f = await fetchMuxFrame(job.playbackId!, t, POSSESSION_FRAME_WIDTH, 7_000);
      if (f) out.push({ timestampSeconds: t, dataUrl: f.dataUrl });
      if (out.length >= 10) return out;
    }
  }
  return out;
}

function referenceHint(job: GameAnalysisJob): { cues: string[]; anyNumberVisible: boolean } {
  const cues = job.targetReference
    .map((r) => r.appearanceCue?.trim())
    .filter((c): c is string => Boolean(c));
  return { cues: [...new Set(cues)].slice(0, 4), anyNumberVisible: job.targetReference.some((r) => r.numberVisible) };
}

function candidateRow(
  job: GameAnalysisJob,
  d: CandidateDraft,
  status: "pending_review" | "needs_attention",
  verifier: Record<string, unknown> | null = null,
): Record<string, unknown> {
  return {
    analysis_job_id: job.id,
    game_id: job.gameId,
    owner_id: job.ownerId,
    target_jersey_number: job.target.jerseyNumber,
    target_team_color: job.target.teamColor,
    clip_start_seconds: d.clipStartSeconds,
    decision_seconds: d.decisionSeconds,
    clip_end_seconds: d.clipEndSeconds,
    title: d.title,
    skill_category: d.skillCategory,
    difficulty: d.difficulty,
    situation: d.situation,
    prompt: d.prompt,
    answer_choices: d.answerChoices,
    best_read_choice_id: d.bestReadChoiceId,
    actual_decision_choice_id: d.actualDecisionChoiceId,
    actual_decision: d.actualDecision,
    outcome: d.outcome,
    coaching_explanation: d.coachingExplanation,
    visible_evidence: d.visibleEvidence,
    basketball_inferences: d.basketballInferences,
    coach_preference_basis: d.coachPreferenceBasis,
    involvement: d.involvement,
    uncertainty: d.uncertainty,
    player_identification_confidence: d.playerIdConfidence,
    decision_confidence: d.decisionConfidence,
    teaching_value_score: d.teachingValue,
    possession_summary: d.possessionSummary,
    actual_action: d.actualAction,
    actual_action_seconds: d.actualActionSeconds,
    visible_outcome_seconds: d.visibleOutcomeSeconds,
    plausible_alternatives: d.plausibleAlternatives,
    why_not_routine: d.whyThisIsNotRoutine,
    why_pause_before_commit: d.whyThePauseIsBeforeCommitment,
    verifier_verdict: verifier,
    dedupe_key: null,
    status,
  };
}

function evenSample<T>(items: T[], n: number): T[] {
  if (items.length <= n) return items;
  const out: T[] = [];
  const step = items.length / n;
  for (let i = 0; i < n; i += 1) out.push(items[Math.floor(i * step)]);
  return out;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
