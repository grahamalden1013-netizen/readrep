import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getRankedStories } from "@/lib/content/repository";
import { Container } from "@/components/layout/container";
import { CoverPlate } from "@/components/news/cover-art";
import { CategoryBadge } from "@/components/news/category-badge";
import { DemoNotice } from "@/components/news/demo-notice";
import { ReadTime } from "@/components/news/story-meta";
import { SaveShare } from "@/components/article/save-share";
import { ReadingProgress } from "@/components/article/reading-progress";
import { IDontGetIt } from "@/components/article/i-dont-get-it";
import { formatDateline } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Your Daily Brief",
  description:
    "Everything you need to understand today's biggest political stories, ranked by significance rather than clicks.",
};

export default async function TodayPage() {
  const stories = await getRankedStories(5);
  const now = new Date();

  return (
    <>
      <ReadingProgress />

      <Container className="max-w-[900px] pb-10 pt-10 sm:pt-14">
        <p className="eyebrow text-accent">Today&rsquo;s NGN</p>
        <h1 className="mt-4 text-[2.25rem] font-semibold leading-[1.05] tracking-[-0.035em] text-ink sm:text-[3rem]">
          Your Daily Brief
        </h1>
        <p className="mt-4 text-[1.0625rem] leading-[1.6] text-ink-2">
          Everything you need to understand today&rsquo;s biggest political
          stories.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-hairline pt-4">
          <time
            dateTime={now.toISOString()}
            className="text-[0.8125rem] text-ink-2"
          >
            {formatDateline(now)}
          </time>
          <span aria-hidden className="text-ink-3/50">
            &middot;
          </span>
          <p className="text-[0.8125rem] text-ink-3">
            {stories.length} stories &middot;{" "}
            {stories.reduce((total, story) => total + story.readTime, 0)} min
            total
          </p>
          <span aria-hidden className="text-ink-3/50">
            &middot;
          </span>
          <p className="text-[0.8125rem] text-ink-3">
            Ordered by significance, not by clicks
          </p>
        </div>

        <ol className="mt-10 space-y-12">
          {stories.map((story, index) => (
            <li key={story.id}>
              <article className="grid gap-6 sm:grid-cols-[auto_1fr] sm:gap-7">
                <div className="flex items-start gap-4 sm:block">
                  <span className="font-mono text-[1.75rem] leading-none tabular-nums text-hairline-strong sm:text-[2.5rem]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <CategoryBadge category={story.category} />
                    {story.isDemo && <DemoNotice />}
                  </div>

                  <h2 className="mt-3.5 text-[1.375rem] font-semibold leading-[1.22] tracking-[-0.025em] text-ink sm:text-[1.625rem]">
                    <Link
                      href={`/story/${story.slug}`}
                      className="transition-colors hover:text-accent"
                    >
                      {story.headline}
                    </Link>
                  </h2>

                  <p className="mt-3 max-w-2xl text-[0.9375rem] leading-[1.65] text-ink-2">
                    {story.summary}
                  </p>

                  <div className="mt-5 overflow-hidden rounded-[var(--radius-card)] border border-hairline bg-surface">
                    <div className="grid gap-0 sm:grid-cols-[1fr_auto]">
                      <div className="p-4 sm:p-5">
                        <p className="eyebrow text-ink-3">Why it matters</p>
                        <p className="mt-2 text-[0.875rem] leading-[1.6] text-ink-2">
                          {story.quickWhyItMatters}
                        </p>
                      </div>
                      <div className="hidden w-48 p-2.5 sm:block">
                        <CoverPlate
                          cover={story.cover}
                          label={story.headline}
                          ratio="h-full min-h-[7rem]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Link
                      href={`/story/${story.slug}`}
                      className="group inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-[0.8125rem] font-medium text-paper transition-colors hover:bg-ink/88"
                    >
                      Read story
                      <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </Link>
                    <IDontGetIt slug={story.slug} variant="compact" />
                    <SaveShare
                      slug={story.slug}
                      title={story.headline}
                      size="sm"
                    />
                    <ReadTime minutes={story.readTime} className="ml-auto" />
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ol>

        <div className="mt-16 rounded-[var(--radius-card)] border border-hairline bg-surface p-6 text-center">
          <p className="eyebrow text-ink-3">That&rsquo;s the brief</p>
          <p className="mx-auto mt-3 max-w-md text-[0.9375rem] leading-6 text-ink-2">
            You are caught up. If one of these left you with a question rather
            than an answer, that is the right response — take it to the
            discussion.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/discuss"
              className="inline-flex h-10 items-center gap-2 rounded-full border border-hairline-strong px-4 text-[0.8125rem] font-medium text-ink transition-colors hover:bg-surface-2"
            >
              Join the discussion
            </Link>
            <Link
              href="/issues"
              className="inline-flex h-10 items-center gap-2 rounded-full border border-hairline-strong px-4 text-[0.8125rem] font-medium text-ink transition-colors hover:bg-surface-2"
            >
              Understand an issue
            </Link>
          </div>
        </div>
      </Container>
    </>
  );
}
