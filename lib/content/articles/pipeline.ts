import type { Article } from "@/types/ngn";

/**
 * Stories currently moving through the newsroom pipeline. These are unpublished
 * by design — they exist so the admin dashboard shows a realistic queue, and so
 * the "AI drafts require human approval" rule is visible in the product.
 */

function draftShell(
  partial: Pick<
    Article,
    | "id"
    | "slug"
    | "headline"
    | "summary"
    | "category"
    | "status"
    | "authorId"
    | "updatedAt"
    | "cover"
  > &
    Partial<Article>,
): Article {
  return {
    subheadline: "",
    inTwentySeconds: "",
    issueSlugs: [],
    quickWhatHappened: "",
    quickWhyItMatters: "",
    quickWhatNext: "",
    body: [],
    democraticView: { label: "", summary: "", points: [] },
    republicanView: { label: "", summary: "", points: [] },
    otherViews: [],
    knownFacts: [],
    uncertainties: [],
    keyTerms: [],
    sources: [],
    type: "news",
    publishedAt: "",
    readTime: 5,
    featured: false,
    significance: 50,
    isDemo: true,
    ...partial,
  };
}

export const pipelineArticles: Article[] = [
  draftShell({
    id: "art-draft-farm-bill",
    slug: "farm-bill-draft",
    headline: "The Farm Bill Is Mostly Not About Farms",
    summary:
      "AI-generated first draft. Explains why the largest share of farm bill spending goes to nutrition assistance, and why that shapes the coalition behind it.",
    category: "congress",
    status: "ai_generated",
    authorId: "ngn-desk",
    updatedAt: "2026-08-27T07:10:00.000Z",
    cover: { pattern: "ridge", hue: 100 },
    quickWhatHappened:
      "Draft generated from three source documents. Awaiting editor review — no perspective sections written yet.",
  }),
  draftShell({
    id: "art-draft-student-loans",
    slug: "student-loan-repayment-draft",
    headline: "Student Loan Repayment Rules Keep Changing. Here Is the Structure Underneath.",
    summary:
      "Editor draft. Separates what Congress set in statute from what the Department of Education can change administratively.",
    category: "education",
    status: "needs_review",
    authorId: "sam-reyes",
    updatedAt: "2026-08-27T06:40:00.000Z",
    cover: { pattern: "wave", hue: 200 },
    quickWhatHappened:
      "Full draft written. Perspective sections need a second read for balance before approval.",
  }),
  draftShell({
    id: "art-draft-primaries",
    slug: "how-primaries-work-draft",
    headline: "Open, Closed, Ranked: How Primary Rules Change Who Wins",
    summary:
      "Reporter notes only. Needs source collection before a draft can be generated.",
    category: "elections",
    status: "draft",
    authorId: "dev-anand",
    updatedAt: "2026-08-26T19:05:00.000Z",
    cover: { pattern: "grid", hue: 220 },
  }),
  draftShell({
    id: "art-scheduled-court-term",
    slug: "supreme-court-term-preview-draft",
    headline: "What to Watch in the Next Supreme Court Term",
    summary:
      "Approved and scheduled. Publishes on the morning the term opens.",
    category: "courts",
    status: "scheduled",
    authorId: "iris-chen",
    updatedAt: "2026-08-26T18:00:00.000Z",
    cover: { pattern: "column", hue: 300 },
    publishedAt: "2026-09-01T12:00:00.000Z",
    readTime: 8,
  }),
];
