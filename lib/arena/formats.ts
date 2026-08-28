import type { DebateFormat, DebateRoundSpec, RoundType } from "@/types/ngn";

export type FormatSpec = {
  id: DebateFormat;
  name: string;
  tagline: string;
  rounds: DebateRoundSpec[];
  estimateLabel: string;
  minMinutes: number;
  maxMinutes: number;
};

const PROMPTS: Record<RoundType, { label: string; prompt: string }> = {
  opening: {
    label: "Opening Argument",
    prompt:
      "Make your strongest case. State your claim, give a reason, and back it with evidence.",
  },
  rebuttal: {
    label: "Rebuttal",
    prompt:
      "Respond directly to your opponent's argument. Name the specific claim you are answering.",
  },
  counter: {
    label: "Counterargument",
    prompt:
      "Strengthen your position and answer the criticism aimed at it. Concede what is fair.",
  },
  closing: {
    label: "Closing Argument",
    prompt:
      "Summarise your strongest case. Tell the judge why your reasoning held up better.",
  },
};

function round(
  index: number,
  type: RoundType,
  maxCharacters: number,
  timeLimitSeconds: number,
): DebateRoundSpec {
  return {
    index,
    type,
    label: PROMPTS[type].label,
    prompt: PROMPTS[type].prompt,
    maxCharacters,
    timeLimitSeconds,
  };
}

export const FORMATS: Record<DebateFormat, FormatSpec> = {
  quick: {
    id: "quick",
    name: "Quick Debate",
    tagline: "Two rounds. One clean exchange.",
    estimateLabel: "5–8 min",
    minMinutes: 5,
    maxMinutes: 8,
    rounds: [round(0, "opening", 600, 180), round(1, "rebuttal", 600, 180)],
  },
  standard: {
    id: "standard",
    name: "Standard Debate",
    tagline: "Four rounds. Open, rebut, counter, close.",
    estimateLabel: "10–20 min",
    minMinutes: 10,
    maxMinutes: 20,
    rounds: [
      round(0, "opening", 800, 180),
      round(1, "rebuttal", 800, 180),
      round(2, "counter", 800, 180),
      round(3, "closing", 800, 120),
    ],
  },
  deep: {
    id: "deep",
    name: "Deep Debate",
    tagline: "Six rounds. Evidence-led, long form.",
    estimateLabel: "25–40 min",
    minMinutes: 25,
    maxMinutes: 40,
    rounds: [
      round(0, "opening", 1200, 300),
      round(1, "rebuttal", 1200, 300),
      round(2, "counter", 1200, 300),
      round(3, "rebuttal", 1200, 240),
      round(4, "counter", 1200, 240),
      round(5, "closing", 1000, 180),
    ],
  },
};

export const FORMAT_LIST = Object.values(FORMATS);

export function formatFor(format: DebateFormat): FormatSpec {
  return FORMATS[format];
}

export function roundsFor(format: DebateFormat): DebateRoundSpec[] {
  return FORMATS[format].rounds;
}
