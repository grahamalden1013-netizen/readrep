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
    <Tag className={`rounded-panel border border-ink-700 bg-ink-900 ${className}`}>
      {children}
    </Tag>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="label-caps text-ink-400">{children}</p>;
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-panel border border-dashed border-ink-700 px-5 py-6">
      <p className="text-sm font-semibold text-ink-100">{title}</p>
      <p className="max-w-prose text-sm leading-relaxed text-ink-400">{body}</p>
      {action}
    </div>
  );
}
