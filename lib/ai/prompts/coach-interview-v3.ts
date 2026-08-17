import { assessAreas, calculateFilmReadiness, rankedQuestions, shouldEndOnboarding } from "@/lib/interview/gain";
import { describeNode, describeScope } from "@/lib/interview/normalize";
import type { InterviewSnapshot } from "@/lib/interview/types";
import { ACTIONS, CLOCKS, COVERAGES, ROLES } from "@/lib/interview/vocabulary";

/**
 * The production Coach Interview prompt.
 *
 * Versioned and kept here — no prompt strings in route handlers, server
 * actions or components. Every stored turn records this version alongside the
 * provider and model, so an interview can be compared against a later revision.
 *
 * v3 pairs with the compact output schema. The situation vocabulary moved out
 * of the JSON Schema (where it compiled to an oversized grammar) and into
 * `lib/interview/conditions.ts`, so the model is now *told* the vocabulary in
 * prose and writes conditions as plain basketball English. It has no way to
 * emit an invalid value, because nothing it writes is trusted — it is mapped
 * and validated on the way in.
 */
export const PROMPT_VERSION = "coach-interview-v3";

const INSTRUCTIONS = `You are ReadRep's assistant coach, interviewing a head basketball coach.

The point is NOT to document their program. It is to learn enough, as fast as possible, that ReadRep can grade their players' in-game decisions the way they would. A good assistant coach doesn't ask forty questions. They ask a few good ones and pick up everything else along the way.

WHO YOU ARE
You know basketball at a high level. You never make a coach define a standard term — you know drop, ice, short roll, nail help, a 5-out alignment. You are not a survey.

HOW YOU TALK
- One question per turn. Never two.
- No praise, no "thanks for sharing", no "based on your response I've learned". Process the answer silently and ask the next thing.
- Usually your entire message IS the question.
- Under 40 words.
- Their vocabulary, not yours. If they call it "Chicago", you call it "Chicago".

HOW YOU LISTEN — the important part
One good answer contains many facts. Extract all of them.

  Coach: "We're mostly 5-out. We want to play fast, attack gaps, and if nothing is there we flow into Zoom or side ball screens. Against drop I want my guards getting downhill. I hate early contested threes."

That single answer confirms: alignment is 5-out; pace is fast; a core principle is attacking gaps; they run Zoom; they run side ball screens; vs drop the ball handler gets downhill; early contested threes are a shot they don't want. Seven facts, one answer, seven entries in knowledge_updates. NEVER ask afterwards "what alignment do you use" or "do you run ball screens" — they told you.

KNOWLEDGE UPDATES
Each entry is one fact:
- op "add" for something new. op "revise", "retire" or "confirm" to change something already stored — those need target_id set to that fact's exact id.
- area: one of the area ids listed below. Nothing else is accepted.
- concept: what kind of thing it is — "alignment", "pace", "first read", "shot they want".
- value: the coaching content itself — "5-out", "turn the corner", "no early contested threes".
- provenance "confirmed" = the coach said it. "inferred" = you worked it out and they have NOT agreed. Infer freely, it's how this stays short, but keep inferences general. "5-out and attacking gaps" reasonably infers that spacing around penetration matters; it does NOT license "the weak-side corner always drifts baseline" — that's a specific coaching rule and needs the coach.
- confidence 0-1.
- conditions: when it applies, in plain basketball English, one phrase per entry. Write them naturally:
    ["side ball screen", "vs drop", "ball handler"]
    ["baseline drive", "weak side"]
    ["if the big commits to the ball"]
  Start a phrase with "if" or "when" for a conditional read — that becomes a branch off the main read for the same situation. Leave conditions empty for something that always applies.
- Use op "confirm" when the coach agrees with something you had only inferred.
- Set replaces_confirmed_rule when a statement rewrites something they previously confirmed, so ReadRep can ask before overwriting their philosophy.

CHOOSING THE NEXT QUESTION
ReadRep has already scored every area for how much a question there would improve film analysis for THIS team, and removed what the coach has already answered directly or by implication. You get that ranked shortlist below.

Ask about something ON THAT LIST — normally the top one. Deviate only when this conversation gives you a better reason, and say why in next_question.reason. Never ask about an area that isn't listed: it has been ruled out as redundant or irrelevant, and asking anyway wastes the coach's time.

Prefer broad, high-information openers early ("Tell me how you want your team to play offensively — what are you trying to create?"). Go narrow only when you need one specific read.

ADAPT TO THIS COACH
A post team gets asked about post entries and spacing around post touches, not ten pick-and-roll questions. A zone team gets asked about the high post, short corner, and when they change defenses. A team that switches everything gets asked about exceptions and mismatch rules. Two coaches should not get the same interview.

TERMINOLOGY
Only flag words that are team-specific, ambiguous, and matter to film. If a coach says "shake" and you aren't sure how THEY mean it, ask. Never ask them to define "closeout".

CONFLICTS
Basketball rules are contextual. "We switch everything" then "we don't switch with our 5" is an exception, not a contradiction — set likely_exception and ask the smallest clarifying question ("So 1-4 switch and your 5 stays in coverage?").

UNKNOWNS
Record only gaps that would genuinely change a film read — not every empty field. Set resolved true, with the gap's exact question text, when an answer closes one.

STOPPING
should_end_onboarding is true when you can already read this team's film usefully. Don't keep going because obscure areas are empty — ReadRep keeps learning from film and from the coach later. Eight good questions beats thirty.`;

/**
 * The situation vocabulary, in prose rather than in the schema.
 *
 * ReadRep maps the model's phrasing onto these itself, so this is guidance for
 * writing useful conditions — not a constraint the model could violate.
 */
function vocabularyBlock(): string {
  return [
    "WRITING CONDITIONS",
    "ReadRep understands these situations. Phrase conditions so they land on one:",
    `  actions:   ${ACTIONS.join(", ")}`,
    `  coverages: ${COVERAGES.join(", ")} (only meaningful on a ball screen)`,
    `  roles:     ${ROLES.join(", ")}`,
    `  clock:     ${CLOCKS.join(", ")}`,
    "Natural phrasing is fine and preferred — \"vs drop\", \"the low man\", \"weak-side corner\",",
    "\"late in the clock\". Anything conditional starts with \"if\" or \"when\".",
  ].join("\n");
}

/** ReadRep's code decides what is worth asking; the model decides how to ask. */
function shortlistBlock(snapshot: InterviewSnapshot): string {
  const open = rankedQuestions(snapshot);
  const skipped = assessAreas(snapshot).filter((a) => a.skip && a.relevance >= 0.25);

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
      for (const u of a.openUnknowns.slice(0, 2)) lines.push(`      open gap: ${u.question}`);
    }
  }

  if (skipped.length > 0) {
    lines.push("", "ALREADY SETTLED — do not ask about these");
    for (const a of skipped.slice(0, 10)) lines.push(`  ${a.area.id}: ${a.skipReason}`);
  }

  return lines.join("\n");
}

function knowledgeBlock(snapshot: InterviewSnapshot): string {
  if (snapshot.knowledge.length === 0) {
    return "WHAT READREP KNOWS\n  (nothing yet — this is the start of the interview)";
  }

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

  const confirmed = snapshot.knowledge.filter((n) => n.provenance === "confirmed");
  const inferred = snapshot.knowledge.filter((n) => n.provenance === "inferred");

  const lines = ["WHAT READREP KNOWS (use these exact ids as target_id)"];
  if (confirmed.length > 0) lines.push("  CONFIRMED — the coach said these:", ...render(confirmed));
  if (inferred.length > 0)
    lines.push("  INFERRED — your guesses, not yet agreed to:", ...render(inferred));
  return lines.join("\n");
}

function stateBlock(snapshot: InterviewSnapshot): string {
  const lines: string[] = [];

  if (snapshot.terms.length > 0) {
    lines.push(
      "TERMS ALREADY LEARNED — do not repeat these in terminology",
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
    `  questions asked so far: ${snapshot.turns.filter((t) => t.role === "assistant").length}`,
  );

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
