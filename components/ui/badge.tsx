import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full font-mono text-[0.625rem] font-medium uppercase tracking-[0.12em]",
  {
    variants: {
      variant: {
        neutral: "bg-surface-2 text-ink-2",
        outline: "border border-hairline text-ink-3",
        accent: "bg-accent-soft text-accent",
        editorial: "bg-editorial-soft text-editorial",
        danger: "bg-danger-soft text-danger",
        solid: "bg-ink text-paper",
      },
      size: {
        sm: "h-5 px-2",
        md: "h-6 px-2.5",
      },
    },
    defaultVariants: { variant: "neutral", size: "sm" },
  },
);

export function Badge({
  className,
  variant,
  size,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props} />
  );
}
