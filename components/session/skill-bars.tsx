import { SKILL_CATEGORY_LABELS, type SkillResult } from "@/lib/reps/schema";

export function SkillBars({ skills }: { skills: SkillResult[] }) {
  if (skills.length === 0) {
    return (
      <p className="text-sm text-fg-faint">
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
            <p className="w-40 shrink-0 text-sm text-fg-soft sm:w-48">
              {SKILL_CATEGORY_LABELS[skill.category]}
            </p>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${pct}%` }}
                role="img"
                aria-label={`${pct} percent, ${skill.correct} of ${skill.attempted} correct`}
              />
            </div>
            <p className="timecode w-14 shrink-0 text-right text-fg-faint">
              {skill.correct}/{skill.attempted}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
