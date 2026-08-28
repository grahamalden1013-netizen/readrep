import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, PageHeader, Card } from "@/components/ui/primitives";
import { PARTIES, getParty } from "@/data/demo/parties";

export function generateStaticParams() {
  return PARTIES.map((party) => ({ slug: party.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const party = getParty(slug);
  if (!party) return { title: "Party not found" };
  return { title: party.name, description: party.summary };
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-rule pt-8">
      <h2 className="text-xl sm:text-2xl">{title}</h2>
      {note && <p className="mt-1.5 text-sm text-ink-mute">{note}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default async function PartyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const party = getParty(slug);
  if (!party) notFound();

  return (
    <>
      <PageHeader
        eyebrow={party.founded === "Not a party" ? "Not a party" : `Founded ${party.founded}`}
        title={party.name}
        lede={party.summary}
      />

      <Container width="reading" className="py-10 sm:py-14">
        <nav aria-label="Breadcrumb" className="mb-8">
          <Link href="/parties" className="text-sm text-ink-mute underline-offset-4 hover:text-ink hover:underline">
            ← Party Explorer
          </Link>
        </nav>

        <div className="space-y-10">
          <section>
            <h2 className="text-xl sm:text-2xl">History</h2>
            <ol className="mt-5 space-y-5">
              {party.history.map((item, index) => (
                <li key={index} className="flex gap-4">
                  <span aria-hidden className="tnum mt-1 shrink-0 text-xs font-semibold text-ink-faint">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p className="text-[0.9375rem] leading-relaxed text-ink-soft">{item}</p>
                </li>
              ))}
            </ol>
          </section>

          <Section title="Current major priorities">
            <ul className="space-y-2.5">
              {party.currentPriorities.map((item, index) => (
                <li key={index} className="flex gap-3">
                  <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-lime-deep" />
                  <span className="text-[0.9375rem] leading-relaxed text-ink-soft">{item}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Coalitions">
            <ul className="space-y-2.5">
              {party.coalitions.map((item, index) => (
                <li key={index} className="flex gap-3">
                  <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-ink-faint" />
                  <span className="text-[0.9375rem] leading-relaxed text-ink-soft">{item}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Common policy positions">
            <dl className="divide-y divide-rule border-y border-rule">
              {party.commonPositions.map((position) => (
                <div key={position.area} className="grid gap-1 py-4 sm:grid-cols-[140px_1fr] sm:gap-4">
                  <dt className="text-sm font-semibold">{position.area}</dt>
                  <dd className="text-sm leading-relaxed text-ink-soft">{position.position}</dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section
            title="Internal factions"
            note="A party is a coalition, not a belief. These groups frequently disagree with each other."
          >
            <ul className="space-y-3">
              {party.factions.map((faction) => (
                <li key={faction.name}>
                  <Card className="p-4 sm:p-5">
                    <h3 className="text-base font-semibold">{faction.name}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                      {faction.description}
                    </p>
                  </Card>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="On platforms">
            <p className="rounded-sm border-l-2 border-lime-deep bg-paper-sunken/60 p-5 text-sm leading-relaxed text-ink-soft">
              {party.platformNote}
            </p>
          </Section>
        </div>

        <p className="mt-12 rounded-sm border border-rule px-5 py-4 text-xs leading-relaxed text-ink-mute">
          NGN does not rank parties and does not recommend one. If you cite a
          party position in a debate, name the faction or the specific lawmakers
          you mean — a rebuttal that points out the party is not unified on your
          claim will cost you points.
        </p>
      </Container>
    </>
  );
}
