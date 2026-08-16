import { forwardRef } from "react";
import Link, { type LinkProps } from "next/link";
import { cn } from "@/lib/cn";

const base =
  "inline-flex items-center justify-center rounded-md text-faint-foreground transition-colors duration-[var(--duration-fast)] hover:bg-surface-2 hover:text-foreground disabled:pointer-events-none disabled:opacity-50";

const sizes = { sm: "size-7", md: "size-8" };

type Size = keyof typeof sizes;

export type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  size?: Size;
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, label, size = "md", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        aria-label={label}
        title={label}
        className={cn(base, sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  },
);
IconButton.displayName = "IconButton";

export type IconLinkButtonProps = LinkProps & {
  label: string;
  size?: Size;
  className?: string;
  children?: React.ReactNode;
};

export const IconLinkButton = forwardRef<HTMLAnchorElement, IconLinkButtonProps>(
  ({ className, label, size = "md", children, ...props }, ref) => {
    return (
      <Link ref={ref} aria-label={label} title={label} className={cn(base, sizes[size], className)} {...props}>
        {children}
      </Link>
    );
  },
);
IconLinkButton.displayName = "IconLinkButton";
