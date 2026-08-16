import { cn } from "@/lib/cn";

/**
 * Wordmark + a small diamond "decision point" mark — the same motif used on
 * the video scrubber for the pause point. One idea, reused deliberately.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="relative flex size-5 items-center justify-center">
        <span className="size-2.5 rotate-45 rounded-[3px] bg-primary" />
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-foreground">
        ReadRep
      </span>
    </span>
  );
}
