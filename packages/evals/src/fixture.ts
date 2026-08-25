import { z } from "zod";

/**
 * The schema for one manually labelled benchmark moment.
 *
 * The benchmark is the only thing that will tell ReadRep whether a model change
 * made the product better or worse, so a fixture records what a *human* decided
 * was true, independently of anything the system produced. Fixtures are written
 * by a coach or a trained labeller against real film, following
 * `docs/BENCHMARK_LABELING.md`.
 *
 * No fixture in this repository is machine-generated, and none may be. A
 * fabricated benchmark measures nothing.
 */

export const FixtureId = z.string().regex(/^bm-[a-z0-9-]{3,60}$/, {
  message: "fixture ids look like bm-pnr-low-tag-01",
});

/** Where the moment came from. Kept as identifiers; never a file path or URL. */
export const FixtureSource = z.object({
  /** Opaque game reference. Real footage never enters this repository. */
  gameRef: z.string().min(1).max(80),
  videoAssetRef: z.string().min(1).max(80),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().positive(),
  pausePointMs: z.number().int().nonnegative(),
});

/** What a labeller could actually see. Drives the off-screen and occlusion cases. */
export const VisibilityLimitation = z.enum([
  "full_court_visible",
  "weak_side_off_screen",
  "ball_handler_occluded",
  "target_player_occluded",
  "camera_cut_during_window",
  "jersey_not_legible",
  "ball_not_visible",
]);

export const ExpectedUncertainty = z.enum([
  "off_screen",
  "occlusion",
  "camera_cut",
  "motion_blur",
  "ambiguous_identity",
  "similar_jerseys",
  "substitution_boundary",
  "insufficient_evidence",
  "no_applicable_coach_rule",
  "timing_dependent",
  "court_geometry_unknown",
  "ball_not_visible",
]);

export const DecisionQualityLabel = z.enum([
  "preferred",
  "acceptable",
  "suboptimal",
  "high_risk",
  "unclear",
]);

export const OutcomeLabel = z.enum([
  "made_shot",
  "missed_shot",
  "assist",
  "turnover",
  "foul_drawn",
  "offensive_rebound",
  "defensive_stop",
  "reset",
  "unknown",
]);

export const BenchmarkFixture = z
  .object({
    id: FixtureId,
    source: FixtureSource,

    /** Who labelled it and when, so a disputed label has an owner. */
    labelledBy: z.string().min(1).max(80),
    labelledAt: z.string().datetime({ offset: true }),
    /** Set when a second labeller agreed, which is what makes a label load-bearing. */
    secondLabellerAgreed: z.boolean().default(false),

    /** The category a coach says this moment is. */
    expectedCategory: z.string().min(1),

    /**
     * What a labeller could see. Required, because a fixture whose visibility
     * is unrecorded cannot test whether the system correctly says "I can't see
     * that".
     */
    visibility: z.array(VisibilityLimitation).min(1),

    /** Options as the labeller graded them, in no particular order. */
    options: z
      .array(
        z.object({
          label: z.string().min(1).max(120),
          quality: DecisionQualityLabel,
        }),
      )
      .min(2)
      .max(6),
    /** The read the coach wants. Must appear in `options` and be `preferred`. */
    preferredRead: z.string().min(1).max(120),

    /** Coach rules the moment should ground in. Empty means general reasoning. */
    expectedCoachRuleKeys: z.array(z.string().min(1)).default([]),

    /** Uncertainty a correct analysis must declare. */
    expectedUncertainty: z.array(ExpectedUncertainty).default([]),

    /** What actually happened. Recorded separately from the read, always. */
    outcome: OutcomeLabel,

    /** Whether a coach considers this worth a player's time at all. */
    teachable: z.boolean(),

    notes: z.string().max(1000).nullable().default(null),
  })
  .superRefine((f, ctx) => {
    if (f.source.endMs <= f.source.startMs) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["source", "endMs"],
        message: "the evidence window must end after it starts",
      });
    }
    if (
      f.source.pausePointMs < f.source.startMs ||
      f.source.pausePointMs >= f.source.endMs
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["source", "pausePointMs"],
        message: "the pause point must fall inside the evidence window",
      });
    }
    const preferred = f.options.find((o) => o.label === f.preferredRead);
    if (!preferred) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["preferredRead"],
        message: "the preferred read must be one of the labelled options",
      });
    } else if (preferred.quality !== "preferred") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["preferredRead"],
        message: "the option named as the preferred read must be graded `preferred`",
      });
    }
    if (
      f.expectedCoachRuleKeys.length === 0 &&
      !f.expectedUncertainty.includes("no_applicable_coach_rule")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expectedCoachRuleKeys"],
        message:
          "a fixture with no coach rule must expect `no_applicable_coach_rule`, so the benchmark checks that the system labels it general basketball reasoning",
      });
    }
    const offScreen = f.visibility.some(
      (v) =>
        v === "weak_side_off_screen" ||
        v === "camera_cut_during_window" ||
        v === "ball_not_visible",
    );
    if (offScreen && f.expectedUncertainty.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expectedUncertainty"],
        message:
          "a fixture with something off screen must expect the system to declare uncertainty",
      });
    }
  });
export type BenchmarkFixture = z.infer<typeof BenchmarkFixture>;

export const BenchmarkSet = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string().min(1).max(400),
  fixtures: z.array(BenchmarkFixture),
});
export type BenchmarkSet = z.infer<typeof BenchmarkSet>;
