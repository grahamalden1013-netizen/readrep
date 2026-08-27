"use client";

import { useState } from "react";
import { Bookmark, BookmarkCheck, Check, Share2 } from "lucide-react";
import {
  parseSaved,
  toggleSavedStory,
  useSavedRaw,
} from "@/lib/client/browser-stores";
import { cn } from "@/lib/utils";

/**
 * Save and share controls.
 *
 * Saving is stored per-browser until Supabase is connected, at which point the
 * same interface writes to `saved_articles`.
 */
export function SaveShare({
  slug,
  title,
  className,
  size = "md",
}: {
  slug: string;
  title: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const savedRaw = useSavedRaw();
  const saved = parseSaved(savedRaw).includes(slug);
  const [shared, setShared] = useState(false);

  async function share() {
    const url = `${window.location.origin}/story/${slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShared(true);
      window.setTimeout(() => setShared(false), 2000);
    } catch {
      // Cancelled share or blocked clipboard — nothing to report.
    }
  }

  const base = cn(
    "inline-flex items-center gap-2 rounded-full border border-hairline bg-surface text-ink-2 transition-all duration-200 hover:border-hairline-strong hover:text-ink active:scale-[0.98]",
    size === "sm" ? "h-8 px-3 text-[0.75rem]" : "h-10 px-4 text-[0.8125rem]",
  );

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button
        type="button"
        onClick={() => toggleSavedStory(slug)}
        aria-pressed={saved}
        className={cn(base, saved && "border-accent text-accent")}
      >
        {saved ? (
          <BookmarkCheck className="size-4" aria-hidden />
        ) : (
          <Bookmark className="size-4" aria-hidden />
        )}
        {saved ? "Saved" : "Save"}
      </button>

      <button type="button" onClick={share} className={base}>
        {shared ? (
          <Check className="size-4" aria-hidden />
        ) : (
          <Share2 className="size-4" aria-hidden />
        )}
        {shared ? "Link copied" : "Share"}
      </button>
    </div>
  );
}
