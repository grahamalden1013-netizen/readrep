import { Eye, GitBranch, Lightbulb, Play } from "lucide-react";

const steps = [
  { icon: Play, title: "Watch", body: "The play runs up to the moment that matters." },
  { icon: Eye, title: "Decide", body: "It pauses. You commit to the read." },
  { icon: GitBranch, title: "Reveal", body: "See what actually happened." },
  { icon: Lightbulb, title: "Learn", body: "Your coach's take on the right read." },
];

/**
 * The four-step ReadRep loop, shown when a player has nothing assigned so
 * the page still teaches what's coming instead of sitting empty.
 */
export function HowItWorks() {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-faint-foreground">
        How ReadRep works
      </h2>
      <ol className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {steps.map((step, i) => (
          <li
            key={step.title}
            className="flex items-start gap-3.5 rounded-lg border border-border bg-surface px-4 py-4 transition-colors duration-[var(--duration-fast)] hover:border-border-strong"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary-soft-foreground">
              <step.icon className="size-4" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[13.5px] font-semibold text-foreground">
                <span className="mr-1.5 font-mono text-[11px] text-faint-foreground">{i + 1}</span>
                {step.title}
              </p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
