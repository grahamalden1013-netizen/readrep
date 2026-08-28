"use server";

import { generateDraft, type ArticleDraft } from "@/lib/ai/articleGenerator";
import { isAIConfigured } from "@/lib/ai/provider";

/**
 * Admin newsroom actions.
 *
 * `draftBriefing` returns a draft with `requiresHumanReview: true` set by the
 * generator and never cleared here. AI-generated political content is never
 * auto-published — the publish control stays disabled until an editor approves.
 */
export async function draftBriefing(input: {
  topic: string;
  sourceNotes: string;
}): Promise<ArticleDraft & { aiBacked: boolean }> {
  const topic = input.topic.slice(0, 300);
  const sourceNotes = input.sourceNotes.slice(0, 8000);

  if (!topic.trim()) {
    throw new Error("A topic is required");
  }

  const draft = await generateDraft({ topic, sourceNotes });
  return { ...draft, aiBacked: isAIConfigured() };
}
