import {
  BookMarked,
  CircleCheck,
  CircleDashed,
  FileText,
  Landmark,
  Newspaper,
  ChartNoAxesColumn,
} from "lucide-react";
import type { KeyTerm, Source, SourceKind } from "@/types/ngn";

export function WhatWeKnow({
  facts,
  uncertainties,
}: {
  facts: string[];
  uncertainties: string[];
}) {
  return (
    <section aria-labelledby="what-we-know" className="rule-top pt-4">
      <h2 id="what-we-know" className="sr-only">
        What we know and what is still unclear
      </h2>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[var(--radius-card)] border border-hairline bg-surface p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <CircleCheck className="size-4 text-accent" aria-hidden />
            <h3 className="eyebrow text-accent">What we know</h3>
          </div>
          <ul className="mt-4 space-y-3">
            {facts.map((fact) => (
              <li
                key={fact}
                className="flex gap-2.5 text-[0.9375rem] leading-[1.6] text-ink-2"
              >
                <span
                  aria-hidden
                  className="mt-2 size-1 shrink-0 rounded-full bg-accent"
                />
                {fact}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[var(--radius-card)] border border-hairline bg-surface p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <CircleDashed className="size-4 text-ink-3" aria-hidden />
            <h3 className="eyebrow text-ink-3">What&rsquo;s still unclear</h3>
          </div>
          <ul className="mt-4 space-y-3">
            {uncertainties.map((item) => (
              <li
                key={item}
                className="flex gap-2.5 text-[0.9375rem] leading-[1.6] text-ink-2"
              >
                <span
                  aria-hidden
                  className="mt-2 size-1 shrink-0 rounded-full bg-ink-3"
                />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function KeyTerms({ terms }: { terms: KeyTerm[] }) {
  if (terms.length === 0) return null;

  return (
    <section aria-labelledby="key-terms" className="rule-top pt-4">
      <div className="flex items-center gap-2">
        <BookMarked className="size-4 text-ink-3" aria-hidden />
        <h2 id="key-terms" className="eyebrow text-ink-3">
          Key terms
        </h2>
      </div>

      <dl className="mt-5 grid gap-px overflow-hidden rounded-[var(--radius-card)] border border-hairline bg-hairline sm:grid-cols-2">
        {terms.map((term) => (
          <div key={term.term} className="bg-surface p-5">
            <dt className="text-[0.9375rem] font-semibold text-ink">
              {term.term}
            </dt>
            <dd className="mt-1.5 text-[0.875rem] leading-[1.6] text-ink-2">
              {term.definition}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const SOURCE_ICON: Record<SourceKind, typeof FileText> = {
  primary: Landmark,
  reporting: Newspaper,
  analysis: FileText,
  data: ChartNoAxesColumn,
};

const SOURCE_LABEL: Record<SourceKind, string> = {
  primary: "Primary document",
  reporting: "Reporting",
  analysis: "Analysis",
  data: "Data",
};

export function SourceList({ sources }: { sources: Source[] }) {
  if (sources.length === 0) return null;
  const anyPlaceholder = sources.some((source) => source.isPlaceholder);

  return (
    <section aria-labelledby="sources" className="rule-top pt-4">
      <h2 id="sources" className="eyebrow text-ink-3">
        Sources
      </h2>
      <p className="mt-2.5 max-w-2xl text-[0.8125rem] leading-5 text-ink-3">
        NGN prioritises primary documents — bill text, court opinions, agency
        rules and official data — over descriptions of them.
      </p>

      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {sources.map((source) => {
          const Icon = SOURCE_ICON[source.kind];
          return (
            <li
              key={source.id}
              className="flex gap-3.5 rounded-[var(--radius-card)] border border-hairline bg-surface p-4"
            >
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-ink-3">
                <Icon className="size-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[0.75rem] font-medium text-ink-3">
                  {source.publisher}
                </p>
                <p className="mt-1 text-[0.875rem] font-medium leading-snug text-ink">
                  {source.title}
                </p>
                <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.6875rem] text-ink-3">
                  <span>{SOURCE_LABEL[source.kind]}</span>
                  <span aria-hidden>&middot;</span>
                  <span>{source.date}</span>
                  {source.isPlaceholder && (
                    <>
                      <span aria-hidden>&middot;</span>
                      <span className="font-mono uppercase tracking-[0.1em]">
                        Link pending
                      </span>
                    </>
                  )}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      {anyPlaceholder && (
        <p className="mt-4 text-[0.75rem] leading-5 text-ink-3">
          Source cards marked <span className="font-medium">Link pending</span>{" "}
          are illustrative placeholders in this demo build. In production each
          card links directly to the document named.
        </p>
      )}
    </section>
  );
}
