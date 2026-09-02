/**
 * The deterministic decision gate — pure, no I/O, no `server-only`.
 *
 * Given a parsed model verdict for one window AND the exact frame timestamps the
 * model was shown, it decides whether a genuine, teachable decision exists.
 * Every factual claim the model makes must land on a real supplied frame; a
 * claim that merely asserts "visible evidence" with no locatable frame is
 * rejected. Unit-tested against recorded model responses (see test/fixtures).
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

/** How close (seconds) a claimed timestamp must be to a real supplied frame. */
export const FRAME_MATCH_TOLERANCE_SECONDS = 1.25;

export type GroundedAlternative = { action: string; atSeconds: number; visibleEvidence: string };

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
  // --- v2: the strict-decision evidence, all timestamp-grounded ---
  targetEvidence: { timestampSeconds: number; observation: string }[];
  possessionSummary: string | null;
  actualAction: string | null;
  actualActionSeconds: number | null;
  visibleOutcome: string | null;
  visibleOutcomeSeconds: number | null;
  plausibleAlternatives: GroundedAlternative[];
  whyThisIsNotRoutine: string | null;
  whyThePauseIsBeforeCommitment: string | null;
};

export type GateResult =
  | { kind: "candidate"; draft: CandidateDraft }
  | { kind: "flagged"; draft: CandidateDraft; reason: string }
  | { kind: "rejected"; reason: string; detail: string };

const round = (n: number) => Math.round(n * 10) / 10;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function nearestFrame(absSeconds: number, frames: number[]): { t: number; gap: number } | null {
  if (frames.length === 0) return null;
  let best = frames[0];
  for (const f of frames) if (Math.abs(f - absSeconds) < Math.abs(best - absSeconds)) best = f;
  const gap = Math.abs(best - absSeconds);
  return gap <= FRAME_MATCH_TOLERANCE_SECONDS ? { t: best, gap } : null;
}

/**
 * Run the full decision definition over a parsed model verdict.
 *
 * @param frameTimestamps the exact seconds-into-game of every frame the model saw
 */
export function evaluatePossessionResult(
  r: PossessionResult,
  window: { startSeconds: number; endSeconds: number },
  frameTimestamps: number[] = [],
): GateResult {
  // 1 — identification, grounded on supplied frames
  if (!r.targetVisible) {
    return { kind: "rejected", reason: "target-not-visible", detail: r.noDecisionReason ?? "not visible" };
  }
  if (r.targetConfidence < CANDIDATE_ID_CONFIDENCE_MIN) {
    return { kind: "rejected", reason: "target-not-visible", detail: `id ${r.targetConfidence.toFixed(2)}` };
  }
  const targetEvidence = r.targetEvidence
    .map((e) => ({ ...e, timestampSeconds: round(clamp(e.timestampSeconds, window.startSeconds, window.endSeconds)) }))
    .filter((e) => frameTimestamps.length === 0 || nearestFrame(e.timestampSeconds, frameTimestamps) !== null)
    .sort((a, b) => a.timestampSeconds - b.timestampSeconds);
  if (targetEvidence.length < 2) {
    return { kind: "rejected", reason: "target-not-visible", detail: "target evidence not on supplied frames" };
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
  const decisionSeconds = round(window.startSeconds + r.decisionOffsetSeconds);

  // 4 — ≥ 2 alternatives, each PINNED to a real frame at or before the pause
  const alts: GroundedAlternative[] = [];
  for (const a of r.plausibleAlternatives) {
    const action = a.action.trim();
    const evidence = a.visibleEvidence.trim();
    if (!action || !evidence) continue;
    const atAbs = round(window.startSeconds + a.atSecondsFromWindowStart);
    if (atAbs > decisionSeconds + 0.75) continue; // must be available before commitment
    if (frameTimestamps.length > 0 && !nearestFrame(atAbs, frameTimestamps)) continue; // must be a real frame
    alts.push({ action, atSeconds: atAbs, visibleEvidence: evidence });
  }
  if (alts.length < 2) {
    return {
      kind: "rejected",
      reason: "no-meaningful-decision",
      detail: `only ${alts.length} alternative(s) grounded on a frame before the pause`,
    };
  }

  // 5 — a committed action, visible AFTER the pause on a real frame
  if (!r.actualAction) {
    return { kind: "rejected", reason: "no-meaningful-decision", detail: "no committed action" };
  }
  if (r.actualActionOffsetSeconds === null) {
    return { kind: "rejected", reason: "outcome-not-visible", detail: "no timestamp for the committed action" };
  }
  const actualActionSeconds = round(window.startSeconds + r.actualActionOffsetSeconds);
  if (actualActionSeconds <= decisionSeconds || actualActionSeconds > window.endSeconds + 0.5) {
    return { kind: "rejected", reason: "outcome-not-visible", detail: "committed action not shown after the pause" };
  }
  if (frameTimestamps.length > 0 && !nearestFrame(actualActionSeconds, frameTimestamps)) {
    return { kind: "rejected", reason: "outcome-not-visible", detail: "committed action not on a supplied frame" };
  }

  // 6 — the outcome, visible on a real frame at or after the action
  if (!r.visibleOutcome || r.visibleOutcome.trim().length < 3 || r.visibleOutcomeOffsetSeconds === null) {
    return { kind: "rejected", reason: "outcome-not-visible", detail: "no visible outcome after the pause" };
  }
  const visibleOutcomeSeconds = round(window.startSeconds + r.visibleOutcomeOffsetSeconds);
  if (visibleOutcomeSeconds < actualActionSeconds - 0.75 || visibleOutcomeSeconds > window.endSeconds + 0.5) {
    return { kind: "rejected", reason: "outcome-not-visible", detail: "outcome timestamp out of order" };
  }
  if (frameTimestamps.length > 0 && !nearestFrame(visibleOutcomeSeconds, frameTimestamps)) {
    return { kind: "rejected", reason: "outcome-not-visible", detail: "outcome not on a supplied frame" };
  }

  // 5/7 — the model must justify non-routine + pre-commitment
  if (!r.whyThisIsNotRoutine || r.whyThisIsNotRoutine.trim().length < 8) {
    return { kind: "rejected", reason: "no-meaningful-decision", detail: "not justified as non-routine" };
  }
  if (!r.whyThePauseIsBeforeCommitment || r.whyThePauseIsBeforeCommitment.trim().length < 8) {
    return { kind: "rejected", reason: "no-meaningful-decision", detail: "pause not justified as pre-commitment" };
  }

  // --- clip geometry ---
  const clipStartSeconds = round(Math.max(0, decisionSeconds - PREFERRED_PRE_DECISION_SECONDS));
  const clipEndSeconds = round(Math.min(window.endSeconds, Math.max(decisionSeconds + 6, visibleOutcomeSeconds + 1)));
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
    actualActionSeconds,
    visibleOutcome: r.visibleOutcome,
    visibleOutcomeSeconds,
    plausibleAlternatives: alts,
    whyThisIsNotRoutine: r.whyThisIsNotRoutine,
    whyThePauseIsBeforeCommitment: r.whyThePauseIsBeforeCommitment,
  };

  if (r.decisionConfidence < CANDIDATE_DECISION_CONFIDENCE_MIN) {
    return { kind: "flagged", draft, reason: `low decision confidence ${r.decisionConfidence.toFixed(2)}` };
  }
  return { kind: "candidate", draft };
}
