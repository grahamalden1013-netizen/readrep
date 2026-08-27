import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-all duration-200 ease-[var(--ease-out-soft)] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-ink text-paper hover:bg-ink/88 shadow-[0_1px_2px_rgb(0_0_0/0.12)]",
        accent:
          "bg-accent text-accent-contrast hover:bg-accent-hover shadow-[0_1px_2px_rgb(0_0_0/0.12)]",
        outline:
          "border border-hairline-strong bg-surface text-ink hover:border-ink hover:bg-surface-2",
        subtle: "bg-surface-2 text-ink hover:bg-surface-3",
        ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink",
        link: "text-accent underline-offset-4 hover:underline rounded-none px-0",
      },
      size: {
        sm: "h-8 px-3.5 text-[0.8125rem]",
        md: "h-10 px-5 text-sm",
        lg: "h-12 px-6 text-[0.9375rem]",
        icon: "size-9",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { buttonVariants };
