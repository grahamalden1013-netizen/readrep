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
import { analyzePossession, type CandidateDraft, type ReferenceFrame } from "./possession";
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
  possessionIndex: number;
  reasoningCalls: number;
  rejections: Rejection[];
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
    rejections: [],
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
  // Spread the reasoning budget evenly across the game rather than front-loading.
  const windows = all.length <= MAX_REASONING_CALLS ? all : evenSample(all, MAX_REASONING_CALLS);

  await gameAnalysisJobs.update(job.id, {
    stage: "finding-decisions",
    progress_note: "Finding decision moments",
    possession_count: windows.length,
    cursor: { ...cursor, phase: "possessions", windows, possessionIndex: 0, reasoningCalls: 0 },
  });
  return { done: false, stage: "finding-decisions", note: `${windows.length} windows` };
}

// --- Stage C/D/E: per-possession reasoning ---------------------------

async function stepPossessions(job: GameAnalysisJob, cursor: Cursor): Promise<TickResult> {
  const { windows } = cursor;
  let idx = cursor.possessionIndex;
  let reasoningCalls = cursor.reasoningCalls;
  let analyzed = job.analyzedCount ?? 0;
  let candidateCount = job.candidateCount ?? 0;
  let usageIn = job.inputTokens ?? 0;
  let usageOut = job.outputTokens ?? 0;
  let cost = job.estimatedCostUsd ?? 0;
  const rejections = [...cursor.rejections];

  const profile = await getCoachingProfile().catch(() => null);
  const referenceFrames = await loadReferenceFrames(job);
  const refHint = referenceHint(job);

  for (
    let n = 0;
    n < POSSESSIONS_PER_TICK && idx < windows.length && reasoningCalls < MAX_REASONING_CALLS;
    n += 1, idx += 1
  ) {
    const window = windows[idx];
    let result: Awaited<ReturnType<typeof analyzePossession>>;
    try {
      result = await analyzePossession(
        job.playbackId!,
        window,
        { jerseyNumber: job.target.jerseyNumber, teamColor: job.target.teamColor, marker: job.target.marker },
        referenceFrames,
        profile,
        refHint,
      );
    } catch (cause) {
      // A transient provider failure on one window must not kill a 20-call job.
      // Record it and move on; the run still produces a queue from the rest.
      const err = toAiError(cause);
      reasoningCalls += 1;
      analyzed += 1;
      rejections.push({ window, reason: "provider-error", detail: err.code });
      await gameAnalysisJobs.heartbeat(job.id);
      continue;
    }
    reasoningCalls += 1;
    analyzed += 1;
    usageIn += result.usage.input;
    usageOut += result.usage.output;
    const p = priceFor(result.model);
    cost += (result.usage.input / 1e6) * p.in + (result.usage.output / 1e6) * p.out;

    if (result.kind === "rejected") {
      rejections.push({ window, reason: result.reason, detail: result.detail });
    } else {
      candidateCount += 1;
      await candidateReps.insert([
        candidateRow(job, result.draft, result.kind === "flagged" ? "needs_attention" : "pending_review"),
      ]);
    }

    await gameAnalysisJobs.heartbeat(job.id);
  }

  const possessionsDone = idx >= windows.length || reasoningCalls >= MAX_REASONING_CALLS;

  await gameAnalysisJobs.update(job.id, {
    stage: possessionsDone ? "ranking" : "finding-decisions",
    progress_note: possessionsDone ? "Building your reps" : "Finding decision moments",
    analyzed_count: analyzed,
    candidate_count: candidateCount,
    reasoning_calls: reasoningCalls,
    input_tokens: usageIn,
    output_tokens: usageOut,
    estimated_cost_usd: round4(cost),
    cursor: {
      ...cursor,
      phase: possessionsDone ? "rank" : "possessions",
      possessionIndex: idx,
      reasoningCalls,
      rejections,
    },
  });
  return {
    done: false,
    stage: possessionsDone ? "ranking" : "finding-decisions",
    note: `${idx}/${windows.length} possessions, ${candidateCount} candidates`,
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
