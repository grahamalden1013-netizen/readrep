import type { Article, ArticleSection, KeyTerm, Perspective, Source } from "@/types/ngn";
import type { GeneratedDraft } from "@/lib/ai";

/**
 * Flat, text-based projection of an article for the newsroom editor.
 *
 * Lists are newline-separated and body sections use a `## Heading` convention,
 * which keeps every field editable in a plain textarea without a rich-text
 * dependency.
 */
export interface EditableStory {
  headline: string;
  subheadline: string;
  summary: string;
  inTwentySeconds: string;
  quickWhatHappened: string;
  quickWhyItMatters: string;
  quickWhatNext: string;
  body: string;
  democraticLabel: string;
  democraticSummary: string;
  democraticPoints: string;
  republicanLabel: string;
  republicanSummary: string;
  republicanPoints: string;
  otherViews: string;
  knownFacts: string;
  uncertainties: string;
  keyTerms: string;
  sources: string;
}

export const EMPTY_STORY: EditableStory = {
  headline: "",
  subheadline: "",
  summary: "",
  inTwentySeconds: "",
  quickWhatHappened: "",
  quickWhyItMatters: "",
  quickWhatNext: "",
  body: "",
  democraticLabel: "",
  democraticSummary: "",
  democraticPoints: "",
  republicanLabel: "",
  republicanSummary: "",
  republicanPoints: "",
  otherViews: "",
  knownFacts: "",
  uncertainties: "",
  keyTerms: "",
  sources: "",
};

function sectionsToText(sections: ArticleSection[]) {
  return sections
    .map((section) =>
      [
        `## ${section.heading}`,
        ...section.paragraphs,
        ...(section.bullets ?? []).map((bullet) => `- ${bullet}`),
      ].join("\n\n"),
    )
    .join("\n\n");
}

export function textToSections(text: string): ArticleSection[] {
  const sections: ArticleSection[] = [];
  let current: ArticleSection | null = null;

  for (const rawBlock of text.split(/\n{2,}/)) {
    const block = rawBlock.trim();
    if (!block) continue;

    if (block.startsWith("## ")) {
      current = { heading: block.slice(3).trim(), paragraphs: [], bullets: [] };
      sections.push(current);
      continue;
    }

    if (!current) {
      current = { heading: "", paragraphs: [], bullets: [] };
      sections.push(current);
    }

    if (block.startsWith("- ")) {
      current.bullets = [
        ...(current.bullets ?? []),
        ...block
          .split("\n")
          .map((line) => line.replace(/^-\s*/, "").trim())
          .filter(Boolean),
      ];
    } else {
      current.paragraphs.push(block);
    }
  }

  return sections.map((section) => ({
    ...section,
    bullets: section.bullets?.length ? section.bullets : undefined,
  }));
}

const linesOf = (text: string) =>
  text
    .split("\n")
    .map((line) => line.replace(/^-\s*/, "").trim())
    .filter(Boolean);

function perspectivesToText(views: Perspective[]) {
  return views
    .map((view) =>
      [`## ${view.label}`, view.summary, ...view.points.map((p) => `- ${p}`)].join(
        "\n",
      ),
    )
    .join("\n\n");
}

export function textToPerspectives(text: string): Perspective[] {
  return text
    .split(/\n(?=## )/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
      const label = lines[0]?.replace(/^##\s*/, "") ?? "Other perspectives";
      const points = lines.filter((line) => line.startsWith("- ")).map((line) =>
        line.slice(2).trim(),
      );
      const summary = lines
        .slice(1)
        .filter((line) => !line.startsWith("- "))
        .join(" ");
      return { label, summary, points };
    });
}

function termsToText(terms: KeyTerm[]) {
  return terms.map((term) => `${term.term} — ${term.definition}`).join("\n");
}

export function textToTerms(text: string): KeyTerm[] {
  return linesOf(text).map((line) => {
    const [term, ...rest] = line.split(/\s+—\s+|\s+--\s+|:\s+/);
    return { term: term.trim(), definition: rest.join(" ").trim() };
  });
}

function sourcesToText(sources: Source[]) {
  return sources
    .map((source) => `${source.publisher} | ${source.title} | ${source.date} | ${source.kind}`)
    .join("\n");
}

export function textToSources(text: string): Source[] {
  return linesOf(text).map((line, index) => {
    const [publisher = "", title = "", date = "", kind = "primary"] = line
      .split("|")
      .map((part) => part.trim());
    return {
      id: `editor-source-${index + 1}`,
      publisher,
      title,
      date: date || "Undated",
      url: "#",
      kind: (["primary", "reporting", "analysis", "data"] as const).includes(
        kind as Source["kind"],
      )
        ? (kind as Source["kind"])
        : "primary",
      isPlaceholder: true,
    };
  });
}

export function articleToEditable(article: Article): EditableStory {
  return {
    headline: article.headline,
    subheadline: article.subheadline,
    summary: article.summary,
    inTwentySeconds: article.inTwentySeconds,
    quickWhatHappened: article.quickWhatHappened,
    quickWhyItMatters: article.quickWhyItMatters,
    quickWhatNext: article.quickWhatNext,
    body: sectionsToText(article.body),
    democraticLabel: article.democraticView.label,
    democraticSummary: article.democraticView.summary,
    democraticPoints: article.democraticView.points.join("\n"),
    republicanLabel: article.republicanView.label,
    republicanSummary: article.republicanView.summary,
    republicanPoints: article.republicanView.points.join("\n"),
    otherViews: perspectivesToText(article.otherViews),
    knownFacts: article.knownFacts.join("\n"),
    uncertainties: article.uncertainties.join("\n"),
    keyTerms: termsToText(article.keyTerms),
    sources: sourcesToText(article.sources),
  };
}

export function draftToEditable(draft: GeneratedDraft): EditableStory {
  return {
    headline: draft.headline ?? "",
    subheadline: draft.subheadline ?? "",
    summary: draft.summary ?? "",
    inTwentySeconds: draft.inTwentySeconds ?? "",
    quickWhatHappened: draft.quickWhatHappened ?? "",
    quickWhyItMatters: draft.quickWhyItMatters ?? "",
    quickWhatNext: draft.quickWhatNext ?? "",
    body: sectionsToText(draft.body ?? []),
    democraticLabel: draft.democraticView?.label ?? "",
    democraticSummary: draft.democraticView?.summary ?? "",
    democraticPoints: (draft.democraticView?.points ?? []).join("\n"),
    republicanLabel: draft.republicanView?.label ?? "",
    republicanSummary: draft.republicanView?.summary ?? "",
    republicanPoints: (draft.republicanView?.points ?? []).join("\n"),
    otherViews: perspectivesToText(draft.otherViews ?? []),
    knownFacts: (draft.knownFacts ?? []).join("\n"),
    uncertainties: (draft.uncertainties ?? []).join("\n"),
    keyTerms: termsToText(draft.keyTerms ?? []),
    sources: sourcesToText(draft.sources ?? []),
  };
}

export { linesOf };
