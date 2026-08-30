import Link from "next/link";

/**
 * The mark is the freeze: a short amber rule standing in front of the name,
 * the same rule that marks the decision point everywhere else in the product.
 * It carries no colour of its own, so it reads correctly on every shell.
 */
export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-xs text-fg"
      aria-label="NextRep home"
    >
      <span aria-hidden="true" className="h-4 w-[3px] shrink-0 bg-accent" />
      <span className="display-3">NextRep</span>
    </Link>
  );
}
