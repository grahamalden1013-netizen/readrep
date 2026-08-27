import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-hairline bg-surface px-3.5 text-sm text-ink transition-colors placeholder:text-ink-3 hover:border-hairline-strong focus:border-accent focus:outline-none focus-visible:outline-none",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-xl border border-hairline bg-surface px-3.5 py-3 text-sm leading-6 text-ink transition-colors placeholder:text-ink-3 hover:border-hairline-strong focus:border-accent focus:outline-none focus-visible:outline-none",
        className,
      )}
      {...props}
    />
  );
}

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("eyebrow block text-ink-3", className)}
      {...props}
    />
  );
}
