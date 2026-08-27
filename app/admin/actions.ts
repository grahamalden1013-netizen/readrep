"use server";

import { getViewer } from "@/lib/auth";
import { generateArticleDraft, aiEnabled, type GeneratedDraft } from "@/lib/ai";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  draftToEditable,
  linesOf,
  textToSections,
  type EditableStory,
} from "@/lib/admin/editable";
import type { ArticleStatus } from "@/types/ngn";
import type {
  GenerateState,
  ReviewIssue,
  ReviewState,
} from "./action-types";

/**
 * GENERATE DRAFT.
 *
 * Returns a draft for the editor to work on. It never sets a publishable
 * status — the workflow forces a human read.
 */
export async function generateDraftAction(
  _previous: GenerateState,
  formData: FormData,
): Promise<GenerateState> {
  const viewer = await getViewer();
  if (viewer?.role !== "editor") {
    return {
      status: "error",
      message: "Editor access required.",
      live: aiEnabled(),
    };
  }

  const headline = String(formData.get("headline") ?? "").trim();
  const topic = String(formData.get("topic") ?? "").trim();
  const sourceText = String(formData.get("sourceText") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const sourceUrls = linesOf(String(formData.get("sourceUrls") ?? ""));

  if (!headline && !topic) {
    return {
      status: "error",
      message: "Give the draft a working headline or a topic to start from.",
      live: aiEnabled(),
    };
  }

  try {
    const draft: GeneratedDraft = await generateArticleDraft({
      headline,
      topic,
      sourceUrls,
      sourceText,
      notes,
    });

    return {
      status: "generated",
      live: aiEnabled(),
      message: aiEnabled()
        ? "Draft generated. Every field needs a human read before approval."
        : "Mock draft generated — no model is connected. Every field still needs a human read.",
      draft: draftToEditable(draft),
      editorNotes: draft.editorNotes,
    };
  } catch (error) {
    console.error("[ngn:admin] draft generation failed", error);
    return {
      status: "error",
      message: "Generation failed. The source material was not changed.",
      live: aiEnabled(),
    };
  }
}

function collectIssues(story: EditableStory, intent: ArticleStatus) {
  const issues: ReviewIssue[] = [];
  const require = (
    field: string,
    value: string,
    message: string,
    blocking = true,
  ) => {
    if (!value.trim()) issues.push({ field, message, blocking });
  };

  require("headline", story.headline, "A headline is required.");
  require("summary", story.summary, "A summary is required.");
  require(
    "inTwentySeconds",
    story.inTwentySeconds,
    "The 20-second explanation is required — it is the whole point of the format.",
  );
  require("quickWhatHappened", story.quickWhatHappened, "What happened is required.");
  require("quickWhyItMatters", story.quickWhyItMatters, "Why it matters is required.");
  require("quickWhatNext", story.quickWhatNext, "What happens next is required.");

  if (textToSections(story.body).length === 0) {
    issues.push({
      field: "body",
      message: "The article body has no sections.",
      blocking: true,
    });
  }

  if (!story.democraticSummary.trim() || !story.republicanSummary.trim()) {
    issues.push({
      field: "perspectives",
      message:
        "Both perspective sections must be written before approval. A story with one side is not finished.",
      blocking: true,
    });
  }

  for (const [field, value] of [
    ["democraticSummary", story.democraticSummary],
    ["republicanSummary", story.republicanSummary],
    ["democraticPoints", story.democraticPoints],
    ["republicanPoints", story.republicanPoints],
  ] as const) {
    if (/\b(Democrats|Republicans)\s+believe\b/i.test(value)) {
      issues.push({
        field,
        message:
          "House style: avoid “Democrats believe” / “Republicans believe”. Write “many Democratic lawmakers argue” instead.",
        blocking: true,
      });
    }
  }

  if (linesOf(story.knownFacts).length === 0) {
    issues.push({
      field: "knownFacts",
      message: "List what is established before publishing.",
      blocking: true,
    });
  }

  if (linesOf(story.uncertainties).length === 0) {
    issues.push({
      field: "uncertainties",
      message:
        "What's still unclear is empty. If nothing is uncertain, say why in the notes.",
      blocking: false,
    });
  }

  const sourceCount = linesOf(story.sources).length;
  if (sourceCount < 2) {
    issues.push({
      field: "sources",
      message: `At least two independent sources are required (${sourceCount} listed).`,
      blocking: true,
    });
  }

  if (linesOf(story.otherViews).length === 0) {
    issues.push({
      field: "otherViews",
      message:
        "No other perspectives listed. Politics is rarely exactly two positions — confirm this story is an exception.",
      blocking: false,
    });
  }

  if (intent === "published" && story.subheadline.trim().length === 0) {
    issues.push({
      field: "subheadline",
      message: "A subheadline is required before publishing.",
      blocking: true,
    });
  }

  return issues;
}

/**
 * Runs the publishing checklist.
 *
 * The `humanReviewed` confirmation is mandatory for any status beyond review:
 * AI output must always pass through a person.
 */
export async function reviewStoryAction(
  _previous: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const viewer = await getViewer();
  if (viewer?.role !== "editor") {
    return {
      status: "error",
      message: "Editor access required.",
      issues: [],
      persisted: false,
    };
  }

  const intent = String(formData.get("intent") ?? "needs_review") as ArticleStatus;
  const humanReviewed = formData.get("humanReviewed") === "on";

  const story = Object.fromEntries(
    Object.keys({
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
    }).map((key) => [key, String(formData.get(key) ?? "")]),
  ) as unknown as EditableStory;

  const issues = collectIssues(story, intent);
  const blocking = issues.filter((issue) => issue.blocking);

  if (
    (intent === "approved" || intent === "scheduled" || intent === "published") &&
    !humanReviewed
  ) {
    return {
      status: "blocked",
      intent,
      message:
        "Confirm you have read every field. AI-assisted drafts cannot be approved without it.",
      issues,
      persisted: false,
    };
  }

  if (blocking.length > 0) {
    return {
      status: "blocked",
      intent,
      message: `${blocking.length} ${blocking.length === 1 ? "item blocks" : "items block"} this status change.`,
      issues,
      persisted: false,
    };
  }

  const persisted = isSupabaseConfigured();

  return {
    status: "ok",
    intent,
    message: persisted
      ? `Checks passed. Status set to ${intent.replace("_", " ")}.`
      : `Checks passed. This build has no database connected, so the status change is previewed rather than saved.`,
    issues,
    persisted,
  };
}
