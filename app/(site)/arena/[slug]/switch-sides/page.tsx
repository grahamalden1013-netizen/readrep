import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/primitives";
import { SwitchSides } from "@/components/debate/SwitchSides";
import { getDebate } from "@/data/demo/debates";

export const metadata: Metadata = { title: "Switch Sides" };

export default async function SwitchSidesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const debate = getDebate(slug);
  if (!debate) notFound();

  return (
    <Container width="reading" className="py-10 sm:py-14">
      <p className="mb-8 text-sm text-ink-mute">{debate.title}</p>
      <SwitchSides debate={debate} />
    </Container>
  );
}
