import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/*
 * Three variants, and they are shell-agnostic: every colour is a role token, so
 * the same `primary` button is near-black on the light shells and near-white in
 * the film room without any caller opting in.
 *
 * There is deliberately no accent-filled button. Amber marks the freeze and the
 * decision — spending it on navigation would make it mean nothing.
 */
type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const base = [
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-control",
  "font-semibold tracking-[-0.005em] whitespace-nowrap",
  // Explicit properties: `transition-colors` also animates outline-color, which
  // makes the focus ring fade in from the text colour.
  "transition-[color,background-color,border-color] duration-150 ease-signal",
  "disabled:cursor-not-allowed disabled:opacity-40",
].join(" ");

const variants: Record<Variant, string> = {
  primary: "bg-solid text-on-solid hover:bg-solid-hover",
  secondary:
    "border border-line-strong bg-surface text-fg hover:border-fg-faint hover:bg-raised",
  ghost: "text-fg-soft hover:bg-raised hover:text-fg",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[0.8125rem]",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-[0.9375rem]",
};

export function buttonClass(
  variant: Variant = "primary",
  size: Size = "md",
  extra = "",
) {
  return [base, variants[variant], sizes[size], extra]
    .filter(Boolean)
    .join(" ");
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
};

export function Button({
  variant,
  size,
  className,
  children,
  ...rest
}: ButtonProps) {
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

export function ButtonLink({
  variant,
  size,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}
