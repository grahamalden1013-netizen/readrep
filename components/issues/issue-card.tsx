import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ArticleSummary, Issue } from "@/types/ngn";
import { CoverPlate } from "@/components/news/cover-art";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Compact tile used in the homepage "Understand the issue" strip. */
export function IssueTile({ issue }: { issue: Issue }) {
  return (
    <Link
      href={`/issues/${issue.slug}`}
      className="group relative flex flex-col justify-between overflow-hidden rounded-[var(--radius-card)] border border-hairline bg-surface p-5 shadow-card transition-[transform,box-shadow,border-color] duration-300 ease-[var(--ease-out-soft)] hover:-translate-y-0.5 hover:border-hairline-strong hover:shadow-lift"
    >
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-0.5 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `oklch(0.65 0.13 ${issue.cover.hue})` }}
      />
      <div>
        <h3 className="text-[1.0625rem] font-semibold tracking-[-0.015em] text-ink">
          {issue.name}
        </h3>
        <p className="mt-2 text-[0.8125rem] leading-[1.5] text-ink-3">
          {issue.shortDescription}
        </p>
      </div>
      <span className="mt-5 inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-accent">
        Understand this issue
        <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

/** Full card for the Issues Library grid, including the latest related story. */
export function IssueCard({
  issue,
  latestStory,
  className,
}: {
  issue: Issue;
  latestStory?: ArticleSummary;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-hairline bg-surface shadow-card transition-[transform,box-shadow,border-color] duration-300 ease-[var(--ease-out-soft)] hover:-translate-y-0.5 hover:border-hairline-strong hover:shadow-lift",
        className,
      )}
    >
      <div className="p-2.5 pb-0">
        <CoverPlate cover={issue.cover} label={issue.name} ratio="aspect-[16/7]" />
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-[1.125rem] font-semibold tracking-[-0.02em] text-ink">
          {issue.name}
        </h3>
        <p className="mt-2 text-[0.875rem] leading-[1.55] text-ink-2">
          {issue.shortDescription}
        </p>

        <div className="mt-4 border-t border-hairline pt-4">
          <p className="eyebrow text-ink-3">Latest related story</p>
          {latestStory ? (
            <Link
              href={`/story/${latestStory.slug}`}
              className="mt-2 block text-[0.875rem] font-medium leading-snug text-ink transition-colors hover:text-accent"
            >
              {latestStory.headline}
            </Link>
          ) : (
            <p className="mt-2 text-[0.8125rem] leading-snug text-ink-3">
              No story filed on this issue yet. The guide covers the background
              either way.
            </p>
          )}
        </div>

        <div className="mt-5 pt-1">
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link href={`/issues/${issue.slug}`}>
              Understand this issue
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
