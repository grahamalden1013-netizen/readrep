import { describe, expect, it } from "vitest";
import {
  ALL_DELETION_TARGETS,
  ProcessingRun,
  ProcessingState,
  retryDelayMs,
} from "../entities/processing.js";
import {
  applyProcessingEvent,
  canTransition,
  isTerminal,
  LEGAL_TRANSITIONS,
  nextOnSuccess,
  PIPELINE_ORDER,
  type ProcessingEvent,
} from "./processing.js";

const AT = "2026-08-25T12:00:00.000Z";
const LATER = "2026-08-25T12:05:00.000Z";

// Fixtures are written as plain data and validated by the schema, which is
// exactly how a repository adapter will build them. Typing the override as
// loose input keeps branded ids out of the test bodies without weakening the
// runtime validation that every fixture still goes through.
const run = (over: Record<string, unknown> = {}): ProcessingRun =>
  ProcessingRun.parse({
    id: "run-1",
    gameId: "game-1",
    videoAssetId: "asset-1",
    state: "created",
    pipelineVersion: "0.1.0",
    stages: [],
    createdAt: AT,
    updatedAt: AT,
    ...over,
  });

const advance = (to: ProcessingState, key = `k-${to}`): ProcessingEvent => ({
  type: "advance",
  to,
  at: LATER,
  idempotencyKey: key,
});

const ALL_STATES = ProcessingState.options;

describe("the transition table", () => {
  it("covers every state", () => {
    expect(Object.keys(LEGAL_TRANSITIONS).sort()).toEqual([...ALL_STATES].sort());
  });

  it("only ever points at real states", () => {
    for (const [from, targets] of Object.entries(LEGAL_TRANSITIONS)) {
      for (const to of targets) {
        expect(ALL_STATES, `${from} -> ${to}`).toContain(to);
      }
    }
  });

  it("treats deleted as the only terminal state", () => {
    const terminal = ALL_STATES.filter(isTerminal);
    expect(terminal).toEqual(["deleted"]);
  });

  it("lets every non-deleted state begin deletion", () => {
    for (const state of ALL_STATES) {
      if (state === "deleted" || state === "deleting") continue;
      expect(canTransition(state, "deleting"), `${state} -> deleting`).toBe(true);
    }
  });

  it("walks the whole happy path in order", () => {
    for (let i = 0; i < PIPELINE_ORDER.length - 1; i += 1) {
      const from = PIPELINE_ORDER[i]!;
      const to = PIPELINE_ORDER[i + 1]!;
      expect(canTransition(from, to), `${from} -> ${to}`).toBe(true);
      expect(nextOnSuccess(from)).toBe(to);
    }
  });

  it("does not let a completed run fail", () => {
    expect(canTransition("completed", "failed")).toBe(false);
  });
});

describe("rejecting invalid transitions", () => {
  it("refuses to skip stages", () => {
    const result = applyProcessingEvent(
      run({ state: "created" }),
      advance("transcoding"),
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected rejection");
    expect(result.error).toEqual({
      kind: "illegal_transition",
      from: "created",
      to: "transcoding",
    });
  });

  it("refuses to move backwards", () => {
    const result = applyProcessingEvent(
      run({ state: "transcoding" }),
      advance("uploading"),
    );
    expect(result.ok).toBe(false);
  });

  it("refuses every transition out of the terminal state", () => {
    const deleted = run({
      state: "deleted",
      deletion: { requestedAt: AT, requestedByUserId: null, purged: [], failed: [] },
    });
    for (const to of ALL_STATES) {
      const result = applyProcessingEvent(deleted, advance(to, `k-${to}-terminal`));
      expect(result.ok, `deleted -> ${to}`).toBe(false);
    }
  });

  it("rejects every transition the table does not list", () => {
    let rejected = 0;
    for (const from of ALL_STATES) {
      if (from === "deleted") continue;
      for (const to of ALL_STATES) {
        if (LEGAL_TRANSITIONS[from].includes(to)) continue;
        const base = run({
          state: from,
          failure:
            from === "failed"
              ? {
                  code: "provider_error",
                  message: "x",
                  retryable: true,
                  occurredAt: AT,
                  stage: "transcoding",
                }
              : null,
          resumeState: from === "retrying" ? "transcoding" : null,
          deletion:
            from === "deleting"
              ? { requestedAt: AT, requestedByUserId: null, purged: [], failed: [] }
              : null,
        });
        const result = applyProcessingEvent(base, advance(to, `x-${from}-${to}`));
        expect(result.ok, `${from} -> ${to} should be rejected`).toBe(false);
        rejected += 1;
      }
    }
    // Guard against the loop silently testing nothing.
    expect(rejected).toBeGreaterThan(100);
  });
});

describe("idempotency", () => {
  it("returns the run unchanged when the same event is redelivered", () => {
    const first = applyProcessingEvent(
      run({
        state: "uploading",
        stages: [
          {
            id: "stage-1",
            runId: "run-1",
            state: "uploading",
            status: "running",
            sequence: 0,
            idempotencyKey: "webhook-abc",
            attempts: 1,
            maxAttempts: 3,
            progress: null,
            artifacts: [],
            failure: null,
            costMicroUsd: 0,
            startedAt: AT,
            completedAt: null,
          },
        ],
      }),
      { type: "advance", to: "uploaded", at: LATER, idempotencyKey: "webhook-abc" },
    );
    expect(first.ok).toBe(true);
    if (!first.ok) throw new Error("unreachable");
    expect(first.changed).toBe(true);
    expect(first.run.state).toBe("uploaded");

    const replay = applyProcessingEvent(first.run, {
      type: "advance",
      to: "securing",
      at: LATER,
      idempotencyKey: "webhook-abc",
    });
    expect(replay.ok).toBe(true);
    if (!replay.ok) throw new Error("unreachable");
    expect(replay.changed).toBe(false);
    expect(replay.run.state).toBe("uploaded");
  });
});

describe("failure and retry", () => {
  const failing = run({
    state: "transcoding",
    stages: [
      {
        id: "stage-t",
        runId: "run-1",
        state: "transcoding",
        status: "running",
        sequence: 5,
        idempotencyKey: "stage-transcode",
        attempts: 1,
        maxAttempts: 3,
        progress: null,
        artifacts: [],
        failure: null,
        costMicroUsd: 0,
        startedAt: AT,
        completedAt: null,
      },
    ],
  });

  const failure = {
    code: "provider_timeout" as const,
    message: "provider did not respond",
    retryable: true,
    occurredAt: LATER,
    stage: "transcoding" as const,
  };

  it("records the failure against the stage that failed", () => {
    const result = applyProcessingEvent(failing, {
      type: "fail",
      failure,
      at: LATER,
      idempotencyKey: "fail-1",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.run.state).toBe("failed");
    expect(result.run.failure).toEqual(failure);
    expect(result.run.stages[0]?.status).toBe("failed");
  });

  it("resumes a retry at the stage that failed, preserving earlier work", () => {
    const failed = applyProcessingEvent(failing, {
      type: "fail",
      failure,
      at: LATER,
      idempotencyKey: "fail-2",
    });
    if (!failed.ok) throw new Error("unreachable");

    const retried = applyProcessingEvent(failed.run, {
      type: "retry",
      at: LATER,
      idempotencyKey: "retry-1",
    });
    expect(retried.ok).toBe(true);
    if (!retried.ok) throw new Error("unreachable");
    expect(retried.run.state).toBe("retrying");
    expect(retried.run.resumeState).toBe("transcoding");
    expect(retried.run.stages[0]?.attempts).toBe(2);
    expect(retried.run.stages[0]?.failure).toBeNull();

    const resumed = applyProcessingEvent(
      retried.run,
      advance("transcoding", "resume-1"),
    );
    expect(resumed.ok).toBe(true);
    if (!resumed.ok) throw new Error("unreachable");
    expect(resumed.run.state).toBe("transcoding");
  });

  it("refuses to retry a run that has not failed", () => {
    const result = applyProcessingEvent(run({ state: "transcoding" }), {
      type: "retry",
      at: LATER,
      idempotencyKey: "retry-2",
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.error.kind).toBe("not_failed");
  });

  it("refuses to retry a failure that is not retryable", () => {
    const failed = applyProcessingEvent(failing, {
      type: "fail",
      failure: { ...failure, code: "consent_missing", retryable: false },
      at: LATER,
      idempotencyKey: "fail-3",
    });
    if (!failed.ok) throw new Error("unreachable");
    const result = applyProcessingEvent(failed.run, {
      type: "retry",
      at: LATER,
      idempotencyKey: "retry-3",
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.error.kind).toBe("not_retryable");
  });

  it("refuses to retry once attempts are exhausted", () => {
    const exhausted = run({
      state: "failed",
      failure,
      stages: [
        {
          id: "stage-t",
          runId: "run-1",
          state: "transcoding",
          status: "failed",
          sequence: 5,
          idempotencyKey: "stage-transcode-x",
          attempts: 3,
          maxAttempts: 3,
          progress: null,
          artifacts: [],
          failure,
          costMicroUsd: 0,
          startedAt: AT,
          completedAt: LATER,
        },
      ],
    });
    const result = applyProcessingEvent(exhausted, {
      type: "retry",
      at: LATER,
      idempotencyKey: "retry-4",
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.error.kind).toBe("retries_exhausted");
  });

  it("backs off exponentially and caps at thirty minutes", () => {
    expect(retryDelayMs(0)).toBe(1000);
    expect(retryDelayMs(1)).toBe(2000);
    expect(retryDelayMs(4)).toBe(16000);
    expect(retryDelayMs(50)).toBe(30 * 60 * 1000);
  });
});

describe("deletion propagation", () => {
  it("will not mark a run deleted until every target is purged", () => {
    const deleting = applyProcessingEvent(run({ state: "completed" }), {
      type: "request_deletion",
      at: LATER,
      requestedByUserId: "user-1",
      idempotencyKey: "del-1",
    });
    if (!deleting.ok) throw new Error("unreachable");
    expect(deleting.run.state).toBe("deleting");

    const premature = applyProcessingEvent(
      deleting.run,
      advance("deleted", "del-early"),
    );
    expect(premature.ok).toBe(false);
    if (premature.ok) throw new Error("unreachable");
    expect(premature.error.kind).toBe("deletion_incomplete");

    let current = deleting.run;
    for (const target of ALL_DELETION_TARGETS) {
      const step = applyProcessingEvent(current, {
        type: "confirm_purged",
        target,
        at: LATER,
        idempotencyKey: `purge-${target}`,
      });
      if (!step.ok) throw new Error(`failed to purge ${target}`);
      current = step.run;
    }

    const done = applyProcessingEvent(current, advance("deleted", "del-final"));
    expect(done.ok).toBe(true);
    if (!done.ok) throw new Error("unreachable");
    expect(done.run.state).toBe("deleted");
  });

  it("covers originals, derivatives, and analysis artifacts", () => {
    expect(ALL_DELETION_TARGETS).toContain("provider_original");
    expect(ALL_DELETION_TARGETS).toContain("player_crops");
    expect(ALL_DELETION_TARGETS).toContain("embeddings");
    expect(ALL_DELETION_TARGETS).toContain("decision_candidates");
    expect(ALL_DELETION_TARGETS).toContain("learning_moments");
  });

  it("ignores a duplicate purge confirmation", () => {
    const deleting = applyProcessingEvent(run({ state: "completed" }), {
      type: "request_deletion",
      at: LATER,
      requestedByUserId: null,
      idempotencyKey: "del-2",
    });
    if (!deleting.ok) throw new Error("unreachable");
    const once = applyProcessingEvent(deleting.run, {
      type: "confirm_purged",
      target: "frames",
      at: LATER,
      idempotencyKey: "p-1",
    });
    if (!once.ok) throw new Error("unreachable");
    const twice = applyProcessingEvent(once.run, {
      type: "confirm_purged",
      target: "frames",
      at: LATER,
      idempotencyKey: "p-2",
    });
    if (!twice.ok) throw new Error("unreachable");
    expect(twice.changed).toBe(false);
    expect(twice.run.deletion?.purged).toEqual(["frames"]);
  });
});

describe("run invariants", () => {
  it("requires a failed run to carry its failure", () => {
    expect(() => run({ state: "failed" })).toThrow();
  });

  it("requires a retrying run to say where it resumes", () => {
    expect(() => run({ state: "retrying" })).toThrow();
  });

  it("requires a deleting run to carry its deletion checklist", () => {
    expect(() => run({ state: "deleting" })).toThrow();
  });
});
