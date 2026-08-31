import type { ReactNode } from "react";

/** One input shape for the whole product. */
export const inputClass =
  "h-10 w-full rounded-control border border-line-strong bg-canvas px-3 text-sm text-fg placeholder:text-fg-faint focus:border-fg-faint";

export const textareaClass =
  "w-full rounded-control border border-line-strong bg-canvas px-3 py-2.5 text-sm leading-relaxed text-fg placeholder:text-fg-faint focus:border-fg-faint";

export function Field({
  label,
  hint,
  children,
}: {
  label: ReactNode;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label-caps flex items-center gap-1.5 text-fg-faint">{label}</span>
      {children}
      {hint ? (
        <span className="text-xs leading-relaxed text-fg-faint">{hint}</span>
      ) : null}
    </label>
  );
}
