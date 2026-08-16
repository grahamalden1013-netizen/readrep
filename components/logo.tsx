import { cn } from "@/lib/cn";

/**
 * Custom wordmark: a bold "R" with a small orange play triangle at its
 * foot — no basketball, no shield, no mascot, no gradient.
 */
export function Logo({ className, mark = true }: { className?: string; mark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {mark && (
        <span className="relative inline-flex h-6 w-5 items-center justify-center">
          <span className="font-sans text-[21px] font-extrabold leading-none tracking-tighter text-foreground">
            R
          </span>
          <svg
            width="8"
            height="8"
            viewBox="0 0 8 8"
            className="absolute -bottom-px -right-1"
            aria-hidden="true"
          >
            <path d="M0 0L8 4L0 8Z" fill="var(--primary)" />
          </svg>
        </span>
      )}
      <span className="text-[15px] font-semibold tracking-tight text-foreground">ReadRep</span>
    </span>
  );
}
