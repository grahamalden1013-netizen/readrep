import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, Eyebrow } from "@/components/ui/primitives";
import { PositionSelector } from "@/components/debate/PositionSelector";
import { DEBATES, getDebate } from "@/data/demo/debates";

export function generateStaticParams() {
  return DEBATES.map((debate) => ({ slug: debate.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const debate = getDebate(slug);
  return { title: debate ? `${debate.title} — Choose your position` : "Debate" };
}

export default async function PositionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const debate = getDebate(slug);
  if (!debate) notFound();

  return (
    <Container width="reading" className="py-10 sm:py-14">
      <nav aria-label="Breadcrumb" className="mb-6">
        <Link
          href={`/arena/${debate.slug}/brief`}
          className="text-sm text-ink-mute underline-offset-4 hover:text-ink hover:underline"
        >
          ← Back to the briefing
        </Link>
      </nav>

      <Eyebrow>{debate.category}</Eyebrow>
      <h1 className="mt-2 text-2xl leading-tight sm:text-3xl">{debate.title}</h1>
      <p className="mt-3 border-l-2 border-rule pl-4 text-sm leading-relaxed text-ink-mute">
        {debate.brief.question}
      </p>

      <div className="mt-10">
        <PositionSelector debate={debate} />
      </div>
    </Container>
  );
}
