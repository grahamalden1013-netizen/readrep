import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPossessionWindows,
  discoveryTimestamps,
  spansFromVerdicts,
} from "@/lib/ai/game-analysis/segments";
import {
  DISCOVERY_SAMPLE_INTERVAL_SECONDS,
  GAME_EDGE_TRIM_SECONDS,
  MAX_CANDIDATES,
  MIN_POSSESSION_WINDOW_SECONDS,
  POSSESSION_WINDOW_SECONDS,
} from "@/lib/ai/game-analysis/limits";
import { dedupeAndRank } from "@/lib/ai/game-analysis/rank";
import type { CandidateDraft } from "@/lib/ai/game-analysis/possession";
import { possessionResultSchema } from "@/lib/ai/game-analysis/schema";
import { buildPossessionPrompt } from "@/lib/ai/game-analysis/prompt";
import {
  COACHING_QUESTIONS,
  isProfileComplete,
  relevantPreferences,
  type CoachingProfile,
} from "@/lib/coaching/profile";

// --- Stage A geometry --------------------------------------------------

test("discoveryTimestamps trims both edges and steps by the interval", () => {
  const ts = discoveryTimestamps(600);
  assert.equal(ts[0], GAME_EDGE_TRIM_SECONDS);
  assert.ok(ts[ts.length - 1] <= 600 - GAME_EDGE_TRIM_SECONDS);
  assert.equal(ts[1] - ts[0], DISCOVERY_SAMPLE_INTERVAL_SECONDS);
});

test("discoveryTimestamps never produces an empty grid for a tiny clip", () => {
  assert.ok(discoveryTimestamps(5).length >= 1);
});

test("spansFromVerdicts bridges a single dead sample but not two", () => {
  const step = DISCOVERY_SAMPLE_INTERVAL_SECONDS;
  const at = (i: number) => i * step + step;
  const verdicts = [
    { timestampSeconds: at(0), liveGame: true },
    { timestampSeconds: at(1), liveGame: true },
    { timestampSeconds: at(2), liveGame: false }, // single dead — bridged
    { timestampSeconds: at(3), liveGame: true },
    { timestampSeconds: at(4), liveGame: false }, // two dead in a row — split
    { timestampSeconds: at(5), liveGame: false },
    { timestampSeconds: at(6), liveGame: true },
    { timestampSeconds: at(7), liveGame: true },
  ];
  const spans = spansFromVerdicts(verdicts);
  assert.equal(spans.length, 2);
  assert.ok(spans[0].startSeconds < spans[0].endSeconds);
  assert.ok(spans[1].startSeconds > spans[0].endSeconds);
});

test("spansFromVerdicts returns nothing when no sample is live", () => {
  const step = DISCOVERY_SAMPLE_INTERVAL_SECONDS;
  const spans = spansFromVerdicts([
    { timestampSeconds: 100, liveGame: false },
    { timestampSeconds: 100 + step, liveGame: false },
    { timestampSeconds: 100 + step * 2, liveGame: false },
  ]);
  assert.equal(spans.length, 0);
});

test("spansFromVerdicts turns a lone live blip into a one-interval span", () => {
  const step = DISCOVERY_SAMPLE_INTERVAL_SECONDS;
  const spans = spansFromVerdicts([
    { timestampSeconds: 100, liveGame: false },
    { timestampSeconds: 100 + step, liveGame: true },
    { timestampSeconds: 100 + step * 2, liveGame: false },
    { timestampSeconds: 100 + step * 3, liveGame: false },
  ]);
  assert.equal(spans.length, 1);
  assert.ok(spans[0].endSeconds - spans[0].startSeconds >= step - 0.001);
});

// --- Stage B geometry --------------------------------------------------

test("buildPossessionWindows makes one window for a short span", () => {
  const windows = buildPossessionWindows([{ startSeconds: 40, endSeconds: 40 + POSSESSION_WINDOW_SECONDS - 2 }]);
  assert.equal(windows.length, 1);
});

test("buildPossessionWindows cuts a long span into overlapping windows", () => {
  const windows = buildPossessionWindows([{ startSeconds: 0, endSeconds: 120 }]);
  assert.ok(windows.length >= 5);
  for (const w of windows) {
    assert.ok(w.endSeconds - w.startSeconds >= MIN_POSSESSION_WINDOW_SECONDS);
    assert.ok(w.endSeconds - w.startSeconds <= POSSESSION_WINDOW_SECONDS + 0.001);
  }
  // consecutive windows overlap
  assert.ok(windows[1].startSeconds < windows[0].endSeconds);
});

test("buildPossessionWindows discards a span below the minimum", () => {
  assert.deepEqual(buildPossessionWindows([{ startSeconds: 10, endSeconds: 10 + MIN_POSSESSION_WINDOW_SECONDS - 1 }]), []);
});

// --- Stage F: dedupe + rank -----------------------------------------

function draft(over: Partial<CandidateDraft>): CandidateDraft {
  return {
    clipStartSeconds: 100,
    decisionSeconds: 107,
    clipEndSeconds: 114,
    title: "Drive and kick",
    skillCategory: "help-recognition",
    difficulty: "medium",
    situation: "Middle drive, low man steps up.",
    prompt: "What is the read?",
    answerChoices: [
      { id: "a", text: "Finish" },
      { id: "b", text: "Kick to the corner" },
      { id: "c", text: "Skip it weakside" },
    ],
    bestReadChoiceId: "b",
    actualDecisionChoiceId: "a",
    actualDecision: "Forced the finish",
    outcome: "Blocked at the rim",
    coachingExplanation: "The low man fully committed, so the corner is open.",
    visibleEvidence: [
      { timestampSeconds: 103, observation: "target drives middle" },
      { timestampSeconds: 106, observation: "low man leaves the corner" },
    ],
    basketballInferences: [],
    coachPreferenceBasis: [],
    involvement: "on-ball driver",
    uncertainty: [],
    playerIdConfidence: 0.8,
    decisionConfidence: 0.75,
    teachingValue: 0.7,
    decisionTags: ["drive-help"],
    warnings: [],
    ...over,
  };
}

test("dedupeAndRank keeps the strongest of a duplicate bucket", () => {
  const weak = draft({ playerIdConfidence: 0.6, decisionConfidence: 0.55, teachingValue: 0.5 });
  const strong = draft({ playerIdConfidence: 0.95, decisionConfidence: 0.9, teachingValue: 0.9 });
  const ranked = dedupeAndRank([weak, strong]);
  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].playerIdConfidence, 0.95);
  assert.equal(ranked[0].rank, 1);
});

test("dedupeAndRank ranks distinct buckets and caps the count", () => {
  const many = Array.from({ length: MAX_CANDIDATES + 6 }, (_, i) =>
    draft({
      skillCategory: i % 2 === 0 ? "help-recognition" : "closeout-attack",
      decisionTags: [`tag-${i}`],
      playerIdConfidence: 0.5 + (i % 5) / 20,
    }),
  );
  const ranked = dedupeAndRank(many);
  assert.ok(ranked.length <= MAX_CANDIDATES);
  assert.deepEqual(
    ranked.map((r) => r.rank),
    ranked.map((_, i) => i + 1),
  );
});

test("dedupeAndRank puts a different skill category in the first two", () => {
  const a = draft({ skillCategory: "help-recognition", decisionTags: ["drive-help"], teachingValue: 0.9 });
  const b = draft({ skillCategory: "help-recognition", decisionTags: ["drive-help"], teachingValue: 0.85 });
  const c = draft({ skillCategory: "closeout-attack", decisionTags: ["closeout"], teachingValue: 0.6 });
  const ranked = dedupeAndRank([a, b, c]);
  const cats = new Set(ranked.slice(0, 2).map((r) => r.skillCategory));
  assert.equal(cats.size, 2);
});

// --- schema ---------------------------------------------------------

test("possessionResultSchema accepts a minimal not-visible verdict", () => {
  const parsed = possessionResultSchema.safeParse({
    targetVisible: false,
    targetIdentificationConfidence: 0.2,
    involvement: null,
    hasDecision: false,
    decisionOffsetSeconds: null,
    decisionConfidence: 0,
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
    visibleEvidence: [],
    basketballInferences: [],
    coachPreferenceBasis: [],
    decisionTags: [],
    uncertainty: [],
    warnings: [],
    teachingValue: 0,
  });
  assert.ok(parsed.success);
});

test("possessionResultSchema rejects a confidence above 1", () => {
  const parsed = possessionResultSchema.safeParse({
    targetVisible: true,
    targetIdentificationConfidence: 1.4,
    involvement: "driver",
    hasDecision: true,
    decisionOffsetSeconds: 4,
    decisionConfidence: 0.5,
    title: "x",
    skillCategory: null,
    difficulty: null,
    situation: "x",
    prompt: "x",
    answerChoices: [],
    bestReadChoiceId: null,
    actualDecisionChoiceId: null,
    actualDecision: null,
    outcome: null,
    coachingExplanation: null,
    visibleEvidence: [],
    basketballInferences: [],
    coachPreferenceBasis: [],
    decisionTags: [],
    uncertainty: [],
    warnings: [],
    teachingValue: 0,
  });
  assert.equal(parsed.success, false);
});

// --- prompt -------------------------------------------------------

test("buildPossessionPrompt lists supplied preferences and window frames", () => {
  const built = buildPossessionPrompt({
    target: { jerseyNumber: "15", teamColor: "white", marker: null },
    referenceFrameCount: 2,
    window: { startSeconds: 300, endSeconds: 318 },
    frameTimestampsSeconds: [300, 306, 312, 318],
    coachPreferences: [{ questionId: "drive_help", prompt: "On a drive?", label: "Make the simple kick-out" }],
  });
  assert.match(built.userIntro, /white #15/);
  assert.match(built.userIntro, /drive_help/);
  assert.match(built.userIntro, /t=300/);
  assert.match(built.system, /NEVER attribute an observation from a different player/i);
});

test("buildPossessionPrompt says so when no preference applies", () => {
  const built = buildPossessionPrompt({
    target: { jerseyNumber: "15", teamColor: "white", marker: "sleeve" },
    referenceFrameCount: 0,
    window: { startSeconds: 0, endSeconds: 18 },
    frameTimestampsSeconds: [0, 9, 18],
    coachPreferences: [],
  });
  assert.match(built.userIntro, /none apply/i);
});

// --- coaching profile relevance ----------------------------------

const fullAnswers = Object.fromEntries(COACHING_QUESTIONS.map((q) => [q.id, q.options[0].value]));

test("isProfileComplete needs every question answered", () => {
  assert.equal(isProfileComplete(null), false);
  assert.equal(isProfileComplete({ schemaVersion: 1, answers: {}, completedAt: null }), false);
  assert.equal(
    isProfileComplete({ schemaVersion: 1, answers: fullAnswers, completedAt: null }),
    true,
  );
});

test("relevantPreferences only returns answers whose tags match the visible situation", () => {
  const profile: CoachingProfile = {
    schemaVersion: 1,
    answers: { drive_help: "simple-kick", on_ball_pressure: "contain", closeout: "contain-drive" },
    completedAt: null,
  };
  const forDrive = relevantPreferences(profile, ["drive-help"]);
  assert.deepEqual(
    forDrive.map((p) => p.questionId).sort(),
    ["drive_help"],
  );
  // a defensive on-ball tag must not pull in the drive-help answer
  const forOnBall = relevantPreferences(profile, ["on-ball-defense"]);
  assert.deepEqual(forOnBall.map((p) => p.questionId), ["on_ball_pressure"]);
});

test("relevantPreferences treats a 'depends' answer as no preference", () => {
  const profile: CoachingProfile = {
    schemaVersion: 1,
    answers: { paint_touch: "depends" },
    completedAt: null,
  };
  assert.deepEqual(relevantPreferences(profile, ["paint-touch", "drive-help"]), []);
});
