import { z } from "zod";

/* -------------------------------------------------------------------------- */
/* Decision categories (blueprint §4.3)                                        */
/* -------------------------------------------------------------------------- */

export const OffensiveDecisionCategory = z.enum([
  "pick_and_roll_read",
  "drive_pass_finish_or_pullup",
  "attacking_a_closeout",
  "relocation_cutting_spacing",
  "transition_advantage",
  "shot_selection_late_clock",
]);
export type OffensiveDecisionCategory = z.infer<typeof OffensiveDecisionCategory>;

export const DefensiveDecisionCategory = z.enum([
  "help_recover_low_man",
  "screen_navigation_switching",
  "closeout_angle_discipline",
  "tagging_rollers_paint_protection",
  "transition_matchup_communication",
  "box_out_off_ball_positioning",
]);
export type DefensiveDecisionCategory = z.infer<typeof DefensiveDecisionCategory>;

export const DecisionCategory = z.union([
  OffensiveDecisionCategory,
  DefensiveDecisionCategory,
]);
export type DecisionCategory = z.infer<typeof DecisionCategory>;

export const DecisionSide = z.enum(["offense", "defense"]);
export type DecisionSide = z.infer<typeof DecisionSide>;

export const decisionSideFor = (category: DecisionCategory): DecisionSide =>
  OffensiveDecisionCategory.safeParse(category).success ? "offense" : "defense";

/** Human-readable labels for the interface. Kept beside the enum so they cannot drift. */
export const DECISION_CATEGORY_LABEL: Record<DecisionCategory, string> = {
  pick_and_roll_read: "Pick-and-roll read",
  drive_pass_finish_or_pullup: "Drive: pass, finish, or pull up",
  attacking_a_closeout: "Attacking a closeout",
  relocation_cutting_spacing: "Relocation, cutting, and spacing",
  transition_advantage: "Transition advantage",
  shot_selection_late_clock: "Shot selection and late clock",
  help_recover_low_man: "Help, recover, and low-man rotation",
  screen_navigation_switching: "Screen navigation and switching",
  closeout_angle_discipline: "Closeout angle and discipline",
  tagging_rollers_paint_protection: "Tagging the roller and protecting the paint",
  transition_matchup_communication: "Transition matchups and communication",
  box_out_off_ball_positioning: "Box-outs and off-ball positioning",
};

/* -------------------------------------------------------------------------- */
/* Decision quality — never conflated with outcome                             */
/* -------------------------------------------------------------------------- */

/**
 * How good the read was, judged on what was visible at the moment of decision.
 *
 * This is deliberately NOT a boolean and deliberately NOT named "correct".
 * A player's answer is never labelled merely "wrong"; it is placed on this
 * scale and explained.
 */
export const DecisionQuality = z.enum([
  /** The read the coach's system asks for here. */
  "preferred",
  /** Defensible. Not the first read, but not a mistake. */
  "acceptable",
  /** A better read was available and visible. */
  "suboptimal",
  /** Low-percentage or turnover-prone given what was on the floor. */
  "high_risk",
  /** The evidence does not support judging the read. */
  "unclear",
]);
export type DecisionQuality = z.infer<typeof DecisionQuality>;

export const DECISION_QUALITY_LABEL: Record<DecisionQuality, string> = {
  preferred: "Preferred read",
  acceptable: "Acceptable read",
  suboptimal: "Better read available",
  high_risk: "High-risk read",
  unclear: "Not enough evidence to judge",
};

/**
 * What actually happened on the possession.
 *
 * Recorded separately from `DecisionQuality` and never derived from it. A
 * `preferred` decision can produce a `missed_shot`; a `high_risk` decision can
 * produce a `made_shot`. Collapsing these is the single most damaging thing
 * ReadRep could teach.
 */
export const PlayOutcome = z.enum([
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
export type PlayOutcome = z.infer<typeof PlayOutcome>;

export const PLAY_OUTCOME_LABEL: Record<PlayOutcome, string> = {
  made_shot: "Made shot",
  missed_shot: "Missed shot",
  assist: "Assist",
  turnover: "Turnover",
  foul_drawn: "Foul drawn",
  offensive_rebound: "Offensive rebound",
  defensive_stop: "Defensive stop",
  reset: "Reset the possession",
  unknown: "Not visible",
};

/**
 * A moment where the read was good but the ball did not go in, or the read was
 * poor but it did. These are the cases the product exists to teach, and the
 * evaluation set must contain both.
 */
export const isInstructiveMismatch = (
  quality: DecisionQuality,
  outcome: PlayOutcome,
): boolean => {
  const goodRead = quality === "preferred" || quality === "acceptable";
  const badRead = quality === "suboptimal" || quality === "high_risk";
  const goodResult = outcome === "made_shot" || outcome === "assist";
  const badResult = outcome === "missed_shot" || outcome === "turnover";
  return (goodRead && badResult) || (badRead && goodResult);
};

/* -------------------------------------------------------------------------- */
/* Player response formats                                                     */
/* -------------------------------------------------------------------------- */

/** How the player commits to a decision before the reveal. */
export const ResponseType = z.enum([
  "multiple_choice",
  "select_player",
  "select_court_area",
  "short_text",
]);
export type ResponseType = z.infer<typeof ResponseType>;

/** Court zones a player can tap. Coarse on purpose — this is a read, not a heat map. */
export const CourtArea = z.enum([
  "left_corner",
  "right_corner",
  "left_wing",
  "right_wing",
  "top_of_key",
  "left_elbow",
  "right_elbow",
  "paint",
  "restricted_area",
  "short_corner",
  "backcourt",
]);
export type CourtArea = z.infer<typeof CourtArea>;

export const COURT_AREA_LABEL: Record<CourtArea, string> = {
  left_corner: "Left corner",
  right_corner: "Right corner",
  left_wing: "Left wing",
  right_wing: "Right wing",
  top_of_key: "Top of the key",
  left_elbow: "Left elbow",
  right_elbow: "Right elbow",
  paint: "Paint",
  restricted_area: "Restricted area",
  short_corner: "Short corner",
  backcourt: "Backcourt",
};

/* -------------------------------------------------------------------------- */
/* Coach system topics (blueprint §4.4)                                        */
/* -------------------------------------------------------------------------- */

export const CoachRuleTopic = z.enum([
  "offensive_structure",
  "spacing",
  "transition_priorities",
  "pick_and_roll_rules",
  "shot_profile",
  "closeout_attacks",
  "defensive_coverages",
  "switching",
  "help_and_low_man",
  "closeout_rules",
  "rebounding_assignments",
  "terminology",
]);
export type CoachRuleTopic = z.infer<typeof CoachRuleTopic>;

export const COACH_RULE_TOPIC_LABEL: Record<CoachRuleTopic, string> = {
  offensive_structure: "Offensive structure",
  spacing: "Spacing",
  transition_priorities: "Transition priorities",
  pick_and_roll_rules: "Pick-and-roll rules",
  shot_profile: "Shot profile",
  closeout_attacks: "Attacking closeouts",
  defensive_coverages: "Defensive coverages",
  switching: "Switching",
  help_and_low_man: "Help and low-man responsibilities",
  closeout_rules: "Closeout rules",
  rebounding_assignments: "Rebounding assignments",
  terminology: "Team terminology",
};

/** Which coach topics are worth consulting for a given decision category. */
export const TOPICS_FOR_CATEGORY: Record<DecisionCategory, readonly CoachRuleTopic[]> =
  {
    pick_and_roll_read: [
      "pick_and_roll_rules",
      "spacing",
      "shot_profile",
      "terminology",
    ],
    drive_pass_finish_or_pullup: ["shot_profile", "spacing", "offensive_structure"],
    attacking_a_closeout: ["closeout_attacks", "shot_profile", "spacing"],
    relocation_cutting_spacing: ["spacing", "offensive_structure", "terminology"],
    transition_advantage: ["transition_priorities", "shot_profile"],
    shot_selection_late_clock: ["shot_profile", "offensive_structure"],
    help_recover_low_man: ["help_and_low_man", "defensive_coverages"],
    screen_navigation_switching: ["switching", "defensive_coverages", "terminology"],
    closeout_angle_discipline: ["closeout_rules", "defensive_coverages"],
    tagging_rollers_paint_protection: ["help_and_low_man", "defensive_coverages"],
    transition_matchup_communication: ["transition_priorities", "defensive_coverages"],
    box_out_off_ball_positioning: ["rebounding_assignments", "defensive_coverages"],
  };
