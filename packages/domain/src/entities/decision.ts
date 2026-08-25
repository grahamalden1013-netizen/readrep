import { z } from "zod";
import { brandedId, ClipRange, Instant, longText, shortText } from "../primitives.js";
import { Confidence, EvidenceCitation, TrackId } from "../confidence.js";
import {
  CourtArea,
  DecisionCategory,
  DecisionQuality,
  PlayOutcome,
} from "../taxonomy.js";
import { GameId, VideoAssetId } from "./game.js";
import { PlayerId } from "./identity.js";
import { PossessionId } from "./vision.js";

export const DecisionCandidateId = brandedId("DecisionCandidateId");
export type DecisionCandidateId = z.infer<typeof DecisionCandidateId>;

export const DecisionOptionId = brandedId("DecisionOptionId");
export type DecisionOptionId = z.infer<typeof DecisionOptionId>;

/* -------------------------------------------------------------------------- */
/* Options                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * One action available to the player at the decision point.
 *
 * Each option carries its own `quality` on the five-point scale. There is no
 * `isCorrect` flag anywhere in this schema, and adding one would be a
 * regression: it would force every option into right/wrong and erase the
 * distinction the product exists to teach.
 */
export const DecisionOption = z.object({
  id: DecisionOptionId,
  label: shortText(120),
  quality: DecisionQuality,
  /** Why this read is rated the way it is, in one or two sentences. */
  rationale: longText(600),
  /** For `select_court_area` questions, the area this option corresponds to. */
  courtArea: CourtArea.nullable().default(null),
  /** For `select_player` questions, the track this option points at. */
  trackId: TrackId.nullable().default(null),
});
export type DecisionOption = z.infer<typeof DecisionOption>;

/* -------------------------------------------------------------------------- */
/* Interpretation                                                              */
/* -------------------------------------------------------------------------- */

/**
 * The basketball reading of a moment.
 *
 * `observedFacts` and `basketballInference` are separate arrays on purpose. The
 * coach review interface shows them in separate columns so a reviewer can tell
 * at a glance what the system claims to have *seen* from what it *concluded*.
 * Blending them is how a product starts asserting things it cannot see.
 */
export const DecisionInterpretation = z
  .object({
    category: DecisionCategory,

    /** Only what is visible in the evidence window. No inference here. */
    observedFacts: z.array(longText(400)).min(1),

    /** Basketball reasoning derived from those facts. Clearly not observation. */
    basketballInference: z.array(longText(400)).default([]),

    /** The cue the player should learn to recognise. The heart of the lesson. */
    visualCue: longText(400),

    options: z.array(DecisionOption).min(2).max(6),
    preferredOptionId: DecisionOptionId,

    /** What to look for next time, phrased as an instruction to the player. */
    teachingCue: longText(400),

    /**
     * What actually happened. Recorded, never used to compute option quality.
     */
    outcome: PlayOutcome,
    outcomeNote: longText(400).nullable().default(null),

    citation: EvidenceCitation,
  })
  .superRefine((interp, ctx) => {
    const ids = interp.options.map((o) => o.id);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["options"],
        message: "decision options must have distinct ids",
      });
    }
    if (!ids.includes(interp.preferredOptionId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["preferredOptionId"],
        message: "the preferred option must be one of the listed options",
      });
    }
    const preferred = interp.options.find((o) => o.id === interp.preferredOptionId);
    if (preferred && preferred.quality !== "preferred") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["preferredOptionId"],
        message: "the option named as preferred must be rated `preferred`",
      });
    }
    if (
      interp.citation.coachRuleIds.length === 0 &&
      !interp.citation.uncertainty.some((u) => u.kind === "no_applicable_coach_rule")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["citation", "uncertainty"],
        message:
          "an interpretation that cites no coach rule must declare `no_applicable_coach_rule` uncertainty, so the interface can label it general basketball reasoning",
      });
    }
  });
export type DecisionInterpretation = z.infer<typeof DecisionInterpretation>;

/* -------------------------------------------------------------------------- */
/* Candidate                                                                   */
/* -------------------------------------------------------------------------- */

export const DecisionCandidateStatus = z.enum([
  "proposed",
  "in_review",
  "approved",
  "rejected",
  "superseded",
]);
export type DecisionCandidateStatus = z.infer<typeof DecisionCandidateStatus>;

/**
 * A moment proposed as teachable. A proposal, never instruction.
 *
 * A candidate becomes player-facing only by way of a `CoachReview` with an
 * `approve` verdict, which produces a separate `LearningMoment` record. The
 * candidate itself is preserved unedited so the original proposal and the
 * coach's final version remain distinguishable forever.
 */
export const DecisionCandidate = z.object({
  id: DecisionCandidateId,
  gameId: GameId,
  videoAssetId: VideoAssetId,
  teamId: brandedId("TeamId"),
  playerId: PlayerId,
  possessionId: PossessionId.nullable().default(null),

  status: DecisionCandidateStatus,

  /** The window a reviewer watches. Wider than the pause point. */
  evidenceWindow: ClipRange,
  /** The instant the clip stops, before the answer becomes obvious. */
  pausePointMs: z.number().int().nonnegative(),

  /** How teachable this moment is, used to rank the review queue. */
  teachabilityScore: z.number().min(0).max(1),
  rankConfidence: Confidence,

  interpretation: DecisionInterpretation,

  /** The coach-system revision the interpretation was grounded against. */
  coachSystemRevision: z.number().int().positive().nullable().default(null),

  createdAt: Instant,
  updatedAt: Instant,
});
export type DecisionCandidate = z.infer<typeof DecisionCandidate>;

/** The pause point must fall inside the window the reviewer is shown. */
export const hasCoherentPausePoint = (
  c: Pick<DecisionCandidate, "evidenceWindow" | "pausePointMs">,
): boolean =>
  c.pausePointMs >= c.evidenceWindow.startMs && c.pausePointMs < c.evidenceWindow.endMs;
