import {
  AREAS,
  AREA_BY_ID,
  deriveSignals,
  type Area,
  type SystemSignals,
} from "@/lib/interview/areas";
import type { AreaState, InterviewSnapshot, KnowledgeNode, Unknown } from "@/lib/interview/types";

/**
 * Which question is worth asking next, and which are not worth asking at all.
 *
 * The old interview walked a syllabus: the next question was the next empty
 * field. This scores every area by how much answering it would change ReadRep's
 * reading of this team's film, subtracts what the coach has already told us
 * (directly or by implication), and applies a rising bar as the conversation
 * gets longer. The model still writes the question; it may only write one
 * about an area this file says is worth asking.
 */

export type Redundancy = {
  /** 0-1. Above SKIP_REDUNDANCY the question must not be asked. */
  score: number;
  reason: string | null;
};

export type AreaAssessment = {
  area: Area;
  /** 0-1, adaptive to this team's system. */
  relevance: number;
  /** 0-1 from confirmed knowledge, capped by how much is actually stored. */
  confidence: number;
  confirmedCount: number;
  inferredCount: number;
  redundancy: Redundancy;
  openUnknowns: Unknown[];
  /** Expected value of asking about this area next. */
  gain: number;
  /** True when this area should not be asked about right now. */
  skip: boolean;
  skipReason: string | null;
};

export type Readiness = {
  status: "learning" | "almost_ready" | "film_ready";
  /** Plain language for the coach. Never a percentage. */
  headline: string;
  reason: string;
  /** 0-1, internal only. */
  score: number;
  essentialsMissing: Area[];
  blockingUnknowns: Unknown[];
};

/** An area whose redundancy clears this is never asked about. */
export const SKIP_REDUNDANCY = 0.7;

/** An area must be worth at least this much to be asked about at all. */
const BASE_THRESHOLD = 0.12;

/** How much more a question must be worth per question already asked. */
const FATIGUE_PER_QUESTION = 0.018;

const MAX_THRESHOLD = 0.34;

/** Relevance below this means the area does not apply to this team. */
export const RELEVANT_ENOUGH = 0.25;

/**
 * The rising bar. Early on ReadRep will ask about a moderately useful area;
 * eight questions in, only something that genuinely changes a film read is
 * worth another minute of the coach's time.
 */
export function questionThreshold(questionsAsked: number): number {
  return Math.min(MAX_THRESHOLD, BASE_THRESHOLD + FATIGUE_PER_QUESTION * questionsAsked);
}

/** Everything the coach has said, plus everything ReadRep confirmed from it. */
export function systemText(snapshot: {
  knowledge: KnowledgeNode[];
  turns: { role: string; content: string }[];
}): string {
  const fromCoach = snapshot.turns.filter((t) => t.role === "coach").map((t) => t.content);
  const fromKnowledge = snapshot.knowledge
    .filter((k) => k.provenance === "confirmed")
    .map((k) => `${k.trigger ?? ""} ${k.instruction}`);
  return [...fromCoach, ...fromKnowledge].join(" ").toLowerCase();
}

export function signalsFor(snapshot: {
  knowledge: KnowledgeNode[];
  turns: { role: string; content: string }[];
}): SystemSignals {
  return deriveSignals(systemText(snapshot));
}

/**
 * Has the coach already answered this, one way or another?
 *
 * Four ways an area can already be covered, in descending strength:
 *  - directly, with enough confirmed facts to meet the area's needs
 *  - directly, with at least one confirmed fact
 *  - indirectly, where the coach's own words touch the area but nothing was
 *    extracted into it
 *  - by inference, which only counts as redundant for low-impact areas — a
 *    guess is not good enough to skip something that drives film analysis
 *
 * An open unknown in the area pulls redundancy back down: there is a specific
 * missing piece, so the area is not finished no matter how much sits in it.
 */
export function redundancyFor(
  area: Area,
  facts: { confirmedCount: number; inferredCount: number; text: string; openUnknowns: Unknown[] },
): Redundancy {
  const needed = Math.max(1, area.needs.length);

  let score = 0;
  let reason: string | null = null;

  if (facts.confirmedCount >= needed) {
    score = 0.95;
    reason = `The coach already covered ${area.label.toLowerCase()} directly.`;
  } else if (facts.confirmedCount > 0) {
    score = 0.5 + 0.4 * (facts.confirmedCount / needed);
    reason = `Partly answered already (${facts.confirmedCount} of ~${needed} things known).`;
  } else {
    const hits = area.evidence.filter((word) => facts.text.includes(word));
    if (hits.length >= 2) {
      score = 0.45;
      reason = `The coach's answers already touch this ("${hits.slice(0, 2).join('", "')}").`;
    } else if (hits.length === 1) {
      score = 0.25;
      reason = `Mentioned in passing ("${hits[0]}").`;
    }
  }

  // A guess only excuses a question when the area barely moves a film read.
  if (facts.inferredCount > 0 && area.filmImpact < 0.6) {
    score = Math.max(score, 0.75);
    reason = `A reasonable inference covers this, and it barely changes a film read.`;
  }

  if (facts.openUnknowns.length > 0) {
    const worst = Math.max(...facts.openUnknowns.map((u) => u.importance));
    score = Math.min(score, 1 - worst);
    reason = `Still a specific gap here: ${facts.openUnknowns[0].question}`;
  }

  return { score: Math.min(1, Math.max(0, score)), reason };
}

export function assessAreas(snapshot: {
  knowledge: KnowledgeNode[];
  areaStates: AreaState[];
  unknowns: Unknown[];
  turns: { role: string; content: string }[];
}): AreaAssessment[] {
  const signals = signalsFor(snapshot);
  const text = signals.text;
  const stateById = new Map(snapshot.areaStates.map((s) => [s.areaId, s]));
  const questionsAsked = snapshot.turns.filter((t) => t.role === "assistant").length;
  const threshold = questionThreshold(questionsAsked);

  return AREAS.map((area) => {
    const nodes = snapshot.knowledge.filter((k) => k.areaId === area.id);
    const confirmedCount = nodes.filter((n) => n.provenance === "confirmed").length;
    const inferredCount = nodes.length - confirmedCount;
    const openUnknowns = snapshot.unknowns.filter((u) => u.areaId === area.id);

    const relevance = clamp(area.relevance(signals));

    // The model's stated confidence only counts as far as confirmed facts back
    // it: claiming an area is understood with nothing stored earns very little.
    const claimed = stateById.get(area.id)?.confidence ?? 0;
    const evidence = Math.min(1, confirmedCount / Math.max(1, area.needs.length));
    const confidence = clamp(Math.min(claimed, 0.3 + 0.7 * evidence));

    const redundancy = redundancyFor(area, { confirmedCount, inferredCount, text, openUnknowns });

    const unknownBoost =
      openUnknowns.length === 0
        ? 1
        : 1 + 0.6 * Math.max(...openUnknowns.map((u) => u.importance));

    const gain = relevance * area.filmImpact * (1 - confidence) * (1 - redundancy.score) * unknownBoost;

    let skipReason: string | null = null;
    if (relevance < RELEVANT_ENOUGH) {
      skipReason = `Doesn't apply to how this team plays.`;
    } else if (redundancy.score >= SKIP_REDUNDANCY) {
      skipReason = redundancy.reason;
    } else if (gain < threshold) {
      skipReason = `Not worth another question at this point in the interview.`;
    }

    return {
      area,
      relevance,
      confidence,
      confirmedCount,
      inferredCount,
      redundancy,
      openUnknowns,
      gain: Number(gain.toFixed(3)),
      skip: skipReason !== null,
      skipReason,
    };
  });
}

/** Areas worth asking about right now, best first. */
export function rankedQuestions(snapshot: Parameters<typeof assessAreas>[0]): AreaAssessment[] {
  return assessAreas(snapshot)
    .filter((a) => !a.skip)
    .sort((a, b) => b.gain - a.gain);
}

/** Areas deliberately not asked about, with the reason. Used in reporting. */
export function skippedAreas(snapshot: Parameters<typeof assessAreas>[0]): AreaAssessment[] {
  return assessAreas(snapshot).filter((a) => a.skip);
}

/**
 * Film readiness.
 *
 * Weighted by relevance, so a team that doesn't run ball screens is not held
 * back by not having ball-screen reads, and a team whose whole offense is a
 * ball screen cannot be film-ready without them.
 */
export function calculateFilmReadiness(snapshot: Parameters<typeof assessAreas>[0]): Readiness {
  const assessments = assessAreas(snapshot);
  const relevant = assessments.filter((a) => a.relevance >= RELEVANT_ENOUGH);

  const totalWeight = relevant.reduce((sum, a) => sum + a.area.weight * a.relevance, 0);
  const earned = relevant.reduce((sum, a) => sum + a.area.weight * a.relevance * a.confidence, 0);
  const score = totalWeight === 0 ? 0 : earned / totalWeight;

  const essentialsMissing = assessments
    .filter((a) => a.area.essential && !(a.confirmedCount > 0 && a.confidence >= 0.5))
    .map((a) => a.area);

  const blockingUnknowns = relevant
    .filter((a) => a.relevance >= 0.5)
    .flatMap((a) => a.openUnknowns)
    .filter((u) => u.importance >= 0.7);

  if (essentialsMissing.length === 0 && score >= 0.55 && blockingUnknowns.length === 0) {
    return {
      status: "film_ready",
      headline: "Film-ready",
      reason: "I know enough to start reading film like your staff.",
      score: round(score),
      essentialsMissing,
      blockingUnknowns,
    };
  }

  if (essentialsMissing.length === 0 && score >= 0.4) {
    return {
      status: "almost_ready",
      headline: "Almost film-ready",
      reason: blockingUnknowns.length
        ? `One thing left: ${blockingUnknowns[0].question}`
        : "A couple more answers and I can read your film.",
      score: round(score),
      essentialsMissing,
      blockingUnknowns,
    };
  }

  return {
    status: "learning",
    headline: learningHeadline(assessments),
    reason: essentialsMissing.length
      ? `Still learning ${essentialsMissing[0].label.toLowerCase()}.`
      : "Still learning how your team plays.",
    score: round(score),
    essentialsMissing,
    blockingUnknowns,
  };
}

/** Names the phase of the conversation rather than a fake percentage. */
function learningHeadline(assessments: AreaAssessment[]): string {
  const known = (id: string) => (assessments.find((a) => a.area.id === id)?.confirmedCount ?? 0) > 0;

  if (!known("offense.identity") && !known("defense.identity")) return "Learning your identity";
  if (!known("offense.shot_selection") || !known("defense.principles")) return "Learning your reads";
  if (!known("program.priorities")) return "Learning what you coach";
  return "Learning your language";
}

/**
 * Should the interview stop asking?
 *
 * Either ReadRep has what it needs, or nothing left is worth the coach's time.
 * The coach can always keep teaching — this only ends the *mandatory* part.
 */
export function shouldEndOnboarding(snapshot: Parameters<typeof assessAreas>[0]): {
  end: boolean;
  reason: string;
} {
  const readiness = calculateFilmReadiness(snapshot);
  if (readiness.status === "film_ready") {
    return { end: true, reason: readiness.reason };
  }

  const open = rankedQuestions(snapshot);
  if (open.length === 0) {
    return {
      end: true,
      reason: "Nothing left that would meaningfully change how I read your film.",
    };
  }

  return { end: false, reason: `Next: ${open[0].area.label}` };
}

const clamp = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);
const round = (n: number) => Number(n.toFixed(2));

export { AREA_BY_ID };
export type { InterviewSnapshot };
