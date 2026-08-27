import { mockProvider } from "./mock";
import type {
  AiProvider,
  AskResponse,
  DraftRequest,
  ExplainMode,
  ExplainResponse,
  GeneratedDraft,
} from "./types";

export type {
  AiProvider,
  AskResponse,
  DraftRequest,
  ExplainMode,
  ExplainResponse,
  GeneratedDraft,
};

/**
 * AI service entry point.
 *
 * The product is fully functional without credentials: with no key configured
 * every call is served by the mock provider, which answers only from approved
 * article material. Setting ANTHROPIC_API_KEY swaps in the real Claude
 * provider with no changes anywhere else.
 */
export function aiEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

async function provider(): Promise<AiProvider> {
  if (!aiEnabled()) return mockProvider;
  const { claudeProvider } = await import("./claude");
  return claudeProvider;
}

export async function generateArticleDraft(
  request: DraftRequest,
): Promise<GeneratedDraft> {
  return (await provider()).generateDraft(request);
}

export async function explainArticle(
  slug: string,
  mode: ExplainMode,
): Promise<ExplainResponse> {
  return (await provider()).explain(slug, mode);
}

export async function askAboutStory(
  slug: string,
  question: string,
): Promise<AskResponse> {
  return (await provider()).ask(slug, question);
}
