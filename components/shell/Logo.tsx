import Link from "next/link";

/**
 * The NGN wordmark. A tight serif lockup with a lime rule under it — the same
 * rule that marks every section head, so the brand mark and the page structure
 * are visibly the same system.
 */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      className="group inline-flex shrink-0 items-baseline gap-2"
      aria-label="NGN — Next Gen News, home"
    >
      <span className="relative">
        <span className="font-serif text-[1.375rem] font-semibold leading-none tracking-[-0.03em] text-ink">
          NGN
        </span>
        <span
          aria-hidden
          className="absolute -bottom-1 left-0 h-[2px] w-full bg-lime-deep transition-transform duration-200 ease-out group-hover:scale-x-110"
        />
      </span>
      {!compact && (
        <span className="hidden text-[0.625rem] font-medium uppercase tracking-[0.16em] text-ink-faint sm:inline">
          Next Gen News
        </span>
      )}
    </Link>
  );
}
