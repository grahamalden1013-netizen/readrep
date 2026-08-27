import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  getArticleBySlug,
  getCommentsForArticle,
  getPublishedArticles,
  getReactions,
  getRelatedArticles,
} from "@/lib/content/repository";
import { getAuthor } from "@/lib/content/authors";
import { getViewer } from "@/lib/auth";
import { Container } from "@/components/layout/container";
import { CoverPlate } from "@/components/news/cover-art";
import { CategoryBadge } from "@/components/news/category-badge";
import { DemoNotice } from "@/components/news/demo-notice";
import { ReadTime, PublishedDate, MetaDot } from "@/components/news/story-meta";
import { StoryRow } from "@/components/news/story-card";
import { Avatar } from "@/components/ui/avatar";
import { ReadingProgress } from "@/components/article/reading-progress";
import { QuickVersion } from "@/components/article/quick-version";
import { UnderstandTheSides } from "@/components/article/perspectives";
import {
  KeyTerms,
  SourceList,
  WhatWeKnow,
} from "@/components/article/facts-and-sources";
import { IDontGetIt } from "@/components/article/i-dont-get-it";
import { AskNgn } from "@/components/article/ask-ngn";
import { Reactions } from "@/components/article/reactions";
import { SaveShare } from "@/components/article/save-share";
import { CommentThread } from "@/components/article/comments";

export async function generateStaticParams() {
  const articles = await getPublishedArticles();
  return articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/story/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return { title: "Story not found" };

  return {
    title: article.headline,
    description: article.summary,
    openGraph: {
      title: article.headline,
      description: article.summary,
      type: "article",
      publishedTime: article.publishedAt,
    },
  };
}

export default async function StoryPage({ params }: PageProps<"/story/[slug]">) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  const [comments, reactions, related, viewer] = await Promise.all([
    getCommentsForArticle(article.id),
    getReactions(article.id),
    getRelatedArticles(article.slug, 3),
    getViewer(),
  ]);

  const author = getAuthor(article.authorId);
  const signInHref = `/login?redirectTo=${encodeURIComponent(`/story/${article.slug}`)}`;

  return (
    <>
      <ReadingProgress />

      <Container className="max-w-[820px] pb-8 pt-8 sm:pt-10">
        <Link
          href="/today"
          className="inline-flex items-center gap-1.5 text-[0.8125rem] text-ink-3 transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-3.5" />
          Back to today&rsquo;s brief
        </Link>

        <header className="mt-7">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryBadge category={article.category} href="/politics" />
            {article.isDemo && <DemoNotice />}
          </div>

          <h1 className="mt-5 text-[2rem] font-semibold leading-[1.1] tracking-[-0.032em] text-ink sm:text-[2.625rem]">
            {article.headline}
          </h1>

          <p className="mt-5 text-[1.0625rem] leading-[1.6] text-ink-2 sm:text-[1.1875rem]">
            {article.subheadline}
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-y border-hairline py-4">
            <div className="flex items-center gap-3">
              <Avatar initials={author.initials} hue={author.hue} size="md" />
              <div>
                <p className="text-[0.875rem] font-medium text-ink">
                  {author.name}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <PublishedDate date={article.publishedAt} />
                  <MetaDot />
                  <ReadTime minutes={article.readTime} />
                </div>
              </div>
            </div>
            <SaveShare slug={article.slug} title={article.headline} size="sm" />
          </div>
        </header>

        <div className="mt-8">
          <CoverPlate
            cover={article.cover}
            label={article.headline}
            ratio="aspect-[16/8]"
            eager
          />
          <p className="mt-2.5 text-[0.75rem] text-ink-3">
            Generated cover art. NGN&rsquo;s demo build ships without
            photography.
          </p>
        </div>

        <div className="mt-8">
          <DemoNotice variant="block" />
        </div>

        <div className="mt-10">
          <QuickVersion article={article} />
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-4 rounded-[var(--radius-card)] border border-hairline bg-surface p-5">
          <div className="flex-1">
            <p className="text-[0.9375rem] font-medium text-ink">
              Lost already? That is normal.
            </p>
            <p className="mt-1 text-[0.8125rem] leading-5 text-ink-3">
              Most political coverage assumes background nobody taught you.
            </p>
          </div>
          <IDontGetIt slug={article.slug} />
        </div>

        <article className="article-prose mt-12">
          {article.body.map((section) => (
            <section key={section.heading} className="mt-12 first:mt-0">
              <h2 className="mb-5 text-[1.375rem] font-semibold leading-snug tracking-[-0.022em] text-ink">
                {section.heading}
              </h2>
              {section.paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
              {section.bullets && section.bullets.length > 0 && (
                <ul className="mt-5 space-y-3">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-3">
                      <span
                        aria-hidden
                        className="mt-2.5 size-1.5 shrink-0 rounded-full bg-accent"
                      />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </article>

        <div className="mt-14">
          <UnderstandTheSides
            democratic={article.democraticView}
            republican={article.republicanView}
            other={article.otherViews}
          />
        </div>

        <div className="mt-14">
          <WhatWeKnow
            facts={article.knownFacts}
            uncertainties={article.uncertainties}
          />
        </div>

        <div className="mt-14">
          <KeyTerms terms={article.keyTerms} />
        </div>

        <div className="mt-14">
          <SourceList sources={article.sources} />
        </div>

        <div className="mt-14">
          <AskNgn slug={article.slug} />
        </div>

        <div className="mt-14">
          <Reactions
            tally={reactions}
            signedIn={Boolean(viewer)}
            signInHref={signInHref}
          />
        </div>

        <div className="mt-14">
          <CommentThread
            comments={comments}
            signedIn={Boolean(viewer)}
            signInHref={signInHref}
            viewer={
              viewer
                ? {
                    displayName: viewer.displayName,
                    initials: viewer.initials,
                    hue: viewer.hue,
                  }
                : null
            }
          />
        </div>
      </Container>

      {related.length > 0 && (
        <Container className="max-w-[820px] pt-14">
          <div className="rule-top pt-4">
            <h2 className="eyebrow text-ink-3">Keep going</h2>
            <div className="mt-2 divide-y divide-hairline">
              {related.map((story) => (
                <StoryRow key={story.id} story={story} />
              ))}
            </div>
          </div>
        </Container>
      )}
    </>
  );
}
