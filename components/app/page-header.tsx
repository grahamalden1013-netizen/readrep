import type { ReactNode } from "react";

/**
 * Every application route opens the same way: a small label saying where you
 * are, one heading, an optional line of context, and the actions for this page.
 */
export function PageHeader({
  label,
  title,
  meta,
  children,
  actions,
}: {
  label: string;
  title: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 border-b border-line pb-6">
      <div className="min-w-0">
        <p className="label-caps text-fg-faint">{label}</p>
        <h1 className="display-2 mt-3 text-fg">{title}</h1>
        {meta ? <p className="mt-2 text-sm text-fg-faint">{meta}</p> : null}
        {children ? (
          <div className="mt-3 max-w-prose text-sm leading-relaxed text-fg-soft">
            {children}
          </div>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2.5">{actions}</div>
      ) : null}
    </header>
  );
}
