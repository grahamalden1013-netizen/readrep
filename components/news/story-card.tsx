import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ArticleSummary } from "@/types/ngn";
import { CoverPlate } from "./cover-art";
import { CategoryBadge } from "./category-badge";
import { ReadTime } from "./story-meta";
import { DemoNotice } from "./demo-notice";
import { cn } from "@/lib/utils";

/** Standard story card used across the homepage, Politics and issue pages. */
export function StoryCard({
  story,
  className,
  showWhyItMatters = true,
  priority = false,
}: {
  story: ArticleSummary;
  className?: string;
  showWhyItMatters?: boolean;
  priority?: boolean;
}) {
  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-hairline bg-surface shadow-card transition-[transform,box-shadow,border-color] duration-300 ease-[var(--ease-out-soft)] hover:-translate-y-0.5 hover:border-hairline-strong hover:shadow-lift",
        className,
      )}
    >
      <div className="p-2.5 pb-0">
        <CoverPlate
          cover={story.cover}
          label={story.headline}
          eager={priority}
          ratio="aspect-[16/9]"
        />
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2">
          <CategoryBadge category={story.category} />
          {story.isDemo && <DemoNotice />}
        </div>

        <h3 className="mt-3 text-[1.0625rem] font-semibold leading-[1.3] tracking-[-0.015em] text-ink">
          <Link href={`/story/${story.slug}`} className="after:absolute after:inset-0">
            {story.headline}
          </Link>
        </h3>

        <p className="mt-2.5 text-[0.875rem] leading-[1.55] text-ink-2">
          {story.summary}
        </p>

        {showWhyItMatters && (
          <div className="mt-4 rounded-lg bg-surface-2 px-3.5 py-3">
            <p className="eyebrow text-ink-3">Why it matters</p>
            <p className="mt-1.5 text-[0.8125rem] leading-[1.5] text-ink-2">
              {story.whyItMatters}
            </p>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between pt-5">
          <ReadTime minutes={story.readTime} />
          <ArrowUpRight
            aria-hidden
            className="size-4 text-ink-3 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent"
          />
        </div>
      </div>
    </article>
  );
}

/** Compact horizontal row — used in "more on this" rails and issue pages. */
export function StoryRow({
  story,
  index,
  className,
}: {
  story: ArticleSummary;
  index?: number;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "group relative flex items-start gap-4 py-5",
        className,
      )}
    >
      {typeof index === "number" && (
        <span className="mt-0.5 w-6 shrink-0 font-mono text-[0.75rem] tabular-nums text-ink-3">
          {String(index).padStart(2, "0")}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <CategoryBadge category={story.category} />
          {story.isDemo && <DemoNotice />}
        </div>
        <h3 className="mt-2 text-[0.9375rem] font-semibold leading-snug tracking-[-0.01em] text-ink transition-colors group-hover:text-accent">
          <Link href={`/story/${story.slug}`} className="after:absolute after:inset-0">
            {story.headline}
          </Link>
        </h3>
        <p className="mt-1.5 line-clamp-2 text-[0.8125rem] leading-5 text-ink-3">
          {story.summary}
        </p>
        <div className="mt-2.5">
          <ReadTime minutes={story.readTime} />
        </div>
      </div>
      <div className="hidden w-28 shrink-0 sm:block">
        <CoverPlate cover={story.cover} label={story.headline} ratio="aspect-[4/3]" />
      </div>
    </article>
  );
}
