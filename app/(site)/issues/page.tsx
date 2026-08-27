import type { Metadata } from "next";
import { getArticlesForIssue, getIssues } from "@/lib/content/repository";
import { Container } from "@/components/layout/container";
import { IssueCard } from "@/components/issues/issue-card";

export const metadata: Metadata = {
  title: "Issues",
  description:
    "Neutral background guides to the political debates that keep coming back — what each side argues, and where each side disagrees with itself.",
};

export default async function IssuesPage() {
  const issues = await getIssues();
  const latest = await Promise.all(
    issues.map(async (issue) => ({
      slug: issue.slug,
      story: (await getArticlesForIssue(issue.slug, 1))[0],
    })),
  );
  const latestBySlug = new Map(latest.map((entry) => [entry.slug, entry.story]));

  return (
    <Container wide className="py-10 sm:py-14">
      <p className="eyebrow text-accent">Issues library</p>
      <h1 className="mt-4 max-w-3xl text-[2.25rem] font-semibold leading-[1.05] tracking-[-0.035em] text-ink sm:text-[2.875rem]">
        Understand the issue before the argument
      </h1>
      <p className="mt-4 max-w-2xl text-[1.0625rem] leading-[1.6] text-ink-2">
        Each guide starts with the basics, explains why the debate exists, and
        represents the range of positions — including the disagreements inside
        each party.
      </p>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {issues.map((issue) => (
          <IssueCard
            key={issue.slug}
            issue={issue}
            latestStory={latestBySlug.get(issue.slug)}
          />
        ))}
      </div>
    </Container>
  );
}
