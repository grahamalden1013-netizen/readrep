import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/ui/primitives";
import { ArticleCard } from "@/components/news/ArticleCard";
import { WEEKLY_ARTICLES } from "@/data/demo/articles";

export const metadata: Metadata = {
  title: "NGN Weekly",
  description: "Signed analysis from the editor. Opinion, clearly labelled.",
};

export default function WeeklyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Editor's Article"
        title="NGN Weekly"
        lede="Signed analysis that argues a position. Kept clearly separate from NGN's neutral news coverage, and labelled on every page."
      />
      <Container className="py-10 sm:py-14">
        <ul className="grid gap-4 sm:grid-cols-2">
          {WEEKLY_ARTICLES.map((article) => (
            <li key={article.id} className="relative">
              <ArticleCard article={article} size="lg" />
            </li>
          ))}
        </ul>
      </Container>
    </>
  );
}
