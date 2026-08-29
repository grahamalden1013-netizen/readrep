import { repSchema, type Rep } from "./schema";
import { validateRepTiming } from "./timing";

export type DraftIssue = { field: string; message: string };

export type DraftCandidate = Omit<Rep, "status" | "publishedAt"> & {
  status?: Rep["status"];
  publishedAt?: Rep["publishedAt"];
};

/**
 * Every rule a rep must satisfy before it can reach a player, in one place so
 * the studio, the server action and the tests cannot disagree about it.
 *
 * `durationMs` is null when the provider has not reported a length yet; the
 * ordering rules still apply, only the upper bound is skipped.
 */
export function validateRepDraft(draft: DraftCandidate, durationMs: number | null): DraftIssue[] {
  const issues: DraftIssue[] = validateRepTiming(draft, durationMs).map((issue) => ({
    field: issue.field,
    message: issue.message,
  }));

  if (draft.choices.length < 2) {
    issues.push({ field: "choices", message: "A rep needs at least two answer choices." });
  }
  if (draft.choices.length > 4) {
    issues.push({ field: "choices", message: "A rep can have at most four answer choices." });
  }

  const ids = draft.choices.map((choice) => choice.id);
  if (new Set(ids).size !== ids.length) {
    issues.push({ field: "choices", message: "Answer choices must have distinct ids." });
  }
  if (draft.choices.some((choice) => choice.label.trim().length === 0)) {
    issues.push({ field: "choices", message: "Every answer choice needs a label." });
  }

  if (!ids.includes(draft.correctChoiceId)) {
    issues.push({
      field: "correctChoiceId",
      message: "The best read must be one of the answer choices.",
    });
  }
  if (!ids.includes(draft.actualChoiceId)) {
    issues.push({
      field: "actualChoiceId",
      message: "What the player did must be one of the answer choices.",
    });
  }

  const parsed = repSchema.safeParse({
    ...draft,
    status: draft.status ?? "draft",
    publishedAt: draft.publishedAt ?? null,
  });
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = issue.path.join(".") || "rep";
      // The refinements above already produce friendlier text for these.
      if (issues.some((existing) => existing.field === field)) continue;
      issues.push({ field, message: issue.message });
    }
  }

  return issues;
}
