import { cn } from "@/lib/cn";

/**
 * Every empty state should explain what the feature is, why it matters,
 * and what to do next — title + description + action, always together.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = "default",
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  variant?: "default" | "prominent";
  className?: string;
}) {
  const prominent = variant === "prominent";

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3.5 rounded-lg border border-dashed border-border-strong text-center",
        prominent ? "px-8 py-16" : "px-6 py-12",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-full",
          prominent
            ? "size-14 bg-primary-soft text-primary-soft-foreground"
            : "size-11 bg-surface-2 text-muted-foreground",
        )}
      >
        <Icon className={prominent ? "size-6" : "size-5"} aria-hidden="true" />
      </div>
      <div className="flex flex-col gap-1.5">
        <p className={cn("font-medium text-foreground", prominent ? "text-[16px]" : "text-[14.5px]")}>
          {title}
        </p>
        {description && (
          <p className="max-w-sm text-[13.5px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
