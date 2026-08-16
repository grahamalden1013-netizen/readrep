/**
 * The Coach Intelligence interview.
 *
 * Question definitions live in code, not the database: they're product logic
 * that ships and versions with the app, and `playbook_responses` stores answers
 * in a shape (ordered `selections` + `custom_text`) that absorbs new questions
 * without a migration.
 *
 * Two things make this more than a survey:
 *   1. `showIf` predicates adapt the interview — a coach who doesn't run ball
 *      screens never sees the pick-and-roll sections.
 *   2. `tags` mark which basketball situations an answer is relevant to, so
 *      `getTeamBasketballContext(teamId, situation)` can retrieve only the
 *      coaching intelligence that bears on the possession being analyzed
 *      instead of dumping the whole playbook into every AI request.
 */

export type QuestionType = "single" | "multi" | "rank" | "text" | "longtext";

export type Answers = Record<string, { selections: string[]; customText: string | null }>;

/** Situation facets an answer can be relevant to. Drives AI retrieval. */
export type Tag =
  | "identity"
  | "offense"
  | "spacing"
  | "pace"
  | "transition"
  | "half_court"
  | "paint_touch"
  | "drive_kick"
  | "cutting"
  | "screening"
  | "off_ball"
  | "post"
  | "offensive_rebounding"
  | "shot_selection"
  | "late_clock"
  | "turnover"
  | "ball_screen"
  | "defense"
  | "defensive_ball_screen"
  | "help"
  | "closeout"
  | "rotation"
  | "transition_defense"
  | "defensive_rebounding"
  | "switching"
  | "zone"
  | "priorities"
  | "development";

export type Question = {
  key: string;
  type: QuestionType;
  label: string;
  /** Shown under the label — why ReadRep is asking. */
  help?: string;
  options?: string[];
  allowCustom?: boolean;
  customLabel?: string;
  placeholder?: string;
  tags: Tag[];
  showIf?: (a: Answers) => boolean;
};

/** One screen of the interview. Usually a single question. */
export type Step =
  | { id: string; kind: "questions"; questions: Question[]; showIf?: (a: Answers) => boolean }
  | { id: string; kind: "terminology"; showIf?: (a: Answers) => boolean }
  | {
      id: string;
      kind: "coverage";
      phase: "offense" | "defense";
      title: string;
      help: string;
      showIf?: (a: Answers) => boolean;
    };

export type Section = {
  slug: string;
  title: string;
  intro: string;
  steps: Step[];
  showIf?: (a: Answers) => boolean;
};

// --- ball-screen coverage vocabulary (shared with the coverage matrix) -----

export const COVERAGES = [
  "drop",
  "switch",
  "hedge",
  "blitz",
  "ice",
  "under",
  "over",
] as const;
export type Coverage = (typeof COVERAGES)[number];

export const COVERAGE_LABELS: Record<Coverage, string> = {
  drop: "Drop",
  switch: "Switch",
  hedge: "Hedge / Show",
  blitz: "Blitz / Trap",
  ice: "ICE / Down",
  under: "Under",
  over: "Over",
};

export const OFFENSE_ROLES = ["ball_handler", "screener", "off_ball"] as const;
export const DEFENSE_ROLES = ["on_ball", "screener_def", "low_man", "weak_side"] as const;
export type CoverageRole = (typeof OFFENSE_ROLES)[number] | (typeof DEFENSE_ROLES)[number];

export const ROLE_LABELS: Record<CoverageRole, string> = {
  ball_handler: "Ball handler",
  screener: "Screener",
  off_ball: "Off-ball players",
  on_ball: "On-ball defender",
  screener_def: "Screener's defender",
  low_man: "Low man",
  weak_side: "Weak-side players",
};

/** Suggested reads per role — coaches can add their own on top. */
export const ROLE_READS: Record<CoverageRole, string[]> = {
  ball_handler: [
    "Turn the corner",
    "Reject the screen",
    "Hit the roller",
    "Hit the pop",
    "Pocket pass",
    "Skip weak side",
    "Snake",
    "Retreat / re-screen",
    "Pull up",
    "Attack the big",
  ],
  screener: ["Roll", "Short roll", "Pop", "Slip", "Re-screen", "Seal"],
  off_ball: ["Lift", "Drift", "Shake", "45 cut", "Replace", "Hold spacing"],
  on_ball: ["Force to the screen", "Force away", "Go over", "Go under", "Trail", "Switch"],
  screener_def: ["Drop", "Show and recover", "Hedge", "Blitz", "Switch", "Flat"],
  low_man: ["Tag the roller", "Take the roller", "Stunt and recover", "Stay home"],
  weak_side: ["Rotate to the rim", "Split the difference", "Stay attached", "Sink and recover"],
};

export function rolesForPhase(phase: "offense" | "defense"): readonly CoverageRole[] {
  return phase === "offense" ? OFFENSE_ROLES : DEFENSE_ROLES;
}

// --- conditional helpers --------------------------------------------------

const sel = (a: Answers, key: string): string[] => a[key]?.selections ?? [];
const has = (a: Answers, key: string, ...values: string[]) =>
  values.some((v) => sel(a, key).includes(v));
const answered = (a: Answers, key: string) =>
  sel(a, key).length > 0 || Boolean(a[key]?.customText?.trim());

/** Ball-screen sections only appear if screens are actually part of the system. */
export const usesBallScreens = (a: Answers) =>
  has(a, "off_actions", "Ball screen / pick-and-roll", "Spain P&R", "Step-up screen", "Drag screen", "DHO") ||
  has(
    a,
    "off_systems",
    "Spread pick-and-roll",
    "Continuity ball screen",
    "Horns-based",
    "Dribble drive",
  );

const playsMan = (a: Answers) =>
  has(a, "def_identity", "Man-to-man", "Pack line", "Pressure man", "Switch everything", "Multiple defenses");

const playsZone = (a: Answers) =>
  has(a, "def_identity", "Zone", "Matchup zone", "Multiple defenses");

const playsMultiple = (a: Answers) => has(a, "def_identity", "Multiple defenses");

const postsUp = (a: Answers) =>
  has(a, "off_systems", "4-out 1-in", "Post-oriented", "Triangle concepts", "Princeton concepts") ||
  has(a, "off_actions", "Post entry", "Post splits");

// --- sections -------------------------------------------------------------

export const SECTIONS: Section[] = [
  {
    slug: "identity",
    title: "Your team",
    intro: "A little context before we get into how you play.",
    steps: [
      {
        id: "identity-basics",
        kind: "questions",
        questions: [
          {
            key: "team_level",
            type: "single",
            label: "What level do you coach?",
            options: ["Youth", "Middle school", "High school", "AAU / Club", "College", "Other"],
            allowCustom: true,
            tags: ["identity"],
          },
          {
            key: "team_age_group",
            type: "text",
            label: "Age group or grade",
            placeholder: "e.g. 14U, Varsity, Grades 9–10",
            tags: ["identity"],
          },
          {
            key: "team_season",
            type: "text",
            label: "Season",
            placeholder: "e.g. 2025–26",
            tags: ["identity"],
          },
        ],
      },
      {
        id: "identity-traits",
        kind: "questions",
        questions: [
          {
            key: "identity_traits",
            type: "multi",
            label: "What do you want your team to be known for?",
            help: "Pick what genuinely applies. This becomes the lens ReadRep judges decisions through.",
            options: [
              "Pace",
              "Ball movement",
              "Shooting",
              "Paint pressure",
              "Physicality",
              "Decision making",
              "Defense",
              "Rebounding",
              "Execution",
              "Toughness",
              "Transition",
            ],
            allowCustom: true,
            tags: ["identity", "priorities"],
          },
        ],
      },
      {
        id: "identity-description",
        kind: "questions",
        questions: [
          {
            key: "identity_description",
            type: "longtext",
            label: "How would you describe how your team plays?",
            help: "A few sentences in your own words.",
            tags: ["identity"],
          },
        ],
      },
    ],
  },

  {
    slug: "offense",
    title: "Offensive identity",
    intro: "How you want the ball moved, and what a good possession looks like.",
    steps: [
      {
        id: "off-systems",
        kind: "questions",
        questions: [
          {
            key: "off_systems",
            type: "multi",
            label: "What do you run offensively?",
            help: "Pick everything that applies — most teams aren't just one thing.",
            options: [
              "5-out",
              "4-out 1-in",
              "Motion",
              "Continuity",
              "Dribble drive",
              "Princeton concepts",
              "Flex",
              "Triangle concepts",
              "Horns-based",
              "Spread pick-and-roll",
              "Continuity ball screen",
              "Post-oriented",
              "Transition-heavy",
              "Set-play heavy",
            ],
            allowCustom: true,
            customLabel: "Your own system",
            tags: ["offense", "half_court"],
          },
        ],
      },
      {
        id: "off-actions",
        kind: "questions",
        questions: [
          {
            key: "off_actions",
            type: "multi",
            label: "Which actions show up most in your offense?",
            help: "Your answer decides which follow-up sections you'll see.",
            options: [
              "Ball screen / pick-and-roll",
              "DHO",
              "Spain P&R",
              "Drag screen",
              "Step-up screen",
              "Pin-downs",
              "Flare screens",
              "Staggers",
              "Back screens",
              "UCLA cuts",
              "Iverson cuts",
              "Post entry",
              "Post splits",
              "Flex cuts",
            ],
            allowCustom: true,
            tags: ["offense", "screening"],
          },
        ],
      },
      {
        id: "off-priorities",
        kind: "questions",
        questions: [
          {
            key: "off_priorities",
            type: "rank",
            label: "Rank what matters most in a half-court possession.",
            help: "Order these — the top ones carry the most weight when ReadRep grades a read.",
            options: [
              "Paint touch",
              "Ball reversal",
              "Getting a shot up early",
              "Working the shot clock",
              "Exploiting a mismatch",
              "Extra pass",
              "Offensive rebounding position",
              "Protecting the ball",
            ],
            allowCustom: true,
            tags: ["offense", "half_court", "priorities"],
          },
        ],
      },
      {
        id: "off-pace",
        kind: "questions",
        questions: [
          {
            key: "off_pace",
            type: "single",
            label: "What pace do you want?",
            options: [
              "Push every chance we get",
              "Push off makes and misses when numbers are there",
              "Selective — only with a clear advantage",
              "Deliberate, get into offense",
            ],
            allowCustom: true,
            tags: ["offense", "pace", "transition"],
          },
        ],
      },
      {
        id: "off-spacing",
        kind: "questions",
        questions: [
          {
            key: "off_spacing_rules",
            type: "multi",
            label: "What are your spacing rules?",
            options: [
              "Corners must be filled",
              "15–18 feet apart",
              "Never two players on the same side of the lane",
              "Keep the dunker spot occupied",
              "Big stays above the ball",
              "Weak side stays wide",
            ],
            allowCustom: true,
            tags: ["offense", "spacing", "half_court"],
          },
        ],
      },
      {
        id: "off-paint-touch",
        kind: "questions",
        questions: [
          {
            key: "off_paint_touch",
            type: "multi",
            label: "When the ball gets into the paint, what does everyone else do?",
            help: "One of the highest-value rules for judging off-ball decisions.",
            options: ["Drift", "Lift", "Fill behind", "45 cut", "Baseline cut", "Relocate", "Hold spacing"],
            allowCustom: true,
            tags: ["offense", "paint_touch", "spacing", "off_ball", "drive_kick"],
          },
        ],
      },
      {
        id: "off-drive-kick",
        kind: "questions",
        questions: [
          {
            key: "off_drive_kick",
            type: "longtext",
            label: "What are your drive-and-kick rules?",
            placeholder:
              "e.g. Two feet in the paint before we kick. First kick is to the corner, second is the swing.",
            tags: ["offense", "drive_kick", "paint_touch"],
          },
        ],
      },
      {
        id: "off-cutting",
        kind: "questions",
        questions: [
          {
            key: "off_cutting",
            type: "longtext",
            label: "How do you teach cutting and off-ball movement?",
            placeholder: "e.g. Cut when your defender turns their head. Never stand still two passes away.",
            tags: ["offense", "cutting", "off_ball"],
          },
        ],
      },
      {
        id: "off-screening",
        kind: "questions",
        questions: [
          {
            key: "off_screening",
            type: "longtext",
            label: "What do you teach about setting and using screens?",
            placeholder: "e.g. Screener sprints in, sets it two feet wider than you think. Cutter sets it up first.",
            tags: ["offense", "screening"],
          },
        ],
      },
      {
        id: "off-post",
        kind: "questions",
        showIf: postsUp,
        questions: [
          {
            key: "off_post_rules",
            type: "longtext",
            label: "What are your post-entry rules?",
            help: "You mentioned post play — what should happen once the ball goes inside?",
            placeholder: "e.g. Enter above the block. Passer cuts or relocates, never stands.",
            tags: ["offense", "post"],
          },
        ],
      },
      {
        id: "off-shot-selection",
        kind: "questions",
        questions: [
          {
            key: "shots_encouraged",
            type: "multi",
            label: "Which shots do you actively want?",
            help: "ReadRep won't assume an analytics philosophy — some coaches want the midrange.",
            options: [
              "Rim",
              "Layups",
              "Free throws",
              "Corner 3",
              "Above-break 3",
              "Paint touch → kick-out 3",
              "Post mismatch",
              "Midrange pull-up",
              "Elbow jumper",
              "Floater",
            ],
            allowCustom: true,
            tags: ["offense", "shot_selection"],
          },
          {
            key: "shots_discouraged",
            type: "multi",
            label: "Which shots do you coach against?",
            options: [
              "Contested midrange",
              "Early-clock contested 3",
              "Long 2",
              "Contested paint attempts",
              "Step-back 3 off the dribble",
              "Fadeaway",
              "Shots with no rebounding balance",
            ],
            allowCustom: true,
            tags: ["offense", "shot_selection"],
          },
        ],
      },
      {
        id: "off-late-clock",
        kind: "questions",
        questions: [
          {
            key: "off_late_clock",
            type: "longtext",
            label: "What do you want late in the shot clock?",
            placeholder: "e.g. Under 8 we get downhill — a contested rim attempt beats a rushed 3.",
            tags: ["offense", "late_clock", "shot_selection"],
          },
        ],
      },
      {
        id: "off-rebounding",
        kind: "questions",
        questions: [
          {
            key: "off_rebounding",
            type: "single",
            label: "What's your offensive rebounding philosophy?",
            options: [
              "Crash hard — send multiple",
              "Send one, everyone else balances",
              "Read it — crash only from an advantage",
              "Get back, protect transition defense",
            ],
            allowCustom: true,
            tags: ["offense", "offensive_rebounding", "transition_defense"],
          },
        ],
      },
      {
        id: "off-turnover",
        kind: "questions",
        questions: [
          {
            key: "off_turnovers",
            type: "longtext",
            label: "Which turnovers bother you most?",
            help: "Some turnovers are aggressive mistakes, others are careless. Where's your line?",
            placeholder: "e.g. I'll live with a skip pass that gets picked. I won't live with a lazy jump pass.",
            tags: ["offense", "turnover", "priorities"],
          },
        ],
      },
    ],
  },

  {
    slug: "ball-screen-offense",
    title: "Ball-screen reads",
    intro:
      "You run ball screens, so let's get specific. What you teach here is what ReadRep will judge these possessions against.",
    showIf: usesBallScreens,
    steps: [
      {
        id: "pnr-usage",
        kind: "questions",
        questions: [
          {
            key: "pnr_where",
            type: "multi",
            label: "Where do you run your ball screens?",
            options: ["Middle", "Side / wing", "Step-up", "Drag in transition", "Horns", "Empty corner"],
            allowCustom: true,
            tags: ["ball_screen", "offense"],
          },
        ],
      },
      {
        id: "pnr-coverage-matrix",
        kind: "coverage",
        phase: "offense",
        title: "What do you teach against each coverage?",
        help:
          "This is the heart of it. Pick the coverages you actually see, then set the read for each role. You can skip any you don't face.",
      },
      {
        id: "pnr-general",
        kind: "questions",
        questions: [
          {
            key: "pnr_general_rules",
            type: "longtext",
            label: "Anything else about how you want ball screens played?",
            placeholder: "e.g. We never pick up our dribble off a screen. Screener's first look is always the rim.",
            tags: ["ball_screen", "offense"],
          },
        ],
      },
    ],
  },

  {
    slug: "transition",
    title: "Transition",
    intro: "Getting from defense to offense.",
    steps: [
      {
        id: "trans-priority",
        kind: "questions",
        questions: [
          {
            key: "trans_first_priority",
            type: "single",
            label: "After a rebound, what's the first priority?",
            options: [
              "Push the ball ahead",
              "Rim run",
              "Advance pass up the sideline",
              "Get organized and execute",
              "Read the floor before deciding",
            ],
            allowCustom: true,
            tags: ["transition", "pace"],
          },
        ],
      },
      {
        id: "trans-lanes",
        kind: "questions",
        questions: [
          {
            key: "trans_lanes",
            type: "longtext",
            label: "How do players fill lanes?",
            placeholder: "e.g. Wings sprint the corners, trailer to the top, first big rim runs.",
            tags: ["transition", "spacing"],
          },
        ],
      },
      {
        id: "trans-attack",
        kind: "questions",
        questions: [
          {
            key: "trans_attack_vs_pull",
            type: "longtext",
            label: "When do you attack immediately vs. pull it out?",
            placeholder: "e.g. Attack with numbers or off a live-ball turnover. Pull out if the defense is set.",
            tags: ["transition", "shot_selection", "pace"],
          },
        ],
      },
    ],
  },

  {
    slug: "defense",
    title: "Defensive identity",
    intro: "How you want the ball guarded.",
    steps: [
      {
        id: "def-identity",
        kind: "questions",
        questions: [
          {
            key: "def_identity",
            type: "multi",
            label: "What's your base defense?",
            options: [
              "Man-to-man",
              "Pack line",
              "Pressure man",
              "Switch everything",
              "Zone",
              "Matchup zone",
              "Multiple defenses",
            ],
            allowCustom: true,
            tags: ["defense"],
          },
        ],
      },
      {
        id: "def-multiple",
        kind: "questions",
        showIf: playsMultiple,
        questions: [
          {
            key: "def_multiple_when",
            type: "longtext",
            label: "When and why do you change defenses?",
            placeholder: "e.g. Man in the half court, 1-3-1 after made free throws, zone against poor shooting teams.",
            tags: ["defense", "zone"],
          },
        ],
      },
      {
        id: "def-zone",
        kind: "questions",
        showIf: playsZone,
        questions: [
          {
            key: "def_zone_shape",
            type: "multi",
            label: "Which zone looks do you run?",
            options: ["2-3", "3-2", "1-3-1", "1-2-2", "Matchup", "Box-and-1", "Triangle-and-2"],
            allowCustom: true,
            tags: ["defense", "zone"],
          },
          {
            key: "def_zone_rules",
            type: "longtext",
            label: "What are your zone principles?",
            placeholder: "e.g. Ball can't get to the middle. Bottom defenders own the corners. Trap the short corner.",
            tags: ["defense", "zone"],
          },
        ],
      },
      {
        id: "def-pressure",
        kind: "questions",
        questions: [
          {
            key: "def_pressure",
            type: "single",
            label: "How much pressure do you want on the ball?",
            options: [
              "Full-court pressure",
              "Pick up in the back court",
              "Pick up at half court",
              "Contain, no gambling",
              "Sag and protect the paint",
            ],
            allowCustom: true,
            tags: ["defense"],
          },
        ],
      },
      {
        id: "def-help",
        kind: "questions",
        showIf: playsMan,
        questions: [
          {
            key: "def_help_rules",
            type: "longtext",
            label: "What are your help and gap rules?",
            help: "Where should players be one and two passes away?",
            placeholder: "e.g. One pass away is in a deny gap, two passes away is at the nail.",
            tags: ["defense", "help"],
          },
          {
            key: "def_nail",
            type: "single",
            label: "Do you use nail help?",
            options: [
              "Yes — always someone at the nail",
              "Yes, but only against drivers",
              "No — we stay attached to shooters",
            ],
            allowCustom: true,
            tags: ["defense", "help"],
          },
        ],
      },
      {
        id: "def-closeout",
        kind: "questions",
        questions: [
          {
            key: "def_closeout",
            type: "longtext",
            label: "How do you teach closeouts?",
            placeholder: "e.g. Sprint, chop, high hand, force baseline. Never leave the ground on a shot fake.",
            tags: ["defense", "closeout", "rotation"],
          },
        ],
      },
      {
        id: "def-switch",
        kind: "questions",
        questions: [
          {
            key: "def_switch_rules",
            type: "longtext",
            label: "What are your switching rules?",
            placeholder: "e.g. Switch 1 through 4, never switch our 5 onto a guard above the break.",
            tags: ["defense", "switching"],
          },
          {
            key: "def_mismatch",
            type: "longtext",
            label: "What do you do once there's a mismatch?",
            placeholder: "e.g. Big on a guard — force sideline and expect help from the top.",
            tags: ["defense", "switching", "help"],
          },
        ],
      },
      {
        id: "def-transition-reb",
        kind: "questions",
        questions: [
          {
            key: "def_transition",
            type: "longtext",
            label: "Transition defense rules",
            placeholder: "e.g. Two back on every shot. Stop the ball first, build the wall, match up after.",
            tags: ["defense", "transition_defense"],
          },
          {
            key: "def_rebounding",
            type: "longtext",
            label: "Defensive rebounding responsibilities",
            placeholder: "e.g. Everyone hits somebody. Guards rebound their own closeout.",
            tags: ["defense", "defensive_rebounding"],
          },
        ],
      },
    ],
  },

  {
    slug: "ball-screen-defense",
    title: "Ball-screen defense",
    intro: "How you want screens guarded — and who's responsible for what.",
    showIf: usesBallScreens,
    steps: [
      {
        id: "def-pnr-coverages",
        kind: "questions",
        questions: [
          {
            key: "def_pnr_coverages",
            type: "multi",
            label: "Which coverages do you use?",
            options: [
              "Drop",
              "Switch",
              "Hedge / Show",
              "Blitz / Trap",
              "ICE / Down",
              "Weak",
              "Under",
              "Over",
            ],
            allowCustom: true,
            tags: ["defense", "defensive_ball_screen"],
          },
          {
            key: "def_pnr_when",
            type: "longtext",
            label: "What decides which coverage you're in?",
            placeholder: "e.g. Drop by default. Switch late clock. Blitz if their guard is the whole offense.",
            tags: ["defense", "defensive_ball_screen"],
          },
        ],
      },
      {
        id: "def-pnr-matrix",
        kind: "coverage",
        phase: "defense",
        title: "Who's responsible for what in each coverage?",
        help: "Set the job for each defender in the coverages you actually play. Skip the ones you don't.",
      },
    ],
  },

  {
    slug: "terminology",
    title: "Your language",
    intro:
      "Coaches use different words for the same thing. Teach ReadRep yours, and it can eventually speak to your players the way you do.",
    steps: [{ id: "terminology", kind: "terminology" }],
  },

  {
    slug: "priorities",
    title: "What matters most",
    intro: "This shapes which moments become questions, and how ReadRep grades them.",
    steps: [
      {
        id: "priorities-rank",
        kind: "questions",
        questions: [
          {
            key: "priorities_ranked",
            type: "rank",
            label: "Rank the mistakes that matter most to you.",
            help: "Top of the list gets the most weight.",
            options: [
              "Decision making",
              "Spacing",
              "Shot selection",
              "Turnovers",
              "Communication",
              "Defensive positioning",
              "Transition effort",
              "Rebounding",
              "Screening",
              "Off-ball movement",
            ],
            allowCustom: true,
            tags: ["priorities"],
          },
        ],
      },
      {
        id: "priorities-habits",
        kind: "questions",
        questions: [
          {
            key: "priorities_three_habits",
            type: "longtext",
            label:
              "If film study could fix three basketball habits this season, what would they be?",
            tags: ["priorities", "development"],
          },
        ],
      },
      {
        id: "priorities-peeves",
        kind: "questions",
        questions: [
          {
            key: "priorities_pet_peeves",
            type: "longtext",
            label: "What do you find yourself repeating constantly?",
            help: "Be blunt — this is the stuff you want players to stop doing.",
            tags: ["priorities", "development"],
          },
        ],
      },
    ],
  },

  {
    slug: "development",
    title: "How you teach",
    intro: "A few questions about film study itself, so ReadRep coaches the way you do.",
    steps: [
      {
        id: "dev-notice",
        kind: "questions",
        questions: [
          {
            key: "dev_notice_first",
            type: "multi",
            label: "What should a player notice first when watching a clip?",
            options: [
              "The defense's coverage",
              "Where the help is",
              "Their own spacing",
              "Teammates' positions",
              "The shot clock",
              "The matchup",
            ],
            allowCustom: true,
            tags: ["development"],
          },
        ],
      },
      {
        id: "dev-emphasis",
        kind: "questions",
        questions: [
          {
            key: "dev_emphasis",
            type: "single",
            label: "What should questions emphasize?",
            options: [
              "Recognition — did they see it?",
              "Decision making — did they choose right?",
              "Execution — did they do it well?",
              "All three, evenly",
            ],
            tags: ["development"],
          },
        ],
      },
      {
        id: "dev-difficulty",
        kind: "questions",
        questions: [
          {
            key: "dev_difficulty",
            type: "single",
            label: "How hard should the reads be?",
            options: [
              "Start simple, build up",
              "Challenge them from the start",
              "Match it to each player's experience",
            ],
            tags: ["development"],
          },
          {
            key: "dev_by_experience",
            type: "single",
            label: "Should developing and experienced players get different questions?",
            options: [
              "Yes — simpler reads for younger players",
              "Yes — more context for experienced players",
              "No — everyone gets the same",
            ],
            tags: ["development"],
          },
        ],
      },
      {
        id: "dev-framing",
        kind: "questions",
        questions: [
          {
            key: "dev_mistake_framing",
            type: "single",
            label: "How do you want mistakes framed?",
            options: [
              "Direct and corrective",
              "Encouraging, focus on the fix",
              "Neutral — just explain the read",
            ],
            allowCustom: true,
            tags: ["development"],
          },
        ],
      },
    ],
  },
];

// --- visibility -----------------------------------------------------------

export function visibleSections(a: Answers): Section[] {
  return SECTIONS.filter((s) => !s.showIf || s.showIf(a));
}

export function visibleSteps(section: Section, a: Answers): Step[] {
  return section.steps.filter((s) => !s.showIf || s.showIf(a));
}

export function visibleQuestions(step: Step, a: Answers): Question[] {
  if (step.kind !== "questions") return [];
  return step.questions.filter((q) => !q.showIf || q.showIf(a));
}

export type FlatStep = { section: Section; step: Step; index: number; total: number };

/** The whole interview as a linear list of screens, adapted to the answers. */
export function flattenSteps(a: Answers): FlatStep[] {
  const out: { section: Section; step: Step }[] = [];
  for (const section of visibleSections(a)) {
    for (const step of visibleSteps(section, a)) {
      // A questions-step whose every question is conditioned out is skipped.
      if (step.kind === "questions" && visibleQuestions(step, a).length === 0) continue;
      out.push({ section, step });
    }
  }
  return out.map((s, i) => ({ ...s, index: i, total: out.length }));
}

export function allQuestions(): Question[] {
  return SECTIONS.flatMap((s) =>
    s.steps.flatMap((st) => (st.kind === "questions" ? st.questions : [])),
  );
}

export function questionByKey(key: string): Question | undefined {
  return allQuestions().find((q) => q.key === key);
}

export function sectionBySlug(slug: string): Section | undefined {
  return SECTIONS.find((s) => s.slug === slug);
}

export { answered };
