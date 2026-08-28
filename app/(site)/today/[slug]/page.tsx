import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ButtonLink,
  Container,
  Eyebrow,
  Pill,
} from "@/components/ui/primitives";
import { SourceList } from "@/components/debate/BriefSections";
import { IDontGetIt } from "@/components/explain/IDontGetIt";
import { ARTICLES, getArticle } from "@/data/demo/articles";
import { getDebate } from "@/data/demo/debates";

export function generateStaticParams() {
  return ARTICLES.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return { title: "Article not found" };
  return { title: article.headline, description: article.explainer };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  const relatedDebate = article.relatedDebateSlug
    ? getDebate(article.relatedDebateSlug)
    : null;

  const explainerContext = [
    article.explainer,
    article.quickBrief.whatHappened,
    article.quickBrief.whyItMatters,
    ...article.whatWeKnow,
  ].join(" ");

  const isWeekly = article.kind === "weekly";

  return (
    <article>
      {/* --- Masthead ---------------------------------------------------- */}
      <header className="border-b border-rule">
        <Container width="reading" className="py-8 sm:py-12">
          <nav aria-label="Breadcrumb" className="mb-5">
            <Link
              href={isWeekly ? "/weekly" : "/today"}
              className="text-sm text-ink-mute underline-offset-4 hover:text-ink hover:underline"
            >
              ← {isWeekly ? "NGN Weekly" : "Today"}
            </Link>
          </nav>

          <Eyebrow tone={isWeekly ? "accent" : "mute"}>
            {isWeekly ? "NGN Weekly · Editor's Article" : article.category}
          </Eyebrow>

          {/*
            Headline sizes are deliberately restrained on small screens: an
            oversized headline pushed the quick brief below the fold, which is
            the part a student actually needs first.
          */}
          <h1 className="mt-3 text-[1.75rem] leading-[1.14] sm:text-4xl lg:text-[2.75rem] lg:leading-[1.08]">
            {article.headline}
          </h1>

          <p className="mt-4 text-base leading-relaxed text-ink-soft sm:text-lg">
            {article.subheadline}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-rule pt-5 text-xs text-ink-faint">
            <span className="font-medium text-ink-soft">{article.author}</span>
            <span aria-hidden>·</span>
            <span>{article.publishedAt}</span>
            <span aria-hidden>·</span>
            <span>{article.readMinutes} min read</span>
            <Pill tone={isWeekly ? "warn" : "neutral"} className="ml-auto">
              {article.provenance}
            </Pill>
          </div>

          {isWeekly && (
            <p className="mt-4 rounded-sm border border-warn/30 bg-undecided-soft px-4 py-3 text-xs leading-relaxed text-ink-soft">
              This is an opinion column, not neutral news. It argues a position.
              NGN&apos;s news coverage is written to be neutral and is labelled
              separately.
            </p>
          )}
        </Container>
      </header>

      <Container width="reading" className="py-10 sm:py-12">
        {/* --- Quick brief ------------------------------------------------ */}
        <section className="rounded-sm border border-rule bg-paper-raised p-5 sm:p-6">
          <h2 className="eyebrow text-ink-mute">Quick brief</h2>
          <dl className="mt-4 space-y-4">
            {[
              { term: "What happened", def: article.quickBrief.whatHappened },
              { term: "Why it matters", def: article.quickBrief.whyItMatters },
              { term: "What happens next", def: article.quickBrief.whatHappensNext },
            ].map((item) => (
              <div key={item.term}>
                <dt className="text-xs font-semibold uppercase tracking-wide">
                  {item.term}
                </dt>
                <dd className="mt-1 text-sm leading-relaxed text-ink-soft">
                  {item.def}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="mt-6">
          <IDontGetIt topic={article.headline} context={explainerContext} />
        </div>

        {/* --- Body -------------------------------------------------------- */}
        <div className="prose-ngn mt-10">
          {article.body.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>

        {/* --- Understand the sides ---------------------------------------- */}
        <section className="mt-12 border-t border-rule pt-8">
          <h2 className="text-xl sm:text-2xl">Understand the sides</h2>
          <div className="mt-5 grid gap-6 sm:grid-cols-2">
            {article.understandTheSides.map((side, index) => (
              <div
                key={side.label}
                className="border-t-2 pt-3"
                style={{
                  borderColor:
                    index === 0 ? "var(--color-support)" : "var(--color-oppose)",
                }}
              >
                <h3
                  className="text-sm font-semibold"
                  style={{
                    color:
                      index === 0 ? "var(--color-support)" : "var(--color-oppose)",
                  }}
                >
                  {side.label}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {side.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* --- Known / uncertain -------------------------------------------- */}
        <section className="mt-10 grid gap-8 border-t border-rule pt-8 sm:grid-cols-2">
          <div>
            <h2 className="eyebrow text-ink-mute">What we know</h2>
            <ul className="mt-4 space-y-2.5">
              {article.whatWeKnow.map((item, index) => (
                <li key={index} className="flex gap-2.5">
                  <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-lime-deep" />
                  <span className="text-sm leading-relaxed text-ink-soft">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="eyebrow text-ink-mute">What is still uncertain</h2>
            <ul className="mt-4 space-y-2.5">
              {article.whatIsUncertain.map((item, index) => (
                <li key={index} className="flex gap-2.5">
                  <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-ink-faint" />
                  <span className="text-sm leading-relaxed text-ink-soft">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* --- Sources ------------------------------------------------------ */}
        <section className="mt-10 border-t border-rule pt-8">
          <h2 className="text-xl">Sources</h2>
          <div className="mt-5">
            <SourceList sources={article.sources} />
          </div>
        </section>

        {/* --- Debate CTA ---------------------------------------------------- */}
        {relatedDebate && (
          <section className="mt-12 rounded-sm border border-rule-strong bg-ink p-6 text-ink-inverse sm:p-8">
            <span className="eyebrow text-lime">Understand the story?</span>
            <h2 className="mt-3 text-2xl leading-tight text-ink-inverse sm:text-3xl">
              {relatedDebate.title}
            </h2>
            <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-inverse/70">
              {relatedDebate.description}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href={`/arena/${relatedDebate.slug}/position`} tone="accent" size="lg">
                Enter Debate
              </ButtonLink>
              <ButtonLink
                href={`/arena/${relatedDebate.slug}/brief`}
                tone="ghost"
                size="lg"
                className="border-rule-inverse text-ink-inverse hover:bg-white/5"
              >
                Read the briefing
              </ButtonLink>
            </div>
          </section>
        )}
      </Container>
    </article>
  );
}
