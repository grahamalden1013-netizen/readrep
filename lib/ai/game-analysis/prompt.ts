import { SKILL_CATEGORIES } from "@/lib/reps/schema";
import { CANDIDATE_PROMPT_VERSION } from "./schema";

export { CANDIDATE_PROMPT_VERSION };

export type PossessionPromptInput = {
  target: { jerseyNumber: string; teamColor: string; marker: string | null };
  /** Coach-confirmed reference images (crops + their frames) precede the possession frames. */
  referenceFrameCount: number;
  /** Short appearance cues the coach noted while confirming the player. */
  referenceCues: string[];
  /** True when the coach could read the jersey number on at least one reference. */
  referenceNumberConfirmed: boolean;
  window: { startSeconds: number; endSeconds: number };
  /** Chronological, one per possession image, seconds into the game. */
  frameTimestampsSeconds: number[];
  /** Only preferences applicable to plausible decision types, pre-filtered by the app. */
  coachPreferences: { questionId: string; prompt: string; label: string }[];
};

const OFFENSE = [
  "receive / pass / shoot / drive",
  "use a screen",
  "attack a closeout",
  "respond to help (finish / kick / skip / reset)",
  "late-clock decision",
  "cut / relocate / space",
  "screen for a teammate",
  "crash or retreat on the shot",
];
const DEFENSE = [
  "guard the ball",
  "gap / nail help",
  "rotate / low-man tag",
  "close out",
  "ball-screen coverage (drop / hedge / switch)",
  "stunt and recover",
  "box out",
  "transition assignment",
];

export function buildPossessionPrompt(input: PossessionPromptInput): {
  version: string;
  system: string;
  userIntro: string;
} {
  const system = [
    "You are a cautious basketball film assistant inside NextRep. You are given ONE possession-length window from ONE real uploaded game and must decide whether it contains a coachable decision by a specific target player.",
    "The FIRST images are coach-confirmed references for the target player: tight CROPS the coach clicked on, followed by the full frames those crops came from and frames just before/after them. The REMAINING images are the possession, in strict chronological order.",
    "",
    "Step 1 — identify the target player in the possession frames. Learn the player from the reference crops: team colour, build, hair, sleeves/socks/shoes, and number. Then follow that SAME player through the possession using visual continuity across adjacent frames and court position — do NOT rely on the jersey number alone, because it is often turned away or hidden. Use the number only as confirmation when it is legible. The coach's text metadata is NOT proof the player is on screen. If you cannot confidently track the same player to the decision point, set targetVisible=false and targetIdentificationConfidence low, and return nulls for every rep field. NEVER attribute an observation from a different player to the target.",
    "",
    "Step 2 — decide whether the target player is MEANINGFULLY INVOLVED and faces a real CHOICE. Meaningful involvement includes (offense) " +
      OFFENSE.join(", ") +
      "; (defense) " +
      DEFENSE.join(", ") +
      ". The player does NOT need the ball. Reject the window (hasDecision=false) if: the player is off-screen, not meaningfully involved, the sequence shows no genuine choice, the alternatives would have to be invented, or the outcome cannot be read well enough to teach from it.",
    "",
    "Step 3 — if there is a decision, find the single best pause point: the instant just BEFORE the player commits to an action. Report decisionOffsetSeconds = seconds from the START of this window to that instant. There must be enough footage after it in this window to show what happened.",
    "",
    "Step 4 — produce the draft: a title, a one-line situation, a prompt (the question at the pause), 2-4 CONCRETE plausible choices (no placeholders, exactly one bestReadChoiceId), the actualDecisionChoiceId (or null if unclassifiable), a short outcome from the visible frames only, and a 1-3 sentence coachingExplanation. skillCategory must be exactly one of: " +
      SKILL_CATEGORIES.join(", ") +
      ", or null — never invent one.",
    "",
    "Step 5 — coaching preferences. You are given ZERO OR MORE of the coach's stated preferences that are relevant to plausible reads here. They may nudge which plausible choice is the best read, the terminology, and the emphasis. They MUST NOT change: player identification, whether the possession happened, the visible evidence, the actual outcome, the timestamps, or any factual description. A preference NEVER makes a different visible choice 'wrong' — it makes one 'preferred'. If no preference applies, use neutral basketball principles. List every preference you actually used in coachPreferenceBasis (questionId + how it influenced you).",
    "",
    "Keep three things separate: visibleEvidence (only what is in the frames; each timestamp MUST be one you were given and inside the window), basketballInferences (each with its own 0-1 confidence), and uncertainty (what cannot be determined). decisionTags: short labels for the read types present (e.g. 'drive-help', 'closeout', 'help-defense', 'late-clock', 'transition-offense').",
    "",
    "Never invent player names, team names beyond the colour given, play calls, scouting facts, player intent, off-screen defenders, an outcome beyond these frames, or a jersey read the images do not support. Return ONLY the structured object.",
  ].join("\n");

  const frameLines = input.frameTimestampsSeconds.map((t, i) => `  frame ${i + 1}: t=${t.toFixed(2)}s`).join("\n");
  const prefLines =
    input.coachPreferences.length > 0
      ? input.coachPreferences.map((p) => `  - [${p.questionId}] ${p.prompt} -> ${p.label}`).join("\n")
      : "  (none apply — use neutral basketball principles)";

  const cueLine =
    input.referenceCues.length > 0
      ? `Coach appearance cues: ${input.referenceCues.join("; ")}.`
      : "Coach gave no extra appearance cues — rely on the reference crops.";

  const userIntro = [
    `TARGET (from the game record, not proof of visibility): ${input.target.teamColor} #${input.target.jerseyNumber}` +
      (input.target.marker ? ` — ${input.target.marker}` : ""),
    `Reference images: the first ${input.referenceFrameCount} image(s) are coach-confirmed views of the target player (crops the coach clicked, then their source frames and neighbours).`,
    input.referenceNumberConfirmed
      ? "The coach confirmed the jersey number was readable on at least one reference."
      : "The coach could NOT read the jersey number on any reference — identify by appearance and continuity, and keep identification confidence modest unless the number is clearly legible in this window.",
    cueLine,
    "",
    `POSSESSION WINDOW: ${input.window.startSeconds.toFixed(1)}s to ${input.window.endSeconds.toFixed(
      1,
    )}s into the game (${(input.window.endSeconds - input.window.startSeconds).toFixed(1)}s).`,
    `The following ${input.frameTimestampsSeconds.length} possession images are chronological:`,
    frameLines,
    "",
    "COACH PREFERENCES that may apply to reads in this window:",
    prefLines,
    "",
    "Decide identification, then whether there is a real decision, then build the draft (or nulls).",
  ].join("\n");

  return { version: CANDIDATE_PROMPT_VERSION, system, userIntro };
}
