import type { ReactNode } from "react";

/**
 * The product's one label shape. `accent` is the freeze marker — the paused
 * state, the decision point, the category a rep is training — and is not used
 * for anything else.
 */
type Tone = "neutral" | "quiet" | "accent" | "good" | "bad";

const tones: Record<Tone, string> = {
  neutral: "bg-raised text-fg",
  quiet: "border border-line text-fg-faint",
  accent: "bg-accent text-on-accent",
  good: "bg-good text-on-signal",
  bad: "bg-bad text-on-signal",
};

export function Chip({
  tone = "neutral",
  className = "",
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`label-caps inline-flex shrink-0 items-center rounded-xs px-2 py-1 ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** A status word with a dot, for rows where a filled chip would be too loud. */
export function StatusDot({
  tone,
  children,
}: {
  tone: Tone;
  children: ReactNode;
}) {
  const dot =
    tone === "good"
      ? "bg-good"
      : tone === "bad"
        ? "bg-bad"
        : tone === "accent"
          ? "bg-accent"
          : "bg-fg-faint";
  const text =
    tone === "good"
      ? "text-good"
      : tone === "bad"
        ? "text-bad"
        : "text-fg-faint";

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[0.8125rem] ${text}`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`}
      />
      {children}
    </span>
  );
}
