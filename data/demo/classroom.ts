import type { Classroom, ModerationFlag, AppNotification } from "@/types/ngn";

/**
 * DEMO CONTENT — see `data/demo/README.md`.
 *
 * One seeded classroom, a moderation queue, and a notification set.
 *
 * Two rules that hold in every classroom surface: AI feedback is always a
 * suggestion a teacher must accept, edit or ignore — never a finalised grade —
 * and no analytics anywhere infer or display a student's political leaning.
 */

export const CLASSROOM: Classroom = {
  id: "cls-1",
  name: "AP U.S. Government — Period 3",
  code: "NGN-4K7Q",
  teacher: "Ms. Alvarez",
  period: "Period 3",
  students: [
    { id: "s1", displayName: "A. Okafor", debatesCompleted: 9, averageArgumentScore: 84, averagePerspectiveScore: 89, participationRate: 100, improvement: 11 },
    { id: "s2", displayName: "B. Ramirez", debatesCompleted: 8, averageArgumentScore: 79, averagePerspectiveScore: 82, participationRate: 89, improvement: 7 },
    { id: "s3", displayName: "C. Lindqvist", debatesCompleted: 9, averageArgumentScore: 88, averagePerspectiveScore: 91, participationRate: 100, improvement: 4 },
    { id: "s4", displayName: "D. Nwosu", debatesCompleted: 6, averageArgumentScore: 71, averagePerspectiveScore: 78, participationRate: 67, improvement: 18 },
    { id: "s5", displayName: "E. Tanaka", debatesCompleted: 9, averageArgumentScore: 82, averagePerspectiveScore: 86, participationRate: 100, improvement: 9 },
    { id: "s6", displayName: "F. Brennan", debatesCompleted: 7, averageArgumentScore: 76, averagePerspectiveScore: 80, participationRate: 78, improvement: 13 },
    { id: "s7", displayName: "G. Achebe", debatesCompleted: 9, averageArgumentScore: 86, averagePerspectiveScore: 88, participationRate: 100, improvement: 6 },
    { id: "s8", displayName: "H. Kowalski", debatesCompleted: 5, averageArgumentScore: 68, averagePerspectiveScore: 74, participationRate: 56, improvement: 21 },
  ],
  assignments: [
    {
      id: "asg-1",
      debateSlug: "electoral-college",
      title: "Electoral College — assigned sides",
      dueAt: "Friday",
      format: "standard",
      sideAssignment: "teacher-assigned",
      submitted: 6,
      total: 8,
      suggestions: [
        {
          studentId: "s1",
          studentName: "A. Okafor",
          scores: {
            evidence: 86, reasoning: 88, rebuttal: 84, clarity: 90,
            opponentUnderstanding: 87, civility: 96, participation: 100,
          },
          suggestedComment:
            "Strong use of the winner-take-all distinction — separating state law from constitutional text is exactly the move this question rewards. Next step: quote the opposing argument directly before answering it, rather than paraphrasing it.",
          status: "pending",
        },
        {
          studentId: "s4",
          studentName: "D. Nwosu",
          scores: {
            evidence: 62, reasoning: 74, rebuttal: 70, clarity: 81,
            opponentUnderstanding: 76, civility: 94, participation: 67,
          },
          suggestedComment:
            "Clear writing and a fair reading of the other side. The gap is evidence: several claims about turnout would carry much more weight with a source attached. Suggest reviewing the briefing's sources section before the next round.",
          status: "pending",
        },
        {
          studentId: "s8",
          studentName: "H. Kowalski",
          scores: {
            evidence: 58, reasoning: 66, rebuttal: 61, clarity: 72,
            opponentUnderstanding: 69, civility: 92, participation: 56,
          },
          suggestedComment:
            "Real improvement in reasoning since the last assignment. The main obstacle now is length — responses are ending before the argument is finished. Consider extending the writing window for this student.",
          status: "pending",
        },
      ],
    },
    {
      id: "asg-2",
      debateSlug: "standardized-testing",
      title: "Standardized testing — students choose sides",
      dueAt: "Next Tuesday",
      format: "quick",
      sideAssignment: "student-choice",
      submitted: 0,
      total: 8,
      suggestions: [],
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* Moderation queue                                                           */
/* -------------------------------------------------------------------------- */

export const MODERATION_QUEUE: ModerationFlag[] = [
  {
    id: "mod-1",
    contentType: "discussion-response",
    excerpt: "…anyone who thinks that is just completely brainwashed and hasn't…",
    reason: "harassment",
    reportedAt: "1 hour ago",
    state: "pending",
    automated: true,
  },
  {
    id: "mod-2",
    contentType: "debate-response",
    excerpt: "…you can reach me at [contact details removed by automated filter]…",
    reason: "personal-information",
    reportedAt: "4 hours ago",
    state: "flagged",
    automated: true,
  },
  {
    id: "mod-3",
    contentType: "discussion-response",
    excerpt: "…same link posted eleven times across four threads…",
    reason: "spam",
    reportedAt: "6 hours ago",
    state: "pending",
    automated: true,
  },
  {
    id: "mod-4",
    contentType: "debate-response",
    excerpt: "…a strongly worded but on-topic argument about immigration enforcement…",
    reason: "other",
    reportedAt: "yesterday",
    state: "approved",
    automated: false,
  },
];

/* -------------------------------------------------------------------------- */
/* Notifications                                                              */
/* -------------------------------------------------------------------------- */

export const DEMO_NOTIFICATIONS: AppNotification[] = [
  {
    id: "ntf-1",
    kind: "round-ready",
    title: "Round 2 is ready",
    body: "Your opponent submitted their opening argument in Should the voting age be lowered to 16?",
    at: "just now",
    href: "/arena/voting-age-16/brief",
    read: false,
  },
  {
    id: "ntf-2",
    kind: "tournament",
    title: "Weekly Arena Championship",
    body: "Quarterfinals are live. Eligibility requires 10 debates and a civility average of 85.",
    at: "2 hours ago",
    href: "/tournaments",
    read: false,
  },
  {
    id: "ntf-3",
    kind: "classroom",
    title: "New assignment from Ms. Alvarez",
    body: "Electoral College — assigned sides. Due Friday.",
    at: "yesterday",
    href: "/classroom",
    read: true,
  },
];
