import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "warning" | "danger" | "info";

const toneStyles: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted-foreground",
  warning: "bg-warning-soft text-warning-soft-foreground",
  danger: "bg-danger-soft text-danger-soft-foreground",
  info: "bg-info-soft text-info-soft-foreground",
};

/**
 * A compact, actionable row — used for "needs attention" items and similar
 * surfaced-signal lists. Renders as a link when `href` is given, otherwise
 * a static row (e.g. a positive "all caught up" state with no action).
 */
export function ActionCard({
  icon: Icon,
  title,
  description,
  href,
  tone = "neutral",
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  href?: string;
  tone?: Tone;
  className?: string;
}) {
  const content = (
    <>
      <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-md", toneStyles[tone])}>
        <Icon className="size-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-medium text-foreground">{title}</p>
        {description && (
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">{description}</p>
        )}
      </div>
      {href && <ChevronRight className="size-4 shrink-0 text-faint-foreground" aria-hidden="true" />}
    </>
  );

  const rowClasses = cn(
    "flex items-center gap-3 rounded-lg border border-border bg-surface px-3.5 py-3",
    className,
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(rowClasses, "transition-colors duration-[var(--duration-fast)] hover:border-border-strong hover:bg-surface-2")}
      >
        {content}
      </Link>
    );
  }

  return <div className={rowClasses}>{content}</div>;
}
