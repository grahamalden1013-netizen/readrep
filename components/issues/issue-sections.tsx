import { cn } from "@/lib/utils";

export function IssueSection({
  id,
  eyebrow,
  title,
  children,
  className,
}: {
  id: string;
  eyebrow: string;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className={cn("scroll-mt-24 rule-top pt-4", className)}
    >
      <h2 id={`${id}-heading`} className="eyebrow text-accent">
        {eyebrow}
      </h2>
      {title && (
        <p className="mt-3 text-[1.375rem] font-semibold leading-snug tracking-[-0.022em] text-ink">
          {title}
        </p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function PointList({
  points,
  tone = "neutral",
}: {
  points: string[];
  tone?: "neutral" | "accent";
}) {
  return (
    <ul className="space-y-3.5">
      {points.map((point) => (
        <li
          key={point}
          className="flex gap-3 text-[0.9375rem] leading-[1.65] text-ink-2"
        >
          <span
            aria-hidden
            className={cn(
              "mt-2.5 size-1.5 shrink-0 rounded-full",
              tone === "accent" ? "bg-accent" : "bg-ink-3",
            )}
          />
          {point}
        </li>
      ))}
    </ul>
  );
}

/** Sticky in-page navigation for the long issue guides. */
export function IssueToc({
  sections,
}: {
  sections: { id: string; label: string }[];
}) {
  return (
    <nav aria-label="On this page" className="sticky top-24">
      <p className="eyebrow text-ink-3">On this page</p>
      <ul className="mt-4 space-y-2 border-l border-hairline">
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className="-ml-px block border-l border-transparent py-1 pl-4 text-[0.8125rem] text-ink-3 transition-colors hover:border-accent hover:text-ink"
            >
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
