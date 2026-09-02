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
import { mergeDuplicates } from "@/lib/ai/game-analysis/merge";
import type { CandidateDraft } from "@/lib/ai/game-analysis/possession";
import { possessionResultSchema } from "@/lib/ai/game-analysis/schema";
import { buildPossessionPrompt } from "@/lib/ai/game-analysis/prompt";
import {
  confirmedReferenceSchema,
  confirmedReferenceSetSchema,
} from "@/lib/ai/game-analysis/reference";
import { classifyOutcome, summariseLedger } from "@/lib/ai/game-analysis/coverage-outcomes";
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

// --- Stage F: timestamp merge + rank ------------------------------

/** A candidate at `decisionSeconds`; clip defaults to [d-5, d+6]. */
function draft(decisionSeconds: number, over: Partial<CandidateDraft> = {}): CandidateDraft {
  return {
    clipStartSeconds: decisionSeconds - 5,
    decisionSeconds,
    clipEndSeconds: decisionSeconds + 6,
    title: "Drive and kick",
    skillCategory: "help-recognition",
    difficulty: "medium",
    situation: "Middle drive, low man steps up.",
    prompt: "What is the read?",
    answerChoices: [
      { id: "A", text: "Finish" },
      { id: "B", text: "Kick to the corner" },
      { id: "C", text: "Skip it weakside" },
    ],
    bestReadChoiceId: "B",
    actualDecisionChoiceId: "A",
    actualDecision: "Forced the finish",
    outcome: "Blocked at the rim",
    coachingExplanation: "The low man fully committed, so the corner is open.",
    visibleEvidence: [
      { timestampSeconds: decisionSeconds - 4, observation: "target drives middle" },
      { timestampSeconds: decisionSeconds - 1, observation: "low man leaves the corner" },
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

test("mergeDuplicates merges two overlapping windows with inconsistent tags, keeping the clearer id", () => {
  const a = draft(481, { title: "High ball screen", decisionTags: ["ball-screen"], playerIdConfidence: 0.96 });
  const b = draft(486, {
    title: "Roll to the rim after the high screen",
    skillCategory: "pick-and-roll-read",
    decisionTags: ["pick-and-roll", "rim-pressure"],
    playerIdConfidence: 0.92,
  });
  const { kept, merges } = mergeDuplicates([a, b]);
  assert.equal(kept.length, 1);
  assert.equal(kept[0].playerIdConfidence, 0.96);
  assert.equal(merges.length, 1);
  assert.match(merges[0].reason, /clips overlap/);
});

test("mergeDuplicates keeps two close-in-time decisions whose clips do not overlap", () => {
  const a = draft(863, { skillCategory: "pick-and-roll-read" });
  const b = draft(882, { skillCategory: "defensive-rotation" }); // 19s apart, clips [858,869] vs [877,888]
  const { kept, merges } = mergeDuplicates([a, b]);
  assert.equal(kept.length, 2);
  assert.equal(merges.length, 0);
});

test("mergeDuplicates resolves the three baseline leak pairs", () => {
  assert.equal(mergeDuplicates([draft(481), draft(486)]).kept.length, 1); // #2/#8 -> merge
  assert.equal(mergeDuplicates([draft(1261), draft(1264)]).kept.length, 1); // #1/#9 -> merge
  assert.equal(mergeDuplicates([draft(863), draft(882)]).kept.length, 2); // #6/#10 -> keep both
});

test("mergeDuplicates never merges genuinely separate, well-spaced possessions", () => {
  assert.equal(mergeDuplicates([draft(100), draft(300), draft(600)]).kept.length, 3);
});

test("dedupeAndRank keeps the stronger of an overlapping pair and ranks it #1", () => {
  const weak = draft(107, { playerIdConfidence: 0.6, decisionConfidence: 0.55, teachingValue: 0.5 });
  const strong = draft(110, { playerIdConfidence: 0.95, decisionConfidence: 0.9, teachingValue: 0.9 });
  const ranked = dedupeAndRank([weak, strong]);
  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].playerIdConfidence, 0.95);
  assert.equal(ranked[0].rank, 1);
});

test("dedupeAndRank keeps distinct spaced-out decisions and caps the count", () => {
  const many = Array.from({ length: MAX_CANDIDATES + 6 }, (_, i) =>
    draft(60 + i * 40, {
      skillCategory: i % 2 === 0 ? "help-recognition" : "closeout-attack",
      decisionTags: [`tag-${i}`],
      playerIdConfidence: 0.5 + (i % 5) / 20,
    }),
  );
  const ranked = dedupeAndRank(many);
  assert.equal(ranked.length, MAX_CANDIDATES);
  assert.deepEqual(
    ranked.map((r) => r.rank),
    ranked.map((_, i) => i + 1),
  );
});

test("dedupeAndRank puts a different skill category in the first two", () => {
  const a = draft(100, { skillCategory: "help-recognition", teachingValue: 0.9 });
  const b = draft(300, { skillCategory: "closeout-attack", teachingValue: 0.6 });
  const ranked = dedupeAndRank([a, b]);
  assert.equal(new Set(ranked.slice(0, 2).map((r) => r.skillCategory)).size, 2);
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
    bestReadIndex: null,
    actualDecisionIndex: null,
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
    bestReadIndex: null,
    actualDecisionIndex: null,
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
    referenceCues: ["white leg sleeves"],
    referenceNumberConfirmed: true,
    window: { startSeconds: 300, endSeconds: 318 },
    frameTimestampsSeconds: [300, 306, 312, 318],
    coachPreferences: [{ questionId: "drive_help", prompt: "On a drive?", label: "Make the simple kick-out" }],
  });
  assert.match(built.userIntro, /white #15/);
  assert.match(built.userIntro, /drive_help/);
  assert.match(built.userIntro, /t=300/);
  assert.match(built.userIntro, /white leg sleeves/);
  assert.match(built.system, /NEVER attribute an observation from a different player/i);
  assert.match(built.system, /do NOT rely on the jersey number alone/i);
});

test("buildPossessionPrompt says so when no preference applies and warns when number unconfirmed", () => {
  const built = buildPossessionPrompt({
    target: { jerseyNumber: "15", teamColor: "white", marker: "sleeve" },
    referenceFrameCount: 0,
    referenceCues: [],
    referenceNumberConfirmed: false,
    window: { startSeconds: 0, endSeconds: 18 },
    frameTimestampsSeconds: [0, 9, 18],
    coachPreferences: [],
  });
  assert.match(built.userIntro, /none apply/i);
  assert.match(built.userIntro, /could NOT read the jersey number/i);
});

// --- confirmed player references --------------------------------

const oneRef = (over: Record<string, unknown> = {}) => ({
  timestampSeconds: 742,
  point: { x: 0.5, y: 0.4 },
  box: { x: 0.43, y: 0.25, w: 0.14, h: 0.3 },
  crop: "data:image/webp;base64,AAAA",
  numberVisible: true,
  jerseyColor: "white",
  ...over,
});

test("confirmedReferenceSchema rejects a Mux URL as a crop", () => {
  const bad = confirmedReferenceSchema.safeParse(
    oneRef({ crop: "https://image.mux.com/abc/thumbnail.webp?time=742" }),
  );
  assert.equal(bad.success, false);
});

test("confirmedReferenceSetSchema needs 2+ references", () => {
  assert.equal(confirmedReferenceSetSchema.safeParse([oneRef()]).success, false);
  assert.equal(confirmedReferenceSetSchema.safeParse([oneRef(), oneRef({ timestampSeconds: 900 })]).success, true);
});

test("confirmedReferenceSetSchema needs at least one with the number visible", () => {
  const noNumber = [
    oneRef({ numberVisible: false }),
    oneRef({ timestampSeconds: 900, numberVisible: false }),
  ];
  const parsed = confirmedReferenceSetSchema.safeParse(noNumber);
  assert.equal(parsed.success, false);
  assert.match(parsed.error?.issues[0]?.message ?? "", /jersey number/i);
});

test("confirmedReferenceSetSchema caps at 3 references", () => {
  const four = [oneRef(), oneRef({ timestampSeconds: 2 }), oneRef({ timestampSeconds: 3 }), oneRef({ timestampSeconds: 4 })];
  assert.equal(confirmedReferenceSetSchema.safeParse(four).success, false);
});

// --- window coverage outcomes ----------------------------------

const usg = { input: 0, output: 0 };

test("classifyOutcome maps every analyzer result to one of the five buckets", () => {
  assert.equal(
    classifyOutcome({ kind: "candidate", draft: {} as never, usage: usg, model: "m" }).outcome,
    "valid-decision",
  );
  assert.equal(
    classifyOutcome({ kind: "flagged", draft: {} as never, reason: "low decision confidence", usage: usg, model: "m" })
      .outcome,
    "valid-decision",
  );
  assert.equal(
    classifyOutcome({ kind: "rejected", reason: "target-not-visible", detail: "", usage: usg, model: "m" }).outcome,
    "target-not-visible",
  );
  assert.equal(
    classifyOutcome({ kind: "rejected", reason: "low-identification", detail: "id 0.40", usage: usg, model: "m" })
      .outcome,
    "target-not-visible",
  );
  assert.equal(
    classifyOutcome({ kind: "rejected", reason: "no-decision", detail: "", usage: usg, model: "m" }).outcome,
    "target-no-decision",
  );
  assert.equal(
    classifyOutcome({ kind: "rejected", reason: "bad-timing", detail: "", usage: usg, model: "m" }).outcome,
    "target-no-decision",
  );
  assert.equal(
    classifyOutcome({ kind: "rejected", reason: "invalid-output", detail: "not json", usage: usg, model: "m" }).outcome,
    "invalid-output",
  );
  assert.equal(
    classifyOutcome({ kind: "rejected", reason: "frames-unavailable", detail: "only 3", usage: usg, model: "m" })
      .outcome,
    "processing-failure",
  );
});

test("summariseLedger tallies the buckets and total", () => {
  const s = summariseLedger([
    { index: 0, startSeconds: 0, endSeconds: 18, outcome: "valid-decision", reason: "candidate", attempts: 1 },
    { index: 1, startSeconds: 14, endSeconds: 32, outcome: "target-not-visible", reason: "not visible", attempts: 1 },
    { index: 2, startSeconds: 28, endSeconds: 46, outcome: "target-not-visible", reason: "not visible", attempts: 1 },
    { index: 3, startSeconds: 42, endSeconds: 60, outcome: "processing-failure", reason: "provider-unavailable", attempts: 3 },
  ]);
  assert.equal(s.total, 4);
  assert.equal(s["valid-decision"], 1);
  assert.equal(s["target-not-visible"], 2);
  assert.equal(s["processing-failure"], 1);
  assert.equal(s["target-no-decision"], 0);
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
