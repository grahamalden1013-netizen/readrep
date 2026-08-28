import Link from "next/link";
import type { Article } from "@/types/ngn";
import { Card, Eyebrow, Pill } from "@/components/ui/primitives";

export function ArticleCard({
  article,
  size = "md",
}: {
  article: Article;
  size?: "sm" | "md" | "lg";
}) {
  const headingClass =
    size === "lg"
      ? "text-2xl leading-tight sm:text-[1.75rem]"
      : size === "sm"
        ? "text-base leading-snug"
        : "text-lg leading-snug";

  return (
    <Card interactive as="article" className="group flex h-full flex-col p-5">
      <div className="flex items-center gap-2.5">
        <Eyebrow tone={article.kind === "weekly" ? "accent" : "mute"}>
          {article.kind === "weekly" ? "NGN Weekly" : article.category}
        </Eyebrow>
        <span aria-hidden className="h-3 w-px bg-rule" />
        <span className="text-[0.6875rem] text-ink-faint">
          {article.readMinutes} min read
        </span>
      </div>

      <h3 className={`mt-3 ${headingClass}`}>
        <Link
          href={`/today/${article.slug}`}
          className="after:absolute after:inset-0 focus:outline-none"
        >
          {article.headline}
        </Link>
      </h3>

      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-mute">
        {article.explainer}
      </p>

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
        <span className="text-[0.6875rem] text-ink-faint">{article.provenance}</span>
        {article.relatedDebateSlug && (
          <Pill tone="accent" className="relative z-10">
            Linked debate
          </Pill>
        )}
      </div>
    </Card>
  );
}

/** The "Understand" CTA that turns a story into an Arena entry point. */
export function DebateThisIssue({ debateSlug }: { debateSlug: string }) {
  return (
    <Link
      href={`/arena/${debateSlug}/brief`}
      className="group relative z-10 mt-4 flex items-center justify-between gap-4 rounded-sm border border-rule-strong bg-paper-sunken px-4 py-3 transition-colors hover:border-ink"
    >
      <span className="text-sm font-medium">Debate this issue</span>
      <span
        aria-hidden
        className="text-ink-mute transition-transform duration-200 group-hover:translate-x-0.5"
      >
        →
      </span>
    </Link>
  );
}
