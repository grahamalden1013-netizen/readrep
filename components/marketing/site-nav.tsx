import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";

const LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#for-players", label: "For players" },
];

export function SiteNav({ demoHref }: { demoHref: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/95 backdrop-blur">
      <nav aria-label="Primary" className="page-shell flex h-14 items-center justify-between gap-4">
        <Wordmark />

        <div className="flex items-center gap-1 sm:gap-2">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hidden rounded-xs px-2.5 py-1.5 text-[0.8125rem] font-medium text-fg-faint transition-[color] duration-150 hover:text-fg sm:block"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="rounded-xs px-2.5 py-1.5 text-[0.8125rem] font-medium text-fg-faint transition-[color] duration-150 hover:text-fg"
          >
            Sign in
          </Link>
          <ButtonLink href={demoHref} size="sm" className="ml-1">
            Try a rep
          </ButtonLink>
        </div>
      </nav>
    </header>
  );
}
