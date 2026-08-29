import assert from "node:assert/strict";
import test from "node:test";
import { toPublicRep, toReveal } from "@/lib/reps/public-rep";
import { validateRepDraft } from "@/lib/reps/validate-draft";
import { DEMO_REPS } from "@/lib/reps/seed";

test("a rep sent to the browser carries nothing that gives the answer away", () => {
  const leaky = ["correctChoiceId", "actualChoiceId", "actualOutcome", "explanation", "coachingCue"];
  for (const rep of DEMO_REPS) {
    const publicRep = toPublicRep(rep) as Record<string, unknown>;
    for (const key of leaky) {
      assert.equal(publicRep[key], undefined, `${rep.id} leaked ${key}`);
    }
    assert.ok(publicRep.prompt);
    assert.ok(Array.isArray(publicRep.choices));
  }
});

test("the reveal grades the choice the player actually made", () => {
  const rep = DEMO_REPS[0];
  const wrong = rep.choices.find((choice) => choice.id !== rep.correctChoiceId)!;

  assert.equal(toReveal(rep, rep.correctChoiceId).isCorrect, true);
  assert.equal(toReveal(rep, wrong.id).isCorrect, false);
  assert.equal(toReveal(rep, wrong.id).chosenChoiceId, wrong.id);
  assert.equal(toReveal(rep, wrong.id).correctChoiceId, rep.correctChoiceId);
});

test("the studio rejects drafts the app could not play", () => {
  const valid = validateRepDraft(JSON.stringify(DEMO_REPS[0]));
  assert.equal(valid.ok, true);

  const badJson = validateRepDraft("{");
  assert.equal(badJson.ok, false);

  // Pause outside the clip window would strand the player on a frozen video.
  const badTiming = validateRepDraft(
    JSON.stringify({ ...DEMO_REPS[0], decisionPauseMs: DEMO_REPS[0].clipEndMs + 1000 }),
  );
  assert.equal(badTiming.ok, false);

  const danglingAnswer = validateRepDraft(
    JSON.stringify({ ...DEMO_REPS[0], correctChoiceId: "zzz" }),
  );
  assert.equal(danglingAnswer.ok, false);
});
