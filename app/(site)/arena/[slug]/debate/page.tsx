import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/primitives";
import { DebateRoom } from "@/components/debate/DebateRoom";
import { getDebate } from "@/data/demo/debates";

export const metadata: Metadata = { title: "Debate in progress" };

export default async function DebatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const debate = getDebate(slug);
  if (!debate) notFound();

  return (
    <Container className="py-6 sm:py-8">
      <DebateRoom debate={debate} />
    </Container>
  );
}
