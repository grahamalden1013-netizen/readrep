import { DEBATES } from "@/data/demo/debates";
import { ARTICLES } from "@/data/demo/articles";
import { ISSUES } from "@/data/demo/issues";
import { PARTIES } from "@/data/demo/parties";

/**
 * Search across every content type, grouped by kind.
 *
 * A simple scored substring match over a per-item haystack: with a corpus this
 * size an index would be more machinery than the problem needs, and this keeps
 * the whole thing dependency-free and synchronous.
 */

export type SearchGroup = "Debates" | "Articles" | "Issues" | "Parties";

export type SearchResult = {
  group: SearchGroup;
  title: string;
  description: string;
  href: string;
  meta: string;
  score: number;
};

type Indexed = Omit<SearchResult, "score"> & { haystack: string };

function build(): Indexed[] {
  const items: Indexed[] = [];

  for (const debate of DEBATES) {
    items.push({
      group: "Debates",
      title: debate.title,
      description: debate.description,
      href: `/arena/${debate.slug}/brief`,
      meta: `${debate.category} · ${debate.difficulty}`,
      haystack: [
        debate.title,
        debate.description,
        debate.category,
        ...debate.tags,
        debate.brief.question,
        ...debate.brief.keyFacts,
        ...debate.brief.keyTerms.map((t) => t.term),
      ]
        .join(" ")
        .toLowerCase(),
    });
  }

  for (const article of ARTICLES) {
    items.push({
      group: "Articles",
      title: article.headline,
      description: article.explainer,
      href: `/today/${article.slug}`,
      meta:
        article.kind === "weekly"
          ? `NGN Weekly · ${article.readMinutes} min`
          : `${article.category} · ${article.readMinutes} min`,
      haystack: [
        article.headline,
        article.subheadline,
        article.explainer,
        article.category,
        ...article.body,
        ...article.whatWeKnow,
      ]
        .join(" ")
        .toLowerCase(),
    });
  }

  for (const issue of ISSUES) {
    items.push({
      group: "Issues",
      title: issue.title,
      description: issue.summary,
      href: `/issues/${issue.slug}`,
      meta: issue.category,
      haystack: [
        issue.title,
        issue.summary,
        issue.whyPeopleDebate,
        ...issue.basics,
        ...issue.keyFacts,
        ...issue.keyTerms.map((t) => `${t.term} ${t.definition}`),
      ]
        .join(" ")
        .toLowerCase(),
    });
  }

  for (const party of PARTIES) {
    items.push({
      group: "Parties",
      title: party.name,
      description: party.summary,
      href: `/parties/${party.slug}`,
      meta: party.founded === "Not a party" ? "Not a party" : `Founded ${party.founded}`,
      haystack: [
        party.name,
        party.summary,
        ...party.currentPriorities,
        ...party.factions.map((f) => `${f.name} ${f.description}`),
      ]
        .join(" ")
        .toLowerCase(),
    });
  }

  return items;
}

const INDEX = build();

export function search(query: string): SearchResult[] {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1);

  if (terms.length === 0) return [];

  const scored: SearchResult[] = [];

  for (const item of INDEX) {
    let score = 0;
    const title = item.title.toLowerCase();

    for (const term of terms) {
      if (!item.haystack.includes(term)) continue;
      // A title hit is worth far more than a body hit.
      score += title.includes(term) ? 10 : 1;
      // Reward a term appearing repeatedly, with diminishing returns.
      score += Math.min(3, item.haystack.split(term).length - 1) * 0.5;
    }

    if (score === 0) continue;

    scored.push({
      group: item.group,
      title: item.title,
      description: item.description,
      href: item.href,
      meta: item.meta,
      score,
    });
  }

  return scored.sort((a, b) => b.score - a.score);
}

export const SEARCH_SUGGESTIONS = [
  "Electoral College",
  "minimum wage",
  "AI regulation",
  "Section 230",
  "voting age",
  "carbon tax",
  "defense spending",
  "standardized testing",
];
