import Link from "next/link";
import { Logo } from "./logo";
import { PRIMARY_NAV } from "./nav-config";

const ABOUT_LINKS = [
  { href: "/about", label: "About NGN" },
  { href: "/about#standards", label: "Editorial standards" },
  { href: "/about#corrections", label: "Corrections" },
  { href: "/about#ai", label: "How we use AI" },
];

const ISSUE_LINKS = [
  { href: "/issues/economy", label: "Economy" },
  { href: "/issues/immigration", label: "Immigration" },
  { href: "/issues/climate-change", label: "Climate" },
  { href: "/issues/healthcare", label: "Healthcare" },
  { href: "/issues", label: "All issues" },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-hairline bg-surface">
      <div className="mx-auto max-w-[1400px] px-5 py-14 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-5 text-[1.0625rem] leading-6 tracking-tight text-ink">
              Understand what&rsquo;s happening.
              <br />
              Decide what you think.
            </p>
            <p className="mt-4 text-[0.8125rem] leading-5 text-ink-3">
              Political news made understandable for the next generation. NGN is
              nonpartisan: we explain what is established, represent each major
              position fairly, and leave the conclusion to you.
            </p>
          </div>

          <FooterColumn title="Read" links={PRIMARY_NAV} />
          <FooterColumn title="Issues" links={ISSUE_LINKS} />
          <FooterColumn title="About" links={ABOUT_LINKS} />
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-hairline pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[0.75rem] text-ink-3">
            &copy; {new Date().getFullYear()} NGN — Next Gen News. Demo build:
            all stories are illustrative examples, not live reporting.
          </p>
          <div className="flex items-center gap-5 text-[0.75rem] text-ink-3">
            <Link href="/about#privacy" className="transition-colors hover:text-ink">
              Privacy
            </Link>
            <Link href="/about#standards" className="transition-colors hover:text-ink">
              Standards
            </Link>
            <Link href="/search" className="transition-colors hover:text-ink">
              Search
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <h2 className="eyebrow text-ink-3">{title}</h2>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={`${link.href}-${link.label}`}>
            <Link
              href={link.href}
              className="text-[0.875rem] text-ink-2 transition-colors hover:text-accent"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
