import { SECTIONS, type Answers } from "@/lib/playbook/questions";
import type { Playbook } from "@/lib/playbook/queries";

/**
 * Serializes a team's playbook into the context block the film-analysis
 * pipeline will send to the model alongside a detected decision point.
 *
 * This is the retrieval seam: film analysis identifies *what happened*, and
 * this supplies *how this specific coach wants it played*. Keeping it as a
 * pure function of the stored playbook means the AI step never queries the
 * schema directly, so the storage shape can evolve independently.
 *
 * Not called by the film pipeline yet — that system isn't built. It's used
 * today to render the coach-facing preview, which doubles as a check that
 * what we captured is actually enough to reason from.
 */
export function buildTeamContext(teamName: string, playbook: Playbook): string {
  const lines: string[] = [`TEAM: ${teamName}`];

  for (const section of SECTIONS) {
    if (section.slug === "terminology") continue;

    const entries: string[] = [];
    for (const q of section.questions) {
      const answer = playbook.answers[q.key];
      if (!answer) continue;

      const parts: string[] = [];
      if (answer.selections.length > 0) {
        // Order is meaningful for ranked questions, so number those.
        parts.push(
          q.type === "rank"
            ? answer.selections.map((s, i) => `${i + 1}. ${s}`).join("; ")
            : answer.selections.join(", "),
        );
      }
      if (answer.customText?.trim()) parts.push(answer.customText.trim());
      if (parts.length === 0) continue;

      entries.push(`- ${q.label} ${parts.join(" | ")}`);
    }

    if (entries.length > 0) {
      lines.push("", section.title.toUpperCase(), ...entries);
    }
  }

  if (playbook.terms.length > 0) {
    lines.push("", "TEAM TERMINOLOGY");
    for (const t of playbook.terms) {
      lines.push(`- ${t.term} (${t.category}): ${t.meaning}`);
    }
  }

  return lines.join("\n");
}

/** Rough completeness signal, used to nudge coaches toward richer context. */
export function playbookCoverage(answers: Answers): { answered: number; total: number } {
  const all = SECTIONS.flatMap((s) => s.questions);
  const answered = all.filter((q) => {
    const a = answers[q.key];
    return a && (a.selections.length > 0 || Boolean(a.customText?.trim()));
  }).length;
  return { answered, total: all.length };
}
