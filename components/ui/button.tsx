import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "court" | "outline";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-panel font-semibold tracking-tight transition-[color,background-color,border-color] duration-150 disabled:cursor-not-allowed disabled:opacity-45";

const variants: Record<Variant, string> = {
  // Dark surfaces (the app).
  primary: "bg-lime-accent text-ink-950 hover:bg-lime-accent-dim",
  secondary: "border border-ink-600 text-ink-100 hover:border-ink-400 hover:bg-ink-850",
  ghost: "text-ink-300 hover:text-ink-50",
  // Light surfaces (the public homepage).
  court: "bg-court text-white hover:bg-court-deep",
  outline:
    "border border-graphite-950/25 text-graphite-950 hover:border-graphite-950/60 hover:bg-graphite-950/[0.04]",
};

const sizes: Record<Size, string> = {
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-[0.9375rem]",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = "") {
  return [base, variants[variant], sizes[size], extra].filter(Boolean).join(" ");
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
};

export function Button({ variant, size, className, children, ...rest }: ButtonProps) {
  return (
    <button className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
};

export function ButtonLink({ variant, size, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}
