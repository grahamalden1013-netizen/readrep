import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { BenchmarkFixture } from "./fixture";
import { assessCoverage, type CoverageReport } from "./coverage";
import {
  type BenchmarkSummary,
  type FixtureScore,
  scoreFixture,
  summarize,
  type SystemPrediction,
} from "./scoring";

export type LoadResult = {
  fixtures: BenchmarkFixture[];
  /** Files that exist but do not satisfy the schema. Reported, never skipped silently. */
  invalid: { file: string; issues: string[] }[];
};

/**
 * Loads fixtures from a directory of JSON files.
 *
 * A malformed fixture is reported rather than dropped. Silently skipping bad
 * fixtures would let the benchmark shrink without anyone noticing, which is the
 * quiet way an evaluation set stops meaning anything.
 */
export const loadFixtures = async (directory: string): Promise<LoadResult> => {
  let entries: string[];
  try {
    entries = (await readdir(directory)).filter((f) => f.endsWith(".json"));
  } catch {
    return { fixtures: [], invalid: [] };
  }

  const fixtures: BenchmarkFixture[] = [];
  const invalid: { file: string; issues: string[] }[] = [];

  for (const file of entries.sort()) {
    const raw = await readFile(join(directory, file), "utf8");
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch {
      invalid.push({ file, issues: ["file is not valid JSON"] });
      continue;
    }
    const result = BenchmarkFixture.safeParse(parsedJson);
    if (result.success) fixtures.push(result.data);
    else
      invalid.push({
        file,
        issues: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      });
  }

  return { fixtures, invalid };
};

export type EvaluationReport = {
  /** True when there is nothing to measure. Reported honestly, never as a pass. */
  empty: boolean;
  coverage: CoverageReport;
  invalid: LoadResult["invalid"];
  scores: FixtureScore[];
  summary: BenchmarkSummary;
  /** Fixtures with no matching prediction. A missing prediction is not a pass. */
  unscored: string[];
};

/**
 * Runs the benchmark.
 *
 * Works today and reports zero fixtures, because no real fixtures exist yet:
 * labelling them requires authorized footage and a coach, neither of which this
 * repository has. When fixtures are added the runner needs no changes.
 */
export const evaluate = (
  fixtures: readonly BenchmarkFixture[],
  predictions: readonly SystemPrediction[],
  invalid: LoadResult["invalid"] = [],
): EvaluationReport => {
  const byId = new Map(predictions.map((p) => [p.fixtureId, p]));
  const scores: FixtureScore[] = [];
  const unscored: string[] = [];

  for (const fixture of fixtures) {
    const prediction = byId.get(fixture.id);
    if (!prediction) {
      unscored.push(fixture.id);
      continue;
    }
    scores.push(scoreFixture(fixture, prediction));
  }

  return {
    empty: fixtures.length === 0,
    coverage: assessCoverage(fixtures),
    invalid,
    scores,
    summary: summarize(scores),
    unscored,
  };
};

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

/** Renders a report for a terminal. Says plainly when there is nothing to report. */
export const formatReport = (report: EvaluationReport): string => {
  const lines: string[] = ["ReadRep benchmark", ""];

  if (report.empty) {
    lines.push(
      "No fixtures loaded. The benchmark set has not been labelled yet.",
      "",
      "Labelling 20-30 real decision moments requires authorized game footage and a",
      "pilot coach. See docs/BENCHMARK_LABELING.md. Nothing here is fabricated, so",
      "there are no scores to show.",
    );
    if (report.invalid.length > 0) {
      lines.push("", `${report.invalid.length} fixture file(s) failed validation:`);
      for (const { file, issues } of report.invalid) {
        lines.push(`  ${file}`);
        for (const issue of issues) lines.push(`    - ${issue}`);
      }
    }
    return lines.join("\n");
  }

  lines.push(
    `Fixtures: ${report.coverage.fixtureCount}`,
    `Scored:   ${report.summary.scored}`,
  );
  if (report.unscored.length > 0) {
    lines.push(`Unscored: ${report.unscored.length} (${report.unscored.join(", ")})`);
  }
  lines.push("");

  const s = report.summary;
  lines.push(
    "Measured separately, on purpose:",
    `  category accuracy        ${pct(s.categoryAccuracy)}`,
    `  preferred-read accuracy  ${pct(s.preferredReadAccuracy)}`,
    `  grounding faithfulness   ${pct(s.groundingFaithfulness)}`,
    `  uncertainty recall       ${pct(s.uncertaintyRecall)}`,
    `  outcome accuracy         ${pct(s.outcomeAccuracy)}`,
    `  teachability agreement   ${pct(s.teachabilityAccuracy)}`,
    `  outcome independence     ${pct(s.outcomeIndependence)}`,
  );

  if (s.outcomeContaminated.length > 0) {
    lines.push(
      "",
      "The result influenced the grade on these fixtures. This is a blocking",
      "regression, not a score to average away:",
      ...s.outcomeContaminated.map((id) => `  - ${id}`),
    );
  }

  if (!report.coverage.satisfied) {
    lines.push("", "Coverage gaps:");
    for (const gap of report.coverage.gaps) {
      lines.push(`  ${gap.requirement}: need ${gap.required}, have ${gap.found}`);
    }
  }

  if (report.invalid.length > 0) {
    lines.push("", `${report.invalid.length} fixture file(s) failed validation.`);
  }

  return lines.join("\n");
};
