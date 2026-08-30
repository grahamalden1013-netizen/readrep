import type { ReactNode } from "react";

export function Panel({
  children,
  className = "",
  as: Tag = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article" | "li";
}) {
  return (
    <Tag className={`rounded-panel border border-line bg-surface ${className}`}>
      {children}
    </Tag>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="label-caps text-fg-faint">{children}</p>;
}

/**
 * A real surface, not a dashed placeholder box: an empty state is a state the
 * product is in, not a hole in the layout.
 */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-2.5 rounded-panel border border-line bg-raised px-5 py-6">
      <p className="display-3 text-fg">{title}</p>
      <p className="max-w-prose text-sm leading-relaxed text-fg-soft">{body}</p>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
