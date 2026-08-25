import { describe, expect, it, vi } from "vitest";
import { nullLogger, createInMemoryMetricsSink } from "@readrep/observability";
import { OPERATIONS, decisionAnalysis, frameWindowSummary } from "./operations/index";
import {
  createScriptedProvider,
  notConfiguredProvider,
  ProviderNotConfiguredError,
  type ProviderAdapter,
} from "./provider";
import { hashInput, runOperation } from "./runner";

const window = {
  videoAssetId: "asset-1",
  startMs: 1000,
  endMs: 9000,
  frameIds: ["frame-1"],
};

const validSummary = {
  confidence: { score: 0.8, basis: "clear angle" },
  uncertainty: [],
  observations: [
    { atMs: 4000, description: "Ball handler uses the screen.", visible: true },
  ],
  visibilityLimits: [],
};

const scripted = (output: unknown, cost = 5_000): ProviderAdapter =>
  createScriptedProvider({
    frame_window_summary: {
      output,
      modelVersion: "test-model-1",
      inputTokens: 900,
      outputTokens: 120,
      estimatedCostMicroUsd: cost,
    },
  });

describe("the operation registry", () => {
  it("holds exactly the eight blueprint operations", () => {
    expect(Object.keys(OPERATIONS).sort()).toEqual(
      [
        "coach_review_assist",
        "coach_rule_match",
        "decision_analysis",
        "decision_candidate_rank",
        "frame_window_summary",
        "player_explanation",
        "player_question",
        "session_recommendation",
      ].sort(),
    );
  });

  it("gives every operation a timeout, a cost ceiling, and versions", () => {
    for (const op of Object.values(OPERATIONS)) {
      expect(op.timeoutMs, op.name).toBeGreaterThan(0);
      expect(op.maxCostMicroUsd, op.name).toBeGreaterThan(0);
      expect(op.promptVersion, op.name).toMatch(/^\d+\.\d+\.\d+$/);
      expect(op.schemaVersion, op.name).toMatch(/^\d+\.\d+\.\d+$/);
      expect(op.purpose.length, op.name).toBeGreaterThan(20);
    }
  });

  it("names each operation consistently with its registry key", () => {
    for (const [key, op] of Object.entries(OPERATIONS)) {
      expect(op.name).toBe(key);
    }
  });
});

describe("Phase 0 makes no model calls", () => {
  it("fails loudly instead of inventing analysis", async () => {
    const result = await runOperation(
      frameWindowSummary,
      { window, targetTrackId: null },
      { provider: notConfiguredProvider, logger: nullLogger },
    );
    expect(result.status).toBe("provider_error");
    expect(result.record.errorMessage).toContain("No AI provider is configured");
    expect(result.record.output).toBeNull();
  });

  it("throws a named error a caller can branch on", async () => {
    await expect(
      notConfiguredProvider.execute({
        operation: frameWindowSummary as never,
        input: {} as never,
        timeoutMs: 1,
        signal: new AbortController().signal,
      }),
    ).rejects.toBeInstanceOf(ProviderNotConfiguredError);
  });
});

describe("input validation happens before any spend", () => {
  it("rejects malformed input without calling the provider", async () => {
    const execute = vi.fn();
    const provider: ProviderAdapter = { name: "spy", supports: () => true, execute };
    const result = await runOperation(
      frameWindowSummary,
      { window: { ...window, endMs: -5 }, targetTrackId: null },
      { provider, logger: nullLogger },
    );
    expect(result.status).toBe("schema_rejected");
    expect(execute).not.toHaveBeenCalled();
  });
});

describe("output validation", () => {
  it("accepts output that satisfies the schema", async () => {
    const result = await runOperation(
      frameWindowSummary,
      { window, targetTrackId: null },
      { provider: scripted(validSummary), logger: nullLogger },
    );
    expect(result.status).toBe("succeeded");
    if (result.status !== "succeeded") throw new Error("unreachable");
    expect(result.output.observations[0]?.visible).toBe(true);
    expect(result.record.modelVersion).toBe("test-model-1");
  });

  it("rejects output that is missing required grounding", async () => {
    const result = await runOperation(
      frameWindowSummary,
      { window, targetTrackId: null },
      {
        provider: scripted({
          observations: [{ atMs: 1, description: "x", visible: true }],
        }),
        logger: nullLogger,
      },
    );
    expect(result.status).toBe("schema_rejected");
    expect(result.record.errorMessage).toContain(
      "did not satisfy the operation schema",
    );
  });

  it("never partially adopts non-conforming output", async () => {
    const result = await runOperation(
      frameWindowSummary,
      { window, targetTrackId: null },
      {
        provider: scripted({ ...validSummary, observations: [] }),
        logger: nullLogger,
      },
    );
    expect(result.status).toBe("schema_rejected");
    expect(result.record.output).toBeNull();
  });

  it("requires an observation to declare whether it was visible", async () => {
    const result = await runOperation(
      frameWindowSummary,
      { window, targetTrackId: null },
      {
        provider: scripted({
          ...validSummary,
          observations: [{ atMs: 4000, description: "The wing is spaced correctly." }],
        }),
        logger: nullLogger,
      },
    );
    expect(result.status).toBe("schema_rejected");
  });
});

describe("timeouts", () => {
  it("records a timeout rather than waiting indefinitely", async () => {
    const provider: ProviderAdapter = {
      name: "slow",
      supports: () => true,
      execute: ({ signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    };
    const fast = { ...frameWindowSummary, timeoutMs: 10 };
    const result = await runOperation(
      fast,
      { window, targetTrackId: null },
      { provider, logger: nullLogger },
    );
    expect(result.status).toBe("timed_out");
    expect(result.record.errorMessage).toContain("budget");
  });
});

describe("cost and idempotency", () => {
  it("records cost and latency for a successful call", async () => {
    const metrics = createInMemoryMetricsSink();
    await runOperation(
      frameWindowSummary,
      { window, targetTrackId: null },
      {
        provider: scripted(validSummary, 7_500),
        logger: nullLogger,
        metrics,
        gameId: "game-1",
      },
    );
    expect(metrics.totalMicroUsd()).toBe(7_500);
    expect(metrics.latencies[0]?.outcome).toBe("succeeded");
    expect(metrics.costs[0]?.gameId).toBe("game-1");
  });

  it("records latency even when the operation fails", async () => {
    const metrics = createInMemoryMetricsSink();
    await runOperation(
      frameWindowSummary,
      { window, targetTrackId: null },
      { provider: notConfiguredProvider, logger: nullLogger, metrics },
    );
    expect(metrics.latencies[0]?.outcome).toBe("failed");
  });

  it("hashes identical inputs identically regardless of key order", () => {
    const a = hashInput("decision_analysis", { x: 1, y: [1, 2], z: { b: 2, a: 1 } });
    const b = hashInput("decision_analysis", { z: { a: 1, b: 2 }, y: [1, 2], x: 1 });
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("distinguishes different inputs", () => {
    expect(hashInput("decision_analysis", { x: 1 })).not.toBe(
      hashInput("decision_analysis", { x: 2 }),
    );
  });

  it("serves a cached result without calling the provider again", async () => {
    const execute = vi.fn();
    const provider: ProviderAdapter = { name: "spy", supports: () => true, execute };
    const inputHash = hashInput("frame_window_summary", {
      window,
      targetTrackId: null,
    });
    const result = await runOperation(
      frameWindowSummary,
      { window, targetTrackId: null },
      {
        provider,
        logger: nullLogger,
        lookupCached: async (h) =>
          h === inputHash
            ? ({
                id: "aiop-cached",
                operation: "frame_window_summary",
                status: "succeeded",
                inputHash: h,
                providerName: "scripted",
                modelVersion: "test-model-1",
                promptVersion: "0.1.0",
                schemaVersion: "0.1.0",
                output: validSummary,
                errorMessage: null,
                citation: null,
                latencyMs: 10,
                cost: { inputTokens: 1, outputTokens: 1, estimatedCostMicroUsd: 1 },
                startedAt: "2026-08-25T12:00:00.000Z",
                completedAt: "2026-08-25T12:00:01.000Z",
              } as never)
            : null,
      },
    );
    expect(result.status).toBe("succeeded");
    expect(execute).not.toHaveBeenCalled();
  });
});

describe("decision_analysis keeps quality and outcome apart", () => {
  const validAnalysis = {
    confidence: { score: 0.7, basis: "target player clearly visible" },
    uncertainty: [],
    observedFacts: ["The low defender steps toward the roller."],
    basketballInference: ["The weak-side corner is unattended."],
    visualCue: "Read the defender who leaves first.",
    options: [
      {
        label: "Skip to the weak-side corner",
        quality: "preferred",
        rationale: "The corner defender left first.",
      },
      {
        label: "Hit the roller",
        quality: "suboptimal",
        rationale: "The roll is already tagged.",
      },
    ],
    preferredOptionLabel: "Skip to the weak-side corner",
    teachingCue: "Find the help defender's man before picking up the dribble.",
    outcome: "missed_shot",
    citedRuleIds: ["pnr-low-tag"],
  };

  it("grades each option and records the result as an independent field", () => {
    const parsed = decisionAnalysis.outputSchema.parse(validAnalysis);
    expect(parsed.options.map((o) => o.quality)).toEqual(["preferred", "suboptimal"]);
    expect(parsed.outcome).toBe("missed_shot");
  });

  it("accepts a preferred read whose possession ended in a miss", () => {
    const parsed = decisionAnalysis.outputSchema.parse({
      ...validAnalysis,
      outcome: "turnover",
    });
    expect(parsed.options[0]?.quality).toBe("preferred");
    expect(parsed.outcome).toBe("turnover");
  });

  it("has no correctness field for a model to fill in", () => {
    const parsed = decisionAnalysis.outputSchema.parse({
      ...validAnalysis,
      isCorrect: true,
      wasSuccessful: true,
    });
    const keys = JSON.stringify(Object.keys(parsed));
    expect(keys).not.toContain("isCorrect");
    expect(keys).not.toContain("wasSuccessful");
  });

  it("rejects an option graded on a scale it does not define", () => {
    const result = decisionAnalysis.outputSchema.safeParse({
      ...validAnalysis,
      options: [
        { label: "A", quality: "correct", rationale: "because it went in" },
        { label: "B", quality: "wrong", rationale: "because it missed" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("can cite supplied rules but has no field for authoring one", () => {
    const parsed = decisionAnalysis.outputSchema.parse({
      ...validAnalysis,
      newRule: "always shoot",
      authoredRule: "always shoot",
    });
    expect(parsed.citedRuleIds).toEqual(["pnr-low-tag"]);
    const keys = JSON.stringify(Object.keys(parsed));
    expect(keys).not.toContain("newRule");
    expect(keys).not.toContain("authoredRule");
  });
});
