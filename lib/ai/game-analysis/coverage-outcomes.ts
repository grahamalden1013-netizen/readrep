/**
 * The window-outcome taxonomy — pure, no `server-only`, imported by both the
 * worker/harness (via coverage.ts) and the tests.
 */
import type { AnalyzedPossession } from "./possession";

export type WindowOutcome =
  | "valid-decision" // a coachable decision was found (candidate, or candidate flagged low-confidence)
  | "target-not-visible" // the target player could not be identified in the window
  | "target-no-decision" // the target was visible but no usable decision
  | "invalid-output" // the model returned something that did not parse / validate
  | "processing-failure"; // frames unavailable, or the provider errored after bounded retries

export type WindowLedgerEntry = {
  index: number;
  startSeconds: number;
  endSeconds: number;
  outcome: WindowOutcome;
  reason: string;
  attempts: number;
  decisionSeconds?: number;
  flaggedLowConfidence?: boolean;
};

const NO_DECISION_REASONS = new Set([
  "no-decision",
  "bad-timing",
  "no-outcome-room",
  "weak-evidence",
  "bad-choices",
  "incomplete-draft",
]);

/** Map one analyzer result to its terminal window outcome. */
export function classifyOutcome(r: AnalyzedPossession): { outcome: WindowOutcome; reason: string } {
  if (r.kind === "candidate") return { outcome: "valid-decision", reason: "candidate" };
  if (r.kind === "flagged") return { outcome: "valid-decision", reason: `flagged: ${r.reason}` };
  if (r.reason === "target-not-visible") return { outcome: "target-not-visible", reason: "not visible" };
  if (r.reason === "low-identification") return { outcome: "target-not-visible", reason: r.detail || "low id confidence" };
  if (r.reason === "invalid-output") return { outcome: "invalid-output", reason: r.detail || "invalid output" };
  if (r.reason === "frames-unavailable") return { outcome: "processing-failure", reason: r.detail || "frames unavailable" };
  if (NO_DECISION_REASONS.has(r.reason)) return { outcome: "target-no-decision", reason: r.reason };
  return { outcome: "target-no-decision", reason: r.reason };
}

/** Tally a ledger into the five buckets. */
export function summariseLedger(
  ledger: WindowLedgerEntry[],
): Record<WindowOutcome, number> & { total: number } {
  const base: Record<WindowOutcome, number> = {
    "valid-decision": 0,
    "target-not-visible": 0,
    "target-no-decision": 0,
    "invalid-output": 0,
    "processing-failure": 0,
  };
  for (const e of ledger) base[e.outcome] += 1;
  return { ...base, total: ledger.length };
}
