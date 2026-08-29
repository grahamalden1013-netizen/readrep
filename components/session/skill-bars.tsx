import { SKILL_CATEGORY_LABELS, type SkillResult } from "@/lib/reps/schema";

export function SkillBars({ skills }: { skills: SkillResult[] }) {
  if (skills.length === 0) {
    return (
      <p className="text-sm text-ink-500">
        Take a session and your read accuracy by category shows up here.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {skills.map((skill) => {
        const pct = skill.attempted === 0 ? 0 : Math.round((skill.correct / skill.attempted) * 100);
        return (
          <li key={skill.category} className="flex items-center gap-4">
            <p className="w-44 shrink-0 text-sm text-ink-300">
              {SKILL_CATEGORY_LABELS[skill.category]}
            </p>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-800">
              <div
                className="h-full rounded-full bg-lime-accent"
                style={{ width: `${pct}%` }}
                role="img"
                aria-label={`${pct} percent, ${skill.correct} of ${skill.attempted} correct`}
              />
            </div>
            <p className="w-16 shrink-0 text-right font-mono text-xs text-ink-400 tabular-nums">
              {skill.correct}/{skill.attempted}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
