import { z } from "zod";
import { SKILL_CATEGORIES } from "@/lib/reps/schema";
import {
  OVERALL_CONFIDENCE_APPLY_MIN,
  OVERALL_CONFIDENCE_MIN,
  TARGET_ID_CONFIDENCE_MIN,
} from "./limits";

/** Bumped whenever the prompt or the output contract changes, so past runs stay comparable. */
export const PROMPT_VERSION = "rep-copilot-v1";

const confidence = z.number().min(0).max(1);

const answerChoice = z.object({
  id: z.string().min(1).max(8),
  text: z.string().trim().min(3).max(200),
});

const visibleEvidence = z.object({
  timestampSeconds: z.number().nonnegative(),
  observation: z.string().trim().min(3).max(600),
});

const inference = z.object({
  statement: z.string().trim().min(3).max(600),
  confidence,
});

/**
 * Exactly what the model must return. Deliberately strict — anything that does
 * not parse here never reaches the Studio form.
 *
 * `skillCategory` is constrained to NextRep's closed set so the model cannot
 * invent a category. Nulls are allowed for every draft field: when the target
 * player is not visible, or the situation cannot be read, the model is told to
 * return nulls rather than guess.
 */
export const aiRepResultSchema = z
  .object({
    targetPlayerVisible: z.boolean(),
    targetIdentificationConfidence: confidence,
    confidence,

    // Generous upper bounds: the model is not constrained by these (OpenAI's
    // structured output ignores maxLength), so a slightly long field must not
    // fail the whole analysis. `mapAiResultToStudioForm` truncates to the rep
    // schema's real limits (80 / 240 / 160 / 600 / 120) on the way to the form.
    title: z.string().trim().min(3).max(200).nullable(),
    skillCategory: z.enum(SKILL_CATEGORIES).nullable(),
    difficulty: z.enum(["easy", "medium", "hard"]).nullable(),
    situation: z.string().trim().min(3).max(800).nullable(),
    prompt: z.string().trim().min(3).max(600).nullable(),

    answerChoices: z.array(answerChoice).max(4),

    bestReadChoiceId: z.string().min(1).max(8).nullable(),
    actualDecisionChoiceId: z.string().min(1).max(8).nullable(),

    actualDecision: z.string().trim().min(3).max(600).nullable(),
    outcome: z.string().trim().min(3).max(600).nullable(),
    coachingExplanation: z.string().trim().min(3).max(2000).nullable(),

    // Separated reasoning, so a reviewer sees exactly what was and was not seen.
    situationSummary: z.string().trim().max(800).nullable(),
    targetPlayerLocation: z.string().trim().max(600).nullable(),
    visibleOptions: z.array(z.string().trim().min(2).max(400)).max(8),
    whatRemainsUncertain: z.array(z.string().trim().min(2).max(600)).max(10),

    visibleEvidence: z.array(visibleEvidence).max(30),
    inferences: z.array(inference).max(16),
    warnings: z.array(z.string().trim().min(2).max(600)).max(16),
  })
  .superRefine((value, ctx) => {
    const ids = value.answerChoices.map((c) => c.id);

    if (value.targetPlayerVisible) {
      if (value.answerChoices.length < 2) {
        ctx.addIssue({
          code: "custom",
          path: ["answerChoices"],
          message: "A visible-target draft needs 2-4 answer choices.",
        });
      }
      const texts = value.answerChoices.map((c) => c.text.trim().toLowerCase());
      if (new Set(texts).size !== texts.length) {
        ctx.addIssue({ code: "custom", path: ["answerChoices"], message: "Answer choices must be unique." });
      }
      if (new Set(ids).size !== ids.length) {
        ctx.addIssue({ code: "custom", path: ["answerChoices"], message: "Answer choice ids must be unique." });
      }
      if (GENERIC_CHOICE.test(texts.join(" | "))) {
        ctx.addIssue({
          code: "custom",
          path: ["answerChoices"],
          message: "Answer choices must be concrete basketball decisions, not placeholders.",
        });
      }
      if (value.answerChoices.length >= 2) {
        if (!value.bestReadChoiceId || !ids.includes(value.bestReadChoiceId)) {
          ctx.addIssue({
            code: "custom",
            path: ["bestReadChoiceId"],
            message: "Exactly one answer choice must be the best read.",
          });
        }
        if (value.actualDecisionChoiceId !== null && !ids.includes(value.actualDecisionChoiceId)) {
          ctx.addIssue({
            code: "custom",
            path: ["actualDecisionChoiceId"],
            message: "actualDecisionChoiceId must be null or one of the answer choices.",
          });
        }
      }
    }

    // Evidence must be chronological.
    for (let i = 1; i < value.visibleEvidence.length; i += 1) {
      if (value.visibleEvidence[i].timestampSeconds < value.visibleEvidence[i - 1].timestampSeconds) {
        ctx.addIssue({
          code: "custom",
          path: ["visibleEvidence", i, "timestampSeconds"],
          message: "Evidence timestamps must be in chronological order.",
        });
        break;
      }
    }
  });

export type AiRepResult = z.infer<typeof aiRepResultSchema>;

const GENERIC_CHOICE =
  /\b(option [abcd]|choice [abcd]|do something|another option|other|n\/a|tbd|placeholder|lorem)\b/i;

export type ClipWindowSeconds = {
  clipStartSeconds: number;
  decisionSeconds: number;
  clipEndSeconds: number;
};

export type ResultValidation = {
  result: AiRepResult;
  /** Combined model warnings plus anything this validation added. */
  warnings: string[];
  /** True once the draft may be presented as a usable, review-required draft. */
  usable: boolean;
  /** True once one-click "Apply draft" is allowed. */
  applyAllowed: boolean;
  /** Why usable/applyAllowed are false, for the UI. */
  gateReasons: string[];
};

/**
 * Parses raw model output and then applies NextRep's trust rules:
 *
 *  - every evidence timestamp must land inside the submitted clip (± a small
 *    tolerance for frame rounding). Model-invented timestamps are dropped and
 *    warned about; too many drops fail the result.
 *  - target-not-visible or below-threshold identification => not usable.
 *  - below-threshold overall confidence => usable as notes, but not one-click.
 */
export function validateAiRepResult(raw: unknown, clip: ClipWindowSeconds): ResultValidation {
  const parsed = aiRepResultSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new AiSchemaError(
      `AI output failed validation at ${first?.path.join(".") || "root"}: ${first?.message ?? "unknown"}`,
    );
  }
  const result = parsed.data;
  const warnings = [...result.warnings];
  const gateReasons: string[] = [];

  // ---- verify evidence timestamps against the real clip -------------------
  const tolerance = 0.75;
  const lo = clip.clipStartSeconds - tolerance;
  const hi = clip.clipEndSeconds + tolerance;
  const kept: AiRepResult["visibleEvidence"] = [];
  let dropped = 0;
  for (const item of result.visibleEvidence) {
    if (item.timestampSeconds >= lo && item.timestampSeconds <= hi) {
      kept.push({
        ...item,
        timestampSeconds: clamp(item.timestampSeconds, clip.clipStartSeconds, clip.clipEndSeconds),
      });
    } else {
      dropped += 1;
    }
  }
  result.visibleEvidence = kept;
  if (dropped > 0) {
    warnings.push(
      `${dropped} evidence timestamp${dropped === 1 ? "" : "s"} fell outside the selected clip and ${
        dropped === 1 ? "was" : "were"
      } discarded.`,
    );
  }
  if (result.targetPlayerVisible && kept.length < 2 && dropped > 0) {
    throw new AiSchemaError("Too much evidence referenced moments outside the clip to trust this result.");
  }

  // ---- confidence gates -------------------------------------------------
  let usable = true;
  let applyAllowed = true;

  if (!result.targetPlayerVisible) {
    usable = false;
    applyAllowed = false;
    gateReasons.push("The target player could not be reliably identified in the supplied frames.");
  } else if (result.targetIdentificationConfidence < TARGET_ID_CONFIDENCE_MIN) {
    usable = false;
    applyAllowed = false;
    gateReasons.push(
      `Target identification confidence ${(result.targetIdentificationConfidence * 100) | 0}% is below the ${
        (TARGET_ID_CONFIDENCE_MIN * 100) | 0
      }% bar.`,
    );
  }

  // Below the low-water mark: usable only as notes.
  if (usable && result.confidence < OVERALL_CONFIDENCE_MIN) {
    applyAllowed = false;
    gateReasons.push(
      `Overall analysis confidence ${(result.confidence * 100) | 0}% is low; use the evidence and warnings as notes rather than a one-click draft.`,
    );
    if (warnings.length < 2) {
      warnings.push("Low overall confidence — treat every field below as a starting point, not a conclusion.");
    }
  } else if (usable && result.confidence < OVERALL_CONFIDENCE_APPLY_MIN) {
    // In the grey band: allow apply, but say plainly it needs a hard look.
    gateReasons.push(
      `Overall confidence ${(result.confidence * 100) | 0}% is moderate — review every applied field before publishing.`,
    );
  }

  // Missing fields do not block Apply (it fills what exists and the coach
  // completes the rest); the publish gate still enforces completeness. They are
  // surfaced so the reviewer knows what to add — a null skill category in
  // particular, which the model is told never to invent.
  if (usable) {
    const missing = missingDraftFields(result);
    if (missing.length > 0) {
      gateReasons.push(`The AI left ${missing.join(", ")} for you to fill before publishing.`);
    }
  }

  return { result, warnings, usable, applyAllowed, gateReasons };
}

function missingDraftFields(r: AiRepResult): string[] {
  const missing: string[] = [];
  if (!r.title) missing.push("a title");
  if (!r.skillCategory) missing.push("a skill category");
  if (!r.situation) missing.push("a situation");
  if (!r.prompt) missing.push("a prompt");
  if (r.answerChoices.length < 2) missing.push("answer choices");
  if (!r.bestReadChoiceId) missing.push("a best read");
  if (!r.outcome) missing.push("an outcome");
  if (!r.coachingExplanation) missing.push("a coaching explanation");
  return missing;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export class AiSchemaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiSchemaError";
  }
}

// ---------------------------------------------------------------------------
// Mapping a validated result into the Studio form's shape.
// ---------------------------------------------------------------------------

export const STUDIO_CHOICE_IDS = ["a", "b", "c", "d"] as const;

export type StudioFormDraft = {
  title: string;
  category: (typeof SKILL_CATEGORIES)[number] | null;
  difficulty: "easy" | "medium" | "hard" | null;
  situation: string;
  prompt: string;
  /** Length 4, index 0..3 = choices a..d; "" for an unused row. */
  choiceLabels: [string, string, string, string];
  correctChoiceId: string | null;
  actualChoiceId: string | null;
  actualOutcome: string;
  explanation: string;
  coachingCue: string;
  /** Which form fields carry AI content, for the "AI" marker in the UI. */
  aiFields: string[];
};

/**
 * Projects the AI result onto NextRep's a/b/c/d choice slots and clamps every
 * string to the rep schema's limits. Only called for a usable result.
 */
export function mapAiResultToStudioForm(r: AiRepResult): StudioFormDraft {
  const choiceLabels: [string, string, string, string] = ["", "", "", ""];
  const idMap = new Map<string, string>();
  r.answerChoices.slice(0, 4).forEach((choice, index) => {
    const slot = STUDIO_CHOICE_IDS[index];
    choiceLabels[index] = truncate(choice.text, 120);
    idMap.set(choice.id, slot);
  });

  const coachingCue = deriveCue(r);

  const aiFields: string[] = [];
  const mark = (field: string, value: unknown) => {
    if (value !== null && value !== "" && !(Array.isArray(value) && value.length === 0)) aiFields.push(field);
  };
  mark("title", r.title);
  mark("category", r.skillCategory);
  mark("difficulty", r.difficulty);
  mark("situation", r.situation);
  mark("prompt", r.prompt);
  if (choiceLabels.some((l) => l)) aiFields.push("choices");
  mark("correctChoiceId", r.bestReadChoiceId);
  mark("actualChoiceId", r.actualDecisionChoiceId);
  mark("actualOutcome", r.outcome);
  mark("explanation", r.coachingExplanation);
  if (coachingCue) aiFields.push("coachingCue");

  return {
    title: truncate(r.title ?? "", 80),
    category: r.skillCategory,
    difficulty: r.difficulty,
    situation: truncate(r.situation ?? "", 240),
    prompt: truncate(r.prompt ?? "", 240),
    choiceLabels,
    correctChoiceId: r.bestReadChoiceId ? (idMap.get(r.bestReadChoiceId) ?? null) : null,
    actualChoiceId: r.actualDecisionChoiceId ? (idMap.get(r.actualDecisionChoiceId) ?? null) : null,
    actualOutcome: truncate(r.outcome ?? "", 160),
    explanation: truncate(r.coachingExplanation ?? "", 600),
    coachingCue: truncate(coachingCue, 120),
    aiFields,
  };
}

function deriveCue(r: AiRepResult): string {
  const firstInference = r.inferences[0]?.statement;
  const source = firstInference ?? r.whatRemainsUncertain[0] ?? r.coachingExplanation ?? "";
  if (!source) return "";
  const sentence = source.split(/(?<=[.!?])\s/)[0] ?? source;
  return truncate(sentence, 120);
}

function truncate(value: string, max: number): string {
  const trimmed = value.trim();
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1).trimEnd()}…`;
}
