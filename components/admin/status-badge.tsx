import type { ArticleStatus } from "@/types/ngn";
import { cn } from "@/lib/utils";

export const STATUS_LABEL: Record<ArticleStatus, string> = {
  draft: "Draft",
  ai_generated: "AI generated",
  needs_review: "Needs review",
  approved: "Approved",
  scheduled: "Scheduled",
  published: "Published",
};

const STATUS_HUE: Record<ArticleStatus, string> = {
  draft: "var(--ink-3)",
  ai_generated: "oklch(0.62 0.14 300)",
  needs_review: "oklch(0.66 0.15 70)",
  approved: "var(--accent)",
  scheduled: "oklch(0.62 0.12 240)",
  published: "oklch(0.6 0.13 150)",
};

/** Workflow status. AI drafts are visually distinct on purpose. */
export function StatusBadge({
  status,
  className,
}: {
  status: ArticleStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 font-mono text-[0.625rem] font-medium uppercase tracking-[0.1em]",
        className,
      )}
      style={{
        background: `color-mix(in oklab, ${STATUS_HUE[status]} 14%, transparent)`,
        color: `color-mix(in oklab, ${STATUS_HUE[status]} 80%, var(--ink))`,
      }}
    >
      <span
        aria-hidden
        className="size-1.5 rounded-full"
        style={{ background: STATUS_HUE[status] }}
      />
      {STATUS_LABEL[status]}
    </span>
  );
}
