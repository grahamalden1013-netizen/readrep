import Link from "next/link";

export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="text-[0.9375rem] font-semibold tracking-[-0.01em] text-ink-50"
    >
      Next<span className="text-lime-accent">Rep</span>
    </Link>
  );
}
