/**
 * The deterministic decision gate — pure, no I/O, no `server-only`.
 *
 * Given a parsed model verdict for one window, it decides whether a genuine,
 * teachable decision exists. Every rejection carries a specific reason. This is
 * unit-tested against recorded model responses (see test/fixtures).
 */
import {
  CANDIDATE_DECISION_CONFIDENCE_MIN,
  CANDIDATE_ID_CONFIDENCE_MIN,
  CHOICE_LETTERS,
  MIN_POST_DECISION_SECONDS,
  MIN_PRE_DECISION_SECONDS,
  PREFERRED_PRE_DECISION_SECONDS,
} from "./limits";
import type { PossessionResult } from "./schema";

export type CandidateDraft = {
  clipStartSeconds: number;
  decisionSeconds: number;
  clipEndSeconds: number;
  title: string | null;
  skillCategory: PossessionResult["skillCategory"];
  difficulty: PossessionResult["difficulty"];
  situation: string | null;
  prompt: string | null;
  answerChoices: { id: string; text: string }[];
  bestReadChoiceId: string | null;
  actualDecisionChoiceId: string | null;
  actualDecision: string | null;
  outcome: string | null;
  coachingExplanation: string | null;
  visibleEvidence: { timestampSeconds: number; observation: string }[];
  basketballInferences: { statement: string; confidence: number }[];
  coachPreferenceBasis: { questionId: string; influence: string }[];
  involvement: string | null;
  uncertainty: string[];
  playerIdConfidence: number;
  decisionConfidence: number;
  teachingValue: number;
  decisionTags: string[];
  warnings: string[];
  // --- v2: the strict-decision evidence ---
  targetEvidence: { timestampSeconds: number; observation: string }[];
  possessionSummary: string | null;
  actualAction: string | null;
  visibleOutcome: string | null;
  plausibleAlternatives: { action: string; visibleEvidence: string }[];
  whyThisIsNotRoutine: string | null;
  whyThePauseIsBeforeCommitment: string | null;
};

export type GateResult =
  | { kind: "candidate"; draft: CandidateDraft }
  | { kind: "flagged"; draft: CandidateDraft; reason: string }
  | { kind: "rejected"; reason: string; detail: string };

const round = (n: number) => Math.round(n * 10) / 10;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Run the full decision definition over a parsed model verdict.
 *
 * 1  target visibly + confidently identified
 * 2  target directly involved in the possession
 * 3  ≥ 2 plausible actions at a precise moment
 * 4  those actions supported by VISIBLE evidence, not generic knowledge
 * 5  the player commits to one
 * 6  the footage after the pause shows that action + its immediate outcome
 * 7  pausing just before commitment makes a useful "what would you do?"
 */
export function evaluatePossessionResult(
  r: PossessionResult,
  window: { startSeconds: number; endSeconds: number },
): GateResult {
  // 1 — identification
  if (!r.targetVisible) {
    return { kind: "rejected", reason: "target-not-visible", detail: r.noDecisionReason ?? "not visible" };
  }
  if (r.targetConfidence < CANDIDATE_ID_CONFIDENCE_MIN) {
    return { kind: "rejected", reason: "target-not-visible", detail: `id ${r.targetConfidence.toFixed(2)}` };
  }
  const targetEvidence = r.targetEvidence
    .filter((e) => e.timestampSeconds >= window.startSeconds - 1 && e.timestampSeconds <= window.endSeconds + 1)
    .map((e) => ({ ...e, timestampSeconds: round(clamp(e.timestampSeconds, window.startSeconds, window.endSeconds)) }))
    .sort((a, b) => a.timestampSeconds - b.timestampSeconds);
  if (targetEvidence.length < 2) {
    return { kind: "rejected", reason: "target-not-visible", detail: "no repeated visible target evidence" };
  }

  // 2 — involvement
  if (r.targetInvolvement === "not-involved" || r.targetInvolvement === null) {
    return { kind: "rejected", reason: "no-meaningful-decision", detail: "target not materially involved" };
  }

  // 3-5 — the model itself must assert a decision
  if (!r.decision) {
    return { kind: "rejected", reason: "no-meaningful-decision", detail: r.noDecisionReason ?? "model returned decision:false" };
  }
  if (r.decisionOffsetSeconds === null) {
    return { kind: "rejected", reason: "no-meaningful-decision", detail: "no decision timestamp" };
  }
  if (r.decisionOffsetSeconds < MIN_PRE_DECISION_SECONDS) {
    return {
      kind: "rejected",
      reason: "insufficient-pre-decision-context",
      detail: `offset ${r.decisionOffsetSeconds.toFixed(1)}s`,
    };
  }

  // 4 — at least two alternatives, each with its own visible evidence
  const alts = r.plausibleAlternatives
    .map((a) => ({ action: a.action.trim(), visibleEvidence: a.visibleEvidence.trim() }))
    .filter((a) => a.action.length > 0 && a.visibleEvidence.length > 0);
  if (alts.length < 2) {
    return {
      kind: "rejected",
      reason: "no-meaningful-decision",
      detail: `only ${alts.length} alternative(s) with visible evidence`,
    };
  }

  // 5 — a committed action
  if (!r.actualAction) {
    return { kind: "rejected", reason: "no-meaningful-decision", detail: "no committed action" };
  }

  // 6 — the action and its immediate outcome are visible after the pause
  if (!r.visibleOutcome || r.visibleOutcome.trim().length < 3) {
    return { kind: "rejected", reason: "outcome-not-visible", detail: "no visible outcome after the pause" };
  }

  // 5/7 — the model must justify why this is not routine and why the pause is pre-commitment
  if (!r.whyThisIsNotRoutine || r.whyThisIsNotRoutine.trim().length < 8) {
    return { kind: "rejected", reason: "no-meaningful-decision", detail: "not justified as non-routine" };
  }
  if (!r.whyThePauseIsBeforeCommitment || r.whyThePauseIsBeforeCommitment.trim().length < 8) {
    return { kind: "rejected", reason: "no-meaningful-decision", detail: "pause not justified as pre-commitment" };
  }

  // --- clip geometry ---
  const decisionSeconds = round(window.startSeconds + r.decisionOffsetSeconds);
  const clipStartSeconds = round(Math.max(0, decisionSeconds - PREFERRED_PRE_DECISION_SECONDS));
  const clipEndSeconds = round(Math.min(window.endSeconds, decisionSeconds + 6));
  const preContext = decisionSeconds - clipStartSeconds;
  if (!(clipStartSeconds < decisionSeconds && decisionSeconds < clipEndSeconds && clipEndSeconds - clipStartSeconds >= 5)) {
    return { kind: "rejected", reason: "bad-timing", detail: `d=${decisionSeconds}` };
  }
  if (preContext < MIN_PRE_DECISION_SECONDS) {
    return { kind: "rejected", reason: "insufficient-pre-decision-context", detail: `${preContext.toFixed(1)}s lead` };
  }
  if (clipEndSeconds - decisionSeconds < MIN_POST_DECISION_SECONDS) {
    return { kind: "rejected", reason: "outcome-not-visible", detail: "no room after the pause" };
  }

  // --- the rep draft ---
  const choiceTexts = r.answerChoices.map((c) => c.text.trim()).filter(Boolean);
  const uniqueText = new Set(choiceTexts.map((t) => t.toLowerCase()));
  if (
    choiceTexts.length < 2 ||
    uniqueText.size !== choiceTexts.length ||
    r.bestReadIndex === null ||
    r.bestReadIndex >= choiceTexts.length
  ) {
    return { kind: "rejected", reason: "bad-choices", detail: `${choiceTexts.length} choices` };
  }
  const choices = choiceTexts.map((text, i) => ({ id: CHOICE_LETTERS[i], text }));
  const bestReadChoiceId = CHOICE_LETTERS[r.bestReadIndex];
  const actualDecisionChoiceId =
    r.actualDecisionIndex !== null && r.actualDecisionIndex < choiceTexts.length
      ? CHOICE_LETTERS[r.actualDecisionIndex]
      : null;
  if (!r.title || !r.situation || !r.prompt || !r.coachingExplanation) {
    return { kind: "rejected", reason: "incomplete-draft", detail: "" };
  }

  const draft: CandidateDraft = {
    clipStartSeconds,
    decisionSeconds,
    clipEndSeconds,
    title: r.title,
    skillCategory: r.skillCategory,
    difficulty: r.difficulty,
    situation: r.situation,
    prompt: r.prompt,
    answerChoices: choices,
    bestReadChoiceId,
    actualDecisionChoiceId,
    actualDecision: r.actualAction,
    outcome: r.visibleOutcome,
    coachingExplanation: r.coachingExplanation,
    visibleEvidence: targetEvidence,
    basketballInferences: r.basketballInferences,
    coachPreferenceBasis: r.coachPreferenceBasis,
    involvement: r.targetInvolvement,
    uncertainty: r.uncertainty,
    playerIdConfidence: r.targetConfidence,
    decisionConfidence: r.decisionConfidence,
    teachingValue: r.teachingValue,
    decisionTags: r.decisionTags,
    warnings: r.warnings,
    targetEvidence,
    possessionSummary: r.possessionSummary,
    actualAction: r.actualAction,
    visibleOutcome: r.visibleOutcome,
    plausibleAlternatives: alts,
    whyThisIsNotRoutine: r.whyThisIsNotRoutine,
    whyThePauseIsBeforeCommitment: r.whyThePauseIsBeforeCommitment,
  };

  if (r.decisionConfidence < CANDIDATE_DECISION_CONFIDENCE_MIN) {
    return { kind: "flagged", draft, reason: `low decision confidence ${r.decisionConfidence.toFixed(2)}` };
  }
  return { kind: "candidate", draft };
}
