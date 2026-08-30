import Link from "next/link";

/**
 * The app is dark and the public homepage is light, so the wordmark carries the
 * accent that belongs to the surface it sits on.
 */
export function Wordmark({
  href = "/",
  tone = "dark",
}: {
  href?: string;
  tone?: "dark" | "light";
}) {
  const isLight = tone === "light";

  return (
    <Link
      href={href}
      className={`text-[0.9375rem] font-semibold tracking-[-0.02em] ${
        isLight ? "text-graphite-950" : "text-ink-50"
      }`}
    >
      Next<span className={isLight ? "text-court" : "text-lime-accent"}>Rep</span>
    </Link>
  );
}
