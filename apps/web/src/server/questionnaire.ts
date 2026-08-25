import "server-only";
import { z } from "zod";
import type { CoachRuleTopic, DecisionCategory } from "@readrep/domain";

/**
 * The coach-system survey.
 *
 * Sixteen questions across the twelve topics the blueprint names. It is
 * deliberately short: a coach who abandons a thirty-question form halfway
 * leaves ReadRep with no rules to cite, and ungrounded advice is worse than no
 * advice. Follow-up detail is optional on every question.
 *
 * Each answer becomes a versioned `CoachRule` that decision analysis can cite
 * by id. The rule text is built from the coach's chosen option, so the rule
 * reads as something a coach would actually say to the team.
 */

export type QuestionOption = {
  value: string;
  label: string;
  /** The rule this answer produces, in the coach's voice. */
  statement: string;
};

export type Question = {
  id: string;
  topic: CoachRuleTopic;
  prompt: string;
  /** Shown under the prompt when the question needs framing. */
  help?: string;
  options: QuestionOption[];
  /** Decision categories where the resulting rule is worth consulting. */
  appliesTo: DecisionCategory[];
  /** Optional free-text elaboration, stored as the rule's detail. */
  followUpPrompt: string;
};

export const QUESTIONS: readonly Question[] = Object.freeze([
  {
    id: "offense-structure",
    topic: "offensive_structure",
    prompt: "What does your half-court offence mostly look like?",
    options: [
      {
        value: "five_out_motion",
        label: "Five-out motion",
        statement: "We play five-out motion: keep the paint empty and move the ball.",
      },
      {
        value: "four_out_one_in",
        label: "Four-out, one-in",
        statement: "We play four-out with one big inside; the big works off the ball.",
      },
      {
        value: "ball_screen_continuity",
        label: "Ball-screen continuity",
        statement:
          "We run ball-screen continuity: flow into the next screen if the first is stopped.",
      },
      {
        value: "set_plays",
        label: "Mostly called sets",
        statement: "We run called sets; execute the action before improvising.",
      },
    ],
    appliesTo: ["relocation_cutting_spacing", "shot_selection_late_clock"],
    followUpPrompt: "Anything specific about how you want it run?",
  },
  {
    id: "spacing-width",
    topic: "spacing",
    prompt: "How do you want the floor spaced when the ball is driven?",
    options: [
      {
        value: "corners_filled",
        label: "Corners stay filled",
        statement: "Corners stay filled on a drive; do not vacate the corner.",
      },
      {
        value: "drift_and_lift",
        label: "Drift and lift",
        statement:
          "On a drive, the weak side drifts and lifts to stay in the driver's vision.",
      },
      {
        value: "clear_the_side",
        label: "Clear the drive side",
        statement: "Clear out the drive side and let the driver work one-on-one.",
      },
    ],
    appliesTo: [
      "drive_pass_finish_or_pullup",
      "relocation_cutting_spacing",
      "attacking_a_closeout",
    ],
    followUpPrompt: "How far apart do you want players standing?",
  },
  {
    id: "spacing-cut",
    topic: "spacing",
    prompt:
      "When a teammate's defender turns their head, what should an off-ball player do?",
    options: [
      {
        value: "backdoor",
        label: "Cut backdoor",
        statement: "When your defender turns their head, cut backdoor.",
      },
      {
        value: "relocate",
        label: "Relocate along the arc",
        statement:
          "When your defender turns their head, relocate along the arc into the passing window.",
      },
      {
        value: "hold_spacing",
        label: "Hold spacing",
        statement: "Hold your spot and stay ready; spacing beats movement for us.",
      },
    ],
    appliesTo: ["relocation_cutting_spacing"],
    followUpPrompt: "Any cut you especially want to see?",
  },
  {
    id: "transition-first-look",
    topic: "transition_priorities",
    prompt: "What is your first look in transition?",
    options: [
      {
        value: "rim",
        label: "Rim first",
        statement: "In transition we hunt the rim first; a layup beats a good three.",
      },
      {
        value: "early_three",
        label: "Early three from the corners",
        statement:
          "In transition, run the corners hard and take the early three if it is open.",
      },
      {
        value: "drag_screen",
        label: "Drag screen into the middle",
        statement: "In transition we look for the drag screen and attack the middle.",
      },
      {
        value: "advance_pass",
        label: "Advance pass ahead",
        statement: "In transition, throw the pass ahead before you dribble.",
      },
    ],
    appliesTo: ["transition_advantage"],
    followUpPrompt: "When do you want the ball pulled back out?",
  },
  {
    id: "pnr-base-coverage-offense",
    topic: "pick_and_roll_rules",
    prompt:
      "When the low defender steps over to tag the roller, what do you want the ball handler to do?",
    help: "This is the read in the pick-and-roll that decides most possessions.",
    options: [
      {
        value: "skip_weak_side",
        label: "Look weak side",
        statement: "Against a low tag, look weak-side before forcing the finish.",
      },
      {
        value: "hit_the_roller",
        label: "Still hit the roller",
        statement:
          "Against a low tag, hit the roller anyway and let them finish through contact.",
      },
      {
        value: "pull_up",
        label: "Take the pull-up",
        statement:
          "Against a low tag, take the pull-up if the big is in drop coverage.",
      },
    ],
    appliesTo: ["pick_and_roll_read", "drive_pass_finish_or_pullup"],
    followUpPrompt: "Which pass do you want first if the corner is tagged too?",
  },
  {
    id: "pnr-screen-usage",
    topic: "pick_and_roll_rules",
    prompt: "How do you want the ball handler to use a ball screen?",
    options: [
      {
        value: "two_dribbles",
        label: "Get downhill in two dribbles",
        statement:
          "Use the ball screen to get downhill in two dribbles; do not stall behind it.",
      },
      {
        value: "reject_if_over",
        label: "Reject it when the defender goes over",
        statement:
          "Reject the ball screen when your defender jumps over the top of it.",
      },
      {
        value: "re_screen",
        label: "Re-screen if the first one fails",
        statement:
          "If the first screen does not create an advantage, re-screen immediately.",
      },
    ],
    appliesTo: ["pick_and_roll_read"],
    followUpPrompt: "Anything about screen angle you want called out?",
  },
  {
    id: "shot-profile-good",
    topic: "shot_profile",
    prompt: "Which shots do you actively want?",
    options: [
      {
        value: "rim_and_corner",
        label: "Rim and corner threes",
        statement: "Our shot profile is rim and corner threes.",
      },
      {
        value: "rim_and_any_three",
        label: "Rim and any open three",
        statement:
          "Our shot profile is rim attempts and any open three, corner or above the break.",
      },
      {
        value: "paint_touches",
        label: "Anything after a paint touch",
        statement: "We want a paint touch before a shot goes up.",
      },
      {
        value: "midrange_ok",
        label: "Mid-range is fine in rhythm",
        statement: "An in-rhythm mid-range shot is a good shot for us.",
      },
    ],
    appliesTo: [
      "shot_selection_late_clock",
      "drive_pass_finish_or_pullup",
      "attacking_a_closeout",
    ],
    followUpPrompt: "Which shot do you least want to see?",
  },
  {
    id: "shot-profile-clock",
    topic: "shot_profile",
    prompt: "Late in the clock, what do you want?",
    options: [
      {
        value: "best_available",
        label: "Take the best available shot",
        statement:
          "Late clock, take the best available shot rather than passing up a look.",
      },
      {
        value: "attack_rim",
        label: "Attack the rim for a foul",
        statement: "Late clock, attack the rim and put pressure on the officials.",
      },
      {
        value: "isolate_best_scorer",
        label: "Get it to the best scorer",
        statement:
          "Late clock, put the ball in our best scorer's hands and space around them.",
      },
    ],
    appliesTo: ["shot_selection_late_clock"],
    followUpPrompt: "At what point on the clock does this start?",
  },
  {
    id: "closeout-attack",
    topic: "closeout_attacks",
    prompt: "When a closeout arrives hard, what is the first read?",
    options: [
      {
        value: "attack_shoulder",
        label: "Drive the top shoulder",
        statement: "Against a hard closeout, drive the defender's top shoulder.",
      },
      {
        value: "shot_fake",
        label: "Shot fake, one dribble",
        statement:
          "Against a hard closeout, shot fake and take one dribble into the gap.",
      },
      {
        value: "swing_it",
        label: "Swing it and move it on",
        statement:
          "Against a hard closeout, swing the ball on rather than driving into help.",
      },
    ],
    appliesTo: ["attacking_a_closeout"],
    followUpPrompt: "What if the closeout is short instead of hard?",
  },
  {
    id: "defense-pnr-coverage",
    topic: "defensive_coverages",
    prompt: "What is your base ball-screen coverage?",
    options: [
      {
        value: "drop",
        label: "Drop",
        statement: "Our base ball-screen coverage is drop; the big protects the paint.",
      },
      {
        value: "hedge",
        label: "Hedge and recover",
        statement: "Our base ball-screen coverage is hedge and recover.",
      },
      {
        value: "switch_all",
        label: "Switch 1 through 5",
        statement: "We switch ball screens one through five.",
      },
      {
        value: "ice",
        label: "Ice side screens",
        statement: "We ice side ball screens and keep the ball on the sideline.",
      },
    ],
    appliesTo: ["screen_navigation_switching", "help_recover_low_man"],
    followUpPrompt: "When do you change off the base coverage?",
  },
  {
    id: "defense-switching",
    topic: "switching",
    prompt: "When do you switch off the ball?",
    options: [
      {
        value: "like_positions",
        label: "Only between like positions",
        statement:
          "Switch off the ball only between like positions; do not create a mismatch.",
      },
      {
        value: "everything_perimeter",
        label: "Everything on the perimeter",
        statement:
          "Switch everything on the perimeter and fight the mismatch afterwards.",
      },
      {
        value: "never",
        label: "We do not switch",
        statement: "We do not switch off the ball; fight through and stay attached.",
      },
    ],
    appliesTo: ["screen_navigation_switching"],
    followUpPrompt: "How should a switch be communicated?",
  },
  {
    id: "defense-low-man",
    topic: "help_and_low_man",
    prompt: "Who tags the roller?",
    options: [
      {
        value: "low_man",
        label: "The low man, from the weak-side corner",
        statement:
          "The low man tags the roller from the weak-side corner and recovers out.",
      },
      {
        value: "nearest_help",
        label: "Whoever is nearest",
        statement: "The nearest help defender tags the roller; talk it out.",
      },
      {
        value: "nobody",
        label: "Nobody — the big stays home",
        statement: "Nobody leaves the corner; our big handles the roller alone.",
      },
    ],
    appliesTo: ["tagging_rollers_paint_protection", "help_recover_low_man"],
    followUpPrompt: "How far off the corner shooter is acceptable?",
  },
  {
    id: "defense-help-recovery",
    topic: "help_and_low_man",
    prompt: "After helping, where does the defender recover?",
    options: [
      {
        value: "own_man",
        label: "Back to their own man",
        statement: "After you help, recover to your own man.",
      },
      {
        value: "rotate_next",
        label: "Rotate to the next open man",
        statement:
          "After you help, rotate to the next open man and let the defence rotate behind you.",
      },
    ],
    appliesTo: ["help_recover_low_man", "closeout_angle_discipline"],
    followUpPrompt: "Who covers the shooter you left?",
  },
  {
    id: "defense-closeout",
    topic: "closeout_rules",
    prompt: "How should a closeout be run?",
    options: [
      {
        value: "high_hands_short",
        label: "High hands, short choppy steps",
        statement:
          "Close out with high hands and short choppy steps; do not leave your feet.",
      },
      {
        value: "sprint_to_shooter",
        label: "Sprint and contest the shot",
        statement: "Sprint the closeout and contest the shot; live with the drive.",
      },
      {
        value: "closeout_to_side",
        label: "Close out to one side",
        statement: "Close out to a side and force the ball back toward our help.",
      },
    ],
    appliesTo: ["closeout_angle_discipline"],
    followUpPrompt: "Which direction do you force?",
  },
  {
    id: "rebounding",
    topic: "rebounding_assignments",
    prompt: "How many players go to the offensive glass?",
    options: [
      {
        value: "none",
        label: "Nobody — all five get back",
        statement:
          "Nobody crashes the offensive glass; all five get back in transition defence.",
      },
      {
        value: "one",
        label: "One crasher",
        statement: "One player crashes the offensive glass; the rest get back.",
      },
      {
        value: "two",
        label: "Two crashers",
        statement: "Two players crash the offensive glass; the guards get back.",
      },
      {
        value: "read_it",
        label: "Read the shot",
        statement:
          "Crash the offensive glass by reading the shot; a long shot means a long rebound.",
      },
    ],
    appliesTo: ["box_out_off_ball_positioning", "transition_matchup_communication"],
    followUpPrompt: "Who is always responsible for getting back?",
  },
  {
    id: "terminology",
    topic: "terminology",
    prompt: "What do you call the weak-side help defender?",
    help: "ReadRep uses your team's words in explanations, so a player recognises them.",
    options: [
      {
        value: "low_man",
        label: '"Low man"',
        statement: 'We call the weak-side help defender the "low man".',
      },
      {
        value: "help_side",
        label: '"Help side"',
        statement: 'We call the weak-side help defender "help side".',
      },
      {
        value: "tagger",
        label: '"Tagger"',
        statement: 'We call the weak-side help defender the "tagger".',
      },
      {
        value: "x_out",
        label: '"X-out"',
        statement: 'We call the weak-side help rotation the "X-out".',
      },
    ],
    appliesTo: ["help_recover_low_man", "tagging_rollers_paint_protection"],
    followUpPrompt: "Any other words your team uses that ReadRep should know?",
  },
]);

/** One coach's answer to one question. */
export const QuestionnaireAnswer = z.object({
  questionId: z.string().min(1),
  value: z.string().min(1),
  followUp: z.string().trim().max(1200).optional(),
});
export type QuestionnaireAnswer = z.infer<typeof QuestionnaireAnswer>;

export const QuestionnaireSubmission = z.object({
  summary: z.string().trim().max(1200).optional(),
  answers: z.array(QuestionnaireAnswer).min(1),
});
export type QuestionnaireSubmission = z.infer<typeof QuestionnaireSubmission>;

export const questionById = (id: string): Question | undefined =>
  QUESTIONS.find((q) => q.id === id);

/** Resolves an answer to the rule text it produces, or null if it is not valid. */
export const resolveAnswer = (
  answer: QuestionnaireAnswer,
): { question: Question; option: QuestionOption } | null => {
  const question = questionById(answer.questionId);
  if (!question) return null;
  const option = question.options.find((o) => o.value === answer.value);
  if (!option) return null;
  return { question, option };
};

export const TOPIC_COUNT = new Set(QUESTIONS.map((q) => q.topic)).size;
