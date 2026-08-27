import { getArticleBySlug } from "@/lib/content/repository";
import type {
  AiProvider,
  AskResponse,
  DraftRequest,
  ExplainMode,
  ExplainResponse,
  GeneratedDraft,
} from "./types";

/**
 * Mock provider.
 *
 * Used whenever no Anthropic API key is configured, which is the default in
 * this build. Responses are assembled from the article's own approved fields,
 * so the interaction is real even though no model is called — the same
 * constraint the live provider works under ("answer only from approved
 * material").
 */

const NO_ARTICLE: AskResponse = {
  answer:
    "That story is not available right now, so there is nothing approved for me to answer from.",
  citations: [],
  outOfScope: true,
};

async function explain(
  slug: string,
  mode: ExplainMode,
): Promise<ExplainResponse> {
  const article = await getArticleBySlug(slug);

  if (!article) {
    return {
      mode,
      title: "Nothing to explain yet",
      paragraphs: [
        "This story is not available, so there is no approved material to explain from.",
      ],
    };
  }

  switch (mode) {
    case "sixty-seconds":
      return {
        mode,
        title: "The 60-second version",
        paragraphs: [
          article.inTwentySeconds,
          article.quickWhatHappened,
          article.quickWhyItMatters,
        ].filter(Boolean),
      };

    case "background": {
      const first = article.body[0];
      return {
        mode,
        title: "What led up to this",
        paragraphs: [
          first
            ? `${first.heading}. ${first.paragraphs.join(" ")}`
            : article.summary,
          ...(article.body[1]?.paragraphs.slice(0, 1) ?? []),
        ].filter(Boolean),
      };
    }

    case "from-scratch":
      return {
        mode,
        title: "Starting from zero",
        paragraphs: [
          "Here is the story assuming you have never followed politics before.",
          article.inTwentySeconds,
          ...article.knownFacts.slice(0, 4).map((fact) => `Established: ${fact}`),
          "The disagreement is about what to do next, not mainly about the facts above.",
        ],
        terms: article.keyTerms.slice(0, 3),
      };

    case "define-terms":
    default:
      return {
        mode,
        title: "The words you need",
        paragraphs: [
          "These are the terms this story uses that news coverage usually assumes you already know.",
        ],
        terms: article.keyTerms,
      };
  }
}

async function ask(slug: string, question: string): Promise<AskResponse> {
  const article = await getArticleBySlug(slug);
  if (!article) return NO_ARTICLE;

  const q = question.toLowerCase();
  const has = (...terms: string[]) => terms.some((term) => q.includes(term));

  if (has("democrat", "left", "liberal")) {
    return {
      answer: `${article.democraticView.summary} ${article.democraticView.points.slice(0, 2).join(" ")}`,
      citations: ["Understand the Sides — Democratic perspective"],
      outOfScope: false,
    };
  }

  if (has("republican", "right", "conservative", "gop")) {
    return {
      answer: `${article.republicanView.summary} ${article.republicanView.points.slice(0, 2).join(" ")}`,
      citations: ["Understand the Sides — Republican perspective"],
      outOfScope: false,
    };
  }

  if (has("why does this matter", "why it matters", "why does it matter", "care")) {
    return {
      answer: article.quickWhyItMatters,
      citations: ["The Quick Version — Why it matters"],
      outOfScope: false,
    };
  }

  if (has("before", "background", "history", "lead up", "led up")) {
    const first = article.body[0];
    return {
      answer: first ? first.paragraphs.join(" ") : article.summary,
      citations: first ? [first.heading] : ["Summary"],
      outOfScope: false,
    };
  }

  if (has("next", "happen next", "future", "will happen")) {
    return {
      answer: article.quickWhatNext,
      citations: ["The Quick Version — What happens next"],
      outOfScope: false,
    };
  }

  if (has("unclear", "unknown", "uncertain", "sure")) {
    return {
      answer: `Here is what is still unresolved. ${article.uncertainties.join(" ")}`,
      citations: ["What's still unclear"],
      outOfScope: false,
    };
  }

  if (has("fact", "confirmed", "true", "know")) {
    return {
      answer: `Established from the sources: ${article.knownFacts.slice(0, 3).join(" ")}`,
      citations: ["What we know"],
      outOfScope: false,
    };
  }

  if (has("should i", "what do you think", "who is right", "your opinion")) {
    return {
      answer:
        "NGN does not take positions on contested political questions, so I will not tell you which side is right. What I can do is lay out the strongest version of each position — that is the Understand the Sides section above — and point you to what is still genuinely unresolved.",
      citations: ["Editorial standards"],
      outOfScope: false,
    };
  }

  const term = article.keyTerms.find((t) => q.includes(t.term.toLowerCase()));
  if (term) {
    return {
      answer: `${term.term}: ${term.definition}`,
      citations: ["Key terms"],
      outOfScope: false,
    };
  }

  return {
    answer: `${article.inTwentySeconds} If your question is more specific than that, try asking about a term used in the story, about what each side argues, or about what is still unresolved — those are the parts I can answer from this article's approved material.`,
    citations: ["In 20 seconds"],
    outOfScope: false,
  };
}

async function generateDraft(request: DraftRequest): Promise<GeneratedDraft> {
  const topic = request.topic || "this policy area";
  const headline = request.headline || "Untitled working draft";

  return {
    headline,
    subheadline:
      "Draft subheadline — replace with one sentence explaining why a reader who has never followed this should care.",
    summary: `Draft summary generated from ${request.sourceUrls.length} supplied source link(s) and ${request.sourceText.trim().split(/\s+/).filter(Boolean).length} words of pasted source text.`,
    inTwentySeconds:
      "Draft 20-second explanation. Replace with the shortest honest version of the story that still makes sense to someone who has never heard of it.",
    quickWhatHappened: `Draft: what happened, stated plainly, in ${topic}.`,
    quickWhyItMatters: "Draft: who is affected and how, without exaggeration.",
    quickWhatNext:
      "Draft: the specific next procedural step and the signals worth watching.",
    body: [
      {
        heading: "Draft section one",
        paragraphs: [
          "This is mock output. No model was called because no Anthropic API key is configured for this environment.",
          "When a key is present, this section is replaced by generated prose grounded strictly in the source material entered above.",
        ],
      },
      {
        heading: "Draft section two",
        paragraphs: [
          "Every generated draft still requires a human editor to read every field before it can move to approved.",
        ],
      },
    ],
    democraticView: {
      label: "Many Democratic lawmakers",
      summary:
        "Draft placeholder. Must be written from cited positions, never generalised as what the party believes.",
      points: ["Draft point one.", "Draft point two."],
    },
    republicanView: {
      label: "Many Republican lawmakers",
      summary:
        "Draft placeholder. Must be written from cited positions, never generalised as what the party believes.",
      points: ["Draft point one.", "Draft point two."],
    },
    otherViews: [
      {
        label: "Other perspectives",
        summary:
          "Draft placeholder for independents, internal party disagreement, experts and affected groups.",
        points: ["Draft point one."],
      },
    ],
    knownFacts: [
      "Draft: only facts traceable to a supplied source belong here.",
    ],
    uncertainties: [
      "Draft: what the sources do not establish, stated as uncertainty rather than omitted.",
    ],
    keyTerms: [
      {
        term: "Draft term",
        definition: "Draft definition, written for someone encountering it first time.",
      },
    ],
    sources: request.sourceUrls.map((url, index) => ({
      id: `draft-source-${index + 1}`,
      publisher: "Supplied source",
      title: url,
      date: "Unverified",
      url,
      kind: "primary" as const,
      isPlaceholder: true,
    })),
    editorNotes: [
      "Mock generation: no model call was made because ANTHROPIC_API_KEY is not set.",
      request.sourceText.trim()
        ? "Source text was supplied and would be the only permitted basis for factual claims."
        : "No source text was supplied. A live generation would refuse to assert facts and would return uncertainties instead.",
      "This draft cannot be published until a human editor reviews every field.",
    ],
  };
}

export const mockProvider: AiProvider = {
  name: "mock",
  generateDraft,
  explain,
  ask,
};
