import type { Metadata } from "next";
import { Container, PageHeader, SectionHead } from "@/components/ui/primitives";
import { FeaturedDebate } from "@/components/arena/FeaturedDebate";
import { ArenaBrowser } from "@/components/arena/ArenaBrowser";
import { DEBATES, featuredDebate } from "@/data/demo/debates";
import { FORMAT_LIST } from "@/lib/arena/formats";

export const metadata: Metadata = {
  title: "Arena",
  description: "Debate real issues. Build better arguments.",
};

export default function ArenaPage() {
  const featured = featuredDebate();

  return (
    <>
      <PageHeader
        eyebrow="NGN Arena"
        title="Arena"
        lede="Debate real issues. Build better arguments."
      />

      <Container className="py-10 sm:py-12">
        <FeaturedDebate debate={featured} eyebrow="Today's Featured Debate" />
      </Container>

      <Container className="pb-10">
        <SectionHead
          title="All debates"
          description="Filter by category, difficulty, format or how long you have."
        />
        <ArenaBrowser debates={DEBATES} />
      </Container>

      {/* Format explainer — students need to know what they are choosing */}
      <section className="border-t border-rule bg-paper-sunken/50">
        <Container className="py-12">
          <SectionHead title="Debate formats" />
          <ul className="grid gap-4 sm:grid-cols-3">
            {FORMAT_LIST.map((format) => (
              <li key={format.id} className="card p-5">
                <h3 className="text-lg">{format.name}</h3>
                <p className="mt-1.5 text-sm text-ink-mute">{format.tagline}</p>
                <dl className="mt-4 space-y-1.5 border-t border-rule pt-4 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-mute">Rounds</dt>
                    <dd className="tnum font-medium">{format.rounds.length}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-mute">Typical length</dt>
                    <dd className="font-medium">{format.estimateLabel}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-mute">Per round</dt>
                    <dd className="tnum font-medium">
                      {format.rounds[0].maxCharacters} chars
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        </Container>
      </section>
    </>
  );
}
