import { describe, expect, it } from "vitest";
import {
  GAME_BUDGET_MICRO_USD,
  IDEMPOTENCY_CONTRACT,
  PIPELINE,
  pipelineMatchesDomain,
  stageFor,
} from "./index.js";

describe("the pipeline definition", () => {
  it("matches the domain state machine exactly", () => {
    expect(pipelineMatchesDomain()).toBe(true);
  });

  it("numbers stages consecutively from zero", () => {
    expect(PIPELINE.map((s) => s.sequence)).toEqual(PIPELINE.map((_, i) => i));
  });

  it("gives every stage a timeout and an attempt limit", () => {
    for (const stage of PIPELINE) {
      expect(stage.timeoutMs, stage.state).toBeGreaterThan(0);
      expect(stage.maxAttempts, stage.state).toBeGreaterThan(0);
    }
  });

  it("puts human confirmation before any paid analysis", () => {
    const confirm = stageFor("awaiting_player_confirmation");
    const analyze = stageFor("analyzing_candidates");
    expect(confirm?.humanCheckpoint).toBe(true);
    expect(confirm!.sequence).toBeLessThan(analyze!.sequence);
  });

  it("runs the cheap discovery pass before the expensive analysis pass", () => {
    const discover = stageFor("discovering_candidate_moments")!;
    const analyze = stageFor("analyzing_candidates")!;
    expect(discover.sequence).toBeLessThan(analyze.sequence);
    expect(discover.budgetMicroUsd).toBeLessThan(analyze.budgetMicroUsd);
  });

  it("spends nothing at a human checkpoint", () => {
    for (const stage of PIPELINE.filter((s) => s.humanCheckpoint)) {
      expect(stage.budgetMicroUsd, stage.state).toBe(0);
    }
  });

  it("gives human checkpoints room to be answered by a person", () => {
    for (const stage of PIPELINE.filter((s) => s.humanCheckpoint)) {
      expect(stage.timeoutMs, stage.state).toBeGreaterThanOrEqual(24 * 60 * 60 * 1000);
    }
  });

  it("keeps the per-game budget within a plausible subscription price", () => {
    // Blueprint §16: per-game cost must support a plausible subscription. This
    // is a design ceiling, not a measurement; Phase 1 replaces it with real
    // numbers from the cost records.
    expect(GAME_BUDGET_MICRO_USD).toBe(2_401_000);
    expect(GAME_BUDGET_MICRO_USD).toBeLessThan(5_000_000);
  });

  it("states the idempotency rules a worker must satisfy", () => {
    expect(IDEMPOTENCY_CONTRACT.checkBeforeWork).toBe(true);
    expect(IDEMPOTENCY_CONTRACT.atomicResultAndTransition).toBe(true);
    expect(IDEMPOTENCY_CONTRACT.earlierStagesSurviveFailure).toBe(true);
    expect(IDEMPOTENCY_CONTRACT.keyDerivation).not.toContain("random");
    expect(IDEMPOTENCY_CONTRACT.keyDerivation).not.toContain("timestamp");
  });
});
