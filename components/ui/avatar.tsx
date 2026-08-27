import { cn } from "@/lib/utils";

/**
 * Initial-based avatar. The demo build never uses stock photography of people —
 * NGN readers may be minors, so identity art stays abstract by default.
 */
export function Avatar({
  initials,
  hue = 190,
  size = "md",
  className,
}: {
  initials: string;
  hue?: number;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const sizes = {
    sm: "size-7 text-[0.625rem]",
    md: "size-9 text-xs",
    lg: "size-12 text-sm",
    xl: "size-20 text-lg",
  };
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-mono font-medium uppercase tracking-wider",
        sizes[size],
        className,
      )}
      style={{
        background: `oklch(0.92 0.05 ${hue})`,
        color: `oklch(0.38 0.09 ${hue})`,
      }}
    >
      {initials}
    </span>
  );
}
