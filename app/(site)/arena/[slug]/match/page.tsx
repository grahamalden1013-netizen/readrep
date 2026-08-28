import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Container } from "@/components/ui/primitives";
import { Matchmaking } from "@/components/debate/Matchmaking";
import { getDebate } from "@/data/demo/debates";
import { DEBATE_FORMATS, type DebateFormat } from "@/types/ngn";

export const metadata: Metadata = { title: "Finding an opponent" };

export default async function MatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const debate = getDebate(slug);
  if (!debate) notFound();

  const rawPosition = typeof query.position === "string" ? query.position : "";
  if (rawPosition !== "support" && rawPosition !== "oppose") {
    // Arriving here without a position means the flow was skipped; send the
    // student back to choose one rather than guessing on their behalf.
    redirect(`/arena/${slug}/position`);
  }

  const rawFormat = typeof query.format === "string" ? query.format : debate.format;
  const format = (DEBATE_FORMATS as readonly string[]).includes(rawFormat)
    ? (rawFormat as DebateFormat)
    : debate.format;

  const confidence = Number(query.confidence) || 3;

  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto max-w-lg text-center">
        <p className="eyebrow text-ink-mute">Matching</p>
        <h1 className="mt-2 text-2xl leading-tight sm:text-3xl">{debate.title}</h1>
      </div>

      <div className="mt-10">
        <Matchmaking
          debate={debate}
          position={rawPosition}
          wasAssigned={query.assigned === "1"}
          confidence={confidence}
          format={format}
        />
      </div>
    </Container>
  );
}
