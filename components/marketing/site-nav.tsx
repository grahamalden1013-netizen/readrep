import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";

const LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#for-players", label: "For players" },
];

export function SiteNav({ demoHref }: { demoHref: string }) {
  return (
    <header className="border-b border-rule">
      <nav
        aria-label="Primary"
        className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-8"
      >
        <Wordmark tone="light" />

        <div className="flex items-center gap-1 sm:gap-2">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hidden rounded-[3px] px-2.5 py-1.5 text-[0.8125rem] text-graphite-700 transition-[color] hover:text-graphite-950 sm:block"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="rounded-[3px] px-2.5 py-1.5 text-[0.8125rem] text-graphite-700 transition-[color] hover:text-graphite-950"
          >
            Sign in
          </Link>
          <ButtonLink href={demoHref} variant="court" className="ml-1 h-9 px-3.5 text-[0.8125rem]">
            Try a rep
          </ButtonLink>
        </div>
      </nav>
    </header>
  );
}
