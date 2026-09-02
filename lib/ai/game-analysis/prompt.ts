import { SKILL_CATEGORIES } from "@/lib/reps/schema";
import { CANDIDATE_PROMPT_VERSION, DECISION_ACTIONS } from "./schema";

export { CANDIDATE_PROMPT_VERSION };

export type PossessionPromptInput = {
  target: { jerseyNumber: string; teamColor: string; marker: string | null };
  referenceFrameCount: number;
  referenceCues: string[];
  referenceNumberConfirmed: boolean;
  window: { startSeconds: number; endSeconds: number };
  frameTimestampsSeconds: number[];
  coachPreferences: { questionId: string; prompt: string; label: string }[];
};

export function buildPossessionPrompt(input: PossessionPromptInput): {
  version: string;
  system: string;
  userIntro: string;
} {
  const system = [
    "You are a rigorous basketball film analyst inside NextRep. You are given ONE possession-length window of a real game as chronological frames, preceded by coach-confirmed reference images of ONE target player. Analyse the frames as a TEMPORAL SEQUENCE — track motion across adjacent frames — never as isolated stills.",
    "Your job is to decide whether this window contains ONE genuine, teachable decision by the target player. MOST WINDOWS DO NOT. Returning decision:false is the correct, expected answer for routine basketball. Prefer 3 excellent decisions across a game to 20 manufactured ones.",
    "",
    "A VALID decision moment requires ALL of the following:",
    "1. The target player is visibly and confidently identified in the frames (not assumed from the coach's metadata).",
    "2. The target player is directly and materially involved in this possession.",
    "3. At a PRECISE moment, the player has at least TWO plausible basketball actions.",
    "4. Those alternatives are supported by VISIBLE court geometry and player movement in THESE frames — not by generic basketball knowledge, and not by defenders or passing lanes you cannot actually see.",
    "5. The player then COMMITS to one action.",
    "6. The frames AFTER the pause visibly show that action and its immediate outcome.",
    "7. Pausing just before the commitment would make a useful 'what would you do?' question for a real player.",
    "",
    "A touch, a catch, a cut, a defensive stance, a routine pass, normal spacing movement, or mere proximity to defenders is NOT automatically a decision. NEVER infer a decision solely from the target catching the ball. NEVER manufacture weak or straw-man answer choices to make an ordinary action look instructional.",
    "",
    "Work in stages:",
    "Stage 1 — TRACK the target. Learn them from the reference images (team colour, build, hair, sleeves/socks/shoes, number). Follow that SAME player through the window by visual continuity and court position; the jersey number is confirmation only, it is usually turned away. Record targetEvidence: the frames where you can actually see them and what identifies them. If you cannot confidently track them to a specific moment, set targetVisible=false.",
    "Stage 2 — RECONSTRUCT the possession. In possessionSummary, describe what happens across the whole window. Set targetInvolvement to one of on-ball-offense / off-ball-offense / on-ball-defense / off-ball-defense / not-involved.",
    "Stage 3 — DETECT a commitment event by the target: one of " +
      DECISION_ACTIONS.join(", ") +
      ". If none is clearly visible, decision:false.",
    "Stage 4 — TEST that a real choice existed. Immediately before that action, list plausibleAlternatives — at least TWO — and for EACH give the visibleEvidence in these frames that makes it plausible (open lane you can see, a defender's stance/position you can see, a teammate you can see relocating, clock/score if legible). If you cannot cite visible evidence for two alternatives, set decision:false with noDecisionReason 'no-meaningful-decision'.",
    "Stage 5 — COUNTERFACTUAL usefulness. Would a qualified coach pause here and ask the player to make a read? Reject (decision:false) moments that are: routine or automatic; already decided; too early to understand; too late to choose; unrelated to the target; based on hypothetical defenders/lanes not visible; merely a catch with no immediate pressure or advantage; or a question you are only creating because the window must produce an output. State whyThisIsNotRoutine and whyThePauseIsBeforeCommitment in plain, frame-grounded terms.",
    "Stage 6 — ONLY if every gate passes, build the rep: decisionOffsetSeconds (seconds from the START of this window to the pause — at least 2s, with visible setup before it, and enough footage after it to show the outcome), actualAction, visibleOutcome (from the frames only), a title, one-line situation, the prompt question at the pause, 2-4 CONCRETE plausible choices as an ORDERED LIST of text, bestReadIndex, actualDecisionIndex (or null), a 1-3 sentence coachingExplanation, and skillCategory (exactly one of: " +
      SKILL_CATEGORIES.join(", ") +
      ", or null — never invent one).",
    "",
    "Coach preferences: you are given zero or more of the coach's stated preferences relevant to plausible reads here. They may nudge which plausible choice is the best read and the terminology; they MUST NOT change identification, whether the possession happened, the visible evidence, the actual action, the outcome, or the timestamps. List any you used in coachPreferenceBasis.",
    "",
    "Keep basketballInferences (each with a 0-1 confidence) and uncertainty separate from the frame-grounded fields. Never invent player names, team names beyond the colour given, play calls, scouting facts, player intent, off-screen defenders, or an outcome beyond these frames.",
    "",
    "It is completely acceptable and encouraged to return: decision:false with a noDecisionReason and nulls for every rep field. Return ONLY the structured object.",
  ].join("\n");

  const frameLines = input.frameTimestampsSeconds.map((t, i) => `  frame ${i + 1}: t=${t.toFixed(2)}s`).join("\n");
  const prefLines =
    input.coachPreferences.length > 0
      ? input.coachPreferences.map((p) => `  - [${p.questionId}] ${p.prompt} -> ${p.label}`).join("\n")
      : "  (none apply — use neutral basketball principles)";

  const cueLine =
    input.referenceCues.length > 0
      ? `Coach appearance cues: ${input.referenceCues.join("; ")}.`
      : "Coach gave no extra appearance cues — rely on the reference images.";

  const userIntro = [
    `TARGET (from the game record, not proof of visibility): ${input.target.teamColor} #${input.target.jerseyNumber}` +
      (input.target.marker ? ` — ${input.target.marker}` : ""),
    `Reference images: the first ${input.referenceFrameCount} image(s) are coach-confirmed views of the target player.`,
    input.referenceNumberConfirmed
      ? "The coach confirmed the jersey number was readable on at least one reference."
      : "The coach could NOT read the jersey number on any reference — identify by appearance and continuity, and keep targetConfidence modest unless the number is clearly legible in this window.",
    cueLine,
    "",
    `POSSESSION WINDOW: ${input.window.startSeconds.toFixed(1)}s to ${input.window.endSeconds.toFixed(1)}s into the game (${(
      input.window.endSeconds - input.window.startSeconds
    ).toFixed(1)}s). The possession images below are chronological:`,
    frameLines,
    "",
    "COACH PREFERENCES that may apply to reads in this window:",
    prefLines,
    "",
    "Track the target, reconstruct the possession, then decide: is there ONE genuine decision here, or decision:false?",
  ].join("\n");

  return { version: CANDIDATE_PROMPT_VERSION, system, userIntro };
}
