"use client";

import Link from "next/link";
import { useState } from "react";
import { search, SEARCH_SUGGESTIONS, type SearchGroup } from "@/lib/search";
import { EmptyState, Eyebrow, Pill } from "@/components/ui/primitives";

const GROUP_ORDER: SearchGroup[] = ["Debates", "Articles", "Issues", "Parties"];

export function SearchView() {
  const [query, setQuery] = useState("");
  const results = query.trim().length > 1 ? search(query) : [];

  const grouped = GROUP_ORDER.map((group) => ({
    group,
    items: results.filter((r) => r.group === group),
  })).filter((section) => section.items.length > 0);

  return (
    <div>
      <label className="block">
        <span className="sr-only">Search NGN</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          placeholder="Search debates, articles, issues and parties"
          className="h-14 w-full rounded-sm border border-rule-strong bg-paper-raised px-4 font-serif text-lg placeholder:font-sans placeholder:text-base placeholder:text-ink-faint focus:border-ink focus:outline-none"
        />
      </label>

      {query.trim().length <= 1 && (
        <div className="mt-6">
          <Eyebrow>Try</Eyebrow>
          <ul className="mt-3 flex flex-wrap gap-2">
            {SEARCH_SUGGESTIONS.map((suggestion) => (
              <li key={suggestion}>
                <button
                  type="button"
                  onClick={() => setQuery(suggestion)}
                  className="rounded-full border border-rule-strong bg-paper-raised px-3 py-1.5 text-sm text-ink-soft transition-colors hover:border-ink hover:text-ink"
                >
                  {suggestion}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p aria-live="polite" className="sr-only">
        {results.length} results for {query}
      </p>

      {query.trim().length > 1 && results.length === 0 && (
        <div className="mt-8">
          <EmptyState
            title="Nothing matched that."
            body="Try a broader term — a topic, a party, or a phrase from a debate question."
          />
        </div>
      )}

      {grouped.length > 0 && (
        <div className="mt-10 space-y-10">
          {grouped.map((section) => (
            <section key={section.group}>
              <div className="section-rule mb-4 flex items-baseline gap-3">
                <h2 className="text-lg">{section.group}</h2>
                <span className="tnum text-sm text-ink-faint">
                  {section.items.length}
                </span>
              </div>
              <ul className="divide-y divide-rule border-y border-rule">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="group block py-4">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <h3 className="text-base font-medium group-hover:underline underline-offset-4">
                          {item.title}
                        </h3>
                        <Pill>{item.meta}</Pill>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-mute">
                        {item.description}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
