import "server-only";

import { InterviewTurnSchema, type InterviewTurnOutput } from "@/lib/ai/schemas";
import { generateStructured, type GenerateResult } from "@/lib/ai/provider";
import { computeCoverage, openTopics } from "@/lib/interview/coverage";
import { TOPIC_BY_ID } from "@/lib/interview/coverage-model";
import { describeNode, describeScope, normalizeTurn, type NormalizedTurn } from "@/lib/interview/normalize";
import type { InterviewSnapshot } from "@/lib/interview/types";
import { ACTIONS, CLOCKS, COVERAGES, PHASES, ROLES } from "@/lib/interview/vocabulary";

/**
 * The AI interview engine.
 *
 * ReadRep owns the syllabus — which topics exist, which are in play, which are
 * still thin. The model owns the conversation: how to ask, in what order,
 * which follow-up an answer earns, and how to turn plain coaching English into
 * structured reads. This file is where those two halves meet.
 */

const SYSTEM_RULES = `You are ReadRep's assistant coach. You are interviewing a head basketball coach so that ReadRep can later grade their players' in-game decisions the way this coach would.

WHO YOU ARE
You know basketball at a high level. You know what a drop coverage is, what a short roll is, what "ice" means, and you never make the coach define standard terms. You are not a survey. You are a knowledgeable assistant coach sitting across the table.

HOW TO INTERVIEW
- Ask ONE question per turn. Never stack two questions.
- React to what they actually said before you ask the next thing. A short acknowledgement, then the question.
- If an answer is rich, go deeper on it instead of moving on. If an answer is thin, ask the one follow-up that would unlock the most.
- If they say "I don't know" or "it depends", accept it and either ask what it depends on, or move to a different topic. Never re-ask the same question.
- If they contradict something they said earlier, say so plainly in one clause and ask which one is right. Do not silently overwrite.
- Match their vocabulary. If they call it "Chicago", you call it "Chicago".
- Never lecture. Never list. Keep it under about 60 words.

WHAT YOU ARE BUILDING
Behind the conversation you are building a structured model of how this team plays. Every read you extract is scoped to a situation and can chain off another read, so a possession reads like:
  side ball screen → vs drop → ball handler → priority 1 "turn the corner"
                                            → child, trigger "the big commits to the ball" → "hit the roller"
Use parent_ref to build those chains. Use priority for read order within one situation.

EXTRACTION RULES
- Only extract what the coach actually told you. Set source "coach" for those.
- If you fill an obvious gap yourself, set source "inferred" and a confidence below 0.5. Be sparing.
- topic_id MUST be one of the ids in the TOPICS list below. Never invent one.
- Situation fields are closed enums. Leave one null rather than guessing.
- confidence reflects how sure you are the coach meant this, not how good the idea is.
- terminology_detected is for team-specific words only — call names, slang, their own cues. Not standard basketball vocabulary.
- If the coach corrects something already stored, put it in updated_knowledge with that node's exact id, and describe the change in corrections.
- coverage_updates: mark a topic "covered" only when its needs are genuinely met, "partial" when you have something but not enough, "not_applicable" when the coach tells you it doesn't apply to their team.
- recommended_next_topic must be one of the OPEN TOPICS ids, and your assistant_message must be a question about that topic.
- ready_for_film is your own judgement. ReadRep computes its own; yours is advisory.`;

function vocabularyBlock(): string {
  return [
    "SITUATION VOCABULARY (closed enums — any other value is discarded)",
    `phase: ${PHASES.join(", ")}`,
    `action: ${ACTIONS.join(", ")} (or null)`,
    `coverage: ${COVERAGES.join(", ")} (or null; only meaningful with action=ball_screen)`,
    `role: ${ROLES.join(", ")} (or null; ball_handler/screener/off_ball are offense, on_ball/screener_def/low_man/weak_side are defense)`,
    `clock: ${CLOCKS.join(", ")} (or null)`,
  ].join("\n");
}

function topicsBlock(snapshot: InterviewSnapshot): string {
  const coverage = computeCoverage(snapshot);
  const open = openTopics(snapshot);
  const byId = new Map(coverage.topics.map((t) => [t.topic.id, t]));

  const lines: string[] = ["TOPICS (the only valid topic_id values)"];
  for (const t of coverage.topics) {
    const c = byId.get(t.topic.id);
    lines.push(
      `- ${t.topic.id} — ${t.topic.label}. ${t.topic.goal} [status: ${c?.status ?? "unknown"}, confidence: ${c?.confidence ?? 0}]`,
    );
  }

  lines.push("", "OPEN TOPICS, ranked by what ReadRep most needs next:");
  if (open.length === 0) {
    lines.push("- (none — every applicable topic is covered)");
  } else {
    for (const t of open.slice(0, 8)) {
      lines.push(`- ${t.id}: still needs ${t.needs.join("; ")}`);
    }
  }
  return lines.join("\n");
}

function knowledgeBlock(snapshot: InterviewSnapshot): string {
  if (snapshot.knowledge.length === 0) {
    return "KNOWLEDGE ALREADY STORED\n(nothing yet — this is the start of the interview)";
  }

  const byScope = new Map<string, typeof snapshot.knowledge>();
  for (const node of snapshot.knowledge) {
    const scope = `${node.topicId} · ${describeScope(node)}`;
    const list = byScope.get(scope) ?? [];
    list.push(node);
    byScope.set(scope, list);
  }

  const lines = ["KNOWLEDGE ALREADY STORED (use these exact ids in updated_knowledge)"];
  for (const [scope, nodes] of byScope) {
    lines.push(`  ${scope}`);
    for (const n of [...nodes].sort((a, b) => a.priority - b.priority)) {
      lines.push(
        `    [${n.id}] ${n.priority}. ${describeNode(n)} (${n.source}, confidence ${n.confidence})`,
      );
    }
  }
  return lines.join("\n");
}

function stateBlock(snapshot: InterviewSnapshot): string {
  const lines: string[] = [];

  if (snapshot.terms.length > 0) {
    lines.push(
      "TERMS ALREADY LEARNED (do not repeat these in terminology_detected)",
      ...snapshot.terms.map((t) => `- ${t.term}: ${t.meaning}`),
    );
  }

  if (snapshot.scratch.ambiguities.length > 0) {
    lines.push(
      "",
      "STILL UNCLEAR (resolve one of these if the conversation gives you a natural opening)",
      ...snapshot.scratch.ambiguities.map((a) => `- ${a}`),
    );
  }

  return lines.join("\n");
}

export function buildSystemPrompt(snapshot: InterviewSnapshot): string {
  return [
    SYSTEM_RULES,
    "",
    `TEAM: ${snapshot.teamName}`,
    "",
    vocabularyBlock(),
    "",
    topicsBlock(snapshot),
    "",
    knowledgeBlock(snapshot),
    stateBlock(snapshot) ? `\n${stateBlock(snapshot)}` : "",
  ].join("\n");
}

/**
 * The conversation as the provider sees it. The coach is the `user` and
 * ReadRep is the `assistant`, so the model continues its own voice rather
 * than being handed a transcript to summarize.
 */
function buildMessages(
  snapshot: InterviewSnapshot,
  coachMessage: string | null,
): { role: "user" | "assistant"; content: string }[] {
  const messages: { role: "user" | "assistant"; content: string }[] = [];

  for (const turn of snapshot.turns) {
    messages.push({
      role: turn.role === "coach" ? "user" : "assistant",
      content: turn.content,
    });
  }

  if (coachMessage) {
    messages.push({ role: "user", content: coachMessage });
  }

  // The API requires the conversation to start with a user turn, and an
  // opening turn has no coach message at all.
  if (messages.length === 0 || messages[0].role !== "user") {
    messages.unshift({
      role: "user",
      content:
        "Start the interview. Introduce yourself in one sentence and ask your first question.",
    });
  }

  // Two coach messages can't sit back to back if a previous turn failed to
  // persist an assistant reply; collapse them so the API stays happy.
  const collapsed: typeof messages = [];
  for (const m of messages) {
    const last = collapsed[collapsed.length - 1];
    if (last && last.role === m.role) {
      last.content = `${last.content}\n\n${m.content}`;
    } else {
      collapsed.push({ ...m });
    }
  }

  return collapsed;
}

export type InterviewTurnResult =
  | { ok: true; turn: NormalizedTurn; mode: "live" | "mock" }
  | { ok: false; kind: string; message: string; mode: string };

/**
 * Runs one interview turn: build the prompt from current state, call the
 * provider, validate, and normalize. Persistence is the caller's job — this
 * function has no database access, which makes it testable end to end against
 * a real model without writing anything.
 */
export async function runInterviewTurn(
  snapshot: InterviewSnapshot,
  coachMessage: string | null,
): Promise<InterviewTurnResult> {
  const result: GenerateResult<InterviewTurnOutput> = await generateStructured({
    system: buildSystemPrompt(snapshot),
    messages: buildMessages(snapshot, coachMessage),
    schema: InterviewTurnSchema,
    effort: "medium",
    maxTokens: 8000,
    mockKey: snapshot.scratch.nextTopicId ?? "start",
  });

  if (!result.ok) {
    return { ok: false, kind: result.kind, message: result.message, mode: result.mode };
  }

  const turn = normalizeTurn(result.data, {
    knownNodeIds: new Set(snapshot.knowledge.map((k) => k.id)),
    existingTerms: new Set(snapshot.terms.map((t) => t.term.toLowerCase())),
  });

  if (!turn.assistantMessage) {
    return {
      ok: false,
      kind: "invalid_output",
      message: "The model returned an empty question.",
      mode: result.mode,
    };
  }

  return { ok: true, turn, mode: result.mode === "mock" ? "mock" : "live" };
}

export { TOPIC_BY_ID };
