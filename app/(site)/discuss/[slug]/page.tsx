import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink, Container, Eyebrow } from "@/components/ui/primitives";
import { DiscussionThread } from "@/components/discuss/DiscussionThread";
import { DISCUSSIONS, getDiscussion } from "@/data/demo/discussions";
import { getDebate } from "@/data/demo/debates";
import { getArticle } from "@/data/demo/articles";

export function generateStaticParams() {
  return DISCUSSIONS.map((discussion) => ({ slug: discussion.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const discussion = getDiscussion(slug);
  if (!discussion) return { title: "Discussion not found" };
  return { title: discussion.question, description: discussion.context };
}

export default async function DiscussionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const discussion = getDiscussion(slug);
  if (!discussion) notFound();

  const debate = discussion.relatedDebateSlug ? getDebate(discussion.relatedDebateSlug) : null;
  const article = discussion.relatedArticleSlug ? getArticle(discussion.relatedArticleSlug) : null;

  return (
    <Container width="reading" className="py-10 sm:py-14">
      <nav aria-label="Breadcrumb" className="mb-6">
        <Link href="/discuss" className="text-sm text-ink-mute underline-offset-4 hover:text-ink hover:underline">
          ← Discuss
        </Link>
      </nav>

      <Eyebrow>Discussion</Eyebrow>
      <h1 className="mt-3 text-2xl leading-tight sm:text-4xl">{discussion.question}</h1>
      <p className="mt-4 text-base leading-relaxed text-ink-soft">{discussion.context}</p>

      {(debate || article) && (
        <div className="mt-6 flex flex-wrap gap-3 border-t border-rule pt-5">
          {debate && (
            <ButtonLink href={`/arena/${debate.slug}/brief`} tone="secondary" size="sm">
              Read the related briefing
            </ButtonLink>
          )}
          {article && (
            <ButtonLink href={`/today/${article.slug}`} tone="ghost" size="sm">
              Related article →
            </ButtonLink>
          )}
        </div>
      )}

      <div className="mt-10">
        <DiscussionThread discussion={discussion} />
      </div>
    </Container>
  );
}
