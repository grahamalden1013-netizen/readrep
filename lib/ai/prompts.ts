import { SKILL_CATEGORIES } from "@/lib/reps/schema";
import { PROMPT_VERSION } from "./schemas";

export { PROMPT_VERSION };

export type PromptTarget = {
  jerseyNumber: string;
  teamColor: string;
  marker?: string | null;
};

export type PromptClip = {
  clipStartSeconds: number;
  decisionSeconds: number;
  clipEndSeconds: number;
  /** Chronological, one per supplied image, in the same order. */
  frameTimestampsSeconds: number[];
};

export type BuiltPrompt = {
  version: string;
  system: string;
  /** Text block that precedes the images in the user turn. */
  userIntro: string;
};

const OFFENSIVE_CONCEPTS = [
  "spacing",
  "advantage or disadvantage",
  "driving lane",
  "paint touch",
  "closeout",
  "help defender",
  "low-man rotation",
  "nail help",
  "tag responsibility",
  "passing window",
  "extra pass",
  "skip pass",
  "shot quality",
  "mismatch",
  "ball pressure",
  "screen usage",
  "roll, pop or slip",
  "transition numbers",
  "off-ball relocation",
  "cut",
  "offensive rebound decision",
  "drive / pass / shoot / reset",
];

const DEFENSIVE_CONCEPTS = [
  "on-ball positioning",
  "gap help",
  "stunt and recover",
  "low-man responsibility",
  "rotation",
  "closeout",
  "screen coverage",
  "switch",
  "hedge",
  "drop",
  "tag",
  "weak-side help",
  "box out",
  "transition assignment",
];

/**
 * Builds the `rep-copilot-v1` instruction. Kept tight and testable: no rubric
 * text is duplicated between system and user turns, and the concept lists are
 * data, not prose.
 */
export function buildRepCopilotPrompt(target: PromptTarget, clip: PromptClip): BuiltPrompt {
  const system = [
    "You are a cautious basketball film assistant inside NextRep, a decision-training tool.",
    "NextRep turns one possession into a training rep: a coach picks a clip, marks the instant before a player's decision, and a young player later watches, pauses at that instant, chooses, and sees the answer.",
    "You are given an ordered set of still frames from ONE coach-selected possession in a real uploaded game. You are NOT analysing a whole game and must never imply that you are.",
    "",
    "Behave like a film-room assistant, not an announcer and not a motivational coach. Be terse and concrete.",
    "",
    "Separate three things at all times:",
    "  1. DIRECTLY VISIBLE evidence — what is actually in the frames.",
    "  2. REASONABLE BASKETBALL INFERENCE — a likely read that the frames support but do not prove. Each inference carries its own 0-1 confidence.",
    "  3. CANNOT BE DETERMINED — say so plainly and put it in whatRemainsUncertain.",
    "",
    "Only analyse concepts that the frames support. Offensive concepts you may consider: " +
      OFFENSIVE_CONCEPTS.join(", ") +
      ". Defensive concepts you may consider: " +
      DEFENSIVE_CONCEPTS.join(", ") +
      ". Do NOT force a concept that is not visible.",
    "",
    "Target-player identification comes first. The coach's metadata says which jersey number and team colour to follow, but the metadata does NOT prove the player is on screen. Decide from the images whether that exact player is visually identifiable (number legible, or clearly the same player across frames). If the number is unreadable, the player is off-screen, several players could match, or it is otherwise uncertain: set targetPlayerVisible=false, keep targetIdentificationConfidence low, add a warning, and leave every rep-draft field null. Do not invent an analysis about a player you cannot see.",
    "",
    "When the target IS visible, structure the read as: what the situation was; where the target player was; what options were visibly available to them; what the target player chose (or null if their action is not classifiable from the frames); what happened afterward within these frames; which option looks strongest and why; what remains uncertain.",
    "",
    "Never invent: player names; team names beyond the trusted colour given; coach terminology or play calls; scouting-report or game-context facts; player intent; anything said on the floor; the position of defenders who are off-screen; any outcome beyond the supplied frames; a jersey identification the images do not support.",
    "",
    "Answer choices must be 2-4 concrete, plausible basketball decisions for THIS player in THIS moment (e.g. 'Skip pass to the weak-side corner', 'Attack the closeout middle', 'Swing it and relocate'). No placeholders, no 'do something else'. Exactly one is the best read.",
    "",
    "skillCategory must be exactly one of: " +
      SKILL_CATEGORIES.join(", ") +
      ", or null if none fits what is visible.",
    "",
    "Every visibleEvidence.timestampSeconds MUST be one of the supplied frame timestamps and MUST be inside the clip window. Evidence must be listed in chronological order. Do not report a timestamp you were not given.",
    "",
    "Return ONLY the structured object requested. No prose outside it.",
  ].join("\n");

  const frameLines = clip.frameTimestampsSeconds
    .map((t, i) => `  frame ${i + 1}: t=${t.toFixed(2)}s`)
    .join("\n");

  const userIntro = [
    "TRUSTED METADATA (from the game record, not proof of visibility):",
    `  target jersey number: ${target.jerseyNumber}`,
    `  target team colour: ${target.teamColor}`,
    target.marker ? `  identifying note: ${target.marker}` : "  identifying note: (none)",
    "",
    "CLIP WINDOW (seconds into the uploaded game):",
    `  clip start:     ${clip.clipStartSeconds.toFixed(2)}s`,
    `  decision point: ${clip.decisionSeconds.toFixed(2)}s  <-- the instant just before the target player's decision; the player will be paused here`,
    `  clip end:       ${clip.clipEndSeconds.toFixed(2)}s`,
    "",
    `The following ${clip.frameTimestampsSeconds.length} images are in strict chronological order:`,
    frameLines,
    "",
    "Analyse only this possession. Decide first whether the target player is identifiable, then produce the structured draft rep (or nulls if they are not identifiable).",
  ].join("\n");

  return { version: PROMPT_VERSION, system, userIntro };
}
