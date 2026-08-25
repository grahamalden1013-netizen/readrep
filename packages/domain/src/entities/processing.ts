import { z } from "zod";
import { brandedId, Instant, SemanticVersion, shortText } from "../primitives.js";
import { ArtifactId, ProvenanceKind } from "../confidence.js";
import { GameId, VideoAssetId } from "./game.js";

export const ProcessingRunId = brandedId("ProcessingRunId");
export type ProcessingRunId = z.infer<typeof ProcessingRunId>;

export const ProcessingStageId = brandedId("ProcessingStageId");
export type ProcessingStageId = z.infer<typeof ProcessingStageId>;

/* -------------------------------------------------------------------------- */
/* States                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Every state a game's processing can be in.
 *
 * These are the states the *user* is shown, verbatim. The blueprint requires
 * that "processing states never imply work has completed when it has not", so
 * there is no generic "processing" bucket hiding six different situations.
 */
export const ProcessingState = z.enum([
  "created",
  "awaiting_upload",
  "uploading",
  "uploaded",
  "securing",
  "transcoding",
  "preparing_frames",
  "awaiting_player_confirmation",
  "discovering_candidate_moments",
  "analyzing_candidates",
  "awaiting_coach_review",
  "ready_for_assignment",
  "completed",
  "failed",
  "retrying",
  "deleting",
  "deleted",
]);
export type ProcessingState = z.infer<typeof ProcessingState>;

/** What the interface says for each state. Honest, present tense, no hedging. */
export const PROCESSING_STATE_LABEL: Record<ProcessingState, string> = {
  created: "Created",
  awaiting_upload: "Waiting for the file",
  uploading: "Uploading",
  uploaded: "Upload received",
  securing: "Securing the file",
  transcoding: "Transcoding",
  preparing_frames: "Preparing frames",
  awaiting_player_confirmation: "Waiting for you to confirm the player",
  discovering_candidate_moments: "Finding decision moments",
  analyzing_candidates: "Analyzing moments",
  awaiting_coach_review: "Waiting for coach review",
  ready_for_assignment: "Ready to assign",
  completed: "Completed",
  failed: "Failed",
  retrying: "Retrying",
  deleting: "Deleting",
  deleted: "Deleted",
};

/** States where ReadRep is waiting on a person, not on a machine. */
export const HUMAN_CHECKPOINT_STATES = [
  "awaiting_player_confirmation",
  "awaiting_coach_review",
] as const satisfies readonly ProcessingState[];

export const isHumanCheckpoint = (s: ProcessingState): boolean =>
  (HUMAN_CHECKPOINT_STATES as readonly ProcessingState[]).includes(s);

/* -------------------------------------------------------------------------- */
/* Failure                                                                     */
/* -------------------------------------------------------------------------- */

export const FailureCode = z.enum([
  "upload_incomplete",
  "unsupported_format",
  "file_too_large",
  "provider_error",
  "provider_timeout",
  "webhook_signature_invalid",
  "gpu_capacity_unavailable",
  "insufficient_evidence",
  "quota_exceeded",
  "consent_missing",
  "internal_error",
]);
export type FailureCode = z.infer<typeof FailureCode>;

/**
 * A recorded failure.
 *
 * `retryable` is set by the code that raised the failure, not guessed later. A
 * missing consent record is not a transient error and must never be retried
 * into success.
 */
export const ProcessingFailure = z.object({
  code: FailureCode,
  /** Operator-facing. Never contains media content, file paths, or secrets. */
  message: shortText(400),
  retryable: z.boolean(),
  occurredAt: Instant,
  /** The stage that failed, so a retry knows where to resume. */
  stage: ProcessingState,
});
export type ProcessingFailure = z.infer<typeof ProcessingFailure>;

/* -------------------------------------------------------------------------- */
/* Stage                                                                       */
/* -------------------------------------------------------------------------- */

export const StageStatus = z.enum([
  "pending",
  "running",
  "succeeded",
  "failed",
  "skipped",
]);
export type StageStatus = z.infer<typeof StageStatus>;

/** Coarse progress within a stage. `total` is null when it genuinely is not known. */
export const StageProgress = z.object({
  completed: z.number().int().nonnegative(),
  total: z.number().int().nonnegative().nullable().default(null),
  unit: shortText(24).default("items"),
});
export type StageProgress = z.infer<typeof StageProgress>;

/**
 * An artifact a stage produced.
 *
 * Carries its own provenance so a derived frame produced by deterministic code
 * is never confused with a model-produced overlay. `storageKey` is an internal
 * key, never a URL, and never returned to a client.
 */
export const StageArtifact = z.object({
  id: ArtifactId,
  kind: z.enum([
    "rendition",
    "thumbnail",
    "frame",
    "player_crop",
    "embedding",
    "overlay",
    "track_set",
    "possession_set",
    "candidate_set",
    "analysis",
  ]),
  storageKey: shortText(240),
  provenance: ProvenanceKind,
  sizeBytes: z.number().int().nonnegative().nullable().default(null),
  createdAt: Instant,
});
export type StageArtifact = z.infer<typeof StageArtifact>;

/**
 * One persisted step of a run.
 *
 * Stage results are persisted so a failure does not erase completed work: a
 * retry resumes at the failed stage and every earlier stage keeps its
 * artifacts.
 *
 * `idempotencyKey` is what makes a stage safe to re-deliver. A worker that
 * receives the same key twice must return the first result rather than
 * recomputing and re-charging.
 */
export const ProcessingStage = z
  .object({
    id: ProcessingStageId,
    runId: ProcessingRunId,
    /** The state this stage performs. */
    state: ProcessingState,
    status: StageStatus,
    /** Position in the pipeline, ascending. */
    sequence: z.number().int().nonnegative(),

    idempotencyKey: shortText(120),

    attempts: z.number().int().nonnegative().default(0),
    maxAttempts: z.number().int().positive().default(3),

    progress: StageProgress.nullable().default(null),
    artifacts: z.array(StageArtifact).default([]),
    failure: ProcessingFailure.nullable().default(null),

    /** Micro-USD spent in this stage. Cost is measurable from the first run. */
    costMicroUsd: z.number().int().nonnegative().default(0),

    startedAt: Instant.nullable().default(null),
    completedAt: Instant.nullable().default(null),
  })
  .superRefine((s, ctx) => {
    if (s.status === "failed" && s.failure === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["failure"],
        message: "a failed stage must record its failure",
      });
    }
    if (s.status === "succeeded" && s.completedAt === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["completedAt"],
        message: "a succeeded stage must record when it completed",
      });
    }
  });
export type ProcessingStage = z.infer<typeof ProcessingStage>;

export const hasRetriesRemaining = (
  s: Pick<ProcessingStage, "attempts" | "maxAttempts">,
): boolean => s.attempts < s.maxAttempts;

/**
 * Exponential backoff with a ceiling, in milliseconds.
 *
 * Deterministic so tests can assert it. Jitter is applied by the scheduler, not
 * here, to keep this function pure.
 */
export const retryDelayMs = (attempt: number): number =>
  Math.min(30 * 60 * 1000, 2 ** Math.max(0, attempt) * 1000);

/* -------------------------------------------------------------------------- */
/* Deletion propagation                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Everything that must be purged when a game is deleted.
 *
 * Deletion is designed across originals, derivatives, and analysis artifacts
 * from the start. A run in `deleting` is not `deleted` until every target here
 * is accounted for, which is why `DeletionProgress` is a checklist rather than
 * a boolean.
 */
export const DeletionTarget = z.enum([
  "provider_original",
  "provider_renditions",
  "thumbnails",
  "frames",
  "player_crops",
  "embeddings",
  "overlays",
  "tracks",
  "possessions",
  "decision_candidates",
  "ai_operation_results",
  "learning_moments",
  "player_attempts",
]);
export type DeletionTarget = z.infer<typeof DeletionTarget>;

export const ALL_DELETION_TARGETS = DeletionTarget.options;

export const DeletionProgress = z.object({
  requestedAt: Instant,
  requestedByUserId: shortText(80).nullable().default(null),
  /** Targets confirmed purged. Deletion completes only when all are present. */
  purged: z.array(DeletionTarget).default([]),
  /** Targets that could not be purged, with the reason. Surfaced, never hidden. */
  failed: z
    .array(z.object({ target: DeletionTarget, reason: shortText(240) }))
    .default([]),
});
export type DeletionProgress = z.infer<typeof DeletionProgress>;

export const isDeletionComplete = (d: DeletionProgress): boolean =>
  ALL_DELETION_TARGETS.every((t) => d.purged.includes(t));

export const outstandingDeletionTargets = (
  d: DeletionProgress,
): readonly DeletionTarget[] =>
  ALL_DELETION_TARGETS.filter((t) => !d.purged.includes(t));

/* -------------------------------------------------------------------------- */
/* Run                                                                         */
/* -------------------------------------------------------------------------- */

/**
 * A durable, restartable processing run for one game.
 *
 * The run holds the current state; the stages hold the persisted work. A worker
 * crash loses at most the in-flight stage.
 */
export const ProcessingRun = z
  .object({
    id: ProcessingRunId,
    gameId: GameId,
    videoAssetId: VideoAssetId.nullable().default(null),

    state: ProcessingState,
    /** Where a retry resumes. Set when entering `retrying`, cleared on exit. */
    resumeState: ProcessingState.nullable().default(null),

    /** Version of the pipeline definition, recorded on every derived claim. */
    pipelineVersion: SemanticVersion,

    stages: z.array(ProcessingStage).default([]),
    failure: ProcessingFailure.nullable().default(null),
    deletion: DeletionProgress.nullable().default(null),

    /**
     * Dedupe log of event keys already applied to this run.
     *
     * Queue messages and provider webhooks are delivered at least once, so the
     * same event will arrive twice. Applying it twice would advance the run two
     * stages. This log is what makes re-delivery a no-op rather than a bug, and
     * it is distinct from a stage's `idempotencyKey`, which dedupes the *work*
     * a worker performs rather than the *transition* the run makes.
     */
    appliedEventKeys: z.array(shortText(120)).max(500).default([]),

    createdAt: Instant,
    updatedAt: Instant,
  })
  .superRefine((r, ctx) => {
    if (r.state === "failed" && r.failure === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["failure"],
        message: "a failed run must record its failure",
      });
    }
    if (r.state === "retrying" && r.resumeState === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["resumeState"],
        message: "a retrying run must record which stage it resumes at",
      });
    }
    if ((r.state === "deleting" || r.state === "deleted") && r.deletion === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["deletion"],
        message: "a run being deleted must carry its deletion checklist",
      });
    }
  });
export type ProcessingRun = z.infer<typeof ProcessingRun>;
