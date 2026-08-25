import { describe, expect, it } from "vitest";
import { BenchmarkFixture } from "./fixture";
import {
  assessCoverage,
  isBadDecisionGoodOutcome,
  isGoodDecisionBadOutcome,
} from "./coverage";
import { scoreFixture, summarize, type SystemPrediction } from "./scoring";
import { evaluate, formatReport } from "./runner";

const fixture = (over: Record<string, unknown> = {}) =>
  BenchmarkFixture.parse({
    id: "bm-pnr-low-tag-01",
    source: {
      gameRef: "game-ref-1",
      videoAssetRef: "asset-ref-1",
      startMs: 100_000,
      endMs: 112_000,
      pausePointMs: 106_000,
    },
    labelledBy: "coach-riley",
    labelledAt: "2026-08-25T12:00:00.000Z",
    secondLabellerAgreed: true,
    expectedCategory: "pick_and_roll_read",
    visibility: ["full_court_visible"],
    options: [
      { label: "Skip to the weak-side corner", quality: "preferred" },
      { label: "Hit the roller", quality: "suboptimal" },
    ],
    preferredRead: "Skip to the weak-side corner",
    expectedCoachRuleKeys: ["pnr-low-tag"],
    expectedUncertainty: [],
    outcome: "missed_shot",
    teachable: true,
    notes: null,
    ...over,
  });

const prediction = (over: Partial<SystemPrediction> = {}): SystemPrediction => ({
  fixtureId: "bm-pnr-low-tag-01",
  category: "pick_and_roll_read",
  options: [
    { label: "Skip to the weak-side corner", quality: "preferred" },
    { label: "Hit the roller", quality: "suboptimal" },
  ],
  preferredRead: "Skip to the weak-side corner",
  citedCoachRuleKeys: ["pnr-low-tag"],
  declaredUncertainty: [],
  outcome: "missed_shot",
  teachable: true,
  ...over,
});

describe("fixture validation", () => {
  it("accepts a well-formed fixture", () => {
    expect(() => fixture()).not.toThrow();
  });

  it("rejects a pause point outside the evidence window", () => {
    expect(() =>
      fixture({
        source: {
          gameRef: "g",
          videoAssetRef: "a",
          startMs: 100_000,
          endMs: 112_000,
          pausePointMs: 5_000,
        },
      }),
    ).toThrow();
  });

  it("rejects a preferred read that is not graded preferred", () => {
    expect(() => fixture({ preferredRead: "Hit the roller" })).toThrow();
  });

  it("rejects a preferred read that is not among the options", () => {
    expect(() => fixture({ preferredRead: "Pull the ball out" })).toThrow();
  });

  it("forces an ungrounded fixture to expect the general-reasoning label", () => {
    expect(() => fixture({ expectedCoachRuleKeys: [] })).toThrow();
    expect(() =>
      fixture({
        expectedCoachRuleKeys: [],
        expectedUncertainty: ["no_applicable_coach_rule"],
      }),
    ).not.toThrow();
  });

  it("forces an off-screen fixture to expect declared uncertainty", () => {
    expect(() =>
      fixture({ visibility: ["weak_side_off_screen"], expectedUncertainty: [] }),
    ).toThrow();
    expect(() =>
      fixture({
        visibility: ["weak_side_off_screen"],
        expectedUncertainty: ["off_screen"],
      }),
    ).not.toThrow();
  });
});

describe("the instructive mismatches", () => {
  it("identifies a good decision that produced a bad result", () => {
    expect(isGoodDecisionBadOutcome(fixture({ outcome: "missed_shot" }))).toBe(true);
    expect(isGoodDecisionBadOutcome(fixture({ outcome: "made_shot" }))).toBe(false);
  });

  it("identifies a bad decision that produced a good result", () => {
    expect(isBadDecisionGoodOutcome(fixture({ outcome: "made_shot" }))).toBe(true);
  });
});

describe("coverage", () => {
  it("reports every gap in an empty set rather than passing it", () => {
    const report = assessCoverage([]);
    expect(report.satisfied).toBe(false);
    expect(report.fixtureCount).toBe(0);
    expect(report.gaps.map((g) => g.requirement)).toContain("fixtures");
    expect(report.gaps.map((g) => g.requirement)).toContain(
      "good decision / bad outcome",
    );
    expect(report.gaps.map((g) => g.requirement)).toContain("off-screen or occluded");
  });

  it("still fails a set of twenty comfortable moments", () => {
    const easy = Array.from({ length: 22 }, (_, i) =>
      fixture({ id: `bm-easy-${String(i).padStart(2, "0")}`, outcome: "made_shot" }),
    );
    const report = assessCoverage(easy);
    expect(report.counts.fixtures).toBe(22);
    expect(report.satisfied).toBe(false);
    expect(report.gaps.map((g) => g.requirement)).toContain("off-screen or occluded");
    expect(report.gaps.map((g) => g.requirement)).toContain("not teachable");
    expect(report.gaps.map((g) => g.requirement)).toContain("distinct categories");
  });

  it("flags a set that has grown past thirty", () => {
    const many = Array.from({ length: 31 }, (_, i) =>
      fixture({ id: `bm-many-${String(i).padStart(2, "0")}` }),
    );
    expect(
      assessCoverage(many).gaps.some((g) => g.requirement.includes("at most 30")),
    ).toBe(true);
  });
});

describe("scoring", () => {
  it("scores a faithful prediction across every axis", () => {
    const score = scoreFixture(fixture(), prediction());
    expect(score).toMatchObject({
      categoryCorrect: true,
      preferredReadCorrect: true,
      groundingFaithful: true,
      uncertaintyDeclared: true,
      outcomeCorrect: true,
      teachabilityCorrect: true,
      outcomeIndependent: true,
    });
  });

  it("fails grounding when the system cites a rule the coach never gave it", () => {
    const score = scoreFixture(
      fixture(),
      prediction({ citedCoachRuleKeys: ["pnr-low-tag", "invented-rule"] }),
    );
    expect(score.groundingFaithful).toBe(false);
  });

  it("fails uncertainty recall when the system does not admit what it could not see", () => {
    const f = fixture({
      visibility: ["weak_side_off_screen"],
      expectedUncertainty: ["off_screen"],
    });
    expect(scoreFixture(f, prediction()).uncertaintyDeclared).toBe(false);
    expect(
      scoreFixture(f, prediction({ declaredUncertainty: ["off_screen"] }))
        .uncertaintyDeclared,
    ).toBe(true);
  });

  it("catches a good read downgraded because the shot missed", () => {
    const score = scoreFixture(
      fixture({ outcome: "missed_shot" }),
      prediction({
        options: [
          { label: "Skip to the weak-side corner", quality: "high_risk" },
          { label: "Hit the roller", quality: "suboptimal" },
        ],
      }),
    );
    expect(score.outcomeIndependent).toBe(false);
  });

  it("catches a poor read upgraded because it went in", () => {
    const f = fixture({
      outcome: "made_shot",
      options: [
        { label: "Skip to the weak-side corner", quality: "preferred" },
        { label: "Pull up from three", quality: "high_risk" },
      ],
      preferredRead: "Skip to the weak-side corner",
    });
    const contaminated = scoreFixture(
      { ...f, preferredRead: "Pull up from three" } as never,
      prediction({
        preferredRead: "Pull up from three",
        options: [
          { label: "Skip to the weak-side corner", quality: "preferred" },
          { label: "Pull up from three", quality: "preferred" },
        ],
        outcome: "made_shot",
      }),
    );
    expect(contaminated.outcomeIndependent).toBe(false);
  });

  it("does not flag a disagreement that has nothing to do with the result", () => {
    const score = scoreFixture(
      fixture({ outcome: "reset" }),
      prediction({
        options: [
          { label: "Skip to the weak-side corner", quality: "acceptable" },
          { label: "Hit the roller", quality: "suboptimal" },
        ],
      }),
    );
    expect(score.outcomeIndependent).toBe(true);
  });

  it("keeps contaminated fixtures visible in the summary", () => {
    const bad = scoreFixture(
      fixture(),
      prediction({
        options: [
          { label: "Skip to the weak-side corner", quality: "high_risk" },
          { label: "Hit the roller", quality: "suboptimal" },
        ],
      }),
    );
    const summary = summarize([bad]);
    expect(summary.outcomeContaminated).toEqual(["bm-pnr-low-tag-01"]);
    expect(summary.outcomeIndependence).toBe(0);
  });
});

describe("the runner", () => {
  it("reports an empty benchmark honestly rather than as a pass", () => {
    const report = evaluate([], []);
    expect(report.empty).toBe(true);
    expect(report.coverage.satisfied).toBe(false);
    const text = formatReport(report);
    expect(text).toContain("No fixtures loaded");
    expect(text).toContain("has not been labelled yet");
    expect(text).not.toMatch(/100(\.0)?%/);
  });

  it("counts a fixture with no prediction as unscored, not as correct", () => {
    const report = evaluate([fixture()], []);
    expect(report.unscored).toEqual(["bm-pnr-low-tag-01"]);
    expect(report.summary.scored).toBe(0);
    expect(formatReport(report)).toContain("Unscored: 1");
  });

  it("surfaces contamination in the rendered report", () => {
    const report = evaluate(
      [fixture()],
      [
        prediction({
          options: [
            { label: "Skip to the weak-side corner", quality: "high_risk" },
            { label: "Hit the roller", quality: "suboptimal" },
          ],
        }),
      ],
    );
    expect(formatReport(report)).toContain("blocking");
  });

  it("reports invalid fixture files instead of skipping them", () => {
    const report = evaluate([], [], [{ file: "bad.json", issues: ["id: invalid"] }]);
    expect(formatReport(report)).toContain("failed validation");
  });
});
