import { forwardRef } from "react";
import Link, { type LinkProps } from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium " +
  "transition-[color,background-color,border-color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out)] " +
  "active:scale-[0.98] motion-reduce:active:scale-100 " +
  "disabled:pointer-events-none disabled:opacity-50 select-none";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary-fill text-primary-foreground shadow-sm hover:bg-primary-fill-hover active:bg-primary-fill-active",
  secondary:
    "bg-surface-2 text-foreground border border-border-strong hover:bg-surface-3 hover:border-border-strong active:bg-surface-3",
  ghost:
    "bg-transparent text-muted-foreground hover:bg-surface-2 hover:text-foreground",
  destructive:
    "bg-danger/10 text-danger border border-danger/30 hover:bg-danger/15 hover:border-danger/50",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 rounded-md px-3 text-[13px]",
  md: "h-9 rounded-md px-4 text-sm",
  lg: "h-11 rounded-lg px-5 text-[15px]",
};

type Shared = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  className?: string;
  children?: React.ReactNode;
};

export type ButtonProps = Shared & React.ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", loading, disabled, children, ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";

export type LinkButtonProps = Shared & LinkProps & { className?: string };

export const LinkButton = forwardRef<HTMLAnchorElement, LinkButtonProps>(
  ({ className, variant = "primary", size = "md", loading, children, ...props }, ref) => {
    return (
      <Link
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        {children}
      </Link>
    );
  },
);
LinkButton.displayName = "LinkButton";
