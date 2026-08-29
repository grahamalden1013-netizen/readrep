import assert from "node:assert/strict";
import test from "node:test";
import { validateRepDraft, type DraftCandidate } from "@/lib/reps/draft";
import { formatTimecode, validateRepTiming } from "@/lib/reps/timing";

const VIDEO_MS = 600_000; // ten minutes of film

function draft(overrides: Partial<DraftCandidate> = {}): DraftCandidate {
  return {
    id: "rep_1",
    gameId: "game_1",
    order: 1,
    title: "The low man digs",
    category: "help-recognition",
    difficulty: "medium",
    clipStartMs: 120_000,
    decisionPauseMs: 133_000,
    clipEndMs: 141_000,
    situation: "Ball swings to you on the right wing.",
    prompt: "Their low defender has left the corner. What's your best read?",
    choices: [
      { id: "a", label: "Attack the rim" },
      { id: "b", label: "Skip to the weak-side corner" },
    ],
    correctChoiceId: "b",
    actualChoiceId: "a",
    actualOutcome: "Drove into help and lost it.",
    explanation: "The low man left the corner, so the corner is the open man.",
    coachingCue: "Low man digs, skip it.",
    ...overrides,
  };
}

test("a well-formed rep inside the video passes", () => {
  assert.deepEqual(validateRepDraft(draft(), VIDEO_MS), []);
});

test("0 <= clipStart < decisionPause < clipEnd <= duration is enforced", () => {
  const cases: [Partial<DraftCandidate>, string][] = [
    [{ clipStartMs: -1, decisionPauseMs: 1000, clipEndMs: 2000 }, "clipStartMs"],
    [{ clipStartMs: 5000, decisionPauseMs: 5000 }, "decisionPauseMs"],
    [{ clipStartMs: 9000, decisionPauseMs: 5000, clipEndMs: 12000 }, "decisionPauseMs"],
    [{ decisionPauseMs: 141_000, clipEndMs: 141_000 }, "clipEndMs"],
    [{ decisionPauseMs: 150_000, clipEndMs: 141_000 }, "clipEndMs"],
    [{ clipEndMs: VIDEO_MS + 1 }, "clipEndMs"],
  ];

  for (const [overrides, field] of cases) {
    const issues = validateRepDraft(draft(overrides), VIDEO_MS);
    assert.ok(issues.length > 0, `expected ${JSON.stringify(overrides)} to be rejected`);
    assert.ok(
      issues.some((issue) => issue.field === field),
      `expected an issue on ${field}, got ${JSON.stringify(issues)}`,
    );
  }
});

test("a clip may end exactly at the last frame of the video", () => {
  const issues = validateRepDraft(
    draft({ clipStartMs: 0, decisionPauseMs: 1000, clipEndMs: VIDEO_MS }),
    VIDEO_MS,
  );
  assert.deepEqual(issues, []);
});

test("ordering is still checked when the video length is unknown", () => {
  assert.deepEqual(validateRepDraft(draft(), null), []);
  const issues = validateRepDraft(draft({ decisionPauseMs: 200_000 }), null);
  assert.ok(issues.some((issue) => issue.field === "clipEndMs"));
});

test("a rep needs two to four distinct, labelled choices", () => {
  const one = validateRepDraft(
    draft({ choices: [{ id: "a", label: "Only one" }], correctChoiceId: "a", actualChoiceId: "a" }),
    VIDEO_MS,
  );
  assert.ok(one.some((issue) => issue.field === "choices"));

  const five = validateRepDraft(
    draft({
      choices: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
        { id: "c", label: "C" },
        { id: "d", label: "D" },
        { id: "e", label: "E" },
      ],
    }),
    VIDEO_MS,
  );
  assert.ok(five.some((issue) => issue.field === "choices"));

  const duplicate = validateRepDraft(
    draft({
      choices: [
        { id: "a", label: "A" },
        { id: "a", label: "Also A" },
      ],
      correctChoiceId: "a",
      actualChoiceId: "a",
    }),
    VIDEO_MS,
  );
  assert.ok(duplicate.some((issue) => issue.field === "choices"));
});

test("the best read and the actual decision must both be real choices", () => {
  const badCorrect = validateRepDraft(draft({ correctChoiceId: "z" }), VIDEO_MS);
  assert.ok(badCorrect.some((issue) => issue.field === "correctChoiceId"));

  const badActual = validateRepDraft(draft({ actualChoiceId: "z" }), VIDEO_MS);
  assert.ok(badActual.some((issue) => issue.field === "actualChoiceId"));
});

test("required coaching text is required", () => {
  for (const field of ["title", "situation", "prompt", "explanation", "coachingCue"] as const) {
    const issues = validateRepDraft(draft({ [field]: "" }), VIDEO_MS);
    assert.ok(issues.length > 0, `${field} should be required`);
  }
});

test("timecodes read as minutes, seconds and tenths", () => {
  assert.equal(formatTimecode(0), "0:00.0");
  assert.equal(formatTimecode(13_400), "0:13.4");
  assert.equal(formatTimecode(133_000), "2:13.0");
  assert.equal(formatTimecode(-500), "0:00.0");
});

test("timing validation reports per-field messages the studio can render", () => {
  const issues = validateRepTiming(
    { clipStartMs: 5000, decisionPauseMs: 4000, clipEndMs: 3000 },
    VIDEO_MS,
  );
  assert.ok(issues.some((issue) => issue.field === "decisionPauseMs"));
  assert.ok(issues.some((issue) => issue.field === "clipEndMs"));
  assert.ok(issues.every((issue) => issue.message.length > 0));
});
