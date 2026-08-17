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
  /** True when this area gates film-readiness for this team. */
  core: boolean;
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

/**
 * How much more a question must be worth per question already asked.
 *
 * Steep on purpose. The first version rose by 0.018 to a ceiling of 0.34 —
 * which was below the floor gain of every single area (the cheapest,
 * `program.language`, is 0.40). No area could ever age out, so the interview
 * could only end by reaching film-ready, and ran to its cap instead. The
 * ceiling now sits above the low-value areas so they genuinely drop away.
 */
const FATIGUE_PER_QUESTION = 0.045;

const MAX_THRESHOLD = 0.62;

/**
 * After this many substantive answers, having covered what matters is enough.
 * Past this point ReadRep would rather start reading film than keep asking.
 */
export const SOFT_STOP_ANSWERS = 10;

/** Relevance below this means the area does not apply to this team. */
export const RELEVANT_ENOUGH = 0.25;

/**
 * Core areas: what ReadRep must understand before it can read a possession.
 *
 * Offensive and defensive identity, the principles and actions this team
 * actually runs, a few decision rules, and what the coach corrects. NOT a
 * complete playbook — transition detail, late-clock rules and terminology are
 * all genuinely useful and none of them gate readiness.
 *
 * Readiness is scored over this set alone. Scoring it over every applicable
 * area punished ReadRep for the low-value questions it had correctly decided
 * not to ask: a coach who had explained everything that matters still scored
 * 0.34 against a 0.55 bar, because eight areas nobody should ask about sat at
 * zero in the denominator.
 */
export function isCoreArea(area: Area, relevance: number): boolean {
  return area.essential || (relevance >= 0.8 && area.filmImpact >= 0.85);
}

/**
 * How much one area is understood, from confirmed facts alone.
 *
 * A single clear statement — "man to man, we take away the paint first" —
 * genuinely tells ReadRep most of what it needs about an area, so the first
 * confirmed fact is worth 0.6 and further facts fill in the rest. Requiring a
 * linear count meant a coach had to repeat themselves to move the needle.
 */
export function confidenceFrom(confirmedCount: number, needs: number): number {
  if (confirmedCount <= 0) return 0;
  const span = Math.max(1, needs - 1);
  return clamp(0.6 + 0.4 * ((confirmedCount - 1) / span));
}

/** Coach turns that actually said something. "Depends." is not an answer. */
export function substantiveAnswers(turns: { role: string; content: string }[]): number {
  return turns.filter((t) => t.role === "coach" && t.content.trim().split(/\s+/).length >= 3).length;
}

/**
 * The rising bar. Early on ReadRep will ask about a moderately useful area;
 * ten questions in, only something that genuinely changes a film read is worth
 * another minute of the coach's time.
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
    score = 0.4 + 0.5 * (facts.confirmedCount / needed);
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

    // Confidence is evidence, full stop. The model used to report its own
    // coverage per area; it no longer can, which removes the one place it
    // could talk ReadRep into believing it knew more than it had stored.
    // An area is understood exactly as far as there are confirmed facts in it.
    const status = stateById.get(area.id)?.status;
    const confidence =
      status === "not_applicable" ? 0 : confidenceFrom(confirmedCount, area.needs.length);

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
      core: isCoreArea(area, relevance),
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
  const core = assessments.filter((a) => a.core && a.relevance >= RELEVANT_ENOUGH);
  const answers = substantiveAnswers(snapshot.turns);

  // Scored over the core only. A coach who has explained their identity,
  // principles, actions, key reads and priorities is readable, whether or not
  // ReadRep ever asked about late-clock rules or terminology.
  const totalWeight = core.reduce((sum, a) => sum + a.area.weight * a.relevance, 0);
  const earned = core.reduce((sum, a) => sum + a.area.weight * a.relevance * a.confidence, 0);
  const score = totalWeight === 0 ? 0 : earned / totalWeight;

  const essentialsMissing = assessments
    .filter((a) => a.area.essential && a.confirmedCount === 0)
    .map((a) => a.area);

  /**
   * A hole: a core area with nothing confirmed in it at all. An aggregate can
   * hide the one thing that matters — a team whose whole offense is a side ball
   * screen can score well elsewhere and still be unreadable — so every core
   * area needs at least one real fact before ReadRep claims it can read film.
   */
  const holes = core.filter((a) => a.confirmedCount === 0).map((a) => a.area);

  /**
   * Which gaps actually block.
   *
   * Previously any unknown at importance >= 0.7 in a moderately relevant area
   * blocked readiness, and unknowns only closed when the model echoed their
   * exact text back — so they accumulated and permanently pinned a coach at
   * "almost ready". A gap now blocks only when it is genuinely load-bearing:
   * near-certain importance, in a core area, and in an area ReadRep knows
   * NOTHING about yet. Once there is a confirmed fact in an area, a residual
   * question there is something to learn later, not a reason to refuse film.
   */
  const blockingUnknowns = core
    .filter((a) => a.confirmedCount === 0)
    .flatMap((a) => a.openUnknowns)
    .filter((u) => u.importance >= 0.8);

  const coreCovered = holes.length === 0 && essentialsMissing.length === 0;

  // 0.62 rather than 0.60: one confirmed fact in every core area scores exactly
  // 0.60, and "I know the headline of everything" is a shade thin to start
  // grading decisions on. A little depth somewhere is a cheap guard against a
  // model that extracted broadly but shallowly.
  if (coreCovered && score >= 0.62 && blockingUnknowns.length === 0) {
    return {
      status: "film_ready",
      headline: "Film-ready",
      reason: "I know enough to start reading film like your staff.",
      score: round(score),
      essentialsMissing: [],
      blockingUnknowns: [],
    };
  }

  /**
   * Enough talking. Once the core is covered and the coach has given ten real
   * answers, ReadRep would rather start reading film than keep asking — the
   * remaining questions are refinements, and it goes on learning from film and
   * from the coach afterwards either way.
   */
  if (coreCovered && answers >= SOFT_STOP_ANSWERS) {
    return {
      status: "film_ready",
      headline: "Film-ready",
      reason: "I know enough to start reading film like your staff.",
      score: round(score),
      essentialsMissing: [],
      blockingUnknowns: [],
    };
  }

  if (essentialsMissing.length === 0 && score >= 0.35) {
    return {
      status: "almost_ready",
      headline: "Almost film-ready",
      reason: holes.length
        ? `Still need your ${holes[0].label.toLowerCase()} — it's central to how you play.`
        : blockingUnknowns.length
          ? `One thing left: ${blockingUnknowns[0].question}`
          : "A couple more answers and I can read your film.",
      score: round(score),
      essentialsMissing: [...essentialsMissing, ...holes],
      blockingUnknowns,
    };
  }

  return {
    status: "learning",
    headline: learningHeadline(assessments),
    reason: essentialsMissing.length
      ? `Still learning ${essentialsMissing[0].label.toLowerCase()}.`
      : holes.length
        ? `Still learning ${holes[0].label.toLowerCase()}.`
        : "Still learning how your team plays.",
    score: round(score),
    essentialsMissing: [...essentialsMissing, ...holes],
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
  if (readiness.status === "film_ready") return { end: true, reason: readiness.reason };

  const open = rankedQuestions(snapshot);
  if (open.length === 0) {
    return {
      end: true,
      reason: "Nothing left that would meaningfully change how I read your film.",
    };
  }

  /**
   * Past the soft stop, only a high-value question earns another minute. If
   * the best thing left is a refinement, ReadRep stops rather than grinding
   * through the tail of the framework — the coach can keep teaching it later.
   */
  const answers = substantiveAnswers(snapshot.turns);
  if (answers >= SOFT_STOP_ANSWERS && open[0].gain < HIGH_VALUE_GAIN) {
    return {
      end: true,
      reason: "What's left is refinement — better to start reading film and learn the rest from it.",
    };
  }

  return { end: false, reason: `Next: ${open[0].area.label}` };
}

/** Past the soft stop, a question must be worth at least this much to ask. */
export const HIGH_VALUE_GAIN = 0.45;

const clamp = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);
const round = (n: number) => Number(n.toFixed(2));

export { AREA_BY_ID };
export type { InterviewSnapshot };
