import {
  ALL_DELETION_TARGETS,
  hasRetriesRemaining,
  isDeletionComplete,
  type ProcessingFailure,
  type ProcessingRun,
  type ProcessingStage,
  type ProcessingState,
} from "../entities/processing";
import type { Instant } from "../primitives";

/* -------------------------------------------------------------------------- */
/* The transition table                                                        */
/* -------------------------------------------------------------------------- */

/**
 * The pipeline's happy path, in order.
 *
 * Each of these states advances to the next one on success. `retrying` resumes
 * into exactly one of these.
 */
export const PIPELINE_ORDER = [
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
] as const satisfies readonly ProcessingState[];

export type PipelineState = (typeof PIPELINE_ORDER)[number];

/** States a retry may resume into: any pipeline state that performs real work. */
export const RESUMABLE_STATES = PIPELINE_ORDER.filter(
  (s) => s !== "created" && s !== "completed",
) as readonly ProcessingState[];

const successor = (state: PipelineState): ProcessingState | null => {
  const i = PIPELINE_ORDER.indexOf(state);
  return PIPELINE_ORDER[i + 1] ?? null;
};

/**
 * Every legal transition, exhaustively.
 *
 * Anything not listed here is rejected. The table is the specification: a
 * reader should be able to see the whole lifecycle without tracing code.
 *
 * Three rules shape it:
 *  - Any state before `deleted` may begin deleting. A deletion request is never
 *    blocked by where processing happens to be.
 *  - Only states that do machine work can fail. `completed` cannot fail.
 *  - `deleted` is the sole terminal state.
 */
export const LEGAL_TRANSITIONS: Readonly<
  Record<ProcessingState, readonly ProcessingState[]>
> = Object.freeze({
  created: ["awaiting_upload", "deleting"],
  awaiting_upload: ["uploading", "failed", "deleting"],
  uploading: ["uploaded", "failed", "deleting"],
  uploaded: ["securing", "failed", "deleting"],
  securing: ["transcoding", "failed", "deleting"],
  transcoding: ["preparing_frames", "failed", "deleting"],
  preparing_frames: ["awaiting_player_confirmation", "failed", "deleting"],
  awaiting_player_confirmation: ["discovering_candidate_moments", "failed", "deleting"],
  discovering_candidate_moments: ["analyzing_candidates", "failed", "deleting"],
  analyzing_candidates: ["awaiting_coach_review", "failed", "deleting"],
  awaiting_coach_review: ["ready_for_assignment", "failed", "deleting"],
  ready_for_assignment: ["completed", "deleting"],
  completed: ["deleting"],
  failed: ["retrying", "deleting"],
  retrying: [...RESUMABLE_STATES, "failed", "deleting"],
  deleting: ["deleted", "failed"],
  deleted: [],
});

export const canTransition = (from: ProcessingState, to: ProcessingState): boolean =>
  LEGAL_TRANSITIONS[from].includes(to);

export const isTerminal = (state: ProcessingState): boolean =>
  LEGAL_TRANSITIONS[state].length === 0;

export const nextOnSuccess = (state: ProcessingState): ProcessingState | null =>
  (PIPELINE_ORDER as readonly ProcessingState[]).includes(state)
    ? successor(state as PipelineState)
    : null;

/* -------------------------------------------------------------------------- */
/* Events                                                                      */
/* -------------------------------------------------------------------------- */

export type ProcessingEvent =
  | { type: "advance"; to: ProcessingState; at: Instant; idempotencyKey: string }
  | { type: "fail"; failure: ProcessingFailure; at: Instant; idempotencyKey: string }
  | { type: "retry"; at: Instant; idempotencyKey: string }
  | {
      type: "request_deletion";
      at: Instant;
      requestedByUserId: string | null;
      idempotencyKey: string;
    }
  | {
      type: "confirm_purged";
      target: (typeof ALL_DELETION_TARGETS)[number];
      at: Instant;
      idempotencyKey: string;
    };

export type TransitionError =
  | { kind: "illegal_transition"; from: ProcessingState; to: ProcessingState }
  | { kind: "not_failed"; state: ProcessingState }
  | { kind: "retries_exhausted"; stage: ProcessingState; attempts: number }
  | { kind: "not_retryable"; stage: ProcessingState }
  | { kind: "deletion_incomplete"; outstanding: readonly string[] }
  | { kind: "terminal"; state: ProcessingState };

export type TransitionResult =
  | { ok: true; run: ProcessingRun; changed: boolean }
  | { ok: false; error: TransitionError };

export const describeTransitionError = (e: TransitionError): string => {
  switch (e.kind) {
    case "illegal_transition":
      return `cannot move a processing run from "${e.from}" to "${e.to}"`;
    case "not_failed":
      return `only a failed run can be retried; this run is "${e.state}"`;
    case "retries_exhausted":
      return `stage "${e.stage}" has used all ${e.attempts} attempts`;
    case "not_retryable":
      return `the failure in stage "${e.stage}" is not retryable`;
    case "deletion_incomplete":
      return `deletion is not finished; still to purge: ${e.outstanding.join(", ")}`;
    case "terminal":
      return `"${e.state}" is a terminal state and accepts no further transitions`;
  }
};

/* -------------------------------------------------------------------------- */
/* Applying an event                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Whether this exact event has already been applied.
 *
 * Idempotency is keyed on the event's key being recorded against the stage. A
 * re-delivered webhook or a duplicated queue message must not advance the run
 * twice, so `apply` returns the unchanged run with `changed: false` instead of
 * erroring — the caller's retry succeeded, it just had no work to do.
 */
const alreadyApplied = (run: ProcessingRun, key: string): boolean =>
  run.appliedEventKeys.includes(key);

/** Bounds the dedupe log so a long-lived run cannot grow without limit. */
const MAX_APPLIED_KEYS = 500;

const touch = (run: ProcessingRun, at: Instant, key: string): ProcessingRun => ({
  ...run,
  updatedAt: at,
  appliedEventKeys: [...run.appliedEventKeys, key].slice(-MAX_APPLIED_KEYS),
});

const markStage = (
  stages: readonly ProcessingStage[],
  state: ProcessingState,
  patch: Partial<ProcessingStage>,
): ProcessingStage[] => stages.map((s) => (s.state === state ? { ...s, ...patch } : s));

/**
 * Applies one event to a run, returning a new run or a typed error.
 *
 * Pure: it never mutates its input and never reads the clock. The caller passes
 * `at`, which keeps the machine testable and keeps replay deterministic.
 */
export const applyProcessingEvent = (
  run: ProcessingRun,
  event: ProcessingEvent,
): TransitionResult => {
  if (isTerminal(run.state) && event.type !== "confirm_purged") {
    return { ok: false, error: { kind: "terminal", state: run.state } };
  }

  if (alreadyApplied(run, event.idempotencyKey)) {
    return { ok: true, run, changed: false };
  }

  switch (event.type) {
    case "advance": {
      if (!canTransition(run.state, event.to)) {
        return {
          ok: false,
          error: { kind: "illegal_transition", from: run.state, to: event.to },
        };
      }
      if (event.to === "deleted") {
        if (run.deletion === null || !isDeletionComplete(run.deletion)) {
          const outstanding = ALL_DELETION_TARGETS.filter(
            (t) => !(run.deletion?.purged ?? []).includes(t),
          );
          return { ok: false, error: { kind: "deletion_incomplete", outstanding } };
        }
      }
      return {
        ok: true,
        changed: true,
        run: touch(
          {
            ...run,
            state: event.to,
            resumeState: null,
            failure: event.to === "failed" ? run.failure : null,
            stages: markStage(run.stages, run.state, {
              status: "succeeded",
              completedAt: event.at,
            }),
          },
          event.at,
          event.idempotencyKey,
        ),
      };
    }

    case "fail": {
      if (!canTransition(run.state, "failed")) {
        return {
          ok: false,
          error: { kind: "illegal_transition", from: run.state, to: "failed" },
        };
      }
      return {
        ok: true,
        changed: true,
        run: touch(
          {
            ...run,
            state: "failed",
            failure: event.failure,
            stages: markStage(run.stages, event.failure.stage, {
              status: "failed",
              failure: event.failure,
              completedAt: event.at,
            }),
          },
          event.at,
          event.idempotencyKey,
        ),
      };
    }

    case "retry": {
      if (run.state !== "failed") {
        return { ok: false, error: { kind: "not_failed", state: run.state } };
      }
      const failure = run.failure;
      if (!failure) {
        return { ok: false, error: { kind: "not_failed", state: run.state } };
      }
      if (!failure.retryable) {
        return { ok: false, error: { kind: "not_retryable", stage: failure.stage } };
      }
      const stage = run.stages.find((s) => s.state === failure.stage);
      if (stage && !hasRetriesRemaining(stage)) {
        return {
          ok: false,
          error: {
            kind: "retries_exhausted",
            stage: failure.stage,
            attempts: stage.attempts,
          },
        };
      }
      return {
        ok: true,
        changed: true,
        run: touch(
          {
            ...run,
            state: "retrying",
            resumeState: failure.stage,
            stages: markStage(run.stages, failure.stage, {
              status: "pending",
              attempts: (stage?.attempts ?? 0) + 1,
              failure: null,
              completedAt: null,
            }),
          },
          event.at,
          event.idempotencyKey,
        ),
      };
    }

    case "request_deletion": {
      if (!canTransition(run.state, "deleting")) {
        return {
          ok: false,
          error: { kind: "illegal_transition", from: run.state, to: "deleting" },
        };
      }
      return {
        ok: true,
        changed: true,
        run: touch(
          {
            ...run,
            state: "deleting",
            resumeState: null,
            deletion: run.deletion ?? {
              requestedAt: event.at,
              requestedByUserId: event.requestedByUserId,
              purged: [],
              failed: [],
            },
          },
          event.at,
          event.idempotencyKey,
        ),
      };
    }

    case "confirm_purged": {
      if (run.deletion === null) {
        return {
          ok: false,
          error: { kind: "illegal_transition", from: run.state, to: "deleting" },
        };
      }
      if (run.deletion.purged.includes(event.target)) {
        return { ok: true, run, changed: false };
      }
      return {
        ok: true,
        changed: true,
        run: touch(
          {
            ...run,
            deletion: {
              ...run.deletion,
              purged: [...run.deletion.purged, event.target],
            },
          },
          event.at,
          event.idempotencyKey,
        ),
      };
    }
  }
};
