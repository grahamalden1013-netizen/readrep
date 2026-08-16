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
 * This schema is sent to the provider as a JSON schema *and* used to validate
 * what comes back. Every situation dimension is a closed enum, so a model can
 * describe a read in its own words but can never invent a new column value.
 * Free text is length-capped here; further normalization (unknown topic ids,
 * confidence clamping, list caps) happens in `lib/interview/normalize.ts`.
 */

const shortText = z.string().min(1).max(240);
const mediumText = z.string().min(1).max(600);

const nullableEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.enum(values).nullable();

/** A single coached read, scoped to the situation it applies in. */
export const KnowledgeNodeSchema = z.object({
  /**
   * A short slug the model uses to refer to this node inside this one turn,
   * so `parent_ref` can chain reads. Not a database id.
   */
  ref: z.string().min(1).max(60),
  topic_id: z.string().min(1).max(80),
  phase: z.enum(PHASES),
  action: nullableEnum(ACTIONS),
  coverage: nullableEnum(COVERAGES),
  role: nullableEnum(ROLES),
  clock: nullableEnum(CLOCKS),
  /** The condition, if this read is conditional. "big commits to the ball" */
  trigger: shortText.nullable(),
  /** What the player should do. "hit the roller" */
  instruction: shortText,
  /** Read order within the same situation. 1 is the first look. */
  priority: z.number().int().min(1).max(20),
  /** How sure we are the coach actually said this, 0-1. */
  confidence: z.number().min(0).max(1),
  /** `coach` = they said it. `inferred` = the model filled a gap. */
  source: z.enum(["coach", "inferred"]),
  /** `ref` of the read this one branches from, if any. */
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
  /** True when the coach corrected this away entirely. */
  retire: z.boolean(),
  /** Why it changed, shown to the coach in the learning panel. */
  reason: shortText.nullable(),
});

export const TerminologySchema = z.object({
  term: z.string().min(1).max(60),
  meaning: shortText,
  category: z.enum(TERM_CATEGORIES),
});

export const ConfidenceUpdateSchema = z.object({
  topic_id: z.string().min(1).max(80),
  confidence: z.number().min(0).max(1),
});

export const CoverageUpdateSchema = z.object({
  topic_id: z.string().min(1).max(80),
  status: z.enum(TOPIC_STATUSES),
  note: shortText.nullable(),
});

export const InterviewTurnSchema = z.object({
  /** What ReadRep says back to the coach. Ends with one question. */
  assistant_message: mediumText,
  /** New reads learned from this answer. */
  extracted_knowledge: z.array(KnowledgeNodeSchema).max(12),
  /** Revisions to reads already stored. */
  updated_knowledge: z.array(KnowledgeUpdateSchema).max(12),
  /** Team-specific words the coach used that ReadRep should adopt. */
  terminology_detected: z.array(TerminologySchema).max(8),
  /** Things the answer left genuinely unclear. */
  ambiguities: z.array(shortText).max(6),
  /** Plain-language description of what the coach corrected, if anything. */
  corrections: z.array(shortText).max(6),
  confidence_updates: z.array(ConfidenceUpdateSchema).max(12),
  coverage_updates: z.array(CoverageUpdateSchema).max(12),
  /** Which canonical topic the next question belongs to. */
  recommended_next_topic: z.string().max(80).nullable(),
  /** Why that topic is the smartest thing to ask about next. */
  next_question_reason: shortText.nullable(),
  /** The model's own read on whether there's enough to work film. */
  ready_for_film: z.boolean(),
});

export type InterviewTurnOutput = z.infer<typeof InterviewTurnSchema>;
