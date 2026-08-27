import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Info } from "lucide-react";
import { getWeeklyArticles, getWeeklyBySlug } from "@/lib/content/repository";
import { getAuthor } from "@/lib/content/authors";
import { Container } from "@/components/layout/container";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CoverPlate } from "@/components/news/cover-art";
import { ReadTime, PublishedDate, MetaDot } from "@/components/news/story-meta";
import { SaveShare } from "@/components/article/save-share";
import { ReadingProgress } from "@/components/article/reading-progress";
import { EditorsArticleBadge, WeeklyCard } from "@/components/weekly/weekly-cards";

export async function generateStaticParams() {
  const editions = await getWeeklyArticles();
  return editions.map((weekly) => ({ slug: weekly.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/weekly/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const weekly = await getWeeklyBySlug(slug);
  if (!weekly) return { title: "Edition not found" };

  return {
    title: weekly.headline,
    description: weekly.summary,
  };
}

export default async function WeeklyArticlePage({
  params,
}: PageProps<"/weekly/[slug]">) {
  const { slug } = await params;
  const weekly = await getWeeklyBySlug(slug);
  if (!weekly) notFound();

  const author = getAuthor(weekly.authorId);
  const others = (await getWeeklyArticles())
    .filter((edition) => edition.id !== weekly.id)
    .slice(0, 3);

  return (
    <>
      <ReadingProgress />

      <Container className="max-w-[780px] py-10 sm:py-14">
        <Link
          href="/weekly"
          className="inline-flex items-center gap-1.5 text-[0.8125rem] text-ink-3 transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-3.5" />
          The NGN Weekly
        </Link>

        <header className="mt-7">
          <div className="flex flex-wrap items-center gap-2">
            <EditorsArticleBadge />
            <Badge variant="outline" className="h-6 px-2.5">
              Edition {weekly.edition}
            </Badge>
          </div>

          <h1 className="display mt-6 text-[2.5rem] text-ink sm:text-[3.5rem]">
            {weekly.headline}
          </h1>

          <p className="mt-5 text-[1.125rem] leading-[1.55] text-ink-2">
            {weekly.dek}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-y border-hairline py-4">
            <div className="flex items-center gap-3">
              <Avatar initials={author.initials} hue={author.hue} size="lg" />
              <div>
                <p className="text-[0.9375rem] font-semibold text-ink">
                  {author.name}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[0.75rem] text-editorial">
                    {author.role}
                  </span>
                  <MetaDot />
                  <PublishedDate date={weekly.publishedAt} />
                  <MetaDot />
                  <ReadTime minutes={weekly.readTime} />
                </div>
              </div>
            </div>
            <SaveShare slug={weekly.slug} title={weekly.headline} size="sm" />
          </div>
        </header>

        <div className="mt-8">
          <CoverPlate
            cover={weekly.cover}
            label={weekly.headline}
            ratio="aspect-[16/7]"
            eager
          />
        </div>

        <aside className="mt-8 flex gap-3 rounded-xl border border-hairline bg-editorial-soft px-4 py-3.5">
          <Info className="mt-0.5 size-4 shrink-0 text-editorial" aria-hidden />
          <p className="text-[0.8125rem] leading-5 text-ink-2">
            <span className="font-semibold text-ink">This is an opinion piece.</span>{" "}
            It is written by a named editor and argues a position. NGN&rsquo;s
            news coverage does not.
          </p>
        </aside>

        <article className="article-prose mt-12">
          {weekly.body.map((section) => (
            <section key={section.heading} className="mt-12 first:mt-0">
              <h2 className="mb-5 text-[1.375rem] font-semibold leading-snug tracking-[-0.022em] text-ink">
                {section.heading}
              </h2>
              {section.paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </section>
          ))}
        </article>

        <div className="mt-14 rounded-[var(--radius-card)] border border-hairline bg-surface p-6">
          <div className="flex items-start gap-4">
            <Avatar initials={author.initials} hue={author.hue} size="xl" />
            <div>
              <p className="text-[1rem] font-semibold text-ink">{author.name}</p>
              <p className="text-[0.8125rem] text-editorial">{author.role}</p>
              <p className="mt-2.5 text-[0.875rem] leading-[1.6] text-ink-2">
                {author.bio}
              </p>
            </div>
          </div>
        </div>
      </Container>

      {others.length > 0 && (
        <Container wide className="pt-6">
          <div className="border-t border-hairline pt-4">
            <p className="eyebrow text-ink-3">More from the Weekly</p>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((edition) => (
                <WeeklyCard key={edition.id} weekly={edition} />
              ))}
            </div>
          </div>
        </Container>
      )}
    </>
  );
}
