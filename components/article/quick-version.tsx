import { ArrowRightCircle, CircleHelp, Target } from "lucide-react";
import type { Article } from "@/types/ngn";

const BLOCKS = [
  {
    key: "what" as const,
    label: "What happened",
    Icon: CircleHelp,
  },
  {
    key: "why" as const,
    label: "Why it matters",
    Icon: Target,
  },
  {
    key: "next" as const,
    label: "What happens next",
    Icon: ArrowRightCircle,
  },
];

export function QuickVersion({ article }: { article: Article }) {
  const content = {
    what: article.quickWhatHappened,
    why: article.quickWhyItMatters,
    next: article.quickWhatNext,
  };

  return (
    <section aria-labelledby="quick-version" className="rule-top pt-4">
      <h2 id="quick-version" className="eyebrow text-accent">
        The quick version
      </h2>

      <div className="mt-5 grid gap-px overflow-hidden rounded-[var(--radius-card)] border border-hairline bg-hairline sm:grid-cols-3">
        {BLOCKS.map(({ key, label, Icon }) => (
          <div key={key} className="flex flex-col gap-3 bg-surface p-5">
            <div className="flex items-center gap-2">
              <Icon className="size-4 text-accent" aria-hidden />
              <h3 className="eyebrow text-ink-3">{label}</h3>
            </div>
            <p className="text-[0.9375rem] leading-[1.6] text-ink-2">
              {content[key]}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
