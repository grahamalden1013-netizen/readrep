import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Info } from "lucide-react";
import {
  getArticlesForIssue,
  getIssueBySlug,
  getIssues,
} from "@/lib/content/repository";
import { Container } from "@/components/layout/container";
import { CoverPlate } from "@/components/news/cover-art";
import { StoryRow } from "@/components/news/story-card";
import { SourceList, KeyTerms } from "@/components/article/facts-and-sources";
import {
  IssueSection,
  IssueToc,
  PointList,
} from "@/components/issues/issue-sections";

const SECTIONS = [
  { id: "basics", label: "The basics" },
  { id: "why-debated", label: "Why this is debated" },
  { id: "democratic-views", label: "Common Democratic views" },
  { id: "republican-views", label: "Common Republican views" },
  { id: "democratic-splits", label: "Where Democrats disagree" },
  { id: "republican-splits", label: "Where Republicans disagree" },
  { id: "other-perspectives", label: "Other perspectives" },
  { id: "key-terms", label: "Key terms" },
  { id: "latest", label: "Latest NGN stories" },
  { id: "sources", label: "Primary sources" },
];

export async function generateStaticParams() {
  const issues = await getIssues();
  return issues.map((issue) => ({ slug: issue.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/issues/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const issue = await getIssueBySlug(slug);
  if (!issue) return { title: "Issue not found" };

  return {
    title: `Understand ${issue.name}`,
    description: issue.shortDescription,
  };
}

export default async function IssuePage({ params }: PageProps<"/issues/[slug]">) {
  const { slug } = await params;
  const issue = await getIssueBySlug(slug);
  if (!issue) notFound();

  const stories = await getArticlesForIssue(issue.slug, 4);

  return (
    <Container wide className="py-10 sm:py-14">
      <Link
        href="/issues"
        className="inline-flex items-center gap-1.5 text-[0.8125rem] text-ink-3 transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-3.5" />
        All issues
      </Link>

      <header className="mt-7 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div>
          <p className="eyebrow text-accent">Issue guide</p>
          <h1 className="mt-4 text-[2.25rem] font-semibold leading-[1.05] tracking-[-0.035em] text-ink sm:text-[3rem]">
            Understand {issue.name}
          </h1>
          <p className="mt-4 max-w-xl text-[1.0625rem] leading-[1.6] text-ink-2">
            {issue.shortDescription}
          </p>
        </div>
        <div className="rounded-[calc(var(--radius-card)+4px)] border border-hairline bg-surface p-2.5 shadow-card">
          <CoverPlate cover={issue.cover} label={issue.name} ratio="aspect-[16/8]" />
        </div>
      </header>

      <div className="mt-14 grid gap-12 lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-16">
        <div className="max-w-[46rem] space-y-14">
          <IssueSection id="basics" eyebrow="The basics">
            <PointList points={issue.basics} tone="accent" />
          </IssueSection>

          <IssueSection id="why-debated" eyebrow="Why this is debated">
            <PointList points={issue.whyDebated} />
          </IssueSection>

          <IssueSection id="democratic-views" eyebrow="Common Democratic views">
            <PointList points={issue.democraticViews} />
          </IssueSection>

          <IssueSection id="republican-views" eyebrow="Common Republican views">
            <PointList points={issue.republicanViews} />
          </IssueSection>

          <IssueSection
            id="democratic-splits"
            eyebrow="Where Democrats disagree"
            title="The party is not one position"
          >
            <PointList points={issue.democraticDisagreements} />
          </IssueSection>

          <IssueSection
            id="republican-splits"
            eyebrow="Where Republicans disagree"
            title="The party is not one position"
          >
            <PointList points={issue.republicanDisagreements} />
          </IssueSection>

          <IssueSection id="other-perspectives" eyebrow="Other perspectives">
            <div className="grid gap-4 sm:grid-cols-2">
              {issue.otherPerspectives.map((perspective) => (
                <div
                  key={perspective.label}
                  className="rounded-[var(--radius-card)] border border-hairline bg-surface p-5"
                >
                  <p className="text-[0.9375rem] font-semibold text-ink">
                    {perspective.label}
                  </p>
                  <p className="mt-2 text-[0.875rem] leading-[1.6] text-ink-2">
                    {perspective.summary}
                  </p>
                  <ul className="mt-3.5 space-y-2.5">
                    {perspective.points.map((point) => (
                      <li
                        key={point}
                        className="flex gap-2.5 text-[0.8125rem] leading-[1.6] text-ink-2"
                      >
                        <span
                          aria-hidden
                          className="mt-2 size-1 shrink-0 rounded-full bg-ink-3"
                        />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <p className="mt-5 flex gap-2.5 rounded-xl bg-surface-2 px-4 py-3 text-[0.8125rem] leading-5 text-ink-2">
              <Info className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden />
              These summaries describe common positions. Political parties
              contain a wide range of views.
            </p>
          </IssueSection>

          <div id="key-terms" className="scroll-mt-24">
            <KeyTerms terms={issue.keyTerms} />
          </div>

          <section id="latest" className="scroll-mt-24 rule-top pt-4">
            <h2 className="eyebrow text-accent">Latest NGN stories</h2>
            {stories.length > 0 ? (
              <div className="mt-2 divide-y divide-hairline">
                {stories.map((story) => (
                  <StoryRow key={story.id} story={story} />
                ))}
              </div>
            ) : (
              <p className="mt-5 rounded-[var(--radius-card)] border border-dashed border-hairline-strong p-8 text-center text-[0.875rem] text-ink-3">
                No story filed on this issue yet. This guide stays accurate
                whether or not there is news this week.
              </p>
            )}
          </section>

          <div id="sources" className="scroll-mt-24">
            <SourceList sources={issue.sources} />
          </div>
        </div>

        <aside className="hidden lg:block">
          <IssueToc sections={SECTIONS} />
        </aside>
      </div>
    </Container>
  );
}
