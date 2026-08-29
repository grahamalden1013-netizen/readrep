import assert from "node:assert/strict";
import test from "node:test";
import { CUT_GAP_MS, DEMO_FILM_DURATION_MS, DEMO_GAME, DEMO_REPS } from "@/lib/reps/seed";
import { POSSESSIONS, DURATION_MS } from "@/scripts/demo-film/choreography.mjs";

test("the demo game ships exactly five reps in order", () => {
  assert.equal(DEMO_REPS.length, 5);
  assert.deepEqual(
    DEMO_REPS.map((rep) => rep.order),
    [1, 2, 3, 4, 5],
  );
  assert.equal(new Set(DEMO_REPS.map((rep) => rep.id)).size, 5);
});

test("every rep covers a distinct skill category", () => {
  assert.equal(new Set(DEMO_REPS.map((rep) => rep.category)).size, 5);
});

test("no rep's correct answer matches what the player actually did", () => {
  // If they were the same there would be nothing to learn from the rep.
  for (const rep of DEMO_REPS) {
    assert.notEqual(rep.correctChoiceId, rep.actualChoiceId, rep.id);
  }
});

test("clips tile the film, separated by the cut gap", () => {
  let cursor = 0;
  for (const rep of DEMO_REPS) {
    assert.equal(rep.clipStartMs, cursor, `${rep.id} starts at the previous cut`);
    cursor = rep.clipEndMs + CUT_GAP_MS;
  }
  assert.equal(cursor, DEMO_FILM_DURATION_MS);
});

test("each clip stops before its possession ends so the outcome is the last frame", () => {
  for (const rep of DEMO_REPS) {
    const possession = POSSESSIONS.find((item) => item.repId === rep.id);
    assert.ok(possession);
    assert.equal(possession.endMs - rep.clipEndMs, CUT_GAP_MS, rep.id);
  }
});

test("rep timings match the rendered film's choreography", () => {
  assert.equal(DURATION_MS, DEMO_FILM_DURATION_MS);
  assert.equal(POSSESSIONS.length, DEMO_REPS.length);

  for (const rep of DEMO_REPS) {
    const possession = POSSESSIONS.find((item) => item.repId === rep.id);
    assert.ok(possession, `no possession rendered for ${rep.id}`);
    assert.equal(possession.startMs, rep.clipStartMs, `${rep.id} start`);
    assert.equal(possession.pauseMs, rep.decisionPauseMs, `${rep.id} pause`);
  }
});

test("the demo game points at the committed film", () => {
  const video = DEMO_GAME.video;
  assert.ok(video && video.kind === "progressive", "the demo ships progressive encodings");
  assert.deepEqual(
    video.encodings.map((encoding) => encoding.src),
    ["/demo/dragons-film.webm", "/demo/dragons-film.mp4"],
  );
  assert.ok(DEMO_GAME.video?.disclaimer, "the demo film must be labelled as a re-creation");
});
