import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessagesSquare } from "lucide-react";
import {
  getArticleBySlug,
  getDiscussionBySlug,
  getDiscussions,
  getIssueBySlug,
} from "@/lib/content/repository";
import { getViewer } from "@/lib/auth";
import { Container } from "@/components/layout/container";
import { Composer } from "@/components/discussion/composer";
import { ResponseBlock } from "@/components/discussion/discussion-cards";
import { formatRelative } from "@/lib/utils";

export async function generateStaticParams() {
  const discussions = await getDiscussions();
  return discussions.map((discussion) => ({ slug: discussion.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/discuss/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const discussion = await getDiscussionBySlug(slug);
  if (!discussion) return { title: "Discussion not found" };

  return { title: discussion.question, description: discussion.context };
}

export default async function DiscussionPage({
  params,
}: PageProps<"/discuss/[slug]">) {
  const { slug } = await params;
  const discussion = await getDiscussionBySlug(slug);
  if (!discussion) notFound();

  const viewer = await getViewer();
  const signInHref = `/login?redirectTo=${encodeURIComponent(`/discuss/${discussion.slug}`)}`;

  const [articles, issues] = await Promise.all([
    Promise.all(
      discussion.relatedArticleSlugs.map((articleSlug) =>
        getArticleBySlug(articleSlug),
      ),
    ),
    Promise.all(
      discussion.relatedIssueSlugs.map((issueSlug) => getIssueBySlug(issueSlug)),
    ),
  ]);

  return (
    <Container className="max-w-[880px] py-10 sm:py-14">
      <Link
        href="/discuss"
        className="inline-flex items-center gap-1.5 text-[0.8125rem] text-ink-3 transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-3.5" />
        All discussions
      </Link>

      <header className="mt-7">
        <p className="eyebrow text-accent">Student voices</p>
        <h1 className="mt-4 text-[2rem] font-semibold leading-[1.1] tracking-[-0.03em] text-ink sm:text-[2.5rem]">
          {discussion.question}
        </h1>
        <p className="mt-5 max-w-2xl text-[1rem] leading-[1.65] text-ink-2">
          {discussion.context}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2 text-[0.8125rem] text-ink-3">
          <MessagesSquare className="size-3.5" aria-hidden />
          {discussion.responseCount} responses
          <span aria-hidden className="text-ink-3/50">
            &middot;
          </span>
          opened {formatRelative(discussion.openedAt)}
        </div>
      </header>

      {(articles.some(Boolean) || issues.some(Boolean)) && (
        <div className="mt-8 rounded-[var(--radius-card)] border border-hairline bg-surface p-5">
          <p className="eyebrow text-ink-3">Read first</p>
          <ul className="mt-3.5 space-y-2.5">
            {articles.filter(Boolean).map((article) => (
              <li key={article!.slug}>
                <Link
                  href={`/story/${article!.slug}`}
                  className="text-[0.875rem] font-medium text-ink transition-colors hover:text-accent"
                >
                  {article!.headline}
                </Link>
              </li>
            ))}
            {issues.filter(Boolean).map((issue) => (
              <li key={issue!.slug}>
                <Link
                  href={`/issues/${issue!.slug}`}
                  className="text-[0.875rem] font-medium text-ink transition-colors hover:text-accent"
                >
                  Understand {issue!.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-10">
        <Composer
          signedIn={Boolean(viewer)}
          signInHref={signInHref}
          viewer={
            viewer
              ? {
                  displayName: viewer.displayName,
                  initials: viewer.initials,
                  hue: viewer.hue,
                }
              : null
          }
        />
      </div>

      <section aria-label="Responses" className="mt-12">
        <div className="rule-top pt-4">
          <p className="eyebrow text-ink-3">
            {discussion.responses.length} responses
          </p>
        </div>
        <div className="mt-6 space-y-8 divide-y divide-hairline [&>*+*]:pt-8">
          {discussion.responses.map((response) => (
            <ResponseBlock
              key={response.id}
              response={response}
              signedIn={Boolean(viewer)}
              signInHref={signInHref}
              viewer={
                viewer
                  ? {
                      displayName: viewer.displayName,
                      initials: viewer.initials,
                      hue: viewer.hue,
                    }
                  : null
              }
            />
          ))}
        </div>
      </section>
    </Container>
  );
}
