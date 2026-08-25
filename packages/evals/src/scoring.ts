import type { BenchmarkFixture } from "./fixture";

/**
 * What the system produced for one fixture, reduced to the fields the benchmark
 * grades. The evaluation runner builds this; it never reads it from a model.
 */
export type SystemPrediction = {
  fixtureId: string;
  category: string;
  /** Options the system proposed, with the quality it assigned each. */
  options: readonly { label: string; quality: string }[];
  preferredRead: string;
  citedCoachRuleKeys: readonly string[];
  declaredUncertainty: readonly string[];
  outcome: string;
  teachable: boolean;
};

/**
 * Per-fixture scores.
 *
 * Deliberately several numbers rather than one. Blueprint §13 requires decision
 * discovery precision and coach-rated usefulness to be measured *separately*,
 * and a single blended score would hide exactly the failure that matters: an
 * analysis that reads the play correctly but invents a coach rule.
 */
export type FixtureScore = {
  fixtureId: string;
  categoryCorrect: boolean;
  preferredReadCorrect: boolean;
  /** Whether every rule the system cited was one the labeller expected. */
  groundingFaithful: boolean;
  /** Whether the system declared the uncertainty the labeller required. */
  uncertaintyDeclared: boolean;
  /** Whether the system read the result correctly, scored apart from the read. */
  outcomeCorrect: boolean;
  /** Whether the system agreed with the coach about teachability. */
  teachabilityCorrect: boolean;
  /**
   * The critical check: the system must not have let the result colour the
   * grade. Fails when a good read was downgraded because the shot missed, or a
   * poor read was upgraded because it went in.
   */
  outcomeIndependent: boolean;
};

const GOOD_READS = new Set(["preferred", "acceptable"]);
const BAD_READS = new Set(["suboptimal", "high_risk"]);
const GOOD_RESULTS = new Set(["made_shot", "assist"]);
const BAD_RESULTS = new Set(["missed_shot", "turnover"]);

const qualityOf = (
  options: readonly { label: string; quality: string }[],
  label: string,
): string | null => options.find((o) => o.label === label)?.quality ?? null;

/**
 * Checks that the system's grade of the preferred read did not follow the
 * result.
 *
 * The fixture says what the read was worth. If the labeller graded the read
 * good and the system graded it bad while the play also ended badly, the system
 * has probably learned to score outcomes. That is the specific failure this
 * catches.
 */
const isOutcomeIndependent = (
  fixture: BenchmarkFixture,
  prediction: SystemPrediction,
): boolean => {
  const expected = qualityOf(fixture.options, fixture.preferredRead);
  const actual = qualityOf(prediction.options, fixture.preferredRead);
  if (expected === null || actual === null) return true;
  if (expected === actual) return true;

  const downgradedAfterBadResult =
    GOOD_READS.has(expected) &&
    BAD_READS.has(actual) &&
    BAD_RESULTS.has(fixture.outcome);
  const upgradedAfterGoodResult =
    BAD_READS.has(expected) &&
    GOOD_READS.has(actual) &&
    GOOD_RESULTS.has(fixture.outcome);

  return !downgradedAfterBadResult && !upgradedAfterGoodResult;
};

export const scoreFixture = (
  fixture: BenchmarkFixture,
  prediction: SystemPrediction,
): FixtureScore => ({
  fixtureId: fixture.id,
  categoryCorrect: prediction.category === fixture.expectedCategory,
  preferredReadCorrect: prediction.preferredRead === fixture.preferredRead,
  groundingFaithful: prediction.citedCoachRuleKeys.every((k) =>
    fixture.expectedCoachRuleKeys.includes(k),
  ),
  uncertaintyDeclared: fixture.expectedUncertainty.every((u) =>
    prediction.declaredUncertainty.includes(u),
  ),
  outcomeCorrect: prediction.outcome === fixture.outcome,
  teachabilityCorrect: prediction.teachable === fixture.teachable,
  outcomeIndependent: isOutcomeIndependent(fixture, prediction),
});

export type BenchmarkSummary = {
  scored: number;
  categoryAccuracy: number;
  preferredReadAccuracy: number;
  groundingFaithfulness: number;
  uncertaintyRecall: number;
  outcomeAccuracy: number;
  teachabilityAccuracy: number;
  outcomeIndependence: number;
  /** Fixtures where the system let the result colour the grade. Never aggregate away. */
  outcomeContaminated: string[];
};

const rate = (scores: readonly FixtureScore[], pick: (s: FixtureScore) => boolean) =>
  scores.length === 0 ? 0 : scores.filter(pick).length / scores.length;

export const summarize = (scores: readonly FixtureScore[]): BenchmarkSummary => ({
  scored: scores.length,
  categoryAccuracy: rate(scores, (s) => s.categoryCorrect),
  preferredReadAccuracy: rate(scores, (s) => s.preferredReadCorrect),
  groundingFaithfulness: rate(scores, (s) => s.groundingFaithful),
  uncertaintyRecall: rate(scores, (s) => s.uncertaintyDeclared),
  outcomeAccuracy: rate(scores, (s) => s.outcomeCorrect),
  teachabilityAccuracy: rate(scores, (s) => s.teachabilityCorrect),
  outcomeIndependence: rate(scores, (s) => s.outcomeIndependent),
  outcomeContaminated: scores
    .filter((s) => !s.outcomeIndependent)
    .map((s) => s.fixtureId),
});
