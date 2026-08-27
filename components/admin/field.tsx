"use client";

import { cn } from "@/lib/utils";

export function Field({
  name,
  label,
  hint,
  value,
  onChange,
  rows = 3,
  placeholder,
  mono = false,
  className,
}: {
  name: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  mono?: boolean;
  className?: string;
}) {
  const id = `field-${name}`;
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <label htmlFor={id} className="eyebrow text-ink-3">
          {label}
        </label>
        {hint && <p className="text-[0.6875rem] text-ink-3">{hint}</p>}
      </div>
      {rows === 1 ? (
        <input
          id={id}
          name={name}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            "h-11 w-full rounded-xl border border-hairline bg-surface px-3.5 text-[0.9375rem] text-ink transition-colors placeholder:text-ink-3 hover:border-hairline-strong focus:border-accent focus:outline-none",
            mono && "font-mono text-[0.8125rem]",
          )}
        />
      ) : (
        <textarea
          id={id}
          name={name}
          rows={rows}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            "w-full rounded-xl border border-hairline bg-surface px-3.5 py-3 text-[0.9375rem] leading-[1.6] text-ink transition-colors placeholder:text-ink-3 hover:border-hairline-strong focus:border-accent focus:outline-none",
            mono && "font-mono text-[0.8125rem]",
          )}
        />
      )}
    </div>
  );
}
