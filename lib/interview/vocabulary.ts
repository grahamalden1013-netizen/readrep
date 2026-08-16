/**
 * The closed vocabulary the AI is allowed to write into structured knowledge.
 *
 * Everything the model emits is checked against these lists before it touches
 * the database. The model can phrase an instruction however it likes; it can
 * never invent a new situation dimension, phase, or role.
 */

import { COVERAGES, OFFENSE_ROLES, DEFENSE_ROLES } from "@/lib/playbook/questions";

export const PHASES = ["team", "offense", "defense", "coaching"] as const;
export type Phase = (typeof PHASES)[number];

export const ACTIONS = [
  "ball_screen",
  "transition",
  "post",
  "drive_kick",
  "half_court",
  "off_ball",
] as const;
export type Action = (typeof ACTIONS)[number];

export { COVERAGES };
export type Coverage = (typeof COVERAGES)[number];

export const ROLES = [...OFFENSE_ROLES, ...DEFENSE_ROLES] as const;
export type Role = (typeof ROLES)[number];

export const CLOCKS = ["early", "late"] as const;
export type Clock = (typeof CLOCKS)[number];

export const TERM_CATEGORIES = [
  "offense",
  "defense",
  "transition",
  "screening",
  "spacing",
  "personnel",
  "other",
] as const;
export type TermCategory = (typeof TERM_CATEGORIES)[number];

export const TOPIC_STATUSES = ["unknown", "partial", "covered", "not_applicable"] as const;
export type TopicStatus = (typeof TOPIC_STATUSES)[number];

/** The situation a piece of knowledge applies to. Nulls widen the scope. */
export type Scope = {
  phase: Phase;
  action: Action | null;
  coverage: Coverage | null;
  role: Role | null;
  clock: Clock | null;
};

export const ACTION_LABELS: Record<Action, string> = {
  ball_screen: "Ball screen",
  transition: "Transition",
  post: "Post",
  drive_kick: "Drive & kick",
  half_court: "Half court",
  off_ball: "Off ball",
};

export const PHASE_LABELS: Record<Phase, string> = {
  team: "Team",
  offense: "Offense",
  defense: "Defense",
  coaching: "Coaching",
};
