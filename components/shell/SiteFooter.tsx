import Link from "next/link";
import { Container } from "@/components/ui/primitives";
import { isDemoContent } from "@/data/demo";

const COLUMNS = [
  {
    title: "Understand",
    links: [
      { href: "/today", label: "Today's Brief" },
      { href: "/issues", label: "Issue Library" },
      { href: "/parties", label: "Party Explorer" },
      { href: "/weekly", label: "NGN Weekly" },
    ],
  },
  {
    title: "Arena",
    links: [
      { href: "/arena", label: "All Debates" },
      { href: "/rankings", label: "Rankings" },
      { href: "/tournaments", label: "Weekly Championship" },
      { href: "/schools", label: "School Competitions" },
    ],
  },
  {
    title: "Community",
    links: [
      { href: "/discuss", label: "Discussion" },
      { href: "/profile", label: "Your Profile" },
      { href: "/classroom", label: "For Teachers" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-rule bg-paper-sunken/60">
      <Container className="py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="font-serif text-xl font-semibold tracking-tight">NGN</p>
            <p className="mt-1 text-[0.625rem] font-medium uppercase tracking-[0.16em] text-ink-faint">
              Next Gen News
            </p>
            <p className="mt-4 max-w-[24ch] font-serif text-base leading-snug text-ink-soft">
              Don&apos;t just have an opinion. Defend it.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="eyebrow text-ink-mute">{column.title}</h2>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-ink-soft transition-colors hover:text-ink"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 border-t border-rule pt-6">
          <p className="max-w-3xl text-xs leading-relaxed text-ink-mute">
            NGN scores how well an argument is built — evidence, reasoning,
            rebuttal, clarity, understanding of the opposing view, and civility.
            It never scores whether a political position is correct, and it does
            not recommend a party, candidate or ideology.
          </p>
          {isDemoContent() && (
            <p className="mt-3 text-xs text-ink-faint">
              Running on seeded demo content. Participation figures, opponents
              and rankings are illustrative and marked where shown.
            </p>
          )}
        </div>
      </Container>
    </footer>
  );
}
