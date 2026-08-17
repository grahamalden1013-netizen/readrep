import * as z from "zod/v4";

/**
 * The interview turn contract — deliberately small.
 *
 * WHY THIS IS SHAPED THE WAY IT IS
 *
 * Structured output is enforced by compiling the JSON Schema into a grammar
 * that constrains decoding. A grammar has no bounded-repetition primitive, so
 * every `maxItems` on an array and every `minLength`/`maxLength` on a string
 * has to be UNROLLED into explicit alternatives. The previous version of this
 * schema was only ~6.5 KB of JSON but carried 85 array slots and 31 string
 * length bounds, several of them inside an item repeated 26 times — which
 * compiled to a grammar large enough that Anthropic rejected the request with
 * "The compiled grammar is too large".
 *
 * So this schema states SHAPE ONLY:
 *   · no string length bounds        — lengths are trimmed in normalize.ts
 *   · no array item caps             — caps are applied in normalize.ts
 *   · four small enums, total 12 members, none of them nullable
 *   · basketball vocabulary is NOT encoded here at all
 *
 * A read's situation ("side ball screen", "vs drop", "ball handler") arrives
 * as free-text `conditions`, and `lib/interview/conditions.ts` maps it back
 * onto ReadRep's closed vocabulary. That keeps the basketball knowledge in
 * application code we can test and correct, rather than in a grammar we pay
 * for on every token.
 *
 * Nothing here is trusted. `lib/interview/normalize.ts` is still the only
 * thing that decides what reaches the database.
 */

/** What to do with a piece of knowledge. */
export const KnowledgeOpSchema = z.enum([
  /** Something new the coach said, or that you inferred. */
  "add",
  /** Change an existing fact — supply its id in `target_id`. */
  "revise",
  /** The coach retracted it — supply its id in `target_id`. */
  "retire",
  /** The coach agreed with something you had only inferred. */
  "confirm",
]);

export const ProvenanceSchema = z.enum(["confirmed", "inferred"]);

export const KnowledgeUpdateSchema = z.object({
  op: KnowledgeOpSchema,
  /** A ReadRep area id, e.g. "offense.ball_screen_reads". Checked in code. */
  area: z.string(),
  /** What kind of thing this is: "alignment", "pace", "first read". */
  concept: z.string(),
  /** The coaching content itself: "5-out", "turn the corner". */
  value: z.string(),
  provenance: ProvenanceSchema,
  /** 0-1. How sure you are the coach meant this. */
  confidence: z.number(),
  /**
   * When this applies, in plain basketball English, one phrase per entry:
   * ["side ball screen", "vs drop", "ball handler", "if the big commits"].
   * ReadRep maps these onto its own situation vocabulary.
   */
  conditions: z.array(z.string()),
  /** The existing fact's id for revise/retire/confirm. Null for add. */
  target_id: z.string().nullable(),
  /** True when this rewrites something the coach previously confirmed. */
  replaces_confirmed_rule: z.boolean(),
});

export type KnowledgeUpdateOutput = z.infer<typeof KnowledgeUpdateSchema>;

export const UnknownSchema = z.object({
  area: z.string(),
  /** The specific thing you still need to know. */
  question: z.string(),
  /** 0-1. How much answering it would change a film read. */
  importance: z.number(),
  /** True when this answer resolved a gap that was already open. */
  resolved: z.boolean(),
});

export const TerminologySchema = z.object({
  term: z.string(),
  meaning: z.string(),
});

export const ConflictSchema = z.object({
  description: z.string(),
  /** True when this reads as a contextual exception, not a contradiction. */
  likely_exception: z.boolean(),
});

export const NextQuestionSchema = z.object({
  /** The ReadRep area your question is about. Checked in code. */
  area: z.string(),
  information_value: z.enum(["high", "medium", "low"]),
  reason: z.string(),
});

export const InterviewTurnSchema = z.object({
  /** What ReadRep says to the coach — usually just the next question. */
  assistant_message: z.string(),

  /** Everything learned, revised, retracted or confirmed this turn. */
  knowledge_updates: z.array(KnowledgeUpdateSchema),

  /** Gaps that would materially change a film read, opened or closed. */
  unknowns: z.array(UnknownSchema),

  /** Team-specific words worth adopting. Not standard basketball vocabulary. */
  terminology: z.array(TerminologySchema),

  /** Apparent contradictions, flagged rather than resolved unilaterally. */
  conflicts: z.array(ConflictSchema),

  /** Areas the coach has told you don't apply to their team. */
  areas_not_applicable: z.array(z.string()),

  /** Your read on readiness. ReadRep computes its own and that one wins. */
  film_readiness: z.enum(["learning", "almost_ready", "film_ready"]),

  next_question: NextQuestionSchema,

  /** 2-4 short taps, only when they genuinely save the coach typing. */
  suggested_answers: z.array(z.string()),

  should_end_onboarding: z.boolean(),
});

export type InterviewTurnOutput = z.infer<typeof InterviewTurnSchema>;
