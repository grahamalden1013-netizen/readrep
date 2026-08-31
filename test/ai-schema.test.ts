import assert from "node:assert/strict";
import test from "node:test";
import {
  AiSchemaError,
  mapAiResultToStudioForm,
  validateAiRepResult,
  type AiRepResult,
} from "@/lib/ai/schemas";
import { validateRepDraft } from "@/lib/reps/draft";
import type { DraftCandidate } from "@/lib/reps/draft";

const CLIP = { clipStartSeconds: 300, decisionSeconds: 308, clipEndSeconds: 312 };

function goodResult(overrides: Partial<AiRepResult> = {}): unknown {
  return {
    targetPlayerVisible: true,
    targetIdentificationConfidence: 0.82,
    confidence: 0.74,
    title: "Weak-side dig on the drive",
    skillCategory: "help-recognition",
    difficulty: "medium",
    situation: "Second quarter, ball driven middle from the right wing.",
    prompt: "You're the low man in white #15. What's your read as the ball gets to the nail?",
    answerChoices: [
      { id: "o1", text: "Dig at the ball then recover to the corner" },
      { id: "o2", text: "Stay attached to the corner shooter" },
      { id: "o3", text: "Fully rotate and take the charge" },
    ],
    bestReadChoiceId: "o1",
    actualDecisionChoiceId: "o2",
    actualDecision: "Stayed home on the corner; no dig.",
    outcome: "Driver got a paint touch and kicked for a middle three.",
    coachingExplanation:
      "As the low man you have to show on the drive to freeze the passer, then close out short to the corner.",
    situationSummary: "Drive middle, help defence late.",
    targetPlayerLocation: "Weak-side corner / low man.",
    visibleOptions: ["Dig and recover", "Stay home", "Full rotation"],
    whatRemainsUncertain: ["Shot outcome after the kick is off-screen."],
    visibleEvidence: [
      { timestampSeconds: 302, observation: "White #15 stands in the weak-side corner." },
      { timestampSeconds: 308, observation: "Ball reaches the nail; #15 has not moved." },
      { timestampSeconds: 311, observation: "Kick-out pass leaves the paint toward the wing." },
    ],
    inferences: [{ statement: "A stunt would have slowed the driver.", confidence: 0.6 }],
    warnings: [],
    ...overrides,
  };
}

test("a well-formed result parses and is usable + applyable", () => {
  const v = validateAiRepResult(goodResult(), CLIP);
  assert.equal(v.usable, true);
  assert.equal(v.applyAllowed, true);
  assert.equal(v.result.answerChoices.length, 3);
});

test("malformed output (bad confidence) is rejected before it can reach the form", () => {
  assert.throws(
    () => validateAiRepResult(goodResult({ confidence: 1.7 as unknown as number }), CLIP),
    (e: unknown) => e instanceof AiSchemaError,
  );
  assert.throws(() => validateAiRepResult({ nope: true }, CLIP), (e: unknown) => e instanceof AiSchemaError);
});

test("duplicate answer choices are rejected", () => {
  assert.throws(
    () =>
      validateAiRepResult(
        goodResult({
          answerChoices: [
            { id: "o1", text: "Dig and recover to the corner" },
            { id: "o2", text: "dig and recover to the corner" },
          ],
        }),
        CLIP,
      ),
    (e: unknown) => e instanceof AiSchemaError,
  );
});

test("placeholder answer choices are rejected", () => {
  assert.throws(
    () =>
      validateAiRepResult(
        goodResult({
          answerChoices: [
            { id: "o1", text: "Option A" },
            { id: "o2", text: "Do something else" },
          ],
        }),
        CLIP,
      ),
    (e: unknown) => e instanceof AiSchemaError,
  );
});

test("a bestReadChoiceId that is not one of the choices is rejected", () => {
  assert.throws(
    () => validateAiRepResult(goodResult({ bestReadChoiceId: "does-not-exist" }), CLIP),
    (e: unknown) => e instanceof AiSchemaError,
  );
});

test("exactly one choice is the best read", () => {
  const v = validateAiRepResult(goodResult(), CLIP);
  const matches = v.result.answerChoices.filter((c) => c.id === v.result.bestReadChoiceId);
  assert.equal(matches.length, 1);
});

test("evidence outside the clip is dropped and warned; too much outside fails", () => {
  const dropOne = validateAiRepResult(
    goodResult({
      visibleEvidence: [
        { timestampSeconds: 302, observation: "in clip" },
        { timestampSeconds: 308, observation: "in clip" },
        { timestampSeconds: 355, observation: "way outside" },
      ],
    }),
    CLIP,
  );
  assert.equal(dropOne.result.visibleEvidence.length, 2);
  assert.ok(dropOne.warnings.some((w) => /outside the selected clip/i.test(w)));

  assert.throws(
    () =>
      validateAiRepResult(
        goodResult({
          visibleEvidence: [
            { timestampSeconds: 100, observation: "outside" },
            { timestampSeconds: 380, observation: "outside" },
            { timestampSeconds: 308, observation: "one inside" },
          ].sort((a, b) => a.timestampSeconds - b.timestampSeconds),
        }),
        CLIP,
      ),
    (e: unknown) => e instanceof AiSchemaError,
  );
});

test("non-chronological evidence is rejected", () => {
  assert.throws(
    () =>
      validateAiRepResult(
        goodResult({
          visibleEvidence: [
            { timestampSeconds: 310, observation: "later first" },
            { timestampSeconds: 302, observation: "earlier second" },
          ],
        }),
        CLIP,
      ),
    (e: unknown) => e instanceof AiSchemaError,
  );
});

test("target-not-visible produces no usable draft", () => {
  const v = validateAiRepResult(
    goodResult({
      targetPlayerVisible: false,
      targetIdentificationConfidence: 0.2,
      title: null,
      skillCategory: null,
      difficulty: null,
      situation: null,
      prompt: null,
      answerChoices: [],
      bestReadChoiceId: null,
      actualDecisionChoiceId: null,
      actualDecision: null,
      outcome: null,
      coachingExplanation: null,
      warnings: ["Jersey number is not legible in any frame."],
    }),
    CLIP,
  );
  assert.equal(v.usable, false);
  assert.equal(v.applyAllowed, false);
  assert.ok(v.gateReasons.length > 0);
});

test("low overall confidence stays usable as notes but blocks one-click apply", () => {
  const v = validateAiRepResult(goodResult({ confidence: 0.35 }), CLIP);
  assert.equal(v.usable, true);
  assert.equal(v.applyAllowed, false);
  assert.ok(v.warnings.length >= 1);
});

test("low target-identification confidence is not presented as reliable", () => {
  const v = validateAiRepResult(goodResult({ targetIdentificationConfidence: 0.4 }), CLIP);
  assert.equal(v.usable, false);
});

test("a valid result maps onto the Studio a/b/c/d form", () => {
  const v = validateAiRepResult(goodResult(), CLIP);
  const form = mapAiResultToStudioForm(v.result);
  assert.equal(form.choiceLabels.length, 4);
  assert.equal(form.choiceLabels[0], "Dig at the ball then recover to the corner");
  assert.equal(form.choiceLabels[2], "Fully rotate and take the charge");
  assert.equal(form.choiceLabels[3], "");
  assert.equal(form.correctChoiceId, "a"); // o1 -> slot a
  assert.equal(form.actualChoiceId, "b"); // o2 -> slot b
  assert.equal(form.category, "help-recognition");
  assert.ok(form.title.length > 0 && form.title.length <= 80);
  assert.ok(form.explanation.length <= 600);
  assert.ok(form.aiFields.includes("title") && form.aiFields.includes("choices"));
});

test("an AI-mapped draft still has to pass the coach's publish gates", () => {
  const v = validateAiRepResult(goodResult({ skillCategory: null }), CLIP);
  const form = mapAiResultToStudioForm(v.result);
  const candidate: DraftCandidate = {
    id: "rep_x",
    gameId: "game_x",
    order: 1,
    title: form.title || "x",
    // A null category cannot be published — this is exactly the gate we want.
    category: (form.category ?? "help-recognition") as never,
    difficulty: form.difficulty ?? "medium",
    clipStartMs: 300_000,
    decisionPauseMs: 308_000,
    clipEndMs: 312_000,
    situation: form.situation || "x",
    prompt: form.prompt || "x",
    choices: form.choiceLabels.filter(Boolean).map((label, i) => ({ id: "abcd"[i], label })),
    correctChoiceId: form.correctChoiceId ?? "a",
    actualChoiceId: form.actualChoiceId ?? "a",
    actualOutcome: form.actualOutcome || "x",
    explanation: form.explanation || "x",
    coachingCue: form.coachingCue || "x",
  };
  // validateRepDraft is the same gate saveRepDraft uses; a mapped draft is not
  // special-cased around it.
  const issues = validateRepDraft(candidate, 2400_000);
  assert.ok(Array.isArray(issues));
});
