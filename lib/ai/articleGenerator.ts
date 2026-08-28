import { NEUTRALITY_CONTRACT } from "./neutrality";
import { generateJSON, isAIConfigured } from "./provider";

/**
 * Drafts neutral briefs and debate briefings for the admin newsroom.
 *
 * Nothing this module produces is publishable on its own. Every draft lands in
 * the admin review queue with `requiresHumanReview: true`, and the publish
 * control is disabled until an editor approves it. AI-generated political
 * content is never auto-published.
 */

const DRAFT_CONTRACT = `${NEUTRALITY_CONTRACT}

You are drafting neutral explanatory material for an editor to review. Write in NGN's voice: plain, precise, unhurried, never breathless. No rhetorical questions, no "in today's polarised world", no scare quotes.

Write only what the supplied sources support. Where the sources disagree or are silent, say so explicitly rather than filling the gap.`;

const DRAFT_SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string" },
    subheadline: { type: "string" },
    whatHappened: { type: "string" },
    whyItMatters: { type: "string" },
    whatHappensNext: { type: "string" },
    debateQuestion: { type: "string" },
    supportArguments: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 5 },
    opposeArguments: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 5 },
    democraticView: { type: "string" },
    republicanView: { type: "string" },
    keyFacts: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 6 },
    whatIsUncertain: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 4 },
  },
  required: [
    "headline",
    "subheadline",
    "whatHappened",
    "whyItMatters",
    "whatHappensNext",
    "debateQuestion",
    "supportArguments",
    "opposeArguments",
    "democraticView",
    "republicanView",
    "keyFacts",
    "whatIsUncertain",
  ],
  additionalProperties: false,
} as const;

export type DraftRequest = {
  topic: string;
  sourceNotes: string;
};

export type ArticleDraft = {
  headline: string;
  subheadline: string;
  whatHappened: string;
  whyItMatters: string;
  whatHappensNext: string;
  debateQuestion: string;
  supportArguments: string[];
  opposeArguments: string[];
  democraticView: string;
  republicanView: string;
  keyFacts: string[];
  whatIsUncertain: string[];
  /** Always true. The admin UI keys its publish gate off this field. */
  requiresHumanReview: true;
  generatedBy: "claude" | "template";
};

function templateDraft({ topic, sourceNotes }: DraftRequest): ArticleDraft {
  const notes = sourceNotes.trim() || "No source notes were supplied.";
  return {
    headline: topic,
    subheadline: "Editor: replace this line with a one-sentence framing of the story.",
    whatHappened: `[DRAFT — needs editor] ${notes.split(/(?<=[.!?])\s+/)[0] ?? notes}`,
    whyItMatters: "[DRAFT — needs editor] State who is affected and how, without arguing a side.",
    whatHappensNext: "[DRAFT — needs editor] Name the next decision point and who makes it.",
    debateQuestion: `Should ${topic.replace(/^should\s+/i, "").replace(/\?$/, "")}?`,
    supportArguments: [
      "[DRAFT] Strongest argument in support — editor to write.",
      "[DRAFT] Second argument in support.",
      "[DRAFT] Third argument in support.",
    ],
    opposeArguments: [
      "[DRAFT] Strongest argument in opposition — editor to write.",
      "[DRAFT] Second argument in opposition.",
      "[DRAFT] Third argument in opposition.",
    ],
    democraticView:
      "[DRAFT] Describe views common among Democratic lawmakers, and note where they differ from each other.",
    republicanView:
      "[DRAFT] Describe views common among Republican lawmakers, and note where they differ from each other.",
    keyFacts: [
      "[DRAFT] A fact a student needs to debate this.",
      "[DRAFT] A second fact.",
      "[DRAFT] A third fact.",
    ],
    whatIsUncertain: ["[DRAFT] Name what is genuinely not known yet."],
    requiresHumanReview: true,
    generatedBy: "template",
  };
}

export async function generateDraft(request: DraftRequest): Promise<ArticleDraft> {
  if (!isAIConfigured()) return templateDraft(request);

  const result = await generateJSON<Omit<ArticleDraft, "requiresHumanReview" | "generatedBy">>({
    system: DRAFT_CONTRACT,
    prompt: `Draft neutral briefing material on this topic for editor review.

Topic: ${request.topic}

Source notes the editor supplied — these are your only permitted basis for factual claims:
${request.sourceNotes}

Produce a headline, a subheadline, a three-part quick brief, a debatable yes/no question, the strongest arguments on each side, how each major party tends to view it (including internal disagreement), key facts, and what remains genuinely uncertain.`,
    schema: DRAFT_SCHEMA as unknown as Record<string, unknown>,
    maxTokens: 4000,
  });

  if (!result) return templateDraft(request);

  return { ...result, requiresHumanReview: true, generatedBy: "claude" };
}
