import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, PageHeader } from "@/components/ui/primitives";
import { KeyTermsList } from "@/components/debate/BriefSections";
import { PartyPerspectives } from "@/components/debate/ArgumentColumns";
import { IDontGetIt } from "@/components/explain/IDontGetIt";
import { DebateCard } from "@/components/arena/DebateCard";
import { ArticleCard } from "@/components/news/ArticleCard";
import { ISSUES, getIssue } from "@/data/demo/issues";
import { getDebate } from "@/data/demo/debates";
import { getArticle } from "@/data/demo/articles";

export function generateStaticParams() {
  return ISSUES.map((issue) => ({ slug: issue.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const issue = getIssue(slug);
  if (!issue) return { title: "Issue not found" };
  return { title: issue.title, description: issue.summary };
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-rule pt-8">
      <h2 className="text-xl sm:text-2xl">{title}</h2>
      {note && <p className="mt-1.5 text-sm text-ink-mute">{note}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default async function IssuePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const issue = getIssue(slug);
  if (!issue) notFound();

  const debates = issue.relatedDebateSlugs.map(getDebate).filter((d) => d !== undefined);
  const articles = issue.relatedArticleSlugs.map(getArticle).filter((a) => a !== undefined);

  const explainerContext = [issue.summary, ...issue.basics, ...issue.keyFacts].join(" ");

  return (
    <>
      <PageHeader eyebrow={issue.category} title={issue.title} lede={issue.summary} />

      <Container width="reading" className="py-10 sm:py-14">
        <nav aria-label="Breadcrumb" className="mb-8">
          <Link href="/issues" className="text-sm text-ink-mute underline-offset-4 hover:text-ink hover:underline">
            ← Issue Library
          </Link>
        </nav>

        <div className="space-y-10">
          <section>
            <h2 className="text-xl sm:text-2xl">The basics</h2>
            <ul className="mt-5 space-y-3">
              {issue.basics.map((item, index) => (
                <li key={index} className="flex gap-3">
                  <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-lime-deep" />
                  <span className="text-[0.9375rem] leading-relaxed text-ink-soft">{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <IDontGetIt topic={issue.title} context={explainerContext} />
            </div>
          </section>

          <Section title="Why people debate it">
            <p className="prose-ngn !mt-0">{issue.whyPeopleDebate}</p>
          </Section>

          <Section
            title="How the parties see it"
            note="Common positions, not universal ones — and never a ranking of which party is right."
          >
            <div className="grid gap-8 md:grid-cols-2 md:gap-10">
              <div>
                <h3 className="eyebrow text-ink-mute">Common Democratic views</h3>
                <ul className="mt-3 space-y-3">
                  {issue.democraticViews.map((view, index) => (
                    <li key={index} className="text-[0.9375rem] leading-relaxed text-ink-soft">
                      {view}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="eyebrow text-ink-mute">Common Republican views</h3>
                <ul className="mt-3 space-y-3">
                  {issue.republicanViews.map((view, index) => (
                    <li key={index} className="text-[0.9375rem] leading-relaxed text-ink-soft">
                      {view}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-8">
              <PartyPerspectives
                democraticView=""
                republicanView=""
                democraticDisagreement={issue.democraticDisagreement}
                republicanDisagreement={issue.republicanDisagreement}
                otherPerspectives={issue.otherPerspectives}
              />
            </div>
          </Section>

          <Section title="Key facts">
            <ul className="space-y-3">
              {issue.keyFacts.map((fact, index) => (
                <li key={index} className="flex gap-3">
                  <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-lime-deep" />
                  <span className="text-[0.9375rem] leading-relaxed text-ink-soft">{fact}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Key terms" note="Tap a term to expand it.">
            <KeyTermsList terms={issue.keyTerms} />
          </Section>
        </div>
      </Container>

      {debates.length > 0 && (
        <section className="border-t border-rule bg-paper-sunken/50">
          <Container className="py-12">
            <div className="section-rule mb-6">
              <h2 className="text-xl sm:text-2xl">Debate this issue</h2>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {debates.map((debate) => (
                <li key={debate.id} className="relative">
                  <DebateCard debate={debate} />
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      {articles.length > 0 && (
        <section className="border-t border-rule">
          <Container className="py-12">
            <div className="section-rule mb-6">
              <h2 className="text-xl sm:text-2xl">Recent articles</h2>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {articles.map((article) => (
                <li key={article.id} className="relative">
                  <ArticleCard article={article} />
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      <Container className="pb-14">
        <p className="rounded-sm border border-rule bg-paper-raised px-5 py-4 text-xs leading-relaxed text-ink-mute">
          NGN never flattens a party into a single belief. Where this page says
          &ldquo;many Democratic lawmakers&rdquo; or &ldquo;most Republican
          lawmakers&rdquo;, it means exactly that — views vary significantly
          within both parties, and the internal disagreements are often where
          the real argument is.{" "}
          <Link href="/parties" className="font-medium text-accent underline-offset-4 hover:underline">
            Explore the parties →
          </Link>
        </p>
      </Container>
    </>
  );
}
