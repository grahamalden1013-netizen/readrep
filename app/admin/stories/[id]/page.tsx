import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import {
  getAllArticlesForAdmin,
  getArticleById,
} from "@/lib/content/repository";
import { getAuthor } from "@/lib/content/authors";
import { articleToEditable } from "@/lib/admin/editable";
import { categoryLabel } from "@/lib/content/categories";
import { Container } from "@/components/layout/container";
import { StoryEditor } from "@/components/admin/story-editor";
import { formatDate, formatRelative } from "@/lib/utils";

export async function generateStaticParams() {
  const articles = await getAllArticlesForAdmin();
  return articles.map((article) => ({ id: article.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/admin/stories/[id]">): Promise<Metadata> {
  const { id } = await params;
  const article = await getArticleById(id);
  return { title: article ? `Edit — ${article.headline}` : "Story not found" };
}

export default async function EditStoryPage({
  params,
}: PageProps<"/admin/stories/[id]">) {
  const { id } = await params;
  const article = await getArticleById(id);
  if (!article) notFound();

  const author = getAuthor(article.authorId);

  return (
    <Container wide className="py-10">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-[0.8125rem] text-ink-3 transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-3.5" />
        Newsroom
      </Link>

      <div className="mt-7 flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-3xl">
          <p className="eyebrow text-accent">Story editor</p>
          <h1 className="mt-3 text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] text-ink">
            {article.headline}
          </h1>
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem] text-ink-3">
            <span>{categoryLabel(article.category)}</span>
            <span aria-hidden>&middot;</span>
            <span>{author.name}</span>
            <span aria-hidden>&middot;</span>
            <span>Updated {formatRelative(article.updatedAt)}</span>
            {article.publishedAt && (
              <>
                <span aria-hidden>&middot;</span>
                <span>
                  {article.status === "scheduled" ? "Publishes" : "Published"}{" "}
                  {formatDate(article.publishedAt)}
                </span>
              </>
            )}
          </p>
        </div>

        {article.status === "published" && (
          <Link
            href={`/story/${article.slug}`}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-hairline px-3.5 text-[0.8125rem] font-medium text-ink-2 transition-colors hover:border-hairline-strong hover:text-ink"
          >
            View live
            <ExternalLink className="size-3.5" />
          </Link>
        )}
      </div>

      <div className="mt-10">
        <StoryEditor
          initial={articleToEditable(article)}
          status={article.status}
        />
      </div>
    </Container>
  );
}
