import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bot, CircleAlert, Clock, FileText, Send } from "lucide-react";
import {
  getAllArticlesForAdmin,
  getArticlesByStatus,
  getWeeklyArticles,
} from "@/lib/content/repository";
import { aiEnabled } from "@/lib/ai";
import { newsIngestionEnabled } from "@/lib/news/pipeline";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Article, ArticleStatus } from "@/types/ngn";
import { Container } from "@/components/layout/container";
import { StatusBadge, STATUS_LABEL } from "@/components/admin/status-badge";
import { categoryLabel } from "@/lib/content/categories";
import { formatDate, formatRelative } from "@/lib/utils";

export const metadata: Metadata = { title: "Newsroom" };

const QUEUES: { status: ArticleStatus; hint: string }[] = [
  { status: "ai_generated", hint: "Generated drafts waiting for a first read" },
  { status: "needs_review", hint: "Edited drafts waiting for approval" },
  { status: "draft", hint: "Reporter notes, no draft generated yet" },
  { status: "scheduled", hint: "Approved and queued to publish" },
];

export default async function AdminDashboard() {
  const [all, weekly, ...queues] = await Promise.all([
    getAllArticlesForAdmin(),
    getWeeklyArticles(),
    ...QUEUES.map((queue) => getArticlesByStatus(queue.status)),
  ]);

  const published = all.filter((article) => article.status === "published");
  const today = published.slice(0, 5);

  return (
    <Container wide className="py-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow text-accent">Newsroom</p>
          <h1 className="mt-3 text-[2rem] font-semibold tracking-[-0.03em] text-ink">
            Today&rsquo;s desk
          </h1>
          <p className="mt-2 text-[0.9375rem] text-ink-2">
            {published.length} published &middot;{" "}
            {all.length - published.length} in the pipeline &middot;{" "}
            {weekly.length} Weekly editions
          </p>
        </div>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          Icon={Bot}
          label="AI generated"
          value={queues[0].length}
          hint="Cannot publish without human review"
        />
        <StatCard
          Icon={CircleAlert}
          label="Needs review"
          value={queues[1].length}
          hint="Waiting on an editor"
        />
        <StatCard
          Icon={FileText}
          label="Drafts"
          value={queues[2].length}
          hint="No draft generated yet"
        />
        <StatCard
          Icon={Clock}
          label="Scheduled"
          value={queues[3].length}
          hint="Approved, queued to publish"
        />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <ServiceCard
          label="Claude drafting"
          connected={aiEnabled()}
          connectedHint="Live model connected. Drafts still require human approval."
          missingHint="ANTHROPIC_API_KEY not set — GENERATE DRAFT returns mock output."
        />
        <ServiceCard
          label="News ingestion"
          connected={newsIngestionEnabled()}
          connectedHint="Daily story collection is configured."
          missingHint="NEWS_API_KEY not set — the morning job returns nothing to review."
        />
        <ServiceCard
          label="Supabase"
          connected={isSupabaseConfigured()}
          connectedHint="Articles, comments and moderation persist."
          missingHint="Not configured — edits in this build are previewed, not stored."
        />
      </section>

      <section className="mt-12">
        <div className="rule-top flex flex-wrap items-baseline justify-between gap-4 pt-4">
          <h2 className="eyebrow text-accent">Today&rsquo;s stories</h2>
          <Link
            href="/today"
            className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-ink-2 transition-colors hover:text-ink"
          >
            View live brief
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
        <ArticleTable articles={today} />
      </section>

      {QUEUES.map((queue, index) => (
        <section key={queue.status} className="mt-12">
          <div className="rule-top pt-4">
            <h2 className="eyebrow text-accent">{STATUS_LABEL[queue.status]}</h2>
            <p className="mt-2 text-[0.8125rem] text-ink-3">{queue.hint}</p>
          </div>
          {queues[index].length > 0 ? (
            <ArticleTable articles={queues[index]} />
          ) : (
            <p className="mt-5 rounded-[var(--radius-card)] border border-dashed border-hairline-strong p-8 text-center text-[0.875rem] text-ink-3">
              Nothing in this queue.
            </p>
          )}
        </section>
      ))}

      <section className="mt-12">
        <div className="rule-top flex flex-wrap items-baseline justify-between gap-4 pt-4">
          <h2 className="eyebrow text-accent">The NGN Weekly</h2>
          <Link
            href="/admin/weekly"
            className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-ink-2 transition-colors hover:text-ink"
          >
            Manage editions
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
        <ul className="mt-4 divide-y divide-hairline rounded-[var(--radius-card)] border border-hairline bg-surface">
          {weekly.slice(0, 3).map((edition) => (
            <li key={edition.id} className="flex items-center gap-4 p-4">
              <span className="font-mono text-[0.75rem] text-ink-3">
                No. {edition.edition}
              </span>
              <Link
                href={`/weekly/${edition.slug}`}
                className="flex-1 text-[0.875rem] font-medium text-ink transition-colors hover:text-accent"
              >
                {edition.headline}
              </Link>
              <span className="text-[0.75rem] text-ink-3">
                {formatDate(edition.publishedAt)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </Container>
  );
}

function StatCard({
  Icon,
  label,
  value,
  hint,
}: {
  Icon: typeof Bot;
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-hairline bg-surface p-5">
      <div className="flex items-center justify-between">
        <p className="eyebrow text-ink-3">{label}</p>
        <Icon className="size-4 text-ink-3" aria-hidden />
      </div>
      <p className="mt-4 font-mono text-[2rem] leading-none tabular-nums text-ink">
        {value}
      </p>
      <p className="mt-3 text-[0.75rem] leading-5 text-ink-3">{hint}</p>
    </div>
  );
}

function ServiceCard({
  label,
  connected,
  connectedHint,
  missingHint,
}: {
  label: string;
  connected: boolean;
  connectedHint: string;
  missingHint: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-[var(--radius-card)] border border-hairline bg-surface p-4">
      <span
        aria-hidden
        className="mt-1.5 size-2 shrink-0 rounded-full"
        style={{ background: connected ? "var(--accent)" : "var(--hairline-strong)" }}
      />
      <div>
        <p className="text-[0.875rem] font-medium text-ink">
          {label}{" "}
          <span className="font-normal text-ink-3">
            {connected ? "connected" : "not connected"}
          </span>
        </p>
        <p className="mt-1 text-[0.75rem] leading-5 text-ink-3">
          {connected ? connectedHint : missingHint}
        </p>
      </div>
    </div>
  );
}

function ArticleTable({ articles }: { articles: Article[] }) {
  return (
    <div className="mt-4 overflow-hidden rounded-[var(--radius-card)] border border-hairline bg-surface">
      <ul className="divide-y divide-hairline">
        {articles.map((article) => (
          <li key={article.id}>
            <Link
              href={`/admin/stories/${article.id}`}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4 transition-colors hover:bg-surface-2"
            >
              <StatusBadge status={article.status} />
              <span className="min-w-0 flex-1 text-[0.875rem] font-medium leading-snug text-ink">
                {article.headline}
              </span>
              <span className="text-[0.75rem] text-ink-3">
                {categoryLabel(article.category)}
              </span>
              <span className="w-28 text-right text-[0.75rem] text-ink-3">
                {formatRelative(article.updatedAt)}
              </span>
              {article.status === "scheduled" && (
                <Send className="size-3.5 text-ink-3" aria-hidden />
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
