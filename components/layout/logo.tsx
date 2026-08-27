import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * NGN wordmark. The mark is three ascending bars — a masthead rule turned on
 * its side — set tight against the letters.
 */
export function Logo({
  className,
  showFullName = false,
}: {
  className?: string;
  showFullName?: boolean;
}) {
  return (
    <Link
      href="/"
      className={cn("group inline-flex items-center gap-2.5", className)}
      aria-label="NGN — Next Gen News, home"
    >
      <span
        aria-hidden
        className="flex h-5 items-end gap-[3px] transition-transform duration-300 ease-[var(--ease-out-soft)] group-hover:-translate-y-px"
      >
        <span className="block w-[3px] rounded-[1px] bg-ink-3 transition-colors group-hover:bg-accent" style={{ height: "42%" }} />
        <span className="block w-[3px] rounded-[1px] bg-ink-2 transition-colors group-hover:bg-accent" style={{ height: "72%" }} />
        <span className="block w-[3px] rounded-[1px] bg-accent" style={{ height: "100%" }} />
      </span>
      <span className="flex items-baseline gap-2">
        <span className="text-[1.375rem] font-semibold leading-none tracking-[-0.055em] text-ink">
          NGN
        </span>
        {showFullName && (
          <span className="hidden text-[0.8125rem] font-medium tracking-tight text-ink-3 sm:inline">
            Next Gen News
          </span>
        )}
      </span>
    </Link>
  );
}
