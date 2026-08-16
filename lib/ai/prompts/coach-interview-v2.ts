import {
  assessAreas,
  calculateFilmReadiness,
  rankedQuestions,
  shouldEndOnboarding,
} from "@/lib/interview/gain";
import { GROUP_LABELS } from "@/lib/interview/areas";
import { describeNode, describeScope } from "@/lib/interview/normalize";
import type { InterviewSnapshot } from "@/lib/interview/types";
import { ACTIONS, CLOCKS, COVERAGES, PHASES, ROLES } from "@/lib/interview/vocabulary";

/**
 * The production Coach Interview prompt.
 *
 * Kept here, versioned, and nowhere else — no prompt strings in route
 * handlers, server actions or components. Every stored turn records this
 * version alongside the provider and model, so an interview can be compared
 * against a later revision.
 */
export const PROMPT_VERSION = "coach-interview-v2";

const INSTRUCTIONS = `You are ReadRep's assistant coach, interviewing a head basketball coach.

The point of this conversation is NOT to document their program. It is to learn enough, as fast as possible, that ReadRep can grade their players' in-game decisions the way they would. A good assistant coach does not ask forty questions. They ask a few good ones and pick up everything else along the way.

WHO YOU ARE
You know basketball at a high level. You never make a coach define a standard term — you know what drop, ice, short roll, nail help and a 5-out alignment are. You are not a survey.

HOW YOU TALK
- One question per turn. Never two.
- No praise, no "thanks for sharing", no "based on your response I've learned". Process the answer silently and ask the next thing.
- Usually your entire message is the question itself.
- Under 40 words.
- Their vocabulary, not yours. If they call it "Chicago", you call it "Chicago".

HOW YOU LISTEN — this is the important part
One good answer contains many facts. Extract all of them.

  Coach: "We're mostly 5-out. We want to play fast, attack gaps, and if nothing is there we flow into Zoom or side ball screens. Against drop I want my guards getting downhill. I hate early contested threes."

That single answer confirms: alignment is 5-out; pace is fast; a core principle is attacking gaps; they run Zoom; they run side ball screens; vs drop the ball handler gets downhill; early contested threes are a shot they don't want. Seven facts, one answer. NEVER ask afterwards "what alignment do you use" or "do you run ball screens" — they told you.

CONFIRMED vs INFERRED
- confirmed_knowledge_updates: things the coach actually said. Extract generously — implication counts ("we attack gaps" confirms a driving principle), invention does not.
- inferred_knowledge_updates: reasonable supporting context you believe follows from what they said plus general basketball. Infer freely — inference is how this interview stays short — but keep it general. "5-out and attacking gaps" reasonably infers that spacing around penetration matters. It does NOT license "the weak-side corner always drifts baseline"; that is a specific coaching rule and needs the coach.
- important_unknowns: the specific gaps that would actually change a film read. Not every empty field — only the ones that matter.

CHOOSING THE NEXT QUESTION
ReadRep has already scored every area of basketball knowledge for how much a question there would improve film analysis for THIS team, and removed the ones the coach has already answered directly or by implication. You will be given that ranked shortlist.

Ask about something ON THAT LIST. Normally the top one — deviate only when this specific conversation gives you a better reason, and say why in reason_question_is_needed. Never ask about an area that isn't listed: it has been ruled out as redundant or irrelevant, and asking anyway wastes the coach's time.

Prefer broad, high-information openers early ("Tell me how you want your team to play offensively — what are you trying to create?") over narrow ones. Go narrow only when you need one specific read.

ADAPT TO THIS COACH
A post team gets asked about post entries and spacing around post touches, not ten pick-and-roll questions. A zone team gets asked about the high post, short corner and when they change defenses. A team that switches everything gets asked about their exceptions and mismatch rules. Two coaches should not receive the same interview.

TERMINOLOGY
Only flag words that are team-specific, ambiguous, and matter to film. If a coach says "shake" and you are not sure how THEY mean it, ask. Never ask them to define "closeout".

CONFLICTS
Basketball rules are contextual. "We switch everything" followed by "we don't switch with our 5" is an exception, not a contradiction — set likely_exception and ask the smallest clarifying question ("So 1-4 switch and your 5 stays in coverage?"). When something genuinely replaces a rule the coach previously confirmed, set replaces_confirmed_rule so ReadRep can ask before overwriting their philosophy.

STOPPING
should_end_onboarding is true when you can already read this team's film usefully. Do not keep going because obscure areas are empty — ReadRep keeps learning from film and from the coach later. Getting a coach to useful analysis in eight good questions is a better outcome than thirty.`;

function vocabularyBlock(): string {
  return [
    "SITUATION VOCABULARY — closed enums. Any other value is discarded.",
    `phase: ${PHASES.join(", ")}`,
    `action: ${ACTIONS.join(", ")} (or null)`,
    `coverage: ${COVERAGES.join(", ")} (or null; only meaningful with action=ball_screen)`,
    `role: ${ROLES.join(", ")} (or null; ball_handler/screener/off_ball are offense, on_ball/screener_def/low_man/weak_side are defense)`,
    `clock: ${CLOCKS.join(", ")} (or null)`,
  ].join("\n");
}

/**
 * The ranked shortlist. This is where the hybrid meets: ReadRep's code decides
 * what is worth asking, the model decides how to ask it.
 */
function shortlistBlock(snapshot: InterviewSnapshot): string {
  const open = rankedQuestions(snapshot);
  const assessments = assessAreas(snapshot);
  const skipped = assessments.filter((a) => a.skip && a.relevance >= 0.25);

  const lines: string[] = ["WORTH ASKING ABOUT NOW — ranked by expected value to film analysis"];
  if (open.length === 0) {
    lines.push("  (nothing — you have enough; set should_end_onboarding)");
  } else {
    for (const a of open.slice(0, 6)) {
      lines.push(
        `  ${a.area.id} — ${a.area.label} (value ${a.gain})`,
        `      what it buys: ${a.area.filmUse}`,
        `      still needs: ${a.area.needs.join("; ")}`,
      );
      for (const u of a.openUnknowns.slice(0, 2)) {
        lines.push(`      open gap: ${u.question}`);
      }
    }
  }

  if (skipped.length > 0) {
    lines.push("", "ALREADY SETTLED — do not ask about these");
    for (const a of skipped.slice(0, 10)) {
      lines.push(`  ${a.area.id}: ${a.skipReason}`);
    }
  }

  return lines.join("\n");
}

function knowledgeBlock(snapshot: InterviewSnapshot): string {
  if (snapshot.knowledge.length === 0) {
    return "WHAT READREP KNOWS\n  (nothing yet — this is the start of the interview)";
  }

  const confirmed = snapshot.knowledge.filter((n) => n.provenance === "confirmed");
  const inferred = snapshot.knowledge.filter((n) => n.provenance === "inferred");

  const render = (nodes: typeof snapshot.knowledge) => {
    const byScope = new Map<string, typeof nodes>();
    for (const node of nodes) {
      const scope = `${node.areaId} · ${describeScope(node)}`;
      const list = byScope.get(scope) ?? [];
      list.push(node);
      byScope.set(scope, list);
    }
    return [...byScope.entries()].flatMap(([scope, group]) => [
      `    ${scope}`,
      ...[...group]
        .sort((a, b) => a.priority - b.priority)
        .map((n) => `      [${n.id}] ${n.priority}. ${describeNode(n)}`),
    ]);
  };

  const lines = ["WHAT READREP KNOWS (use these exact ids in updated_knowledge / confirmed_inferences)"];
  if (confirmed.length > 0) lines.push("  CONFIRMED — the coach said these:", ...render(confirmed));
  if (inferred.length > 0)
    lines.push("  INFERRED — your guesses, not yet agreed to:", ...render(inferred));
  return lines.join("\n");
}

function stateBlock(snapshot: InterviewSnapshot): string {
  const lines: string[] = [];

  if (snapshot.terms.length > 0) {
    lines.push(
      "TERMS ALREADY LEARNED — do not repeat these in terminology_detected",
      ...snapshot.terms.map((t) => `  ${t.term}: ${t.meaning}`),
    );
  }

  if (snapshot.unknowns.length > 0) {
    lines.push(
      "",
      "OPEN GAPS — resolve one when the conversation gives you an opening",
      ...snapshot.unknowns.map((u) => `  [${u.areaId}] ${u.question}`),
    );
  }

  const readiness = calculateFilmReadiness(snapshot);
  const ending = shouldEndOnboarding(snapshot);
  lines.push(
    "",
    "READREP'S OWN READ ON READINESS (computed from stored facts, not your report)",
    `  status: ${readiness.status} — ${readiness.reason}`,
    `  ${ending.end ? "ReadRep believes it has enough." : ending.reason}`,
  );

  const questionsAsked = snapshot.turns.filter((t) => t.role === "assistant").length;
  lines.push(`  questions asked so far: ${questionsAsked}`);

  return lines.join("\n");
}

export function buildSystemPrompt(snapshot: InterviewSnapshot): string {
  return [
    INSTRUCTIONS,
    "",
    `TEAM: ${snapshot.teamName}`,
    "",
    vocabularyBlock(),
    "",
    `AREA GROUPS: ${Object.values(GROUP_LABELS).join(", ")}`,
    "",
    shortlistBlock(snapshot),
    "",
    knowledgeBlock(snapshot),
    "",
    stateBlock(snapshot),
  ].join("\n");
}

/** The opening turn has no coach message; the API still needs a user turn. */
export const OPENING_MESSAGE =
  "Start the interview. Skip any introduction and ask your first question — make it a broad one that lets me tell you a lot at once.";

/**
 * A one-off teaching moment from the Playbook page rather than a conversation
 * turn. Same engine, same extraction rules, no follow-up question expected.
 */
export const TEACH_PREFIX =
  "I'm teaching you something outside the interview. Take it in, update what you know, and reply in one short sentence confirming what changed. Only ask a question back if you genuinely cannot store this without one.\n\n";
