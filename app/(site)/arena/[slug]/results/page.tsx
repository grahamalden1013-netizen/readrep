import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/primitives";
import { DebateResults } from "@/components/debate/DebateResults";
import { getDebate } from "@/data/demo/debates";

export const metadata: Metadata = { title: "Debate result" };

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const debate = getDebate(slug);
  if (!debate) notFound();

  return (
    <Container className="py-10 sm:py-14">
      <p className="mb-8 text-center text-sm text-ink-mute">{debate.title}</p>
      <DebateResults debate={debate} />
    </Container>
  );
}
