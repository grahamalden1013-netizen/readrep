import type { ReactNode } from "react";

export type BadgeTone =
  | "neutral"
  | "accent"
  | "danger"
  | "warning"
  | "success"
  | "info";

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-surface-muted text-muted",
  accent: "bg-accent-soft text-accent",
  danger:
    "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300",
  warning:
    "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  success:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  info: "bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
};

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: BadgeTone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
