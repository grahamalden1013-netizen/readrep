import { EXPLAINER_CONTRACT } from "./neutrality";
import { generateText, isAIConfigured } from "./provider";

/**
 * Backs the "I Don't Get It" panel. Every mode is a fixed prompt, so a student
 * cannot steer the explainer into taking a political side.
 */

export const EXPLAINER_MODES = [
  {
    id: "sixty-seconds",
    label: "Explain this in 60 seconds",
    hint: "The whole issue, fast.",
  },
  {
    id: "background",
    label: "Explain the background",
    hint: "How we got here.",
  },
  {
    id: "from-scratch",
    label: "Explain it like I know nothing about politics",
    hint: "No assumed knowledge, no jargon.",
  },
  {
    id: "terms",
    label: "Define the important terms",
    hint: "The words you need to follow the argument.",
  },
  {
    id: "example",
    label: "Give me an example",
    hint: "One concrete case.",
  },
  {
    id: "why-arguing",
    label: "Why are people arguing about this?",
    hint: "The actual disagreement underneath.",
  },
] as const;

export type ExplainerMode = (typeof EXPLAINER_MODES)[number]["id"];

const MODE_INSTRUCTIONS: Record<ExplainerMode, string> = {
  "sixty-seconds":
    "Explain the whole issue in about 120 words. Assume the reader is a curious 15-year-old with no background. End with the single sentence that captures what is actually being decided.",
  background:
    "Explain how this issue got to where it is now, in about 150 words. Give the history a reader needs to follow today's argument, in rough chronological order.",
  "from-scratch":
    "Explain this to someone who knows nothing about politics or government, in about 150 words. Define every institution or process you mention in the same sentence you mention it. Use no jargon at all.",
  terms:
    "List the 4-6 terms a reader must know to follow this debate. Format each as 'Term — one-sentence definition' on its own line. Nothing else.",
  example:
    "Give one concrete, specific example that makes this issue tangible, in about 120 words. A real situation, a real place, a real consequence. Then say in one sentence what the example illustrates about the disagreement.",
  "why-arguing":
    "In about 150 words, explain what people are actually disagreeing about here. Separate the factual disagreements from the disagreements about values or priorities. Give each side's underlying concern equal weight and equal seriousness.",
};

export type ExplainerRequest = {
  mode: ExplainerMode;
  topic: string;
  /** Neutral context from the briefing or article, so the model stays grounded. */
  context: string;
};

/**
 * Local fallback: reshape the neutral context the page already holds. It never
 * invents facts — it only re-presents the briefing at a different reading level.
 */
function localExplainer({ mode, topic, context }: ExplainerRequest): string {
  const parts = context
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const intro: Record<ExplainerMode, string> = {
    "sixty-seconds": `The short version of "${topic}":`,
    background: `How "${topic}" got here:`,
    "from-scratch": `Starting from zero on "${topic}":`,
    terms: `The terms you need for "${topic}":`,
    example: `A concrete way to picture "${topic}":`,
    "why-arguing": `What people are actually arguing about in "${topic}":`,
  };

  const body =
    mode === "terms"
      ? parts.slice(0, 5).map((s) => `• ${s}`).join("\n")
      : mode === "sixty-seconds"
        ? parts.slice(0, 3).join(" ")
        : parts.slice(0, 6).join(" ");

  return `${intro[mode]}\n\n${body}\n\nThis explanation is drawn from the neutral briefing on this page. NGN does not tell you which side to take — once you understand the question, the position is yours to choose and defend.`;
}

export async function explain(request: ExplainerRequest): Promise<{
  text: string;
  source: "model" | "briefing";
}> {
  if (!isAIConfigured()) {
    return { text: localExplainer(request), source: "briefing" };
  }

  const text = await generateText({
    system: EXPLAINER_CONTRACT,
    prompt: `Topic: ${request.topic}

Neutral context from NGN's briefing on this topic — treat this as your only source of facts, and do not introduce claims it does not support:
${request.context}

Task: ${MODE_INSTRUCTIONS[request.mode]}

Write plain prose with no headings and no preamble. Do not suggest which side is right.`,
    maxTokens: 900,
  });

  return text
    ? { text, source: "model" }
    : { text: localExplainer(request), source: "briefing" };
}
