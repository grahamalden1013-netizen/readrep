import type { Metadata } from "next";
import Link from "next/link";
import { Search as SearchIcon } from "lucide-react";
import { search, SEARCH_SUGGESTIONS } from "@/lib/content/repository";
import type { SearchResultKind } from "@/types/ngn";
import { Container } from "@/components/layout/container";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Search",
  description:
    "Search NGN articles, issue guides, Weekly editions and discussions.",
};

const KIND_LABEL: Record<SearchResultKind, string> = {
  article: "Story",
  issue: "Issue guide",
  weekly: "The Weekly",
  discussion: "Discussion",
};

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const results = query ? await search(query) : [];

  const grouped = results.reduce<Record<SearchResultKind, typeof results>>(
    (acc, result) => {
      acc[result.kind] = [...(acc[result.kind] ?? []), result];
      return acc;
    },
    { article: [], issue: [], weekly: [], discussion: [] },
  );

  return (
    <Container className="max-w-[860px] py-10 sm:py-14">
      <p className="eyebrow text-accent">Search</p>
      <h1 className="mt-4 text-[2.25rem] font-semibold leading-[1.05] tracking-[-0.035em] text-ink sm:text-[2.75rem]">
        Look something up
      </h1>
      <p className="mt-4 max-w-xl text-[1.0625rem] leading-[1.6] text-ink-2">
        Stories, issue guides, Weekly editions and discussions. Background
        topics count — searching a term you half-recognise is the point.
      </p>

      <form action="/search" className="relative mt-8">
        <SearchIcon
          className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-3"
          aria-hidden
        />
        <label htmlFor="search-input" className="sr-only">
          Search NGN
        </label>
        <input
          id="search-input"
          name="q"
          defaultValue={query}
          placeholder="What is NATO?"
          className="h-13 w-full rounded-xl border border-hairline bg-surface py-3.5 pl-11 pr-4 text-[1rem] text-ink transition-colors placeholder:text-ink-3 hover:border-hairline-strong focus:border-accent focus:outline-none"
        />
      </form>

      {!query && (
        <div className="mt-8">
          <p className="eyebrow text-ink-3">Start with</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {SEARCH_SUGGESTIONS.map((suggestion) => (
              <Link
                key={suggestion}
                href={`/search?q=${encodeURIComponent(suggestion)}`}
                className="rounded-full border border-hairline px-3.5 py-2 text-[0.875rem] text-ink-2 transition-colors hover:border-hairline-strong hover:bg-surface-2 hover:text-ink"
              >
                {suggestion}
              </Link>
            ))}
          </div>
        </div>
      )}

      {query && results.length === 0 && (
        <div className="mt-10 rounded-[var(--radius-card)] border border-dashed border-hairline-strong p-12 text-center">
          <p className="text-[1rem] font-medium text-ink">
            Nothing matched &ldquo;{query}&rdquo;
          </p>
          <p className="mx-auto mt-2.5 max-w-sm text-[0.875rem] leading-6 text-ink-3">
            Try a single word rather than a full question, or start from an
            issue guide — those cover background topics even when no story
            mentions them.
          </p>
          <Link
            href="/issues"
            className="mt-6 inline-flex h-10 items-center rounded-full border border-hairline-strong px-4 text-[0.8125rem] font-medium text-ink transition-colors hover:bg-surface-2"
          >
            Browse issue guides
          </Link>
        </div>
      )}

      {query && results.length > 0 && (
        <div className="mt-10">
          <p className="text-[0.8125rem] text-ink-3">
            {results.length} {results.length === 1 ? "result" : "results"} for
            &ldquo;{query}&rdquo;
          </p>

          <div className="mt-6 space-y-10">
            {(Object.keys(grouped) as SearchResultKind[])
              .filter((kind) => grouped[kind].length > 0)
              .map((kind) => (
                <section key={kind}>
                  <h2 className="eyebrow border-t border-hairline pt-4 text-ink-3">
                    {KIND_LABEL[kind]}
                  </h2>
                  <ul className="mt-4 divide-y divide-hairline">
                    {grouped[kind].map((result) => (
                      <li key={result.href} className="group relative py-5">
                        <div className="flex items-start justify-between gap-6">
                          <div className="min-w-0">
                            <h3 className="text-[1.0625rem] font-semibold leading-snug tracking-[-0.015em] text-ink transition-colors group-hover:text-accent">
                              <Link
                                href={result.href}
                                className="after:absolute after:inset-0"
                              >
                                {result.title}
                              </Link>
                            </h3>
                            <p className="mt-2 text-[0.875rem] leading-[1.6] text-ink-2">
                              {result.description}
                            </p>
                          </div>
                          <Badge variant="outline" className="mt-1 shrink-0">
                            {result.meta}
                          </Badge>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
          </div>
        </div>
      )}
    </Container>
  );
}
