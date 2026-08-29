import { repSchema } from "./schema";

export type DraftValidation =
  | { ok: true; json: string }
  | { ok: false; issues: string[] };

/** Shared by the studio UI and `scripts/validate-reps.mjs`. */
export function validateRepDraft(source: string): DraftValidation {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch (cause) {
    return { ok: false, issues: [`JSON: ${(cause as Error).message}`] };
  }

  const result = repSchema.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      issues: result.error.issues.map(
        (issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`,
      ),
    };
  }

  return { ok: true, json: JSON.stringify(result.data, null, 2) };
}
