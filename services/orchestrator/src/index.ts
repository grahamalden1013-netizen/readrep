import { z } from "zod";
import { type ProcessingState, PIPELINE_ORDER, retryDelayMs } from "@readrep/domain";

/**
 * services/orchestrator — durable stage definitions and the idempotency contract.
 *
 * NOT IMPLEMENTED as a running worker. Phase 1 supplies a durable workflow
 * engine or queue. What exists now is the definition of the pipeline it must
 * execute, and the contract every worker has to satisfy.
 *
 * The state machine itself lives in `@readrep/domain` because it is product
 * meaning, not infrastructure: what "awaiting coach review" means does not
 * change when the queue does.
 */

export const ORCHESTRATOR_STATUS = "not_implemented" as const;

/* -------------------------------------------------------------------------- */
/* Stage definitions                                                           */
/* -------------------------------------------------------------------------- */

export const StageDefinition = z.object({
  state: z.string().min(1),
  sequence: z.number().int().nonnegative(),
  /** What this stage does, in one line, for the operator console. */
  description: z.string().min(1).max(200),
  /** Wall-clock ceiling. A stage that overruns is failed, not left running. */
  timeoutMs: z.number().int().positive(),
  maxAttempts: z.number().int().positive(),
  /** Whether a person, rather than a worker, moves this stage forward. */
  humanCheckpoint: z.boolean(),
  /** Whether the stage can be re-run safely once it has already succeeded. */
  replayable: z.boolean(),
  /** Rough cost ceiling per game for this stage, for budget alarms. */
  budgetMicroUsd: z.number().int().nonnegative(),
});
export type StageDefinition = z.infer<typeof StageDefinition>;

/**
 * The pipeline, in order.
 *
 * Cheap work happens before expensive work: frames are sampled before GPU
 * tracking runs, and the target player is confirmed before any candidate
 * analysis is paid for. Getting this order wrong is how a product spends real
 * money analysing the wrong player.
 */
export const PIPELINE: readonly StageDefinition[] = Object.freeze([
  {
    state: "awaiting_upload",
    sequence: 0,
    description: "Hold an authorized upload ticket until the file arrives.",
    timeoutMs: 24 * 60 * 60 * 1000,
    maxAttempts: 1,
    humanCheckpoint: true,
    replayable: true,
    budgetMicroUsd: 0,
  },
  {
    state: "uploading",
    sequence: 1,
    description: "Browser uploads directly to the provider; resumable.",
    timeoutMs: 6 * 60 * 60 * 1000,
    maxAttempts: 3,
    humanCheckpoint: false,
    replayable: true,
    budgetMicroUsd: 0,
  },
  {
    state: "uploaded",
    sequence: 2,
    description: "Verify the signed webhook and record the provider asset.",
    timeoutMs: 60_000,
    maxAttempts: 5,
    humanCheckpoint: false,
    replayable: true,
    budgetMicroUsd: 0,
  },
  {
    state: "securing",
    sequence: 3,
    description: "Validate format, duration, and ownership; check consent.",
    timeoutMs: 5 * 60_000,
    maxAttempts: 3,
    humanCheckpoint: false,
    replayable: true,
    budgetMicroUsd: 1_000,
  },
  {
    state: "transcoding",
    sequence: 4,
    description: "Create streamable renditions and thumbnails.",
    timeoutMs: 2 * 60 * 60 * 1000,
    maxAttempts: 3,
    humanCheckpoint: false,
    replayable: true,
    budgetMicroUsd: 400_000,
  },
  {
    state: "preparing_frames",
    sequence: 5,
    description: "Extract low-rate frames and detect stoppages and camera cuts.",
    timeoutMs: 60 * 60 * 1000,
    maxAttempts: 3,
    humanCheckpoint: false,
    replayable: true,
    budgetMicroUsd: 300_000,
  },
  {
    state: "awaiting_player_confirmation",
    sequence: 6,
    description: "A person confirms the target player before any paid analysis.",
    timeoutMs: 14 * 24 * 60 * 60 * 1000,
    maxAttempts: 1,
    humanCheckpoint: true,
    replayable: true,
    budgetMicroUsd: 0,
  },
  {
    state: "discovering_candidate_moments",
    sequence: 7,
    description: "Cheap first pass: propose timestamps worth a closer look.",
    timeoutMs: 30 * 60_000,
    maxAttempts: 3,
    humanCheckpoint: false,
    replayable: true,
    budgetMicroUsd: 200_000,
  },
  {
    state: "analyzing_candidates",
    sequence: 8,
    description: "Expensive second pass over short windows only.",
    timeoutMs: 60 * 60 * 1000,
    maxAttempts: 3,
    humanCheckpoint: false,
    replayable: true,
    budgetMicroUsd: 1_500_000,
  },
  {
    state: "awaiting_coach_review",
    sequence: 9,
    description: "A coach approves, edits, or rejects each candidate.",
    timeoutMs: 30 * 24 * 60 * 60 * 1000,
    maxAttempts: 1,
    humanCheckpoint: true,
    replayable: true,
    budgetMicroUsd: 0,
  },
  {
    state: "ready_for_assignment",
    sequence: 10,
    description: "Approved moments are publishable and assignable.",
    timeoutMs: 60_000,
    maxAttempts: 1,
    humanCheckpoint: false,
    replayable: true,
    budgetMicroUsd: 0,
  },
]);

export const stageFor = (state: ProcessingState): StageDefinition | undefined =>
  PIPELINE.find((s) => s.state === state);

/** Budget ceiling for one processed game, summed from the stage budgets. */
export const GAME_BUDGET_MICRO_USD = PIPELINE.reduce(
  (sum, s) => sum + s.budgetMicroUsd,
  0,
);

/* -------------------------------------------------------------------------- */
/* Idempotency contract                                                        */
/* -------------------------------------------------------------------------- */

/**
 * The contract every worker must satisfy.
 *
 * Queues and provider webhooks deliver at least once, so every one of these
 * rules exists because the alternative is a run that advances twice, a GPU job
 * charged twice, or a coach reviewing the same clip twice.
 */
export const IDEMPOTENCY_CONTRACT = {
  /**
   * A stage's key is derived from stable inputs, never from a timestamp or a
   * random value, so a redelivery computes the same key.
   */
  keyDerivation: "sha256(runId, stageState, attemptScope)",
  /**
   * Before doing work, a worker checks whether this key already produced a
   * result. If so it returns that result rather than recomputing.
   */
  checkBeforeWork: true,
  /**
   * Artifacts are written to a key derived from the idempotency key, so a
   * duplicate run overwrites rather than duplicating.
   */
  artifactKeysAreDeterministic: true,
  /**
   * Persisting the stage result and advancing the run happen together. A crash
   * between them must leave the run at the earlier state, which a retry can
   * safely re-enter.
   */
  atomicResultAndTransition: true,
  /**
   * Completed stages keep their artifacts when a later stage fails. A retry
   * resumes at the failed stage; it never restarts the pipeline.
   */
  earlierStagesSurviveFailure: true,
} as const;

/** Delay before the next attempt. Re-exported so workers share one policy. */
export const nextRetryDelayMs = retryDelayMs;

/** Sanity check: the pipeline definition matches the domain's state order. */
export const pipelineMatchesDomain = (): boolean => {
  const defined = PIPELINE.map((s) => s.state);
  const expected = PIPELINE_ORDER.filter((s) => s !== "created" && s !== "completed");
  return (
    defined.length === expected.length && defined.every((s, i) => s === expected[i])
  );
};
