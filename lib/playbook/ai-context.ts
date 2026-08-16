import {
  COVERAGE_LABELS,
  ROLE_LABELS,
  allQuestions,
  type Answers,
  type Coverage,
  type Tag,
} from "@/lib/playbook/questions";
import { getPlaybook, type Playbook, type PlaybookTerm, type CoverageRule } from "@/lib/playbook/queries";
import { getTeam } from "@/lib/teams/queries";
import {
  getTeamKnowledge,
  readsToPrompt,
  selectReads,
  type RetrievedRead,
  type Situation,
} from "@/lib/interview/retrieval";
import type { KnowledgeNode } from "@/lib/interview/types";

export type { Situation };

export type ContextEntry = { label: string; value: string };
export type ContextGroup = { heading: string; entries: ContextEntry[] };

export type TeamBasketballContext = {
  teamName: string;
  situation: Situation | null;
  groups: ContextGroup[];
  terminology: PlaybookTerm[];
  coverageRules: CoverageRule[];
  /** Situation-scoped reads from the AI interview's knowledge graph. */
  reads: RetrievedRead[];
  /** Provider-agnostic flattening, for whatever model layer sits on top. */
  toPrompt: () => string;
};

/** Which tags a situation makes relevant. Empty situation = everything. */
function tagsForSituation(situation: Situation | null | undefined): Set<Tag> | null {
  if (!situation || Object.keys(situation).length === 0) return null;

  const tags = new Set<Tag>(["identity", "priorities", "development"]);

  if (situation.phase === "offense") {
    tags.add("offense");
    tags.add("spacing");
    tags.add("shot_selection");
  }
  if (situation.phase === "defense") {
    tags.add("defense");
    tags.add("help");
    tags.add("rotation");
  }

  switch (situation.action) {
    case "ball_screen":
      tags.add("ball_screen");
      tags.add("screening");
      tags.add("spacing");
      if (situation.phase === "defense") tags.add("defensive_ball_screen");
      break;
    case "transition":
      tags.add("transition");
      tags.add("pace");
      if (situation.phase === "defense") tags.add("transition_defense");
      break;
    case "post":
      tags.add("post");
      break;
    case "drive_kick":
      tags.add("drive_kick");
      tags.add("paint_touch");
      tags.add("off_ball");
      break;
    case "half_court":
      tags.add("half_court");
      break;
    case "off_ball":
      tags.add("off_ball");
      tags.add("cutting");
      break;
  }

  if (situation.clock === "late") tags.add("late_clock");

  return tags;
}

function formatAnswer(
  key: string,
  answers: Answers,
  type: string,
): string | null {
  const a = answers[key];
  if (!a) return null;
  const parts: string[] = [];
  if (a.selections.length > 0) {
    // Order carries meaning for ranked questions, so number those.
    parts.push(
      type === "rank"
        ? a.selections.map((s, i) => `${i + 1}. ${s}`).join("; ")
        : a.selections.join(", "),
    );
  }
  if (a.customText?.trim()) parts.push(a.customText.trim());
  return parts.length > 0 ? parts.join(" — ") : null;
}

/**
 * Builds the coaching-intelligence context for a team, optionally narrowed to
 * a specific situation.
 *
 * This is the retrieval seam for the future film pipeline: analysis decides
 * *what happened*, and this supplies *how this coach wants it played*. It
 * deliberately contains no model-provider logic — callers get structured
 * groups plus a `toPrompt()` they can format however they need.
 *
 * Reads through RLS, so it returns null unless the caller coaches the team.
 */
export async function getTeamBasketballContext(
  teamId: string,
  situation?: Situation,
): Promise<TeamBasketballContext | null> {
  return getRelevantTeamBasketballContext({ teamId, situation });
}

/**
 * The retrieval entry point for the film pipeline.
 *
 * Pulls two layers and merges them: the structured knowledge graph built by
 * the AI interview (specific, situation-scoped reads) and the questionnaire
 * answers and coverage matrix from the guided playbook (broad identity and
 * principles). Both are narrowed to the situation, so a possession where the
 * defense switched never sees the coach's drop-coverage rules.
 */
export async function getRelevantTeamBasketballContext({
  teamId,
  situation,
}: {
  teamId: string;
  situation?: Situation;
}): Promise<TeamBasketballContext | null> {
  const [team, playbook, knowledge] = await Promise.all([
    getTeam(teamId),
    getPlaybook(teamId),
    getTeamKnowledge(teamId),
  ]);
  if (!playbook) return null;

  return buildContext(team?.name ?? "Team", playbook, situation ?? null, knowledge);
}

/** Pure builder — separated so it can be unit-tested without a database. */
export function buildContext(
  teamName: string,
  playbook: Playbook,
  situation: Situation | null,
  knowledge: KnowledgeNode[] = [],
): TeamBasketballContext {
  const wanted = tagsForSituation(situation);
  const questions = allQuestions();

  // Group answers by their first tag's owning section-ish heading.
  const groups: ContextGroup[] = [];
  const headingFor = (tags: Tag[]): string => {
    if (tags.includes("defensive_ball_screen")) return "Ball-screen defense";
    if (tags.includes("ball_screen")) return "Ball-screen offense";
    if (tags.includes("transition_defense")) return "Transition defense";
    if (tags.includes("transition")) return "Transition";
    if (tags.includes("zone")) return "Zone";
    if (tags.includes("defense")) return "Defensive identity";
    if (tags.includes("shot_selection")) return "Shot selection";
    if (tags.includes("development")) return "Teaching approach";
    if (tags.includes("priorities")) return "Coaching priorities";
    if (tags.includes("offense")) return "Offensive identity";
    if (tags.includes("identity")) return "Team";
    return "Other";
  };

  for (const q of questions) {
    if (wanted && !q.tags.some((t) => wanted.has(t))) continue;
    const value = formatAnswer(q.key, playbook.answers, q.type);
    if (!value) continue;

    const heading = headingFor(q.tags);
    let group = groups.find((g) => g.heading === heading);
    if (!group) {
      group = { heading, entries: [] };
      groups.push(group);
    }
    group.entries.push({ label: q.label, value });
  }

  // Coverage rules: the highest-value retrieval target. Narrow to the exact
  // coverage when the situation names one.
  let coverageRules = playbook.coverageRules;
  if (situation?.coverage) {
    coverageRules = coverageRules.filter((r) => r.coverage === situation.coverage);
  }
  if (situation?.phase) {
    coverageRules = coverageRules.filter((r) => r.phase === situation.phase);
  }
  if (situation && situation.action && situation.action !== "ball_screen") {
    // Ball-screen rules don't apply to a post-up or transition possession.
    coverageRules = [];
  }
  coverageRules = coverageRules.filter((r) => r.reads.length > 0 || r.note);

  // The knowledge graph is scoped by its own matcher, which understands
  // conditional chains and role scoping the questionnaire never captured.
  const reads = selectReads(knowledge, situation ?? {});

  const toPrompt = () => {
    const lines: string[] = [`TEAM: ${teamName}`];
    if (situation) {
      const bits = [
        situation.phase,
        situation.action?.replace(/_/g, " "),
        situation.coverage ? `vs ${COVERAGE_LABELS[situation.coverage]}` : null,
        situation.clock ? `${situation.clock} clock` : null,
      ].filter(Boolean);
      if (bits.length) lines.push(`SITUATION: ${bits.join(", ")}`);
    }

    // Interview knowledge first: it is the most specific thing ReadRep knows.
    if (reads.length > 0) {
      lines.push("", "HOW THIS COACH WANTS IT PLAYED");
      lines.push(readsToPrompt(reads));
    }

    for (const g of groups) {
      lines.push("", g.heading.toUpperCase());
      for (const e of g.entries) lines.push(`- ${e.label} ${e.value}`);
    }

    if (coverageRules.length > 0) {
      lines.push("", "BALL-SCREEN RULES");
      const byCoverage = new Map<string, CoverageRule[]>();
      for (const r of coverageRules) {
        const list = byCoverage.get(r.coverage) ?? [];
        list.push(r);
        byCoverage.set(r.coverage, list);
      }
      for (const [coverage, rules] of byCoverage) {
        lines.push(`  vs ${COVERAGE_LABELS[coverage as Coverage] ?? coverage}:`);
        for (const r of rules) {
          const detail = [r.reads.join(", "), r.note].filter(Boolean).join(" — ");
          lines.push(`    - ${ROLE_LABELS[r.role] ?? r.role}: ${detail}`);
        }
      }
    }

    if (playbook.terms.length > 0) {
      lines.push("", "TEAM TERMINOLOGY");
      for (const t of playbook.terms) {
        lines.push(`- ${t.term} (${t.category}): ${t.meaning}`);
      }
    }

    return lines.join("\n");
  };

  return {
    teamName,
    situation,
    groups,
    terminology: playbook.terms,
    coverageRules,
    reads,
    toPrompt,
  };
}

/** Rough completeness signal, used to nudge coaches toward richer context. */
export function playbookCoverage(answers: Answers): { answered: number; total: number } {
  const all = allQuestions();
  const answered = all.filter((q) => {
    const a = answers[q.key];
    return a && (a.selections.length > 0 || Boolean(a.customText?.trim()));
  }).length;
  return { answered, total: all.length };
}
