/**
 * The canonical coverage model — ReadRep's own opinion about what it needs to
 * know before it can coach a possession for this team.
 *
 * This is the fixed half of the hybrid architecture. It defines WHAT must be
 * learned; the AI decides HOW to ask, in what order, and in whose language.
 * Keeping it here (rather than in a prompt) means coverage, film-readiness,
 * and retrieval scoping are computed from code we control, not from whatever
 * the model felt like reporting.
 */

import type { Tag } from "@/lib/playbook/questions";
import type { Phase } from "@/lib/interview/vocabulary";

export type Topic = {
  id: string;
  phase: Phase;
  /** Short name, shown in the learning panel. */
  label: string;
  /** What ReadRep can do once this is known. Given to the model verbatim. */
  goal: string;
  /** The specific facts that make this topic genuinely covered. */
  needs: string[];
  /** How much this topic counts toward film-readiness. */
  weight: number;
  /** Film-critical topics gate the "ready for film" state. */
  filmCritical: boolean;
  /** Retrieval tags, so situation-scoped context can pull this topic's answers. */
  tags: Tag[];
  /** Don't raise this topic until these are at least partially covered. */
  dependsOn?: string[];
  /**
   * Server-side relevance gate. A topic that isn't applicable is never offered
   * to the model, so it can't waste a coach's time asking about a zone they
   * don't play. Evaluated against knowledge already captured.
   */
  appliesWhen?: (signals: RelevanceSignals) => boolean;
};

/**
 * Cheap, code-computed signals derived from captured knowledge. Deliberately
 * coarse: these gate topic *relevance*, not the model's phrasing.
 */
export type RelevanceSignals = {
  /** Instruction/trigger text of every active knowledge node, lowercased. */
  text: string;
  /** Topic ids the coach has explicitly marked as not applicable. */
  notApplicable: Set<string>;
  hasCoverage: (coverage: string) => boolean;
};

const mentions = (s: RelevanceSignals, ...needles: string[]) =>
  needles.some((n) => s.text.includes(n));

export const TOPICS: Topic[] = [
  // --- Team ---------------------------------------------------------------
  {
    id: "team.identity",
    phase: "team",
    label: "Team identity",
    goal: "Know the age group, level, and how this coach describes the way their team plays.",
    needs: ["Age group or level", "Two or three words for the team's style"],
    weight: 1,
    filmCritical: true,
    tags: ["identity"],
  },
  {
    id: "team.personnel",
    phase: "team",
    label: "Personnel shape",
    goal: "Know whether the team plays through guards, bigs, or a specific player, so reads can be framed for the right position.",
    needs: ["Who the offense runs through", "Whether they have a true post presence"],
    weight: 1,
    filmCritical: false,
    tags: ["identity", "post"],
    dependsOn: ["team.identity"],
  },

  // --- Offense ------------------------------------------------------------
  {
    id: "offense.system",
    phase: "offense",
    label: "Offensive system",
    goal: "Know the primary offense or set family so a half-court possession can be read against the right structure.",
    needs: ["The main offense or action family", "What they want to get to first"],
    weight: 3,
    filmCritical: true,
    tags: ["offense", "half_court"],
    dependsOn: ["team.identity"],
  },
  {
    id: "offense.spacing",
    phase: "offense",
    label: "Spacing rules",
    goal: "Know where players are supposed to stand, so ReadRep can tell a bad decision from bad spacing around it.",
    needs: ["Standard spots or spacing shape", "What players do when the ball is driven at them"],
    weight: 3,
    filmCritical: true,
    tags: ["offense", "spacing", "off_ball"],
    dependsOn: ["offense.system"],
  },
  {
    id: "offense.pace",
    phase: "offense",
    label: "Pace & transition offense",
    goal: "Know when this team wants to push and what the first look in transition is.",
    needs: ["When to push vs. pull it out", "The first transition look"],
    weight: 2,
    filmCritical: true,
    tags: ["pace", "transition", "offense"],
  },
  {
    id: "offense.ball_screen.usage",
    phase: "offense",
    label: "Ball screens they run",
    goal: "Know which ball screens exist in this team's offense before asking how to read each coverage.",
    needs: ["Which ball-screen types they run (side, middle, step-up, none)"],
    weight: 3,
    filmCritical: true,
    tags: ["ball_screen", "screening", "offense"],
    dependsOn: ["offense.system"],
  },
  {
    id: "offense.ball_screen.vs_drop",
    phase: "offense",
    label: "Reads vs drop",
    goal: "Know the ball handler's and screener's read order when the big drops.",
    needs: [
      "Ball handler's first read vs drop",
      "What changes if the big steps up",
      "What the screener does",
    ],
    weight: 4,
    filmCritical: true,
    tags: ["ball_screen", "offense", "screening"],
    dependsOn: ["offense.ball_screen.usage"],
    appliesWhen: (s) => !mentions(s, "no ball screen", "we don't run ball screens"),
  },
  {
    id: "offense.ball_screen.vs_switch",
    phase: "offense",
    label: "Reads vs switch",
    goal: "Know what this team attacks when the ball screen gets switched.",
    needs: ["Whether they hunt the mismatch or keep it moving", "What the screener does after the switch"],
    weight: 3,
    filmCritical: true,
    tags: ["ball_screen", "switching", "offense"],
    dependsOn: ["offense.ball_screen.usage"],
    appliesWhen: (s) => !mentions(s, "no ball screen", "we don't run ball screens"),
  },
  {
    id: "offense.ball_screen.vs_blitz",
    phase: "offense",
    label: "Reads vs hedge / blitz",
    goal: "Know the release valve and the next pass when two defenders come at the ball.",
    needs: ["First pass out of the trap", "Where the short roll goes", "Who fills behind"],
    weight: 3,
    filmCritical: true,
    tags: ["ball_screen", "offense", "screening"],
    dependsOn: ["offense.ball_screen.usage"],
    appliesWhen: (s) => !mentions(s, "no ball screen", "we don't run ball screens"),
  },
  {
    id: "offense.ball_screen.vs_ice",
    phase: "offense",
    label: "Reads vs ice / under",
    goal: "Know the counter when the defense refuses the screen or goes under it.",
    needs: ["Counter when the screen is iced", "What to do when the guard goes under"],
    weight: 2,
    filmCritical: false,
    tags: ["ball_screen", "offense"],
    dependsOn: ["offense.ball_screen.usage"],
    appliesWhen: (s) => !mentions(s, "no ball screen", "we don't run ball screens"),
  },
  {
    id: "offense.drive_kick",
    phase: "offense",
    label: "Drive & kick",
    goal: "Know what the driver is hunting and how the other four react to a paint touch.",
    needs: ["What the driver looks for", "How teammates relocate on a paint touch"],
    weight: 3,
    filmCritical: true,
    tags: ["drive_kick", "paint_touch", "off_ball", "offense"],
    dependsOn: ["offense.spacing"],
  },
  {
    id: "offense.off_ball",
    phase: "offense",
    label: "Off-ball movement",
    goal: "Know when to cut, when to stand still, and what the away-from-the-ball job is.",
    needs: ["When players cut", "What off-ball players do while the ball is being worked"],
    weight: 2,
    filmCritical: false,
    tags: ["off_ball", "cutting", "offense"],
    dependsOn: ["offense.spacing"],
  },
  {
    id: "offense.post",
    phase: "offense",
    label: "Post play",
    goal: "Know how this team uses the post and what the post player reads.",
    needs: ["Whether they post up at all", "What the post reads on a double"],
    weight: 1,
    filmCritical: false,
    tags: ["post", "offense"],
    dependsOn: ["team.personnel"],
    appliesWhen: (s) => !mentions(s, "no post", "we don't post"),
  },
  {
    id: "offense.shot_selection",
    phase: "offense",
    label: "Shot selection",
    goal: "Know which shots this coach calls good and which ones they call bad — the core of grading a decision.",
    needs: ["Shots they want", "Shots they don't want", "Who has green light"],
    weight: 4,
    filmCritical: true,
    tags: ["shot_selection", "offense"],
    dependsOn: ["offense.system"],
  },
  {
    id: "offense.late_clock",
    phase: "offense",
    label: "Late clock",
    goal: "Know what changes when the shot clock or the game clock is short.",
    needs: ["Late-clock go-to action", "How shot standards change late"],
    weight: 2,
    filmCritical: false,
    tags: ["late_clock", "offense"],
    dependsOn: ["offense.shot_selection"],
  },
  {
    id: "offense.turnovers",
    phase: "offense",
    label: "Turnovers they won't accept",
    goal: "Know which mistakes this coach treats as unacceptable versus part of playing aggressively.",
    needs: ["The turnovers that are never OK", "The mistakes they can live with"],
    weight: 2,
    filmCritical: true,
    tags: ["turnover", "offense", "priorities"],
  },
  {
    id: "offense.rebounding",
    phase: "offense",
    label: "Offensive rebounding",
    goal: "Know who crashes and who gets back, so transition decisions can be graded.",
    needs: ["Who goes to the glass", "Who gets back"],
    weight: 1,
    filmCritical: false,
    tags: ["offensive_rebounding", "transition_defense"],
  },

  // --- Defense ------------------------------------------------------------
  {
    id: "defense.base",
    phase: "defense",
    label: "Base defense",
    goal: "Know the primary defense so a defensive possession can be read against the right structure.",
    needs: ["Man, zone, or mixed", "What they want to take away first"],
    weight: 3,
    filmCritical: true,
    tags: ["defense", "priorities"],
    dependsOn: ["team.identity"],
  },
  {
    id: "defense.ball_screen",
    phase: "defense",
    label: "Ball-screen defense",
    goal: "Know the default coverage and each defender's job in it.",
    needs: ["Default coverage", "On-ball defender's job", "Screener's defender's job", "Low man's job"],
    weight: 4,
    filmCritical: true,
    tags: ["defensive_ball_screen", "defense", "ball_screen"],
    dependsOn: ["defense.base"],
  },
  {
    id: "defense.help",
    phase: "defense",
    label: "Help & rotation",
    goal: "Know where help comes from on a drive and who covers behind it.",
    needs: ["Where help comes from", "Who rotates behind the helper"],
    weight: 4,
    filmCritical: true,
    tags: ["help", "rotation", "defense"],
    dependsOn: ["defense.base"],
  },
  {
    id: "defense.closeouts",
    phase: "defense",
    label: "Closeouts",
    goal: "Know how this team closes out, which decides whether a defensive read was right.",
    needs: ["Closeout technique or rule", "Who they close out short on"],
    weight: 2,
    filmCritical: false,
    tags: ["closeout", "defense"],
    dependsOn: ["defense.help"],
  },
  {
    id: "defense.transition",
    phase: "defense",
    label: "Transition defense",
    goal: "Know the first job on a live-ball change of possession.",
    needs: ["First priority getting back", "Who takes the ball"],
    weight: 2,
    filmCritical: true,
    tags: ["transition_defense", "defense", "transition"],
  },
  {
    id: "defense.rebounding",
    phase: "defense",
    label: "Defensive rebounding",
    goal: "Know the box-out and gang-rebound rules.",
    needs: ["Box-out rule", "Whether guards crash or leak"],
    weight: 1,
    filmCritical: false,
    tags: ["defensive_rebounding", "defense"],
  },
  {
    id: "defense.zone",
    phase: "defense",
    label: "Zone specifics",
    goal: "Know the zone's shape and responsibilities, when the team actually plays zone.",
    needs: ["Which zone", "When they go to it", "The key responsibility inside it"],
    weight: 2,
    filmCritical: false,
    tags: ["zone", "defense"],
    dependsOn: ["defense.base"],
    // Only relevant once zone has actually come up.
    appliesWhen: (s) => mentions(s, "zone", "2-3", "1-3-1", "3-2", "matchup"),
  },

  // --- Coaching -----------------------------------------------------------
  {
    id: "coaching.priorities",
    phase: "coaching",
    label: "Coaching priorities",
    goal: "Know what this coach corrects first, so feedback sounds like them and not like a generic clinic.",
    needs: ["What they correct first", "What they let go"],
    weight: 3,
    filmCritical: true,
    tags: ["priorities"],
  },
  {
    id: "coaching.decision_vs_outcome",
    phase: "coaching",
    label: "Decision vs. outcome",
    goal: "Know whether this coach grades the read or the result — the single most important calibration for ReadRep's feedback.",
    needs: ["How they treat a good read that missed", "How they treat a bad read that scored"],
    weight: 4,
    filmCritical: true,
    tags: ["priorities", "development"],
  },
  {
    id: "coaching.language",
    phase: "coaching",
    label: "Teaching language",
    goal: "Know the coach's own words and tone, so ReadRep's feedback uses their vocabulary.",
    needs: ["How they talk to players", "Words or cues they repeat"],
    weight: 2,
    filmCritical: true,
    tags: ["development"],
  },
  {
    id: "coaching.terminology",
    phase: "coaching",
    label: "Team terminology",
    goal: "Know the team's call names and slang so ReadRep can say 'Chicago' instead of 'pin-down into a handoff'.",
    needs: ["At least a few team-specific terms with meanings"],
    weight: 3,
    filmCritical: true,
    tags: ["development", "identity"],
    dependsOn: ["offense.system"],
  },
];

export const TOPIC_BY_ID = new Map(TOPICS.map((t) => [t.id, t]));

export function isKnownTopic(id: string): boolean {
  return TOPIC_BY_ID.has(id);
}

export function topicLabel(id: string): string {
  return TOPIC_BY_ID.get(id)?.label ?? id;
}

/**
 * Topics that are in play right now: applicable to this team and not blocked
 * behind an unanswered prerequisite. The model only ever sees this list.
 */
export function applicableTopics(
  signals: RelevanceSignals,
  covered: (topicId: string) => boolean,
): Topic[] {
  return TOPICS.filter((t) => {
    if (signals.notApplicable.has(t.id)) return false;
    if (t.appliesWhen && !t.appliesWhen(signals)) return false;
    if (t.dependsOn && !t.dependsOn.every(covered)) return false;
    return true;
  });
}
