"use server";

import type {
  EvidenceItem,
  JudgeFeedback,
  PerspectiveFeedback,
  RoundEntry,
} from "@/types/ngn";
import { judgeDebate } from "@/lib/ai/debateJudge";
import { judgePerspective } from "@/lib/ai/perspectiveJudge";
import { explain, type ExplainerMode } from "@/lib/ai/explainer";
import { moderate, type ModerationResult } from "@/lib/ai/moderation";
import { assessSource, type SourceAssessment } from "@/lib/ai/sourceAnalysis";
import { isAIConfigured } from "@/lib/ai/provider";
import { getDebate } from "@/data/demo/debates";

/**
 * Server actions for the Arena.
 *
 * These are the boundary between the client-held debate state and the AI
 * services. Everything here validates its own inputs — a Server Action is
 * reachable by direct POST, not only through the UI.
 */

const MAX_RESPONSE_CHARS = 2000;

function clampText(value: unknown, limit = MAX_RESPONSE_CHARS): string {
  return typeof value === "string" ? value.slice(0, limit) : "";
}

export type ScoreDebateInput = {
  debateSlug: string;
  position: "support" | "oppose";
  rounds: RoundEntry[];
  evidence: EvidenceItem[];
};

export type ScoreDebateResult = {
  user: JudgeFeedback;
  opponent: JudgeFeedback;
  aiBacked: boolean;
};

/**
 * Score both transcripts. The opponent is scored by the identical judge with
 * the identical prompt — nothing about which side either argued reaches the
 * scoring path except as context the contract forbids weighing.
 */
export async function scoreDebate(
  input: ScoreDebateInput,
): Promise<ScoreDebateResult> {
  const debate = getDebate(input.debateSlug);
  if (!debate) throw new Error("Unknown debate");

  const rounds = input.rounds.slice(0, 12).map((round) => ({
    ...round,
    userText: clampText(round.userText),
    opponentText: clampText(round.opponentText),
  }));

  const evidence = input.evidence.slice(0, 8).map((item) => ({
    ...item,
    quote: clampText(item.quote, 400),
    note: clampText(item.note, 400),
    title: clampText(item.title, 200),
    url: clampText(item.url, 500),
  }));

  const opponentPosition = input.position === "support" ? "oppose" : "support";

  // Mirror the transcript so the opponent's judge sees the same structure.
  const mirroredRounds = rounds.map((round) => ({
    ...round,
    userText: round.opponentText,
    opponentText: round.userText,
    evidence: [],
  }));

  const [user, opponent] = await Promise.all([
    judgeDebate({
      topic: debate.title,
      question: debate.brief.question,
      position: input.position,
      rounds,
      evidence,
    }),
    judgeDebate({
      topic: debate.title,
      question: debate.brief.question,
      position: opponentPosition,
      rounds: mirroredRounds,
      evidence: [],
    }),
  ]);

  return { user, opponent, aiBacked: isAIConfigured() };
}

export type ScorePerspectiveInput = {
  debateSlug: string;
  originalPosition: "support" | "oppose";
  response: string;
};

export async function scorePerspective(
  input: ScorePerspectiveInput,
): Promise<PerspectiveFeedback> {
  const debate = getDebate(input.debateSlug);
  if (!debate) throw new Error("Unknown debate");

  const targetSide =
    input.originalPosition === "support"
      ? debate.brief.opponentArguments
      : debate.brief.supporterArguments;

  return judgePerspective({
    question: debate.brief.question,
    originalPosition: input.originalPosition,
    targetArguments: targetSide,
    response: clampText(input.response),
  });
}

export type ExplainInput = {
  mode: ExplainerMode;
  topic: string;
  context: string;
};

export async function explainTopic(
  input: ExplainInput,
): Promise<{ text: string; source: "model" | "briefing" }> {
  return explain({
    mode: input.mode,
    topic: clampText(input.topic, 300),
    context: clampText(input.context, 6000),
  });
}

export async function moderateText(text: string): Promise<ModerationResult> {
  return moderate(clampText(text));
}

export async function analyzeSource(url: string): Promise<SourceAssessment> {
  return assessSource(clampText(url, 500));
}

export async function aiStatus(): Promise<{ configured: boolean }> {
  return { configured: isAIConfigured() };
}
