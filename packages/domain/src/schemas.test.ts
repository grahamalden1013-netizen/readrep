import { describe, expect, it } from "vitest";
import {
  ClipRange,
  Confidence,
  confidenceBandFor,
  ConsentRecord,
  CoachReview,
  DecisionInterpretation,
  EvidenceCitation,
  isCoachGrounded,
  isInstructiveMismatch,
  isPlayerFacingProvenance,
  LearningMoment,
  makeConfidence,
  PlayerAttempt,
  qualityForResponse,
} from "./index";

const AT = "2026-08-25T12:00:00.000Z";
const LATER = "2026-08-25T12:00:09.000Z";

const confidence = { score: 0.82, band: "high" as const, basis: "clear camera angle" };

const citation = (over: Record<string, unknown> = {}) => ({
  provenance: "manual_authoring",
  clipRange: { startMs: 1000, endMs: 9000 },
  frameIds: [],
  artifactIds: [],
  trackIds: [],
  coachRuleIds: ["rule-low-tag"],
  confidence,
  uncertainty: [],
  ...over,
});

const options = [
  {
    id: "opt-skip",
    label: "Skip to the weak-side corner",
    quality: "preferred",
    rationale: "The corner defender left first, so the corner is open.",
    courtArea: "left_corner",
    trackId: null,
  },
  {
    id: "opt-roller",
    label: "Hit the roller",
    quality: "suboptimal",
    rationale: "The low man has already stepped over to tag the roll.",
    courtArea: "paint",
    trackId: null,
  },
];

const interpretation = (over: Record<string, unknown> = {}) => ({
  category: "pick_and_roll_read",
  observedFacts: ["The corner defender steps in to tag the roller."],
  basketballInference: ["The weak-side corner is unattended."],
  visualCue: "Read the defender who leaves first.",
  options,
  preferredOptionId: "opt-skip",
  teachingCue: "Find the help defender's man before you pick up your dribble.",
  outcome: "missed_shot",
  outcomeNote: null,
  citation: citation(),
  ...over,
});

/* -------------------------------------------------------------------------- */

describe("provenance is load-bearing, not decorative", () => {
  it("rejects manually authored content that claims a model produced it", () => {
    const result = EvidenceCitation.safeParse(
      citation({ provenance: "manual_authoring", modelVersion: "some-model-1" }),
    );
    expect(result.success).toBe(false);
    if (result.success) throw new Error("unreachable");
    expect(result.error.issues[0]?.message).toContain("was not produced by a model");
  });

  it("requires an AI proposal to record its model and prompt version", () => {
    const missing = EvidenceCitation.safeParse(citation({ provenance: "ai_proposal" }));
    expect(missing.success).toBe(false);

    const complete = EvidenceCitation.safeParse(
      citation({
        provenance: "ai_proposal",
        modelVersion: "some-model-1",
        promptVersion: "1.2.0",
      }),
    );
    expect(complete.success).toBe(true);
  });

  it("only lets coach-approved or manual content face a player", () => {
    expect(isPlayerFacingProvenance("coach_approved")).toBe(true);
    expect(isPlayerFacingProvenance("manual_authoring")).toBe(true);
    expect(isPlayerFacingProvenance("ai_proposal")).toBe(false);
    expect(isPlayerFacingProvenance("system_derived")).toBe(false);
    expect(isPlayerFacingProvenance("player_input")).toBe(false);
  });
});

describe("decision quality is never collapsed into outcome", () => {
  it("has no boolean correctness anywhere in an interpretation", () => {
    const parsed = DecisionInterpretation.parse(interpretation());
    const serialized = JSON.stringify(parsed);
    expect(serialized).not.toContain("isCorrect");
    expect(serialized).not.toContain("is_correct");
    expect(serialized).not.toContain("correctOption");
  });

  it("accepts a preferred read that produced a miss", () => {
    const parsed = DecisionInterpretation.parse(
      interpretation({ outcome: "missed_shot" }),
    );
    expect(parsed.options[0]?.quality).toBe("preferred");
    expect(parsed.outcome).toBe("missed_shot");
    expect(isInstructiveMismatch("preferred", "missed_shot")).toBe(true);
  });

  it("accepts a high-risk read that produced a basket", () => {
    expect(isInstructiveMismatch("high_risk", "made_shot")).toBe(true);
    expect(isInstructiveMismatch("preferred", "made_shot")).toBe(false);
    expect(isInstructiveMismatch("suboptimal", "missed_shot")).toBe(false);
  });

  it("stores quality and outcome as independent fields on an attempt", () => {
    const attempt = PlayerAttempt.parse({
      id: "attempt-1",
      momentId: "moment-1",
      assignmentId: null,
      playerId: "player-1",
      teamId: "team-a",
      response: { type: "multiple_choice", optionId: "opt-skip" },
      decisionQuality: "preferred",
      committedAt: AT,
      revealedAt: LATER,
      timeToDecideMs: 2400,
      attemptNumber: 1,
      createdAt: AT,
    });
    expect(attempt.decisionQuality).toBe("preferred");
    expect(JSON.stringify(attempt)).not.toContain("isCorrect");
  });
});

describe("the player must commit before the reveal", () => {
  const base = {
    id: "attempt-2",
    momentId: "moment-1",
    assignmentId: null,
    playerId: "player-1",
    teamId: "team-a",
    response: { type: "multiple_choice", optionId: "opt-skip" },
    decisionQuality: "acceptable",
    attemptNumber: 1,
    createdAt: AT,
  };

  it("rejects a reveal recorded before the commit", () => {
    const result = PlayerAttempt.safeParse({
      ...base,
      committedAt: LATER,
      revealedAt: AT,
    });
    expect(result.success).toBe(false);
    if (result.success) throw new Error("unreachable");
    expect(result.error.issues[0]?.message).toContain(
      "cannot be revealed before the player committed",
    );
  });

  it("accepts an attempt that has not been revealed yet", () => {
    const result = PlayerAttempt.safeParse({
      ...base,
      committedAt: AT,
      revealedAt: null,
    });
    expect(result.success).toBe(true);
  });
});

describe("interpretations must hold together", () => {
  it("rejects a preferred option that is not in the option list", () => {
    const result = DecisionInterpretation.safeParse(
      interpretation({ preferredOptionId: "opt-nonexistent" }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects naming an option preferred when it is rated otherwise", () => {
    const result = DecisionInterpretation.safeParse(
      interpretation({ preferredOptionId: "opt-roller" }),
    );
    expect(result.success).toBe(false);
    if (result.success) throw new Error("unreachable");
    expect(
      result.error.issues.some((i) => i.message.includes("rated `preferred`")),
    ).toBe(true);
  });

  it("rejects duplicate option ids", () => {
    const result = DecisionInterpretation.safeParse(
      interpretation({ options: [options[0], options[0]] }),
    );
    expect(result.success).toBe(false);
  });

  it("requires at least one observed fact", () => {
    const result = DecisionInterpretation.safeParse(
      interpretation({ observedFacts: [] }),
    );
    expect(result.success).toBe(false);
  });

  it("forces an ungrounded interpretation to declare it has no coach rule", () => {
    const ungrounded = DecisionInterpretation.safeParse(
      interpretation({ citation: citation({ coachRuleIds: [] }) }),
    );
    expect(ungrounded.success).toBe(false);
    if (ungrounded.success) throw new Error("unreachable");
    expect(ungrounded.error.issues[0]?.message).toContain(
      "general basketball reasoning",
    );

    const labelled = DecisionInterpretation.safeParse(
      interpretation({
        citation: citation({
          coachRuleIds: [],
          uncertainty: [
            {
              kind: "no_applicable_coach_rule",
              detail: "The coach has not supplied a rule for this situation.",
            },
          ],
        }),
      }),
    );
    expect(labelled.success).toBe(true);
  });

  it("reports coach grounding from the citation", () => {
    expect(isCoachGrounded({ coachRuleIds: ["rule-1"] as never })).toBe(true);
    expect(isCoachGrounded({ coachRuleIds: [] })).toBe(false);
  });
});

describe("only coach-approved content becomes a learning moment", () => {
  const moment = (over: Record<string, unknown> = {}) => ({
    id: "moment-1",
    teamId: "team-a",
    playerId: "player-1",
    gameId: "game-1",
    videoAssetId: "asset-1",
    sourceCandidateId: "cand-1",
    sourceReviewId: "review-1",
    provenance: "coach_approved",
    clipRange: { startMs: 1000, endMs: 9000 },
    pausePointMs: 5000,
    question: {
      prompt: "What is your best read before taking another dribble?",
      responseType: "multiple_choice",
      choiceOptionIds: ["opt-skip", "opt-roller"],
      selectableAreas: [],
      selectableTrackIds: [],
      postRevealHint: null,
    },
    interpretation: interpretation(),
    tags: [],
    citation: citation(),
    createdAt: AT,
    ...over,
  });

  it("accepts a coach-approved moment", () => {
    expect(LearningMoment.safeParse(moment()).success).toBe(true);
  });

  it("refuses to publish a raw AI proposal", () => {
    const result = LearningMoment.safeParse(
      moment({ provenance: "ai_proposal", sourceReviewId: null }),
    );
    expect(result.success).toBe(false);
    if (result.success) throw new Error("unreachable");
    expect(result.error.issues[0]?.message).toContain(
      "only coach-approved or manually authored content",
    );
  });

  it("requires coach-approved content to point at the approving review", () => {
    const result = LearningMoment.safeParse(moment({ sourceReviewId: null }));
    expect(result.success).toBe(false);
  });

  it("rejects a pause point outside the clip the player watches", () => {
    expect(LearningMoment.safeParse(moment({ pausePointMs: 20000 })).success).toBe(
      false,
    );
    expect(LearningMoment.safeParse(moment({ pausePointMs: 500 })).success).toBe(false);
  });

  it("rejects a multiple-choice question with one option", () => {
    const result = LearningMoment.safeParse(
      moment({
        question: {
          ...moment().question,
          choiceOptionIds: ["opt-skip"],
        },
      }),
    );
    expect(result.success).toBe(false);
  });
});

describe("coach reviews", () => {
  const review = (over: Record<string, unknown> = {}) => ({
    id: "review-1",
    candidateId: "cand-1",
    teamId: "team-a",
    reviewerUserId: "user-coach",
    verdict: "approved",
    editedInterpretation: null,
    preferredOptionId: "opt-skip",
    note: null,
    confidence,
    rejectionReason: null,
    rejectionDetail: null,
    coachSystemRevision: 1,
    reviewedAt: AT,
    ...over,
  });

  it("requires a rejection to say why", () => {
    expect(CoachReview.safeParse(review({ verdict: "rejected" })).success).toBe(false);
    expect(
      CoachReview.safeParse({
        ...review({ verdict: "rejected" }),
        rejectionReason: "not_visible_enough",
      }).success,
    ).toBe(true);
  });

  it("does not let an approval carry a rejection reason", () => {
    const result = CoachReview.safeParse(
      review({ rejectionReason: "not_a_real_decision" }),
    );
    expect(result.success).toBe(false);
  });
});

describe("confidence", () => {
  it("derives the band from the score", () => {
    expect(confidenceBandFor(0.2)).toBe("low");
    expect(confidenceBandFor(0.6)).toBe("medium");
    expect(confidenceBandFor(0.95)).toBe("high");
  });

  it("rejects a band that disagrees with its score", () => {
    const result = Confidence.safeParse({
      score: 0.2,
      band: "high",
      basis: "wishful thinking",
    });
    expect(result.success).toBe(false);
  });

  it("requires a basis, so a bare number can never be stored", () => {
    expect(Confidence.safeParse({ score: 0.9, band: "high", basis: "" }).success).toBe(
      false,
    );
  });

  it("builds a consistent value through the helper", () => {
    expect(makeConfidence(0.55, "partial occlusion")).toEqual({
      score: 0.55,
      band: "medium",
      basis: "partial occlusion",
    });
  });
});

describe("clip ranges", () => {
  it("rejects a range that ends before it starts", () => {
    expect(ClipRange.safeParse({ startMs: 9000, endMs: 1000 }).success).toBe(false);
  });

  it("rejects an empty range", () => {
    expect(ClipRange.safeParse({ startMs: 1000, endMs: 1000 }).success).toBe(false);
  });
});

describe("consent", () => {
  const base = {
    id: "consent-1",
    playerId: "player-1",
    scope: "film_upload",
    state: "granted",
    grantedByUserId: "user-parent",
    grantedAt: AT,
    expiresAt: null,
    withdrawnAt: null,
    method: "signed pilot form",
    createdAt: AT,
    updatedAt: AT,
  };

  it("requires granted consent to record who granted it", () => {
    expect(ConsentRecord.safeParse({ ...base, grantedByUserId: null }).success).toBe(
      false,
    );
    expect(ConsentRecord.safeParse(base).success).toBe(true);
  });

  it("requires withdrawn consent to record when", () => {
    expect(
      ConsentRecord.safeParse({ ...base, state: "withdrawn", withdrawnAt: null })
        .success,
    ).toBe(false);
  });
});

describe("grading a response", () => {
  const moment = { interpretation: DecisionInterpretation.parse(interpretation()) };

  it("reads quality straight off the chosen option", () => {
    expect(
      qualityForResponse(moment as never, {
        type: "multiple_choice",
        optionId: "opt-skip" as never,
      }),
    ).toBe("preferred");
    expect(
      qualityForResponse(moment as never, {
        type: "multiple_choice",
        optionId: "opt-roller" as never,
      }),
    ).toBe("suboptimal");
  });

  it("matches a court-area answer to its option", () => {
    expect(
      qualityForResponse(moment as never, {
        type: "select_court_area",
        area: "left_corner",
      }),
    ).toBe("preferred");
  });

  it("says unclear rather than guessing when nothing matches", () => {
    expect(
      qualityForResponse(moment as never, {
        type: "select_court_area",
        area: "backcourt",
      }),
    ).toBe("unclear");
    expect(
      qualityForResponse(moment as never, {
        type: "multiple_choice",
        optionId: "opt-unknown" as never,
      }),
    ).toBe("unclear");
  });

  it("never auto-grades free text", () => {
    expect(
      qualityForResponse(moment as never, {
        type: "short_text",
        text: "skip it weak side",
      }),
    ).toBe("unclear");
  });
});
