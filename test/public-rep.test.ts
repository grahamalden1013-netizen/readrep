import assert from "node:assert/strict";
import test from "node:test";
import { toPublicRep, toReveal } from "@/lib/reps/public-rep";

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

test("a reveal is only ever built from a rep the server already holds", () => {
  // toReveal takes the stored rep, so the browser cannot influence what the
  // correct answer is — only which choice it is graded against.
  const rep = DEMO_REPS[1];
  const reveal = toReveal(rep, rep.choices[0].id);
  assert.equal(reveal.correctChoiceId, rep.correctChoiceId);
  assert.equal(reveal.explanation, rep.explanation);
  assert.equal(reveal.coachingCue, rep.coachingCue);
});
