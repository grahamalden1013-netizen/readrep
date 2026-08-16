import * as z from "zod/v4";

import {
  ACTIONS,
  CLOCKS,
  COVERAGES,
  PHASES,
  ROLES,
  TERM_CATEGORIES,
  TOPIC_STATUSES,
} from "@/lib/interview/vocabulary";

/**
 * The interview turn contract.
 *
 * Sent to the provider as a JSON schema and used to validate what comes back.
 * Every situation dimension is a closed enum, so the model can phrase a read
 * however it likes but can never invent a column value. Confirmed and inferred
 * knowledge arrive in separate arrays, which is what keeps a guess from ever
 * being persisted as something the coach taught.
 *
 * Further normalization — unknown area ids, cross-playbook ids, confidence
 * clamping, list caps — happens in `lib/interview/normalize.ts`.
 */

const shortText = z.string().min(1).max(240);
const mediumText = z.string().min(1).max(600);

const nullableEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.enum(values).nullable();

/** A single coached read, scoped to the situation it applies in. */
export const KnowledgeNodeSchema = z.object({
  /** A slug used only within this turn, so `parent_ref` can chain reads. */
  ref: z.string().min(1).max(60),
  area_id: z.string().min(1).max(80),
  phase: z.enum(PHASES),
  action: nullableEnum(ACTIONS),
  coverage: nullableEnum(COVERAGES),
  role: nullableEnum(ROLES),
  clock: nullableEnum(CLOCKS),
  /** The condition, when the read is conditional: "the big commits". */
  trigger: shortText.nullable(),
  /** What the player should do: "hit the roller". */
  instruction: shortText,
  /** Read order within one situation. 1 is the first look. */
  priority: z.number().int().min(1).max(20),
  /** How sure you are the coach meant this, 0-1. */
  confidence: z.number().min(0).max(1),
  /** `ref` of the read this branches from, if any. */
  parent_ref: z.string().max(60).nullable(),
});

export type KnowledgeNodeOutput = z.infer<typeof KnowledgeNodeSchema>;

/** A revision to something already stored, keyed by its database id. */
export const KnowledgeUpdateSchema = z.object({
  id: z.string().min(1).max(64),
  instruction: shortText.nullable(),
  trigger: shortText.nullable(),
  priority: z.number().int().min(1).max(20).nullable(),
  confidence: z.number().min(0).max(1).nullable(),
  /** True when the coach retracted this entirely. */
  retire: z.boolean(),
  /**
   * True when this rewrites something the coach previously confirmed. Those
   * are never applied silently — they become a proposal the coach accepts.
   */
  replaces_confirmed_rule: z.boolean(),
  reason: shortText.nullable(),
});

/** An inference the coach has now explicitly agreed with. */
export const ConfirmationSchema = z.object({
  id: z.string().min(1).max(64),
  reason: shortText.nullable(),
});

export const TerminologySchema = z.object({
  term: z.string().min(1).max(60),
  meaning: shortText,
  category: z.enum(TERM_CATEGORIES),
});

/** A gap that would change a future film read if it were filled. */
export const UnknownSchema = z.object({
  area_id: z.string().min(1).max(80),
  question: shortText,
  why_it_matters: shortText.nullable(),
  /** 0-1. Above 0.7 this blocks film-readiness. */
  importance: z.number().min(0).max(1),
});

export const CoverageUpdateSchema = z.object({
  area_id: z.string().min(1).max(80),
  status: z.enum(TOPIC_STATUSES),
  confidence: z.number().min(0).max(1),
  note: shortText.nullable(),
});

export const ConflictSchema = z.object({
  /** The stored knowledge id this appears to contradict, if identifiable. */
  id: z.string().max(64).nullable(),
  description: shortText,
  /** True when this reads as a contextual exception, not a contradiction. */
  likely_exception: z.boolean(),
});

export const InterviewTurnSchema = z.object({
  /**
   * What ReadRep says to the coach. Usually just the next question — no
   * praise, no summary of what was learned.
   */
  assistant_message: mediumText,

  /** Facts the coach explicitly stated. Extract everything one answer contains. */
  confirmed_knowledge_updates: z.array(KnowledgeNodeSchema).max(16),

  /** Reasonable supporting context. Never persisted as something they taught. */
  inferred_knowledge_updates: z.array(KnowledgeNodeSchema).max(10),

  /** Revisions to reads already stored, by their real id. */
  updated_knowledge: z.array(KnowledgeUpdateSchema).max(10),

  /** Inferences the coach has now agreed with, by their real id. */
  confirmed_inferences: z.array(ConfirmationSchema).max(10),

  /** Team-specific words worth adopting. Not standard basketball vocabulary. */
  terminology_detected: z.array(TerminologySchema).max(6),

  /** Apparent contradictions, flagged rather than resolved unilaterally. */
  knowledge_conflicts: z.array(ConflictSchema).max(5),

  /** Gaps that would materially change a film read. */
  important_unknowns: z.array(UnknownSchema).max(6),

  /** Unknowns this answer resolved, by their exact question text. */
  resolved_unknowns: z.array(shortText).max(6),

  coverage_updates: z.array(CoverageUpdateSchema).max(12),

  film_readiness: z.object({
    status: z.enum(["learning", "almost_ready", "film_ready"]),
    reason: shortText,
  }),

  /** Which canonical area the next question belongs to. */
  next_question_area: z.string().max(80).nullable(),
  next_question_information_value: z.enum(["high", "medium", "low"]),
  reason_question_is_needed: shortText.nullable(),

  /** 2-4 short taps, only when they genuinely save the coach typing. */
  suggested_answers: z.array(z.string().min(1).max(60)).max(4),

  should_end_onboarding: z.boolean(),
});

export type InterviewTurnOutput = z.infer<typeof InterviewTurnSchema>;
