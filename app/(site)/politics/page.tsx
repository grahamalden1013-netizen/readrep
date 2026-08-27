import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedArticles, toSummary } from "@/lib/content/repository";
import { CATEGORIES, categoryLabel } from "@/lib/content/categories";
import type { CategorySlug } from "@/types/ngn";
import { Container } from "@/components/layout/container";
import { StoryCard } from "@/components/news/story-card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Politics",
  description:
    "Every NGN story, by topic — process, institutions and policy explained without assumed knowledge.",
};

export default async function PoliticsPage({
  searchParams,
}: PageProps<"/politics">) {
  const params = await searchParams;
  const selected =
    typeof params.category === "string" &&
    params.category in CATEGORIES
      ? (params.category as CategorySlug)
      : null;

  const articles = await getPublishedArticles();
  const used = Array.from(new Set(articles.map((a) => a.category)));
  const filtered = selected
    ? articles.filter((article) => article.category === selected)
    : articles;

  return (
    <Container wide className="py-10 sm:py-14">
      <p className="eyebrow text-accent">Politics</p>
      <h1 className="mt-4 max-w-3xl text-[2.25rem] font-semibold leading-[1.05] tracking-[-0.035em] text-ink sm:text-[2.75rem]">
        Everything NGN has published
      </h1>
      <p className="mt-4 max-w-2xl text-[1.0625rem] leading-[1.6] text-ink-2">
        Process, institutions and policy — explained without assuming you were
        already following along.
      </p>

      <nav aria-label="Filter by topic" className="mt-8 border-t border-hairline pt-5">
        <ul className="flex flex-wrap gap-2">
          <li>
            <FilterChip href="/politics" active={!selected}>
              All stories
            </FilterChip>
          </li>
          {used.map((category) => (
            <li key={category}>
              <FilterChip
                href={`/politics?category=${category}`}
                active={selected === category}
              >
                {categoryLabel(category)}
              </FilterChip>
            </li>
          ))}
        </ul>
      </nav>

      {filtered.length > 0 ? (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((article) => (
            <StoryCard key={article.id} story={toSummary(article)} />
          ))}
        </div>
      ) : (
        <div className="mt-10 rounded-[var(--radius-card)] border border-dashed border-hairline-strong p-12 text-center">
          <p className="text-[0.9375rem] font-medium text-ink">
            Nothing filed under {selected ? categoryLabel(selected) : "this topic"} yet.
          </p>
          <p className="mx-auto mt-2 max-w-sm text-[0.875rem] leading-6 text-ink-3">
            The issue guides cover the background whether or not a story has
            been filed this week.
          </p>
          <Link
            href="/issues"
            className="mt-5 inline-flex h-10 items-center rounded-full border border-hairline-strong px-4 text-[0.8125rem] font-medium text-ink transition-colors hover:bg-surface-2"
          >
            Browse issue guides
          </Link>
        </div>
      )}
    </Container>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "inline-flex h-9 items-center rounded-full border px-3.5 text-[0.8125rem] font-medium transition-colors",
        active
          ? "border-ink bg-ink text-paper"
          : "border-hairline text-ink-2 hover:border-hairline-strong hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}
