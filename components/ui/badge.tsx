import { cn } from "@/lib/cn";

type BadgeTone = "neutral" | "primary" | "success" | "warning" | "danger" | "info";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-surface-2 text-muted-foreground border-border-strong",
  primary: "bg-primary-soft text-primary-soft-foreground border-transparent",
  success: "bg-success-soft text-success-soft-foreground border-transparent",
  warning: "bg-warning-soft text-warning-soft-foreground border-transparent",
  danger: "bg-danger-soft text-danger-soft-foreground border-transparent",
  info: "bg-info-soft text-info-soft-foreground border-transparent",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[12px] font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
