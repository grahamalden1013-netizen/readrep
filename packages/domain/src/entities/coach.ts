import { z } from "zod";
import { brandedId, Instant, longText, shortText } from "../primitives.js";
import { Confidence, CoachRuleId } from "../confidence.js";
import { CoachRuleTopic, DecisionCategory } from "../taxonomy.js";
import { TeamId, UserId } from "./identity.js";
import {
  DecisionCandidateId,
  DecisionInterpretation,
  DecisionOptionId,
} from "./decision.js";

export const CoachSystemId = brandedId("CoachSystemId");
export type CoachSystemId = z.infer<typeof CoachSystemId>;

export const CoachReviewId = brandedId("CoachReviewId");
export type CoachReviewId = z.infer<typeof CoachReviewId>;

/* -------------------------------------------------------------------------- */
/* Coach system                                                                */
/* -------------------------------------------------------------------------- */

export const CoachSystemStatus = z.enum(["draft", "active", "superseded"]);
export type CoachSystemStatus = z.infer<typeof CoachSystemStatus>;

/**
 * A versioned snapshot of a team's coaching system.
 *
 * Revisions are immutable. Editing a rule produces a new revision rather than
 * mutating the old one, so a learning moment approved in March still cites the
 * rule text that was actually in force in March.
 */
export const CoachSystem = z.object({
  id: CoachSystemId,
  teamId: TeamId,
  revision: z.number().int().positive(),
  status: CoachSystemStatus,
  authoredByUserId: UserId,
  /** Coach's own words for how the team plays, shown above the rules. */
  summary: longText(1200).nullable().default(null),
  createdAt: Instant,
  activatedAt: Instant.nullable().default(null),
  supersededAt: Instant.nullable().default(null),
});
export type CoachSystem = z.infer<typeof CoachSystem>;

/* -------------------------------------------------------------------------- */
/* Coach rule                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * One citable rule from the coach's system.
 *
 * `id` is unique per revision and `key` is stable across revisions. Citations
 * store the `id`, which pins the exact wording that was cited. `key` is how the
 * interface shows "this rule changed in revision 3".
 */
export const CoachRule = z.object({
  id: CoachRuleId,
  key: shortText(80),
  coachSystemId: CoachSystemId,
  teamId: TeamId,
  revision: z.number().int().positive(),

  topic: CoachRuleTopic,
  /** The rule as the coach would say it to the team. One sentence. */
  statement: longText(400),
  /** Optional elaboration, exceptions, and when the rule does not apply. */
  detail: longText(1200).nullable().default(null),
  /** The coach's own vocabulary for this concept. */
  terminology: z.array(shortText(60)).default([]),

  /** Decision categories where this rule is worth consulting. */
  appliesTo: z.array(DecisionCategory).default([]),

  /** The questionnaire answer this rule was derived from, for traceability. */
  sourceQuestionId: shortText(80).nullable().default(null),

  createdAt: Instant,
});
export type CoachRule = z.infer<typeof CoachRule>;

/* -------------------------------------------------------------------------- */
/* Coach review                                                                */
/* -------------------------------------------------------------------------- */

export const ReviewVerdict = z.enum(["approved", "rejected", "needs_more_evidence"]);
export type ReviewVerdict = z.infer<typeof ReviewVerdict>;

export const RejectionReason = z.enum([
  "not_a_real_decision",
  "wrong_player",
  "wrong_category",
  "not_visible_enough",
  "contradicts_our_system",
  "too_similar_to_another_moment",
  "not_useful_for_this_player",
  "other",
]);
export type RejectionReason = z.infer<typeof RejectionReason>;

/**
 * A coach's decision about one candidate.
 *
 * The review is a separate record from the candidate. The candidate keeps the
 * original proposal verbatim; `editedInterpretation` holds the coach's version
 * when they changed anything. Comparing the two is what lets ReadRep learn a
 * coach's preferences later without ever overwriting what was proposed.
 */
export const CoachReview = z
  .object({
    id: CoachReviewId,
    candidateId: DecisionCandidateId,
    teamId: TeamId,
    reviewerUserId: UserId,

    verdict: ReviewVerdict,

    /**
     * Present only when the coach changed something. Null means "approved the
     * proposal as written", which is meaningfully different from "re-entered
     * the same text".
     */
    editedInterpretation: DecisionInterpretation.nullable().default(null),

    /** The coach's choice of preferred option, which may differ from the proposal. */
    preferredOptionId: DecisionOptionId.nullable().default(null),

    /** Coach's note to the player, in their own voice. */
    note: longText(1200).nullable().default(null),

    /** How confident the coach is that this is worth the player's time. */
    confidence: Confidence,

    rejectionReason: RejectionReason.nullable().default(null),
    rejectionDetail: longText(600).nullable().default(null),

    /** The coach-system revision in force when this review happened. */
    coachSystemRevision: z.number().int().positive().nullable().default(null),

    reviewedAt: Instant,
  })
  .superRefine((r, ctx) => {
    if (r.verdict === "rejected" && r.rejectionReason === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rejectionReason"],
        message: "a rejection must record why, so proposals can improve",
      });
    }
    if (r.verdict !== "rejected" && r.rejectionReason !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rejectionReason"],
        message: "only a rejected review may carry a rejection reason",
      });
    }
  });
export type CoachReview = z.infer<typeof CoachReview>;

/** The interpretation that should be published: the coach's edit if any, else the proposal. */
export const effectiveInterpretation = (
  proposal: DecisionInterpretation,
  review: Pick<CoachReview, "editedInterpretation">,
): DecisionInterpretation => review.editedInterpretation ?? proposal;

/** Whether a review authorizes creating a player-facing learning moment. */
export const authorizesPublication = (r: Pick<CoachReview, "verdict">): boolean =>
  r.verdict === "approved";
