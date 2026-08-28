import type { Metadata } from "next";
import Link from "next/link";
import { Card, Container, PageHeader, Pill } from "@/components/ui/primitives";
import { DISCUSSIONS } from "@/data/demo/discussions";

export const metadata: Metadata = {
  title: "Discuss",
  description: "The slow room. No scores, no contest — just thinking out loud.",
};

export default function DiscussPage() {
  return (
    <>
      <PageHeader
        eyebrow="Community"
        title="Discuss"
        lede="Slower than the Arena, and deliberately unscored. One reaction — Made me think — and no downvotes, ratios or follower counts."
      />

      <Container className="py-10 sm:py-14">
        <ul className="space-y-4">
          {DISCUSSIONS.map((discussion) => (
            <li key={discussion.id} className="relative">
              <Card interactive as="article" className="p-5 sm:p-6">
                <h2 className="text-xl leading-snug sm:text-2xl">
                  <Link href={`/discuss/${discussion.slug}`} className="after:absolute after:inset-0">
                    {discussion.question}
                  </Link>
                </h2>
                <p className="mt-2.5 max-w-prose text-sm leading-relaxed text-ink-mute">
                  {discussion.context}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-1.5">
                  <Pill>
                    {discussion.responses.length}{" "}
                    {discussion.responses.length === 1 ? "response" : "responses"}
                  </Pill>
                  {discussion.relatedDebateSlug && <Pill tone="accent">Linked debate</Pill>}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </Container>
    </>
  );
}
