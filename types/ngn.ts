/**
 * NGN domain model.
 *
 * These types are the contract shared by the demo data layer (`data/demo`),
 * the AI services (`lib/ai`), and every UI surface. When Supabase is wired up
 * the row shapes in `supabase/schema.sql` map 1:1 onto these.
 */

/* ==========================================================================
   Shared vocabulary
   ========================================================================== */

export const CATEGORIES = [
  "Politics",
  "Economy",
  "Technology",
  "Education",
  "Foreign Policy",
  "Social Issues",
  "Environment",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const DIFFICULTIES = ["Introductory", "Intermediate", "Advanced"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const DEBATE_FORMATS = ["quick", "standard", "deep"] as const;
export type DebateFormat = (typeof DEBATE_FORMATS)[number];

export type Position = "support" | "oppose" | "undecided";

export type RoundType = "opening" | "rebuttal" | "counter" | "closing";

export type DebateStatus = "live" | "ongoing" | "upcoming" | "past";

/** Where a source sits on the evidence hierarchy the briefing pages teach. */
export type SourceType =
  | "Government document"
  | "Official data"
  | "Research organization"
  | "News reporting"
  | "Legal opinion"
  | "Academic study";

/* ==========================================================================
   Briefing content
   ========================================================================== */

export type Source = {
  id: string;
  publisher: string;
  title: string;
  date: string;
  sourceType: SourceType;
  url: string;
};

export type KeyTerm = {
  term: string;
  definition: string;
};

export type Statistic = {
  value: string;
  label: string;
  sourceId: string;
};

/**
 * The neutral briefing a student reads before they are allowed to debate.
 * Party sections are optional because plenty of civic questions do not split
 * cleanly along party lines — and pretending they do would be its own bias.
 */
export type DebateBrief = {
  question: string;
  sixtySecond: string[];
  supporterArguments: string[];
  opponentArguments: string[];
  democraticView?: string;
  republicanView?: string;
  democraticDisagreement?: string;
  republicanDisagreement?: string;
  otherPerspectives?: string[];
  keyFacts: string[];
  statistics: Statistic[];
  keyTerms: KeyTerm[];
  sources: Source[];
};

/* ==========================================================================
   Debates
   ========================================================================== */

export type Debate = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: Category;
  difficulty: Difficulty;
  format: DebateFormat;
  status: DebateStatus;
  featured: boolean;
  tags: string[];
  /** Minutes. */
  estimatedMinutes: number;
  participants: number;
  averageScore: number;
  /**
   * Hours until this debate's window closes. Stored as a static offset rather
   * than a timestamp so server and client render identically; the live
   * countdown starts ticking after mount.
   */
  hoursRemaining: number;
  brief: DebateBrief;
  /** Seeded opponent lines, keyed by round type, used by the demo opponent. */
  argumentBank: {
    support: Record<RoundType, string[]>;
    oppose: Record<RoundType, string[]>;
  };
  /** Seeded sentiment split shown on cards. Demo data. */
  sentiment: { support: number; oppose: number; undecided: number };
  relatedArticleSlug?: string;
  relatedIssueSlug?: string;
};

export type DebateRoundSpec = {
  index: number;
  type: RoundType;
  label: string;
  prompt: string;
  maxCharacters: number;
  timeLimitSeconds: number;
};

/* ==========================================================================
   Evidence + scoring
   ========================================================================== */

export type EvidenceItem = {
  id: string;
  url: string;
  title: string;
  publisher: string;
  quote: string;
  note: string;
};

export const SCORE_CATEGORIES = [
  "evidence",
  "reasoning",
  "rebuttal",
  "clarity",
  "opponentUnderstanding",
  "civility",
] as const;

export type ScoreCategory = (typeof SCORE_CATEGORIES)[number];

export type CategoryScores = Record<ScoreCategory, number>;

export type JudgeFeedback = {
  overall: number;
  categories: CategoryScores;
  strongestMoment: string;
  weakestMoment: string;
  improvement: string;
  unsupportedClaims: string[];
  missedCounterarguments: string[];
  summary: string;
};

export type PerspectiveFeedback = {
  score: number;
  categories: {
    accuracy: number;
    fairness: number;
    strength: number;
    understanding: number;
    strawmanAvoidance: number;
  };
  whatYouCaptured: string;
  whatYouMissed: string;
  summary: string;
};

/* ==========================================================================
   Arena participation state (client-persisted in demo mode)
   ========================================================================== */

export type Opponent = {
  id: string;
  username: string;
  rating: number;
  division: DivisionName;
  school?: string;
  /** True when this is the practice AI opponent rather than a seeded student. */
  isAI: boolean;
};

export type RoundEntry = {
  roundIndex: number;
  type: RoundType;
  userText: string;
  opponentText: string;
  evidence: EvidenceItem[];
  submittedAt: string;
};

export type DebateRunStatus =
  | "briefing"
  | "position"
  | "matching"
  | "writing"
  | "revealed"
  | "scoring"
  | "complete";

export type DebateOutcome = "win" | "loss" | "draw";

export type DebateRun = {
  id: string;
  debateSlug: string;
  format: DebateFormat;
  position: Exclude<Position, "undecided">;
  /** True when the side was assigned rather than chosen — the core learning lever. */
  wasAssigned: boolean;
  preConfidence: number | null;
  opponent: Opponent;
  rounds: RoundEntry[];
  currentRound: number;
  status: DebateRunStatus;
  startedAt: string;
  completedAt: string | null;
  userScore: JudgeFeedback | null;
  opponentScore: JudgeFeedback | null;
  outcome: DebateOutcome | null;
  ratingBefore: number;
  ratingAfter: number | null;
  opponentRatingAfter: number | null;
  perspective: PerspectiveFeedback | null;
};

/* ==========================================================================
   Rating + progression
   ========================================================================== */

export const DIVISIONS = [
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
  "Diamond",
  "Master",
  "Champion",
] as const;

export type DivisionName = (typeof DIVISIONS)[number];

export type Division = {
  name: DivisionName;
  min: number;
  max: number;
  colorVar: string;
};

export type RatingEntry = {
  at: string;
  rating: number;
  delta: number;
  debateSlug: string;
  outcome: DebateOutcome;
};

export type BadgeId =
  | "first-debate"
  | "ten-debates"
  | "evidence-builder"
  | "strong-rebuttal"
  | "perspective-master"
  | "civil-challenger"
  | "five-day-streak"
  | "underdog-win"
  | "perfect-civility"
  | "switch-sides-10";

export type Badge = {
  id: BadgeId;
  name: string;
  description: string;
  /** How the badge is earned, shown as progress text. */
  criterion: string;
  target: number;
};

export type EarnedBadge = {
  id: BadgeId;
  earnedAt: string;
};

/* ==========================================================================
   Profile
   ========================================================================== */

export type UserRole = "student" | "teacher" | "admin";

export type GradeBand = "6-8" | "9-10" | "11-12" | "College" | "Educator";

export type ArenaProfile = {
  username: string;
  firstName: string | null;
  role: UserRole;
  rating: number;
  /** Peak rating, so a rough patch does not erase a student's best work. */
  peakRating: number;
  ratingHistory: RatingEntry[];
  debatesCompleted: number;
  wins: number;
  losses: number;
  draws: number;
  perspectiveScores: number[];
  switchSidesCompleted: number;
  categoryTotals: CategoryScores;
  categorySamples: number;
  badges: EarnedBadge[];
  streakDays: number;
  lastActiveDate: string | null;
  /** All optional by design — this product is used by minors. */
  school: string | null;
  state: string | null;
  gradeBand: GradeBand | null;
  interests: Category[];
  onboarded: boolean;
  /** Issue profile is opt-in and private by default. */
  issueProfile: IssueProfile | null;
  issueProfileVisible: boolean;
};

export type IssueProfile = {
  takenAt: string;
  axes: { label: string; democraticAlignment: number; republicanAlignment: number }[];
  democraticAlignment: number;
  republicanAlignment: number;
};

/* ==========================================================================
   Editorial content
   ========================================================================== */

export type ArticleKind = "brief" | "weekly";

export type Article = {
  id: string;
  slug: string;
  kind: ArticleKind;
  category: Category;
  headline: string;
  subheadline: string;
  explainer: string;
  author: string;
  /** Neutral news is AI-assisted and human-reviewed; Weekly is human opinion. */
  provenance: "AI-assisted, human-reviewed" | "Human-written analysis";
  publishedAt: string;
  readMinutes: number;
  quickBrief: {
    whatHappened: string;
    whyItMatters: string;
    whatHappensNext: string;
  };
  body: string[];
  understandTheSides: { label: string; text: string }[];
  whatWeKnow: string[];
  whatIsUncertain: string[];
  sources: Source[];
  relatedDebateSlug?: string;
  featured?: boolean;
};

export type Issue = {
  id: string;
  slug: string;
  title: string;
  category: Category;
  summary: string;
  basics: string[];
  whyPeopleDebate: string;
  democraticViews: string[];
  republicanViews: string[];
  otherPerspectives: string[];
  democraticDisagreement: string;
  republicanDisagreement: string;
  keyTerms: KeyTerm[];
  keyFacts: string[];
  relatedArticleSlugs: string[];
  relatedDebateSlugs: string[];
};

export type Party = {
  id: string;
  slug: string;
  name: string;
  founded: string;
  summary: string;
  history: string[];
  currentPriorities: string[];
  coalitions: string[];
  commonPositions: { area: string; position: string }[];
  factions: { name: string; description: string }[];
  platformNote: string;
};

export type DiscussionResponse = {
  id: string;
  author: string;
  division: DivisionName;
  body: string;
  madeMeThink: number;
  postedAt: string;
  moderation: ModerationState;
};

export type Discussion = {
  id: string;
  slug: string;
  question: string;
  context: string;
  relatedDebateSlug?: string;
  relatedArticleSlug?: string;
  responses: DiscussionResponse[];
};

/* ==========================================================================
   Community, competition, classroom
   ========================================================================== */

export type LeaderboardEntry = {
  rank: number;
  username: string;
  rating: number;
  division: DivisionName;
  debates: number;
  perspectiveScore: number;
  school?: string;
  state?: string;
  isYou?: boolean;
};

export type School = {
  id: string;
  slug: string;
  name: string;
  state: string;
  students: number;
  debates: number;
  averageRating: number;
  averagePerspective: number;
  averageCivility: number;
  points: number;
};

export type SchoolCompetition = {
  id: string;
  week: string;
  homeSchoolId: string;
  awaySchoolId: string;
  homePoints: number;
  awayPoints: number;
  debatesCompleted: number;
  debatesTarget: number;
  status: "live" | "upcoming" | "final";
};

export type TournamentPlayer = {
  seed: number;
  username: string;
  rating: number;
  division: DivisionName;
  school?: string;
};

export type TournamentMatch = {
  id: string;
  round: "Round of 16" | "Quarterfinals" | "Semifinals" | "Final";
  playerA: string | null;
  playerB: string | null;
  scoreA: number | null;
  scoreB: number | null;
  winner: string | null;
};

export type Tournament = {
  id: string;
  slug: string;
  name: string;
  startsAt: string;
  status: "registration" | "live" | "complete";
  eligibility: { minDebates: number; minCivility: number; minRating: number };
  players: TournamentPlayer[];
  matches: TournamentMatch[];
};

export type Classroom = {
  id: string;
  name: string;
  code: string;
  teacher: string;
  period: string;
  students: ClassroomStudent[];
  assignments: ClassroomAssignment[];
};

export type ClassroomStudent = {
  id: string;
  displayName: string;
  debatesCompleted: number;
  averageArgumentScore: number;
  averagePerspectiveScore: number;
  participationRate: number;
  improvement: number;
};

export type ClassroomAssignment = {
  id: string;
  debateSlug: string;
  title: string;
  dueAt: string;
  format: DebateFormat;
  sideAssignment: "random" | "student-choice" | "teacher-assigned";
  submitted: number;
  total: number;
  /** AI feedback is always a suggestion a teacher must accept, edit or ignore. */
  suggestions: TeacherFeedbackSuggestion[];
};

export type TeacherFeedbackSuggestion = {
  studentId: string;
  studentName: string;
  scores: CategoryScores & { participation: number };
  suggestedComment: string;
  status: "pending" | "accepted" | "edited" | "ignored";
};

/* ==========================================================================
   Moderation + notifications
   ========================================================================== */

export type ModerationState = "pending" | "approved" | "flagged" | "removed";

export type ReportReason =
  | "harassment"
  | "hate"
  | "threat"
  | "personal-information"
  | "spam"
  | "other";

export type ModerationFlag = {
  id: string;
  contentType: "debate-response" | "discussion-response" | "profile";
  excerpt: string;
  reason: ReportReason;
  reportedAt: string;
  state: ModerationState;
  automated: boolean;
};

export type NotificationKind =
  | "round-ready"
  | "opponent-replied"
  | "debate-scored"
  | "rating-changed"
  | "badge-earned"
  | "tournament"
  | "classroom";

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  at: string;
  href: string;
  read: boolean;
};
