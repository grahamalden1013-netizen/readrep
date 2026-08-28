import type { Metadata } from "next";
import Link from "next/link";
import {
  Container,
  PageHeader,
  SectionHead,
  Eyebrow,
} from "@/components/ui/primitives";
import { ArticleCard, DebateThisIssue } from "@/components/news/ArticleCard";
import { BRIEF_ARTICLES, WEEKLY_ARTICLES } from "@/data/demo/articles";
import { getDebate } from "@/data/demo/debates";

export const metadata: Metadata = {
  title: "Today",
  description:
    "What happened, why it matters, and what happens next — then go argue about it.",
};

/**
 * News is the fuel for the Arena, so every story that has a debate behind it
 * ends in an entry point to that debate.
 */
export default function TodayPage() {
  const [lead, ...rest] = BRIEF_ARTICLES;
  const leadDebate = lead.relatedDebateSlug ? getDebate(lead.relatedDebateSlug) : null;

  return (
    <>
      <PageHeader
        eyebrow="Today's Brief"
        title="Today"
        lede="Every story answers the same six questions: what happened, why it matters, what happens next, what each side argues, what we know, and what is still unclear."
      />

      {/* --- Lead story --------------------------------------------------- */}
      <Container className="py-10 sm:py-14">
        <article className="grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:gap-14">
          <div className="min-w-0">
            <Eyebrow tone="accent">{lead.category}</Eyebrow>
            <h2 className="mt-3 text-3xl leading-[1.1] sm:text-4xl lg:text-[2.75rem]">
              <Link href={`/today/${lead.slug}`} className="hover:underline decoration-1 underline-offset-[6px]">
                {lead.headline}
              </Link>
            </h2>
            <p className="mt-4 max-w-prose text-lg leading-relaxed text-ink-soft">
              {lead.subheadline}
            </p>
            <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-faint">
              <span>{lead.author}</span>
              <span aria-hidden>·</span>
              <span>{lead.publishedAt}</span>
              <span aria-hidden>·</span>
              <span>{lead.readMinutes} min read</span>
              <span aria-hidden>·</span>
              <span>{lead.provenance}</span>
            </p>
          </div>

          <aside className="lg:border-l lg:border-rule lg:pl-10">
            <h3 className="eyebrow text-ink-mute">Quick brief</h3>
            <dl className="mt-4 space-y-4">
              {[
                { term: "What happened", def: lead.quickBrief.whatHappened },
                { term: "Why it matters", def: lead.quickBrief.whyItMatters },
                { term: "What happens next", def: lead.quickBrief.whatHappensNext },
              ].map((item) => (
                <div key={item.term}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink">
                    {item.term}
                  </dt>
                  <dd className="mt-1 text-sm leading-relaxed text-ink-soft">
                    {item.def}
                  </dd>
                </div>
              ))}
            </dl>
            {leadDebate && (
              <div className="relative mt-6">
                <DebateThisIssue debateSlug={leadDebate.slug} />
              </div>
            )}
          </aside>
        </article>
      </Container>

      {/* --- More stories -------------------------------------------------- */}
      <section className="border-t border-rule">
        <Container className="py-12">
          <SectionHead title="More from today" />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((article) => (
              <li key={article.id} className="relative">
                <ArticleCard article={article} />
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* --- Weekly -------------------------------------------------------- */}
      <section className="border-t border-rule bg-paper-sunken/50">
        <Container className="py-12">
          <SectionHead
            title="NGN Weekly"
            description="Signed analysis. Opinion, clearly labelled and kept separate from NGN's neutral news coverage."
            action={
              <Link href="/weekly" className="font-medium text-accent hover:underline">
                Archive →
              </Link>
            }
          />
          <ul className="grid gap-4 sm:grid-cols-2">
            {WEEKLY_ARTICLES.map((article) => (
              <li key={article.id} className="relative">
                <ArticleCard article={article} size="lg" />
              </li>
            ))}
          </ul>
        </Container>
      </section>
    </>
  );
}
