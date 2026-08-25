import { z } from "zod";
import { brandedId, ClipRange, Instant, longText, shortText } from "../primitives";
import { EvidenceCitation, ProvenanceKind } from "../confidence";
import { CourtArea, DecisionQuality, ResponseType } from "../taxonomy";
import { PlayerId, TeamId, UserId } from "./identity";
import { GameId, VideoAssetId } from "./game";
import {
  DecisionCandidateId,
  DecisionInterpretation,
  DecisionOptionId,
} from "./decision";
import { CoachReviewId } from "./coach";
import { TrackId } from "../confidence";

export const LearningMomentId = brandedId("LearningMomentId");
export type LearningMomentId = z.infer<typeof LearningMomentId>;

export const AssignmentId = brandedId("AssignmentId");
export type AssignmentId = z.infer<typeof AssignmentId>;

export const PlayerAttemptId = brandedId("PlayerAttemptId");
export type PlayerAttemptId = z.infer<typeof PlayerAttemptId>;

export const ReflectionId = brandedId("ReflectionId");
export type ReflectionId = z.infer<typeof ReflectionId>;

/* -------------------------------------------------------------------------- */
/* Learning moment                                                             */
/* -------------------------------------------------------------------------- */

/** The question put to the player before the reveal. */
export const PlayerQuestion = z.object({
  prompt: longText(300),
  responseType: ResponseType,
  /** Populated for `multiple_choice`; the option ids the player picks between. */
  choiceOptionIds: z.array(DecisionOptionId).default([]),
  /** Populated for `select_court_area`. */
  selectableAreas: z.array(CourtArea).default([]),
  /** Populated for `select_player`. */
  selectableTrackIds: z.array(TrackId).default([]),
  /** Hint shown only after a response is recorded. Never before. */
  postRevealHint: longText(300).nullable().default(null),
});
export type PlayerQuestion = z.infer<typeof PlayerQuestion>;

/**
 * A coach-approved, player-facing repetition.
 *
 * The only record in ReadRep that a player is ever shown as instruction. Its
 * `provenance` is constrained to `coach_approved` or `manual_authoring`: an
 * `ai_proposal` cannot become a learning moment without passing through a
 * coach review, which is enforced by the schema below and again in the
 * data-access layer.
 */
export const LearningMoment = z
  .object({
    id: LearningMomentId,
    teamId: TeamId,
    playerId: PlayerId,
    gameId: GameId,
    videoAssetId: VideoAssetId,

    /** The proposal this came from. Preserved so the two never merge. */
    sourceCandidateId: DecisionCandidateId,
    /** The review that authorized publication. Null only for manual authoring. */
    sourceReviewId: CoachReviewId.nullable().default(null),

    provenance: ProvenanceKind,

    /** The clip the player watches, and where it stops. */
    clipRange: ClipRange,
    pausePointMs: z.number().int().nonnegative(),

    question: PlayerQuestion,
    interpretation: DecisionInterpretation,

    /** Free-form tags for grouping recurring cues over a season. */
    tags: z.array(shortText(40)).default([]),

    citation: EvidenceCitation,

    createdAt: Instant,
    retiredAt: Instant.nullable().default(null),
  })
  .superRefine((m, ctx) => {
    if (m.provenance !== "coach_approved" && m.provenance !== "manual_authoring") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["provenance"],
        message:
          "only coach-approved or manually authored content may be shown to a player as instruction",
      });
    }
    if (m.provenance === "coach_approved" && m.sourceReviewId === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sourceReviewId"],
        message: "coach-approved content must reference the review that approved it",
      });
    }
    if (m.pausePointMs < m.clipRange.startMs || m.pausePointMs >= m.clipRange.endMs) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pausePointMs"],
        message: "the pause point must fall inside the clip the player watches",
      });
    }
    if (
      m.question.responseType === "multiple_choice" &&
      m.question.choiceOptionIds.length < 2
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["question", "choiceOptionIds"],
        message: "a multiple-choice question needs at least two options",
      });
    }
  });
export type LearningMoment = z.infer<typeof LearningMoment>;

/* -------------------------------------------------------------------------- */
/* Assignment                                                                  */
/* -------------------------------------------------------------------------- */

export const AssignmentStatus = z.enum([
  "assigned",
  "in_progress",
  "completed",
  "revoked",
]);
export type AssignmentStatus = z.infer<typeof AssignmentStatus>;

/** A short set of repetitions a coach gives a player. */
export const Assignment = z
  .object({
    id: AssignmentId,
    teamId: TeamId,
    playerId: PlayerId,
    assignedByUserId: UserId,
    title: shortText(120),
    /** Ordered. The blueprint targets 5-10 excellent moments, not volume. */
    momentIds: z.array(LearningMomentId).min(1).max(20),
    status: AssignmentStatus,

    /**
     * Optional soft deadline shown to the player.
     *
     * Deliberately soft: nothing expires, nothing locks, and a late session is
     * still worth doing. A hard deadline on a sixteen-year-old's film homework
     * would turn a workout into a punishment.
     */
    dueAt: Instant.nullable().default(null),

    /**
     * Dedupes creation.
     *
     * A coach who double-clicks, or whose connection retries a POST, must end
     * up with one assignment rather than two. The client mints this once per
     * form and the data-access layer returns the existing assignment when it
     * sees the key again. Nullable because seeded and legacy rows predate it.
     */
    idempotencyKey: shortText(120).nullable().default(null),

    assignedAt: Instant,
    startedAt: Instant.nullable().default(null),
    completedAt: Instant.nullable().default(null),
    revokedAt: Instant.nullable().default(null),
  })
  .superRefine((a, ctx) => {
    if (a.dueAt !== null && a.dueAt < a.assignedAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dueAt"],
        message: "an assignment cannot be due before it was assigned",
      });
    }
    if (new Set(a.momentIds).size !== a.momentIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["momentIds"],
        message: "the same moment must not appear twice in one assignment",
      });
    }
  });
export type Assignment = z.infer<typeof Assignment>;

/* -------------------------------------------------------------------------- */
/* Player attempt                                                              */
/* -------------------------------------------------------------------------- */

/** What the player committed to, in the shape the question asked for. */
export const PlayerResponse = z.discriminatedUnion("type", [
  z.object({ type: z.literal("multiple_choice"), optionId: DecisionOptionId }),
  z.object({ type: z.literal("select_player"), trackId: TrackId }),
  z.object({ type: z.literal("select_court_area"), area: CourtArea }),
  z.object({ type: z.literal("short_text"), text: longText(600) }),
]);
export type PlayerResponse = z.infer<typeof PlayerResponse>;

/**
 * One pass at a learning moment.
 *
 * `committedAt` is recorded when the player locks in an answer and
 * `revealedAt` when the outcome is shown. The schema requires
 * `committedAt <= revealedAt`, which makes "commit before reveal" a property of
 * the stored data rather than a promise about the interface.
 *
 * `decisionQuality` and `outcome` are stored separately and neither is derived
 * from the other. There is no `isCorrect` field.
 */
export const PlayerAttempt = z
  .object({
    id: PlayerAttemptId,
    momentId: LearningMomentId,
    assignmentId: AssignmentId.nullable().default(null),
    playerId: PlayerId,
    teamId: TeamId,

    response: PlayerResponse,

    /** Quality of the read the player chose, looked up from the moment's options. */
    decisionQuality: DecisionQuality,

    committedAt: Instant,
    revealedAt: Instant.nullable().default(null),

    /** Milliseconds from the clip pausing to the player committing. */
    timeToDecideMs: z.number().int().nonnegative().nullable().default(null),

    /** Which attempt this is for this player and moment, starting at 1. */
    attemptNumber: z.number().int().positive(),

    createdAt: Instant,
  })
  .superRefine((a, ctx) => {
    if (a.revealedAt !== null && a.revealedAt < a.committedAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["revealedAt"],
        message:
          "the outcome cannot be revealed before the player committed to a decision",
      });
    }
  });
export type PlayerAttempt = z.infer<typeof PlayerAttempt>;

/* -------------------------------------------------------------------------- */
/* Reflection                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The player's own words about what they missed.
 *
 * Written after the reveal. `revisit` is the player's choice to see this moment
 * again, which is the signal that drives the revisit queue.
 */
export const Reflection = z.object({
  id: ReflectionId,
  attemptId: PlayerAttemptId,
  momentId: LearningMomentId,
  playerId: PlayerId,
  teamId: TeamId,
  /** What the player says they missed. Optional; skipping is allowed. */
  missedCue: longText(600).nullable().default(null),
  revisit: z.boolean().default(false),
  provenance: z.literal("player_input"),
  createdAt: Instant,
});
export type Reflection = z.infer<typeof Reflection>;

/**
 * Resolves the quality of a response against a moment's options.
 *
 * Returns `unclear` when the response cannot be matched, which is the honest
 * answer for a free-text response that no rubric covers. It never guesses.
 */
export const qualityForResponse = (
  moment: Pick<LearningMoment, "interpretation">,
  response: PlayerResponse,
): DecisionQuality => {
  switch (response.type) {
    case "multiple_choice": {
      const option = moment.interpretation.options.find(
        (o) => o.id === response.optionId,
      );
      return option?.quality ?? "unclear";
    }
    case "select_court_area": {
      const option = moment.interpretation.options.find(
        (o) => o.courtArea === response.area,
      );
      return option?.quality ?? "unclear";
    }
    case "select_player": {
      const option = moment.interpretation.options.find(
        (o) => o.trackId === response.trackId,
      );
      return option?.quality ?? "unclear";
    }
    case "short_text":
      // Free text is not auto-graded. A coach reads it, or it stays unjudged.
      return "unclear";
  }
};
