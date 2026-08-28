import type { Metadata } from "next";
import Link from "next/link";
import { Card, Container, Eyebrow, PageHeader, Pill } from "@/components/ui/primitives";
import { ISSUES } from "@/data/demo/issues";

export const metadata: Metadata = {
  title: "Issues",
  description: "The background you need on the questions people actually argue about.",
};

export default function IssuesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Explore"
        title="Issue Library"
        lede="The basics, why people disagree, how each party sees it — and where each party disagrees with itself."
      />

      <Container className="py-10 sm:py-14">
        <ul className="grid gap-4 sm:grid-cols-2">
          {ISSUES.map((issue) => (
            <li key={issue.id} className="relative">
              <Card interactive as="article" className="flex h-full flex-col p-5 sm:p-6">
                <Eyebrow>{issue.category}</Eyebrow>
                <h2 className="mt-3 text-xl leading-snug sm:text-2xl">
                  <Link href={`/issues/${issue.slug}`} className="after:absolute after:inset-0">
                    {issue.title}
                  </Link>
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-mute">
                  {issue.summary}
                </p>
                <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-5">
                  <Pill>{issue.keyTerms.length} key terms</Pill>
                  {issue.relatedDebateSlugs.length > 0 && (
                    <Pill tone="accent">
                      {issue.relatedDebateSlugs.length} linked{" "}
                      {issue.relatedDebateSlugs.length === 1 ? "debate" : "debates"}
                    </Pill>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </Container>
    </>
  );
}
