import { GROUP_LABELS, type AreaGroup } from "@/lib/interview/areas";
import { assessAreas, calculateFilmReadiness, type Readiness } from "@/lib/interview/gain";
import { AREA_BY_ID } from "@/lib/interview/areas";
import { describeNode, describeScope } from "@/lib/interview/normalize";
import type {
  InterviewSnapshot,
  InterviewTurn,
  Provenance,
  RuleChange,
  Term,
} from "@/lib/interview/types";

/**
 * A plain, serializable projection for client components.
 *
 * The area framework carries predicate functions, which cannot cross the
 * server/client boundary. This flattens what the coach should actually see —
 * short phrases grouped the way a coach thinks, not a database populating
 * itself — and nothing more.
 */

export type FactView = {
  id: string;
  /** Short enough to read at a glance: "5-out", "Attack gaps". */
  label: string;
  provenance: Provenance;
  scope: string | null;
  children: { id: string; text: string }[];
};

export type KnowledgeGroupView = {
  group: AreaGroup;
  label: string;
  /** Sub-heading with its facts: "Principles" → ["Attack gaps", "Play fast"]. */
  sections: { area: string; facts: FactView[] }[];
};

export type InterviewView = {
  teamId: string;
  teamName: string;
  turns: InterviewTurn[];
  /** The one question on screen right now. */
  currentQuestion: string | null;
  suggestions: string[];
  groups: KnowledgeGroupView[];
  terms: Term[];
  ruleChanges: RuleChange[];
  readiness: { status: Readiness["status"]; headline: string; reason: string };
  /** True once ReadRep has told the coach it has enough. */
  ended: boolean;
  confirmedCount: number;
  inferredCount: number;
  openQuestionCount: number;
  questionsAsked: number;
};

/**
 * Turns an instruction into something readable in a sidebar. Long coaching
 * sentences get trimmed at a natural break rather than mid-word.
 */
function toLabel(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= 46) return trimmed;
  const cut = trimmed.slice(0, 46);
  const brk = Math.max(cut.lastIndexOf(", "), cut.lastIndexOf(" — "), cut.lastIndexOf(" "));
  return `${cut.slice(0, brk > 20 ? brk : 46).trimEnd()}…`;
}

export function toInterviewView(snapshot: InterviewSnapshot): InterviewView {
  const readiness = calculateFilmReadiness(snapshot);
  const assessments = assessAreas(snapshot);

  const childrenOf = new Map<string, { id: string; text: string }[]>();
  for (const node of snapshot.knowledge) {
    if (!node.parentId) continue;
    const list = childrenOf.get(node.parentId) ?? [];
    list.push({ id: node.id, text: describeNode(node) });
    childrenOf.set(node.parentId, list);
  }

  const groups: KnowledgeGroupView[] = (["offense", "defense", "program"] as AreaGroup[]).map(
    (group) => {
      const areas = assessments.filter((a) => a.area.group === group);
      const sections = areas
        .map((a) => {
          const facts = snapshot.knowledge
            .filter((n) => n.areaId === a.area.id && !n.parentId)
            .sort((x, y) => x.priority - y.priority)
            .map((n) => ({
              id: n.id,
              label: toLabel(describeNode(n)),
              provenance: n.provenance,
              scope: n.coverage || n.action ? describeScope(n) : null,
              children: childrenOf.get(n.id) ?? [],
            }));
          return { area: a.area.label, facts };
        })
        .filter((s) => s.facts.length > 0);

      return { group, label: GROUP_LABELS[group], sections };
    },
  );

  const lastAssistant = [...snapshot.turns].reverse().find((t) => t.role === "assistant");

  return {
    teamId: snapshot.teamId,
    teamName: snapshot.teamName,
    turns: snapshot.turns,
    currentQuestion: lastAssistant?.content ?? null,
    suggestions: snapshot.scratch.suggestions,
    groups,
    terms: snapshot.terms,
    ruleChanges: snapshot.ruleChanges,
    readiness: {
      status: readiness.status,
      headline: readiness.headline,
      reason: readiness.reason,
    },
    ended: Boolean(snapshot.scratch.endedAt),
    confirmedCount: snapshot.knowledge.filter((n) => n.provenance === "confirmed").length,
    inferredCount: snapshot.knowledge.filter((n) => n.provenance === "inferred").length,
    openQuestionCount: snapshot.unknowns.length,
    questionsAsked: snapshot.turns.filter((t) => t.role === "assistant").length,
  };
}

export { AREA_BY_ID };
export type { InterviewTurn };
