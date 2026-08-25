import type { BenchmarkFixture } from "./fixture.js";

/**
 * What a usable benchmark set must contain.
 *
 * The blueprint is specific about which cases matter, and they are exactly the
 * cases a set assembled casually would miss. A benchmark of twenty-five
 * comfortable moments would report high scores and tell nobody anything.
 */
export const COVERAGE_REQUIREMENTS = {
  /** Blueprint §12: a benchmark set of 20-30 manually labelled moments. */
  minFixtures: 20,
  maxFixtures: 30,
  /** Good decision, bad result. The case the product exists to teach. */
  minGoodDecisionBadOutcome: 3,
  /** Bad decision, good result. The case that teaches coaches to trust it. */
  minBadDecisionGoodOutcome: 3,
  /** Something genuinely not visible, to test that the system says so. */
  minOffScreenOrOccluded: 3,
  /** Moments a coach would reject, to measure false positives honestly. */
  minNotTeachable: 2,
  /** Moments with no applicable coach rule, to test the labelling of advice. */
  minUngrounded: 2,
  /** Distinct decision categories represented. */
  minCategories: 4,
} as const;

const GOOD_READS = new Set(["preferred", "acceptable"]);
const BAD_READS = new Set(["suboptimal", "high_risk"]);
const GOOD_RESULTS = new Set(["made_shot", "assist"]);
const BAD_RESULTS = new Set(["missed_shot", "turnover"]);

const preferredQuality = (f: BenchmarkFixture): string =>
  f.options.find((o) => o.label === f.preferredRead)?.quality ?? "unclear";

/** The read the labeller says the player actually made, if the set records one. */
const bestGradedQuality = (f: BenchmarkFixture): string => preferredQuality(f);

export const isGoodDecisionBadOutcome = (f: BenchmarkFixture): boolean =>
  GOOD_READS.has(bestGradedQuality(f)) && BAD_RESULTS.has(f.outcome);

export const isBadDecisionGoodOutcome = (f: BenchmarkFixture): boolean =>
  f.options.some((o) => BAD_READS.has(o.quality)) && GOOD_RESULTS.has(f.outcome);

export const hasVisibilityGap = (f: BenchmarkFixture): boolean =>
  f.visibility.some((v) => v !== "full_court_visible");

export type CoverageGap = { requirement: string; required: number; found: number };

export type CoverageReport = {
  fixtureCount: number;
  satisfied: boolean;
  gaps: CoverageGap[];
  counts: Record<string, number>;
};

/**
 * Reports what a benchmark set is missing.
 *
 * Returns gaps rather than a pass/fail bit, so someone assembling the set knows
 * exactly which three clips still need labelling.
 */
export const assessCoverage = (
  fixtures: readonly BenchmarkFixture[],
): CoverageReport => {
  const counts = {
    fixtures: fixtures.length,
    goodDecisionBadOutcome: fixtures.filter(isGoodDecisionBadOutcome).length,
    badDecisionGoodOutcome: fixtures.filter(isBadDecisionGoodOutcome).length,
    offScreenOrOccluded: fixtures.filter(hasVisibilityGap).length,
    notTeachable: fixtures.filter((f) => !f.teachable).length,
    ungrounded: fixtures.filter((f) => f.expectedCoachRuleKeys.length === 0).length,
    categories: new Set(fixtures.map((f) => f.expectedCategory)).size,
  };

  const gaps: CoverageGap[] = [];
  const need = (requirement: string, required: number, found: number) => {
    if (found < required) gaps.push({ requirement, required, found });
  };

  need("fixtures", COVERAGE_REQUIREMENTS.minFixtures, counts.fixtures);
  need(
    "good decision / bad outcome",
    COVERAGE_REQUIREMENTS.minGoodDecisionBadOutcome,
    counts.goodDecisionBadOutcome,
  );
  need(
    "bad decision / good outcome",
    COVERAGE_REQUIREMENTS.minBadDecisionGoodOutcome,
    counts.badDecisionGoodOutcome,
  );
  need(
    "off-screen or occluded",
    COVERAGE_REQUIREMENTS.minOffScreenOrOccluded,
    counts.offScreenOrOccluded,
  );
  need("not teachable", COVERAGE_REQUIREMENTS.minNotTeachable, counts.notTeachable);
  need(
    "no applicable coach rule",
    COVERAGE_REQUIREMENTS.minUngrounded,
    counts.ungrounded,
  );
  need("distinct categories", COVERAGE_REQUIREMENTS.minCategories, counts.categories);

  if (counts.fixtures > COVERAGE_REQUIREMENTS.maxFixtures) {
    gaps.push({
      requirement: "at most 30 fixtures (keep the set reviewable)",
      required: COVERAGE_REQUIREMENTS.maxFixtures,
      found: counts.fixtures,
    });
  }

  return { fixtureCount: counts.fixtures, satisfied: gaps.length === 0, gaps, counts };
};
