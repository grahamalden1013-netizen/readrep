/**
 * NGN domain types.
 *
 * These mirror the Supabase schema in `supabase/schema.sql` so the mock content
 * repository in `lib/content` can be swapped for real queries without touching
 * the UI layer.
 */

export type CategorySlug =
  | "congress"
  | "elections"
  | "courts"
  | "economy"
  | "immigration"
  | "climate"
  | "health"
  | "education"
  | "technology"
  | "foreign-policy"
  | "justice"
  | "explainer";

export interface Category {
  slug: CategorySlug;
  label: string;
}

/** Editorial workflow. AI drafts can never skip human approval. */
export type ArticleStatus =
  | "draft"
  | "ai_generated"
  | "needs_review"
  | "approved"
  | "scheduled"
  | "published";

export type ArticleType = "news" | "explainer" | "weekly";

export type SourceKind = "primary" | "reporting" | "analysis" | "data";

export interface Source {
  id: string;
  publisher: string;
  title: string;
  date: string;
  /** Demo build ships without live links; see `isPlaceholder`. */
  url: string;
  kind: SourceKind;
  /** True while the citation is illustrative rather than a real fetched document. */
  isPlaceholder: boolean;
}

export interface KeyTerm {
  term: string;
  definition: string;
}

export interface ArticleSection {
  heading: string;
  paragraphs: string[];
  /** Optional bulleted list rendered after the paragraphs. */
  bullets?: string[];
}

export interface Perspective {
  /** e.g. "Many Democratic lawmakers", "Fiscal-hawk Republicans" */
  label: string;
  summary: string;
  points: string[];
}

/** Deterministic art direction for the generated cover placeholder. */
export interface CoverArt {
  pattern: "grid" | "arc" | "ridge" | "orbit" | "column" | "wave";
  /** 0–360 hue used to tint the generated cover. */
  hue: number;
}

export interface Author {
  id: string;
  name: string;
  role: string;
  bio: string;
  /** Avatar is drawn from initials — no stock photography in the demo build. */
  initials: string;
  hue: number;
}

export interface Article {
  id: string;
  slug: string;
  headline: string;
  subheadline: string;
  summary: string;
  /** The "IN 20 SECONDS" module. */
  inTwentySeconds: string;
  category: CategorySlug;
  issueSlugs: string[];
  quickWhatHappened: string;
  quickWhyItMatters: string;
  quickWhatNext: string;
  body: ArticleSection[];
  democraticView: Perspective;
  republicanView: Perspective;
  otherViews: Perspective[];
  knownFacts: string[];
  uncertainties: string[];
  keyTerms: KeyTerm[];
  sources: Source[];
  authorId: string;
  type: ArticleType;
  status: ArticleStatus;
  publishedAt: string;
  updatedAt: string;
  readTime: number;
  cover: CoverArt;
  featured: boolean;
  /** Ranking used by /today — editorial significance, never click counts. */
  significance: number;
  /** Every article in this build is clearly-labelled demo content. */
  isDemo: boolean;
}

/** Card-sized projection used by lists and search. */
export interface ArticleSummary {
  id: string;
  slug: string;
  headline: string;
  summary: string;
  whyItMatters: string;
  category: CategorySlug;
  readTime: number;
  publishedAt: string;
  cover: CoverArt;
  isDemo: boolean;
}

export interface Issue {
  slug: string;
  name: string;
  /** One neutral sentence for the issue grid. */
  shortDescription: string;
  basics: string[];
  whyDebated: string[];
  democraticViews: string[];
  republicanViews: string[];
  democraticDisagreements: string[];
  republicanDisagreements: string[];
  otherPerspectives: Perspective[];
  keyTerms: KeyTerm[];
  sources: Source[];
  relatedArticleSlugs: string[];
  cover: CoverArt;
  category: CategorySlug;
}

export interface WeeklyArticle {
  id: string;
  slug: string;
  edition: number;
  headline: string;
  dek: string;
  summary: string;
  authorId: string;
  publishedAt: string;
  readTime: number;
  body: ArticleSection[];
  cover: CoverArt;
  featured: boolean;
  isDemo: boolean;
}

export type ModerationStatus = "approved" | "pending" | "flagged" | "removed";

export interface CommentAuthor {
  username: string;
  displayName: string;
  gradeLabel?: string;
  hue: number;
}

export interface Comment {
  id: string;
  articleId: string;
  parentId: string | null;
  author: CommentAuthor;
  body: string;
  createdAt: string;
  /** "Thoughtful" likes — never shown as a popularity ranking. */
  likes: number;
  status: ModerationStatus;
  replies: Comment[];
}

export type ReactionKind = "learned" | "interesting" | "agree" | "disagree";

export interface ReactionTally {
  learned: number;
  interesting: number;
  agree: number;
  disagree: number;
}

export interface DiscussionResponse {
  id: string;
  author: CommentAuthor;
  body: string;
  createdAt: string;
  madeMeThink: number;
  status: ModerationStatus;
  replies: DiscussionResponse[];
}

export interface Discussion {
  id: string;
  slug: string;
  question: string;
  context: string;
  /** Background reading, so a discussion never starts from vibes alone. */
  relatedArticleSlugs: string[];
  relatedIssueSlugs: string[];
  responseCount: number;
  responses: DiscussionResponse[];
  openedAt: string;
  cover: CoverArt;
}

export type SearchResultKind = "article" | "issue" | "weekly" | "discussion";

export interface SearchResult {
  kind: SearchResultKind;
  title: string;
  description: string;
  href: string;
  meta: string;
  category?: CategorySlug;
}
