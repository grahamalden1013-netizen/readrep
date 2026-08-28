"use client";

import { useState } from "react";
import type { KeyTerm, Source } from "@/types/ngn";

/** Expandable glossary — collapsed by default so the briefing stays scannable. */
export function KeyTermsList({ terms }: { terms: KeyTerm[] }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <dl className="divide-y divide-rule border-y border-rule">
      {terms.map((term) => {
        const isOpen = open === term.term;
        return (
          <div key={term.term}>
            <dt>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : term.term)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 py-3.5 text-left"
              >
                <span className="text-sm font-medium">{term.term}</span>
                <span
                  aria-hidden
                  className={`shrink-0 text-ink-faint transition-transform duration-200 ${isOpen ? "rotate-45" : ""}`}
                >
                  +
                </span>
              </button>
            </dt>
            {isOpen && (
              <dd className="pb-4 pr-8 text-sm leading-relaxed text-ink-soft">
                {term.definition}
              </dd>
            )}
          </div>
        );
      })}
    </dl>
  );
}

/** Source list. Type is displayed on every entry — the hierarchy is the lesson. */
export function SourceList({ sources }: { sources: Source[] }) {
  return (
    <ol className="space-y-3">
      {sources.map((source) => (
        <li key={source.id} className="border-l-2 border-rule pl-4">
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block"
          >
            <p className="text-sm font-medium leading-snug group-hover:underline underline-offset-4">
              {source.title}
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-mute">
              <span className="font-medium text-ink-soft">{source.publisher}</span>
              <span aria-hidden>·</span>
              <span>{source.date}</span>
              <span aria-hidden>·</span>
              <span className="rounded-sm bg-paper-sunken px-1.5 py-px text-[0.6875rem]">
                {source.sourceType}
              </span>
            </p>
          </a>
        </li>
      ))}
    </ol>
  );
}
