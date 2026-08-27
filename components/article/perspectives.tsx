import { Info } from "lucide-react";
import type { Perspective } from "@/types/ngn";

function PerspectiveBlock({
  eyebrow,
  perspective,
  accentHue,
}: {
  eyebrow: string;
  perspective: Perspective;
  accentHue: number;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-hairline bg-surface p-5 sm:p-6">
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          className="size-2 rounded-full"
          style={{ background: `oklch(0.62 0.13 ${accentHue})` }}
        />
        <h3 className="eyebrow text-ink-3">{eyebrow}</h3>
      </div>

      <p className="mt-4 text-[0.9375rem] font-medium leading-[1.55] text-ink">
        {perspective.label}
      </p>
      <p className="mt-2 text-[0.9375rem] leading-[1.65] text-ink-2">
        {perspective.summary}
      </p>

      {perspective.points.length > 0 && (
        <ul className="mt-4 space-y-2.5">
          {perspective.points.map((point) => (
            <li
              key={point}
              className="flex gap-2.5 text-[0.875rem] leading-[1.6] text-ink-2"
            >
              <span
                aria-hidden
                className="mt-2 size-1 shrink-0 rounded-full bg-ink-3"
              />
              {point}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Politics is not always two opinions. The Democratic and Republican blocks are
 * peers, and "other perspectives" is a first-class section rather than a
 * footnote.
 */
export function UnderstandTheSides({
  democratic,
  republican,
  other,
}: {
  democratic: Perspective;
  republican: Perspective;
  other: Perspective[];
}) {
  return (
    <section aria-labelledby="understand-sides" className="rule-top pt-4">
      <h2 id="understand-sides" className="eyebrow text-accent">
        Understand the sides
      </h2>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <PerspectiveBlock
          eyebrow="Democratic perspective"
          perspective={democratic}
          accentHue={250}
        />
        <PerspectiveBlock
          eyebrow="Republican perspective"
          perspective={republican}
          accentHue={30}
        />
      </div>

      {other.length > 0 && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {other.map((perspective) => (
            <PerspectiveBlock
              key={perspective.label}
              eyebrow="Other perspectives"
              perspective={perspective}
              accentHue={165}
            />
          ))}
        </div>
      )}

      <p className="mt-5 flex gap-2.5 rounded-xl bg-surface-2 px-4 py-3 text-[0.8125rem] leading-5 text-ink-2">
        <Info className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden />
        These summaries describe common positions. Political parties contain a
        wide range of views.
      </p>
    </section>
  );
}
