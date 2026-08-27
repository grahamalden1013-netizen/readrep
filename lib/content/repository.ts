import type {
  Article,
  ArticleStatus,
  ArticleSummary,
  Comment,
  Discussion,
  Issue,
  ReactionTally,
  SearchResult,
  WeeklyArticle,
} from "@/types/ngn";
import { ALL_ARTICLES } from "./articles";
import { ALL_ISSUES } from "./issues";
import { WEEKLY_ARTICLES } from "./weekly";
import { DISCUSSIONS } from "./discussions";
import { COMMENTS, REACTIONS } from "./comments";
import { categoryLabel } from "./categories";

/**
 * Content repository.
 *
 * Every function is async so that swapping this file for Supabase queries
 * (see `supabase/schema.sql`) requires no changes in any page or component.
 * Today it reads from the seeded demo content in `lib/content`.
 */

function byNewest(a: { publishedAt: string }, b: { publishedAt: string }) {
  return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
}

export function toSummary(article: Article): ArticleSummary {
  return {
    id: article.id,
    slug: article.slug,
    headline: article.headline,
    summary: article.summary,
    whyItMatters: article.quickWhyItMatters,
    category: article.category,
    readTime: article.readTime,
    publishedAt: article.publishedAt,
    cover: article.cover,
    isDemo: article.isDemo,
  };
}

const published = () =>
  ALL_ARTICLES.filter((a) => a.status === "published").sort(byNewest);

export async function getPublishedArticles(): Promise<Article[]> {
  return published();
}

/** Ranked by editorial significance, never by traffic. */
export async function getRankedStories(limit = 5): Promise<Article[]> {
  return published()
    .slice()
    .sort((a, b) => b.significance - a.significance)
    .slice(0, limit);
}

export async function getHeroStory(): Promise<Article> {
  const featured = published().find((a) => a.featured);
  return featured ?? published()[0];
}

export async function getTodaysBrief(limit = 4): Promise<ArticleSummary[]> {
  const hero = await getHeroStory();
  return published()
    .filter((a) => a.id !== hero.id)
    .sort((a, b) => b.significance - a.significance)
    .slice(0, limit)
    .map(toSummary);
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  return ALL_ARTICLES.find((a) => a.slug === slug && a.status === "published") ?? null;
}

export async function getArticleById(id: string): Promise<Article | null> {
  return ALL_ARTICLES.find((a) => a.id === id) ?? null;
}

export async function getRelatedArticles(
  slug: string,
  limit = 3,
): Promise<ArticleSummary[]> {
  const article = ALL_ARTICLES.find((a) => a.slug === slug);
  if (!article) return [];
  const scored = published()
    .filter((a) => a.slug !== slug)
    .map((candidate) => {
      const shared = candidate.issueSlugs.filter((i) =>
        article.issueSlugs.includes(i),
      ).length;
      const sameCategory = candidate.category === article.category ? 1 : 0;
      return { candidate, score: shared * 2 + sameCategory };
    })
    .sort((a, b) => b.score - a.score || byNewest(a.candidate, b.candidate));
  return scored.slice(0, limit).map((s) => toSummary(s.candidate));
}

export async function getArticlesForIssue(
  issueSlug: string,
  limit = 3,
): Promise<ArticleSummary[]> {
  return published()
    .filter((a) => a.issueSlugs.includes(issueSlug))
    .slice(0, limit)
    .map(toSummary);
}

/* ------------------------------------------------------------------ issues */

export async function getIssues(): Promise<Issue[]> {
  return ALL_ISSUES;
}

export async function getIssueBySlug(slug: string): Promise<Issue | null> {
  return ALL_ISSUES.find((issue) => issue.slug === slug) ?? null;
}

/** Homepage "Understand the issue" strip — a curated subset. */
export async function getFeaturedIssues(limit = 8): Promise<Issue[]> {
  const order = [
    "immigration",
    "economy",
    "abortion",
    "climate-change",
    "gun-policy",
    "healthcare",
    "education",
    "foreign-policy",
  ];
  return order
    .map((slug) => ALL_ISSUES.find((i) => i.slug === slug))
    .filter((i): i is Issue => Boolean(i))
    .slice(0, limit);
}

/* ------------------------------------------------------------------ weekly */

export async function getWeeklyArticles(): Promise<WeeklyArticle[]> {
  return [...WEEKLY_ARTICLES].sort(byNewest);
}

export async function getFeaturedWeekly(): Promise<WeeklyArticle> {
  const sorted = [...WEEKLY_ARTICLES].sort(byNewest);
  return sorted.find((w) => w.featured) ?? sorted[0];
}

export async function getWeeklyBySlug(
  slug: string,
): Promise<WeeklyArticle | null> {
  return WEEKLY_ARTICLES.find((w) => w.slug === slug) ?? null;
}

/* -------------------------------------------------------------- discussion */

export async function getDiscussions(): Promise<Discussion[]> {
  return [...DISCUSSIONS].sort(
    (a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime(),
  );
}

export async function getDiscussionBySlug(
  slug: string,
): Promise<Discussion | null> {
  return DISCUSSIONS.find((d) => d.slug === slug) ?? null;
}

/* ---------------------------------------------------------------- comments */

export async function getCommentsForArticle(
  articleId: string,
): Promise<Comment[]> {
  return COMMENTS.filter(
    (c) => c.articleId === articleId && c.status === "approved",
  );
}

export async function getReactions(articleId: string): Promise<ReactionTally> {
  return (
    REACTIONS[articleId] ?? { learned: 0, interesting: 0, agree: 0, disagree: 0 }
  );
}

/* ------------------------------------------------------------------ search */

export async function search(query: string): Promise<SearchResult[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  // Readers type questions ("What is NATO?"), so strip punctuation and the
  // question words that would otherwise have to appear in every match.
  const STOPWORDS = new Set([
    "what", "whats", "who", "whom", "why", "how", "when", "where", "which",
    "is", "are", "was", "were", "the", "a", "an", "of", "in", "on", "to",
    "for", "and", "or", "do", "does", "did", "it", "that", "this", "about",
    "me", "my", "i", "you", "explain", "mean", "means",
  ]);

  const tokens = q
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1);
  const meaningful = tokens.filter((token) => !STOPWORDS.has(token));
  const terms = meaningful.length > 0 ? meaningful : tokens;

  // Score by how many of the query's terms appear. Requiring every term makes
  // natural-language questions fail; requiring one makes background lookups work.
  const scoreOf = (haystack: string) => {
    const text = haystack.toLowerCase();
    return terms.filter((term) => text.includes(term)).length;
  };

  const scored: { score: number; result: SearchResult }[] = [];
  const push = (score: number, result: SearchResult) => {
    if (score > 0) scored.push({ score, result });
  };

  for (const article of published()) {
    const haystack = [
      article.headline,
      article.summary,
      article.subheadline,
      article.inTwentySeconds,
      categoryLabel(article.category),
      article.quickWhatHappened,
      article.quickWhyItMatters,
      article.quickWhatNext,
      ...article.body.map(
        (section) => `${section.heading} ${section.paragraphs.join(" ")} ${(section.bullets ?? []).join(" ")}`,
      ),
      ...article.keyTerms.map((t) => `${t.term} ${t.definition}`),
      ...article.knownFacts,
      ...article.uncertainties,
    ].join(" ");
    push(scoreOf(haystack), {
      kind: "article",
      title: article.headline,
      description: article.summary,
      href: `/story/${article.slug}`,
      meta: `${categoryLabel(article.category)} · ${article.readTime} min read`,
      category: article.category,
    });
  }

  for (const issue of ALL_ISSUES) {
    const haystack = [
      issue.name,
      issue.shortDescription,
      ...issue.basics,
      ...issue.whyDebated,
      ...issue.democraticViews,
      ...issue.republicanViews,
      ...issue.keyTerms.map((t) => `${t.term} ${t.definition}`),
    ].join(" ");
    push(scoreOf(haystack), {
      kind: "issue",
      title: `Understand ${issue.name}`,
      description: issue.shortDescription,
      href: `/issues/${issue.slug}`,
      meta: "Issue guide",
      category: issue.category,
    });
  }

  for (const weekly of WEEKLY_ARTICLES) {
    const haystack = [
      weekly.headline,
      weekly.dek,
      weekly.summary,
      ...weekly.body.map(
        (section) => `${section.heading} ${section.paragraphs.join(" ")}`,
      ),
    ].join(" ");
    push(scoreOf(haystack), {
      kind: "weekly",
      title: weekly.headline,
      description: weekly.summary,
      href: `/weekly/${weekly.slug}`,
      meta: `The NGN Weekly · Edition ${weekly.edition}`,
    });
  }

  for (const discussion of DISCUSSIONS) {
    const haystack = [discussion.question, discussion.context].join(" ");
    push(scoreOf(haystack), {
      kind: "discussion",
      title: discussion.question,
      description: discussion.context,
      href: `/discuss/${discussion.slug}`,
      meta: `${discussion.responseCount} responses`,
    });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.result);
}

/** Suggested queries surfaced on the empty search page. */
export const SEARCH_SUGGESTIONS = [
  "What is NATO?",
  "What is a filibuster?",
  "Why do prices feel high?",
  "What is redistricting?",
  "What is Section 230?",
  "What is asylum?",
];

/* ------------------------------------------------------------------- admin */

export async function getArticlesByStatus(
  status: ArticleStatus,
): Promise<Article[]> {
  return ALL_ARTICLES.filter((a) => a.status === status).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export async function getAllArticlesForAdmin(): Promise<Article[]> {
  return [...ALL_ARTICLES].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export async function getAllSources() {
  const seen = new Map<string, { source: (typeof ALL_ARTICLES)[number]["sources"][number]; articles: string[] }>();
  for (const article of ALL_ARTICLES) {
    for (const source of article.sources) {
      const existing = seen.get(source.id);
      if (existing) {
        existing.articles.push(article.headline);
      } else {
        seen.set(source.id, { source, articles: [article.headline] });
      }
    }
  }
  return [...seen.values()];
}
