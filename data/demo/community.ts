import type {
  LeaderboardEntry,
  School,
  SchoolCompetition,
  Tournament,
} from "@/types/ngn";
import { divisionName } from "@/lib/arena/divisions";

/**
 * DEMO CONTENT — see `data/demo/README.md`.
 *
 * Seeded students, schools, leaderboards and one tournament. Usernames are
 * invented handles, not real people. Nothing here exposes anything a real
 * profile would not: no ideology, no location beyond state, no age.
 */

type SeedStudent = {
  username: string;
  rating: number;
  debates: number;
  perspectiveScore: number;
  schoolSlug: string;
  state: string;
};

/** Twelve seeded students spanning every division from Silver to Champion. */
export const SEED_STUDENTS: SeedStudent[] = [
  { username: "quietfactcheck", rating: 2148, debates: 96, perspectiveScore: 94, schoolSlug: "menlo", state: "CA" },
  { username: "marginalia", rating: 2071, debates: 84, perspectiveScore: 91, schoolSlug: "paly", state: "CA" },
  { username: "steelman_sam", rating: 1994, debates: 78, perspectiveScore: 96, schoolSlug: "northside", state: "IL" },
  { username: "cite_your_source", rating: 1917, debates: 71, perspectiveScore: 88, schoolSlug: "menlo", state: "CA" },
  { username: "the_third_option", rating: 1846, debates: 64, perspectiveScore: 90, schoolSlug: "bergen", state: "NJ" },
  { username: "footnote_kid", rating: 1782, debates: 59, perspectiveScore: 85, schoolSlug: "northside", state: "IL" },
  { username: "warrant_check", rating: 1704, debates: 52, perspectiveScore: 87, schoolSlug: "paly", state: "CA" },
  { username: "granting_that", rating: 1655, debates: 47, perspectiveScore: 92, schoolSlug: "thomas-jefferson", state: "VA" },
  { username: "second_reading", rating: 1588, debates: 41, perspectiveScore: 81, schoolSlug: "bergen", state: "NJ" },
  { username: "ledger_and_line", rating: 1502, debates: 35, perspectiveScore: 79, schoolSlug: "thomas-jefferson", state: "VA" },
  { username: "openingargument", rating: 1387, debates: 24, perspectiveScore: 76, schoolSlug: "northside", state: "IL" },
  { username: "still_deciding", rating: 1244, debates: 16, perspectiveScore: 83, schoolSlug: "menlo", state: "CA" },
];

export const SCHOOLS: School[] = [
  {
    id: "sch-menlo",
    slug: "menlo",
    name: "Menlo School",
    state: "CA",
    students: 148,
    debates: 1_842,
    averageRating: 1612,
    averagePerspective: 87,
    averageCivility: 94,
    points: 8_940,
  },
  {
    id: "sch-paly",
    slug: "paly",
    name: "Palo Alto High School",
    state: "CA",
    students: 203,
    debates: 2_104,
    averageRating: 1578,
    averagePerspective: 85,
    averageCivility: 93,
    points: 8_612,
  },
  {
    id: "sch-northside",
    slug: "northside",
    name: "Northside College Prep",
    state: "IL",
    students: 176,
    debates: 1_967,
    averageRating: 1601,
    averagePerspective: 88,
    averageCivility: 95,
    points: 8_803,
  },
  {
    id: "sch-tj",
    slug: "thomas-jefferson",
    name: "Thomas Jefferson High School",
    state: "VA",
    students: 191,
    debates: 1_733,
    averageRating: 1566,
    averagePerspective: 84,
    averageCivility: 92,
    points: 8_218,
  },
  {
    id: "sch-bergen",
    slug: "bergen",
    name: "Bergen County Academies",
    state: "NJ",
    students: 134,
    debates: 1_488,
    averageRating: 1594,
    averagePerspective: 86,
    averageCivility: 94,
    points: 7_961,
  },
];

export const SCHOOL_BY_SLUG = new Map(SCHOOLS.map((s) => [s.slug, s]));

/**
 * Minimum debates a school needs before it appears in the school rankings.
 * This is what stops one very strong student from carrying a school's average
 * — the requirement is participation across a roster, not a single star.
 */
export const SCHOOL_MIN_DEBATES = 250;
export const SCHOOL_MIN_STUDENTS = 20;

export function rankedSchools(): School[] {
  return [...SCHOOLS]
    .filter((s) => s.debates >= SCHOOL_MIN_DEBATES && s.students >= SCHOOL_MIN_STUDENTS)
    .sort((a, b) => b.points - a.points);
}

/* -------------------------------------------------------------------------- */
/* Leaderboards                                                               */
/* -------------------------------------------------------------------------- */

function toEntry(student: SeedStudent, rank: number): LeaderboardEntry {
  return {
    rank,
    username: student.username,
    rating: student.rating,
    division: divisionName(student.rating),
    debates: student.debates,
    perspectiveScore: student.perspectiveScore,
    school: SCHOOL_BY_SLUG.get(student.schoolSlug)?.name,
    state: student.state,
  };
}

export function nationalLeaderboard(): LeaderboardEntry[] {
  return [...SEED_STUDENTS]
    .sort((a, b) => b.rating - a.rating)
    .map((student, index) => toEntry(student, index + 1));
}

export function stateLeaderboard(state: string): LeaderboardEntry[] {
  return SEED_STUDENTS.filter((s) => s.state === state)
    .sort((a, b) => b.rating - a.rating)
    .map((student, index) => toEntry(student, index + 1));
}

export function schoolLeaderboard(schoolSlug: string): LeaderboardEntry[] {
  return SEED_STUDENTS.filter((s) => s.schoolSlug === schoolSlug)
    .sort((a, b) => b.rating - a.rating)
    .map((student, index) => toEntry(student, index + 1));
}

/** The homepage board is short on purpose — this is not a popularity feed. */
export function weeklyTopStudents(count = 5): LeaderboardEntry[] {
  return nationalLeaderboard().slice(0, count);
}

/* -------------------------------------------------------------------------- */
/* School competitions                                                        */
/* -------------------------------------------------------------------------- */

export const SCHOOL_COMPETITIONS: SchoolCompetition[] = [
  {
    id: "comp-1",
    week: "This week",
    homeSchoolId: "sch-menlo",
    awaySchoolId: "sch-paly",
    homePoints: 412,
    awayPoints: 388,
    debatesCompleted: 41,
    debatesTarget: 50,
    status: "live",
  },
  {
    id: "comp-2",
    week: "This week",
    homeSchoolId: "sch-northside",
    awaySchoolId: "sch-tj",
    homePoints: 366,
    awayPoints: 371,
    debatesCompleted: 38,
    debatesTarget: 50,
    status: "live",
  },
  {
    id: "comp-3",
    week: "Next week",
    homeSchoolId: "sch-bergen",
    awaySchoolId: "sch-menlo",
    homePoints: 0,
    awayPoints: 0,
    debatesCompleted: 0,
    debatesTarget: 50,
    status: "upcoming",
  },
];

/**
 * How a school earns competition points. Deliberately excludes anything that
 * could reward a political position: a school wins on argument quality,
 * perspective-taking, participation and civility, and on nothing else.
 */
export const COMPETITION_SCORING = [
  { label: "Debate win", points: "6 pts", note: "Awarded on argument score, never on position." },
  { label: "Debate draw", points: "3 pts", note: "Both schools score." },
  { label: "Perspective exercise", points: "up to 4 pts", note: "Scaled by Perspective Score." },
  { label: "Participation", points: "1 pt", note: "Per student who completes a debate, capped per student." },
  { label: "Civility bonus", points: "2 pts", note: "Awarded when a school's weekly civility average clears 90." },
];

/* -------------------------------------------------------------------------- */
/* Tournament                                                                 */
/* -------------------------------------------------------------------------- */

export const TOURNAMENT: Tournament = {
  id: "trn-weekly",
  slug: "weekly-arena-championship",
  name: "Weekly Arena Championship",
  startsAt: "Saturday",
  status: "live",
  eligibility: { minDebates: 10, minCivility: 85, minRating: 1300 },
  players: [
    { seed: 1, username: "quietfactcheck", rating: 2148, division: "Champion", school: "Menlo School" },
    { seed: 2, username: "marginalia", rating: 2071, division: "Master", school: "Palo Alto High School" },
    { seed: 3, username: "steelman_sam", rating: 1994, division: "Master", school: "Northside College Prep" },
    { seed: 4, username: "cite_your_source", rating: 1917, division: "Master", school: "Menlo School" },
    { seed: 5, username: "the_third_option", rating: 1846, division: "Diamond", school: "Bergen County Academies" },
    { seed: 6, username: "footnote_kid", rating: 1782, division: "Diamond", school: "Northside College Prep" },
    { seed: 7, username: "warrant_check", rating: 1704, division: "Diamond", school: "Palo Alto High School" },
    { seed: 8, username: "granting_that", rating: 1655, division: "Platinum", school: "Thomas Jefferson High School" },
  ],
  matches: [
    { id: "qf1", round: "Quarterfinals", playerA: "quietfactcheck", playerB: "granting_that", scoreA: 91, scoreB: 84, winner: "quietfactcheck" },
    { id: "qf2", round: "Quarterfinals", playerA: "cite_your_source", playerB: "the_third_option", scoreA: 86, scoreB: 88, winner: "the_third_option" },
    { id: "qf3", round: "Quarterfinals", playerA: "marginalia", playerB: "warrant_check", scoreA: 89, scoreB: 82, winner: "marginalia" },
    { id: "qf4", round: "Quarterfinals", playerA: "steelman_sam", playerB: "footnote_kid", scoreA: 90, scoreB: 90, winner: null },
    { id: "sf1", round: "Semifinals", playerA: "quietfactcheck", playerB: "the_third_option", scoreA: null, scoreB: null, winner: null },
    { id: "sf2", round: "Semifinals", playerA: "marginalia", playerB: null, scoreA: null, scoreB: null, winner: null },
    { id: "final", round: "Final", playerA: null, playerB: null, scoreA: null, scoreB: null, winner: null },
  ],
};
