import assert from "node:assert/strict";
import test from "node:test";
import { aggregateSkills, scoreSession } from "@/lib/reps/scoring";
import type { PlayerResponse, Rep, TrainingSession } from "@/lib/reps/schema";
import { DEMO_REPS } from "@/lib/reps/seed";

function answer(rep: Rep, correct: boolean): PlayerResponse {
  const choiceId = correct
    ? rep.correctChoiceId
    : (rep.choices.find((choice) => choice.id !== rep.correctChoiceId)?.id ?? rep.correctChoiceId);
  return { repId: rep.id, choiceId, isCorrect: correct, answeredAt: "2026-02-15T10:00:00.000Z" };
}

test("an untouched session scores nothing rather than zero", () => {
  const score = scoreSession(DEMO_REPS, []);
  assert.equal(score.total, 5);
  assert.equal(score.answered, 0);
  assert.equal(score.correct, 0);
  assert.equal(score.accuracy, null);
  assert.equal(score.strength, null);
  assert.equal(score.nextFocus, null);
});

test("accuracy counts only answered reps", () => {
  const score = scoreSession(DEMO_REPS, [answer(DEMO_REPS[0], true), answer(DEMO_REPS[1], false)]);
  assert.equal(score.answered, 2);
  assert.equal(score.correct, 1);
  assert.equal(score.accuracy, 0.5);
  assert.equal(score.scoredReps.filter((scored) => scored.response === null).length, 3);
});

test("a perfect session has no category needing work and no focus cue", () => {
  const score = scoreSession(
    DEMO_REPS,
    DEMO_REPS.map((rep) => answer(rep, true)),
  );
  assert.equal(score.correct, 5);
  assert.equal(score.accuracy, 1);
  assert.equal(score.needsWork, null);
  assert.equal(score.nextFocus, null);
});

test("the focus cue comes from the missed rep in the weakest category", () => {
  const responses = DEMO_REPS.map((rep, index) => answer(rep, index !== 2));
  const score = scoreSession(DEMO_REPS, responses);
  assert.equal(score.needsWork, DEMO_REPS[2].category);
  assert.equal(score.nextFocus, DEMO_REPS[2].coachingCue);
});

test("skills aggregate across sessions", () => {
  const base: Omit<TrainingSession, "responses"> = {
    id: "s1",
    gameId: "demo-dragons",
    repIds: DEMO_REPS.map((rep) => rep.id),
    startedAt: "2026-02-15T10:00:00.000Z",
    completedAt: "2026-02-15T10:05:00.000Z",
  };

  const skills = aggregateSkills([
    { reps: DEMO_REPS, session: { ...base, responses: [answer(DEMO_REPS[0], true)] } },
    { reps: DEMO_REPS, session: { ...base, id: "s2", responses: [answer(DEMO_REPS[0], false)] } },
  ]);

  assert.equal(skills.length, 1);
  assert.equal(skills[0].category, DEMO_REPS[0].category);
  assert.equal(skills[0].attempted, 2);
  assert.equal(skills[0].correct, 1);
});

test("the strength is the hardest category the player got right, not the first one", () => {
  const easyCorrect = DEMO_REPS.find((rep) => rep.difficulty === "easy")!;
  const hardCorrect = DEMO_REPS.find((rep) => rep.difficulty === "hard")!;

  const score = scoreSession(DEMO_REPS, [answer(easyCorrect, true), answer(hardCorrect, true)]);
  assert.equal(score.strength, hardCorrect.category);
});
