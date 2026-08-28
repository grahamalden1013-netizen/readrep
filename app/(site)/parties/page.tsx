import type { Metadata } from "next";
import Link from "next/link";
import { Card, Container, PageHeader } from "@/components/ui/primitives";
import { PARTIES } from "@/data/demo/parties";

export const metadata: Metadata = {
  title: "Party Explorer",
  description: "History, coalitions, priorities and internal factions. No rankings, no recommendations.",
};

export default function PartiesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Explore"
        title="Party Explorer"
        lede="What each party is, where it came from, who it is made of, and where it disagrees with itself."
      />

      <Container className="py-10 sm:py-14">
        <ul className="grid gap-4 sm:grid-cols-2">
          {PARTIES.map((party) => (
            <li key={party.id} className="relative">
              <Card interactive as="article" className="flex h-full flex-col p-5 sm:p-6">
                <p className="text-xs text-ink-faint">Founded {party.founded}</p>
                <h2 className="mt-2 text-xl leading-snug sm:text-2xl">
                  <Link href={`/parties/${party.slug}`} className="after:absolute after:inset-0">
                    {party.name}
                  </Link>
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-ink-mute">
                  {party.summary}
                </p>
                <p className="mt-auto pt-5 text-xs text-ink-faint">
                  {party.factions.length} internal{" "}
                  {party.factions.length === 1 ? "faction" : "factions"} documented
                </p>
              </Card>
            </li>
          ))}
        </ul>

        <p className="mt-8 rounded-sm border border-rule bg-paper-raised px-5 py-4 text-xs leading-relaxed text-ink-mute">
          NGN does not rank parties and does not recommend one. These pages
          describe what each party is and what its members argue — including
          where they argue with each other.
        </p>
      </Container>
    </>
  );
}
