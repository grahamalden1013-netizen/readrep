import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { WeeklyArticle } from "@/types/ngn";
import { getAuthor } from "@/lib/content/authors";
import { CoverPlate } from "@/components/news/cover-art";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

/** The editorial label. Weekly pieces are opinion and always say so. */
export function EditorsArticleBadge({ className }: { className?: string }) {
  return (
    <Badge variant="editorial" className={cn("h-6 px-2.5", className)}>
      Editor&rsquo;s article
    </Badge>
  );
}

export function WeeklyFeature({
  weekly,
  compact = false,
}: {
  weekly: WeeklyArticle;
  compact?: boolean;
}) {
  const author = getAuthor(weekly.authorId);

  return (
    <article
      className={cn(
        "overflow-hidden rounded-[var(--radius-card)] border border-hairline bg-surface shadow-card",
        compact ? "" : "lg:grid lg:grid-cols-[1.1fr_0.9fr]",
      )}
    >
      <div className={cn("p-6 sm:p-8", compact && "sm:p-7")}>
        <div className="flex flex-wrap items-center gap-2">
          <EditorsArticleBadge />
          <Badge variant="outline" className="h-6 px-2.5">
            Edition {weekly.edition}
          </Badge>
        </div>

        <h3
          className={cn(
            "display mt-5 text-ink",
            compact ? "text-[1.75rem]" : "text-[2rem] sm:text-[2.5rem]",
          )}
        >
          <Link
            href={`/weekly/${weekly.slug}`}
            className="transition-colors hover:text-editorial"
          >
            {weekly.headline}
          </Link>
        </h3>

        <p className="mt-4 max-w-xl text-[1rem] leading-[1.6] text-ink-2">
          {weekly.dek}
        </p>

        <div className="mt-7 flex items-center gap-3">
          <Avatar initials={author.initials} hue={author.hue} size="lg" />
          <div>
            <p className="text-[0.875rem] font-semibold text-ink">
              {author.name}
            </p>
            <p className="text-[0.75rem] text-ink-3">
              {author.role} &middot; {formatDate(weekly.publishedAt)} &middot;{" "}
              {weekly.readTime} min read
            </p>
          </div>
        </div>

        <div className="mt-7">
          <Button asChild variant="outline">
            <Link href={`/weekly/${weekly.slug}`}>
              Read the Weekly
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>

      {!compact && (
        <div className="hidden p-2.5 lg:block">
          <CoverPlate
            cover={weekly.cover}
            label={weekly.headline}
            ratio="h-full min-h-[22rem]"
          />
        </div>
      )}
    </article>
  );
}

export function WeeklyCard({ weekly }: { weekly: WeeklyArticle }) {
  const author = getAuthor(weekly.authorId);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-hairline bg-surface shadow-card transition-[transform,box-shadow,border-color] duration-300 ease-[var(--ease-out-soft)] hover:-translate-y-0.5 hover:border-hairline-strong hover:shadow-lift">
      <div className="p-2.5 pb-0">
        <CoverPlate cover={weekly.cover} label={weekly.headline} ratio="aspect-[16/8]" />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2">
          <EditorsArticleBadge />
          <span className="font-mono text-[0.625rem] uppercase tracking-[0.12em] text-ink-3">
            No. {weekly.edition}
          </span>
        </div>
        <h3 className="display mt-3.5 text-[1.375rem] text-ink">
          <Link href={`/weekly/${weekly.slug}`} className="after:absolute after:inset-0">
            {weekly.headline}
          </Link>
        </h3>
        <p className="mt-2.5 text-[0.875rem] leading-[1.55] text-ink-2">
          {weekly.summary}
        </p>
        <div className="mt-auto flex items-center gap-2.5 pt-5">
          <Avatar initials={author.initials} hue={author.hue} size="sm" />
          <p className="text-[0.75rem] text-ink-3">
            {author.name} &middot; {formatDate(weekly.publishedAt)} &middot;{" "}
            {weekly.readTime} min
          </p>
        </div>
      </div>
    </article>
  );
}
