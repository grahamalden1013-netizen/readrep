"use client";

import Link from "next/link";
import { Bookmark } from "lucide-react";
import type { ArticleSummary } from "@/types/ngn";
import { parseSaved, useSavedRaw } from "@/lib/client/browser-stores";
import { CategoryBadge } from "@/components/news/category-badge";
import { ReadTime } from "@/components/news/story-meta";

/**
 * Saved stories, read from the same per-browser store the save button writes
 * to. Swap the store for a `saved_articles` query once Supabase is connected.
 */
export function SavedList({ candidates }: { candidates: ArticleSummary[] }) {
  const savedRaw = useSavedRaw();

  if (savedRaw === null) {
    return (
      <div className="space-y-3" aria-busy="true">
        <span className="sr-only">Loading saved stories</span>
        <div className="skeleton h-16 rounded-xl" />
        <div className="skeleton h-16 rounded-xl" />
      </div>
    );
  }

  const slugs = parseSaved(savedRaw);
  const saved = candidates.filter((story) => slugs.includes(story.slug));

  if (saved.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-dashed border-hairline-strong p-8 text-center">
        <Bookmark className="mx-auto size-5 text-ink-3" aria-hidden />
        <p className="mt-3 text-[0.9375rem] font-medium text-ink">
          Nothing saved yet
        </p>
        <p className="mx-auto mt-1.5 max-w-xs text-[0.8125rem] leading-6 text-ink-3">
          Use Save on any story to keep it here for later.
        </p>
        <Link
          href="/today"
          className="mt-5 inline-flex h-9 items-center rounded-full border border-hairline-strong px-3.5 text-[0.8125rem] font-medium text-ink transition-colors hover:bg-surface-2"
        >
          Read today&rsquo;s brief
        </Link>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-hairline">
      {saved.map((story) => (
        <li key={story.slug} className="group relative py-4">
          <CategoryBadge category={story.category} />
          <h3 className="mt-2 text-[0.9375rem] font-semibold leading-snug text-ink transition-colors group-hover:text-accent">
            <Link href={`/story/${story.slug}`} className="after:absolute after:inset-0">
              {story.headline}
            </Link>
          </h3>
          <div className="mt-2">
            <ReadTime minutes={story.readTime} />
          </div>
        </li>
      ))}
    </ul>
  );
}
