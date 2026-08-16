/**
 * The Coach Intelligence question set.
 *
 * Question definitions live in code, not the database: they're product logic
 * that ships and versions with the app, and `playbook_responses` stores answers
 * in a shape (ordered `selections` + `custom_text`) that absorbs new questions
 * without a migration.
 *
 * `showIf` predicates make the interview adaptive — a coach who doesn't run
 * ball screens never sees the pick-and-roll section.
 */

export type QuestionType = "single" | "multi" | "rank" | "text" | "longtext";

export type Answers = Record<string, { selections: string[]; customText: string | null }>;

export type Question = {
  key: string;
  type: QuestionType;
  label: string;
  /** Shown under the label — why ReadRep is asking. */
  help?: string;
  options?: string[];
  /** Adds a free-text "Other" field alongside the options. */
  allowCustom?: boolean;
  customLabel?: string;
  placeholder?: string;
  showIf?: (a: Answers) => boolean;
};

export type Section = {
  slug: string;
  title: string;
  intro: string;
  questions: Question[];
  showIf?: (a: Answers) => boolean;
};

// --- helpers for conditional logic ---------------------------------------

const sel = (a: Answers, key: string): string[] => a[key]?.selections ?? [];
const has = (a: Answers, key: string, ...values: string[]) =>
  values.some((v) => sel(a, key).includes(v));

/** Ball-screen questions matter if the coach runs screens anywhere in their system. */
export const usesBallScreens = (a: Answers) =>
  has(a, "off_actions", "Pick-and-roll", "Spain P&R", "Ghost screens", "DHO", "Zoom", "Chicago") ||
  has(a, "off_systems", "Spread Pick-and-Roll", "Continuity Ball Screen", "Horns", "Dribble Drive");

const playsMan = (a: Answers) =>
  has(a, "def_identity", "Man-to-man", "Pack line", "Pressure man", "Switching", "Multiple defenses");

const playsZone = (a: Answers) =>
  has(a, "def_identity", "Zone", "Matchup zone", "Multiple defenses");

const playsMultiple = (a: Answers) => has(a, "def_identity", "Multiple defenses");

// --- sections -------------------------------------------------------------

export const SECTIONS: Section[] = [
  {
    slug: "identity",
    title: "Team identity",
    intro: "Start with who your team is. This frames everything else ReadRep learns.",
    questions: [
      {
        key: "team_level",
        type: "single",
        label: "What best describes your team?",
        options: ["Youth", "Middle school", "High school", "AAU / Club", "College", "Other"],
        allowCustom: true,
      },
      {
        key: "team_age_group",
        type: "text",
        label: "Age group or grade level",
        placeholder: "e.g. 14U, Varsity, Grades 9–10",
      },
      {
        key: "team_classification",
        type: "single",
        label: "Team classification",
        help: "Optional — skip if you'd rather not say.",
        options: ["Boys", "Girls", "Men", "Women", "Co-ed", "Prefer not to say"],
      },
      {
        key: "team_season",
        type: "text",
        label: "Season",
        placeholder: "e.g. 2025–26, Spring 2026",
      },
      {
        key: "identity_traits",
        type: "multi",
        label: "What do you want your team to be known for?",
        help: "Pick as many as genuinely apply. These become the lens ReadRep grades decisions through.",
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
      },
      {
        key: "identity_description",
        type: "longtext",
        label: "In your own words, how would you describe your team's style?",
        placeholder: "A few sentences is plenty.",
      },
    ],
  },

  {
    slug: "offense",
    title: "Offensive system",
    intro: "The structure your players are reading inside of.",
    questions: [
      {
        key: "off_systems",
        type: "multi",
        label: "What does your team primarily run offensively?",
        options: [
          "5-Out",
          "4-Out 1-In",
          "Motion",
          "Read & React",
          "Dribble Drive",
          "Princeton",
          "Flex",
          "Triangle",
          "Continuity Ball Screen",
          "Spread Pick-and-Roll",
          "Horns",
          "Pace and Space",
          "Post-oriented offense",
          "Set-play heavy",
        ],
        allowCustom: true,
        customLabel: "Other / custom system",
      },
      {
        key: "off_spacing_importance",
        type: "single",
        label: "How important is spacing in your offense?",
        options: [
          "Non-negotiable — it's the system",
          "Very important",
          "Situationally important",
          "We prioritize other things",
        ],
      },
      {
        key: "off_floor_spots",
        type: "multi",
        label: "Which floor spots do you want occupied?",
        options: [
          "Corners",
          "Wings",
          "Slots",
          "Top of the key",
          "Short corner",
          "Dunker spot",
          "High post",
          "Low block",
        ],
        allowCustom: true,
      },
      {
        key: "off_paint_touch_rules",
        type: "multi",
        label: "When the ball reaches the paint, what should everyone else do?",
        help: "This is one of the highest-value rules for judging off-ball decisions.",
        options: [
          "Drift",
          "Lift",
          "Fill behind",
          "45 cut",
          "Baseline cut",
          "Relocate",
          "Stay spaced",
        ],
        allowCustom: true,
      },
      {
        key: "off_actions",
        type: "multi",
        label: "Which actions do you run frequently?",
        help: "Your answers here decide which follow-up sections ReadRep asks about.",
        options: [
          "Pick-and-roll",
          "DHO",
          "Zoom",
          "Chicago",
          "Spain P&R",
          "Flare screens",
          "Pin-downs",
          "Staggers",
          "Ghost screens",
          "Iverson cuts",
          "Post splits",
          "Back screens",
          "Flex cuts",
          "UCLA cuts",
        ],
        allowCustom: true,
        customLabel: "Other actions you run",
      },
    ],
  },

  {
    slug: "pick-and-roll",
    title: "Pick-and-roll",
    intro: "You run ball screens, so let's get specific. These reads drive a lot of decision training.",
    showIf: usesBallScreens,
    questions: [
      {
        key: "pnr_handler_reads",
        type: "rank",
        label: "What reads do you teach the ball handler?",
        help: "Drag or use the arrows to order these — highest priority first.",
        options: [
          "Get downhill",
          "Turn the corner",
          "Hit the roller",
          "Hit the pop",
          "Pocket pass",
          "Reject the screen",
          "Snake the screen",
          "Hit the weak-side corner",
          "Spray out",
          "Attack the big",
        ],
        allowCustom: true,
      },
      {
        key: "pnr_screener",
        type: "multi",
        label: "What should the screener do?",
        options: [
          "Hard roll",
          "Short roll",
          "Pop",
          "Slip",
          "Re-screen",
          "Read coverage",
          "Depends on personnel",
        ],
        allowCustom: true,
      },
      {
        key: "pnr_vs_drop",
        type: "longtext",
        label: "Against drop coverage, what do you want?",
        placeholder: "e.g. Turn the corner and get to the elbow. Roller seals the drop big.",
      },
      {
        key: "pnr_vs_switch",
        type: "longtext",
        label: "Against a switch?",
        placeholder: "e.g. Attack the mismatch immediately before help sets.",
      },
      {
        key: "pnr_vs_hedge",
        type: "longtext",
        label: "Against a hedge or show?",
        placeholder: "e.g. Split it or reject. Screener slips behind the hedge.",
      },
      {
        key: "pnr_vs_blitz",
        type: "longtext",
        label: "Against a blitz or trap?",
        placeholder: "e.g. Get off it early, short roll makes the 4-on-3 read.",
      },
      {
        key: "pnr_vs_ice",
        type: "longtext",
        label: "Against ICE / down coverage?",
        placeholder: "e.g. Reject baseline, or re-screen to get back to the middle.",
      },
    ],
  },

  {
    slug: "transition",
    title: "Transition",
    intro: "How your team gets from defense to offense.",
    questions: [
      {
        key: "trans_first_priority",
        type: "single",
        label: "After gaining possession, what's the first priority?",
        options: [
          "Push the ball ahead",
          "Rim run",
          "Advance pass up the sideline",
          "Get organized and execute",
          "Read the floor before deciding",
        ],
        allowCustom: true,
      },
      {
        key: "trans_lanes",
        type: "longtext",
        label: "How do players fill lanes?",
        placeholder: "e.g. Wings sprint the corners, trailer to the top, bigs rim run.",
      },
      {
        key: "trans_rim_runner",
        type: "single",
        label: "Do you have designated rim runners?",
        options: ["Yes — specific players", "Whoever is first big down", "No designated runners"],
      },
      {
        key: "trans_pg_looks",
        type: "multi",
        label: "What does the point guard look for first?",
        options: [
          "Rim runner",
          "Trailing big",
          "Corner shooter",
          "Numbers advantage",
          "Mismatch",
          "Drag screen",
        ],
        allowCustom: true,
      },
      {
        key: "trans_attack_vs_pull",
        type: "longtext",
        label: "When should players attack immediately vs. pull it out?",
        placeholder: "e.g. Attack with numbers or a live-ball turnover. Pull it out if the defense is set.",
      },
      {
        key: "trans_good_shot",
        type: "longtext",
        label: "What counts as a good transition shot for your team?",
      },
    ],
  },

  {
    slug: "shots",
    title: "Shot profile",
    intro: "Which shots you want hunted — and which you don't. ReadRep won't assume an analytics philosophy.",
    questions: [
      {
        key: "shots_encouraged",
        type: "multi",
        label: "Which shots do you actively want?",
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
      },
      {
        key: "shots_discouraged",
        type: "multi",
        label: "Which shots do you want to avoid?",
        help: "Only pick what you genuinely coach against — some coaches want the midrange.",
        options: [
          "Contested midrange",
          "Early-clock contested 3",
          "Long 2",
          "Contested paint attempts",
          "Step-back 3 off the dribble",
          "Fadeaway",
          "Shots with no offensive rebounding balance",
        ],
        allowCustom: true,
      },
      {
        key: "shots_clock_rules",
        type: "longtext",
        label: "Any shot-clock or possession rules?",
        placeholder: "e.g. First 8 seconds only rim or corner 3. After a paint touch, any open 3 is green.",
      },
    ],
  },

  {
    slug: "defense",
    title: "Defensive identity",
    intro: "How you want the ball guarded.",
    questions: [
      {
        key: "def_identity",
        type: "multi",
        label: "What's your primary defensive identity?",
        options: [
          "Man-to-man",
          "Pack line",
          "Pressure man",
          "Switching",
          "Zone",
          "Matchup zone",
          "Multiple defenses",
        ],
        allowCustom: true,
      },
      {
        key: "def_multiple_when",
        type: "longtext",
        label: "When do you use each defense?",
        help: "You selected multiple defenses — describe what triggers the change.",
        showIf: playsMultiple,
        placeholder: "e.g. Man in the half court, 1-3-1 after made free throws, zone vs. poor shooting teams.",
      },
      {
        key: "def_zone_shape",
        type: "multi",
        label: "Which zone looks do you run?",
        showIf: playsZone,
        options: ["2-3", "3-2", "1-3-1", "1-2-2", "Matchup", "Box-and-1", "Triangle-and-2"],
        allowCustom: true,
      },
      {
        key: "def_ball_screen_coverage",
        type: "multi",
        label: "How do you cover ball screens?",
        options: ["Drop", "Switch", "Hedge", "ICE", "Blitz", "Show and recover", "Depends on personnel"],
        allowCustom: true,
      },
      {
        key: "def_help_rules",
        type: "longtext",
        label: "Help-side rules",
        showIf: playsMan,
        placeholder: "e.g. Two passes away is in the gap, low man takes the roller, nail help on drives.",
      },
      {
        key: "def_priorities",
        type: "multi",
        label: "What are your defensive non-negotiables?",
        options: [
          "No middle drives",
          "Force baseline",
          "Force sideline",
          "Contest every shot",
          "No second shots",
          "Tag the roller",
          "Sprint to closeouts",
          "No fouling jump shooters",
          "Get back in transition",
        ],
        allowCustom: true,
      },
      {
        key: "def_screen_navigation",
        type: "longtext",
        label: "How do you teach off-ball screen navigation?",
        showIf: playsMan,
        placeholder: "e.g. Top-lock shooters, chase over pin-downs, switch anything 1–4.",
      },
      {
        key: "def_transition",
        type: "longtext",
        label: "Transition defense rules",
        placeholder: "e.g. Two back on every shot, stop the ball first, build the wall.",
      },
    ],
  },

  {
    slug: "terminology",
    title: "Your language",
    intro:
      "Teach ReadRep the words your program actually uses, so training speaks your team's language instead of generic basketball.",
    questions: [],
  },

  {
    slug: "personnel",
    title: "Roles & personnel",
    intro:
      "The right read often depends on who's involved. You don't need to configure individual players yet — just how you think about roles.",
    questions: [
      {
        key: "roles_used",
        type: "multi",
        label: "Which roles do you think in terms of?",
        options: [
          "Primary ball handlers",
          "Secondary creators",
          "Shooters",
          "Rollers",
          "Stretch bigs",
          "Post players",
          "Connectors",
          "Defensive specialists",
          "Rim protectors",
        ],
        allowCustom: true,
      },
      {
        key: "roles_philosophy",
        type: "longtext",
        label: "How much do reads change based on who's involved?",
        placeholder:
          "e.g. Our best shooter always gets the extra pass. We don't want our 5 taking jumpers off the roll.",
      },
    ],
  },

  {
    slug: "priorities",
    title: "Coaching priorities",
    intro: "This directly shapes how ReadRep grades and explains decisions.",
    questions: [
      {
        key: "priorities_ranked",
        type: "rank",
        label: "When ReadRep evaluates a decision, what matters most?",
        help: "Order these — the top ones carry the most weight in feedback.",
        options: [
          "Making the correct read",
          "Playing quickly",
          "Protecting the basketball",
          "Creating paint touches",
          "Generating open shots",
          "Following team spacing rules",
          "Exploiting mismatches",
          "Making the extra pass",
          "Shot quality",
          "Execution",
        ],
        allowCustom: true,
      },
      {
        key: "priorities_pet_peeves",
        type: "longtext",
        label: "What mistakes bother you the most?",
        placeholder: "Be blunt — this is the stuff you want players to stop doing.",
      },
    ],
  },

  {
    slug: "interview",
    title: "Open interview",
    intro: "All optional, and the most valuable context you can give ReadRep. Answer what you feel like.",
    questions: [
      {
        key: "interview_three_things",
        type: "longtext",
        label:
          "If you could teach every player three things about decision-making, what would they be?",
      },
      {
        key: "interview_great_possession",
        type: "longtext",
        label: "What does a great offensive possession look like to you?",
      },
      {
        key: "interview_bad_possession",
        type: "longtext",
        label: "What does a bad possession usually look like?",
      },
      {
        key: "interview_struggles",
        type: "longtext",
        label: "What concepts do your players struggle with most?",
      },
      {
        key: "interview_repeats",
        type: "longtext",
        label: "What do you find yourself repeating constantly in practice or film?",
      },
    ],
  },
];

/** Sections visible given the current answers. */
export function visibleSections(a: Answers): Section[] {
  return SECTIONS.filter((s) => !s.showIf || s.showIf(a));
}

/** Questions visible within a section given the current answers. */
export function visibleQuestions(section: Section, a: Answers): Question[] {
  return section.questions.filter((q) => !q.showIf || q.showIf(a));
}

export function sectionBySlug(slug: string): Section | undefined {
  return SECTIONS.find((s) => s.slug === slug);
}
