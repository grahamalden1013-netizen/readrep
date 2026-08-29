import {
  SKILL_CATEGORY_LABELS,
  type Difficulty,
  type PlayerResponse,
  type Rep,
  type SkillCategory,
  type SkillResult,
  type TrainingSession,
} from "./schema";

const DIFFICULTY_WEIGHT: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };

export type ScoredRep = {
  rep: Rep;
  response: PlayerResponse | null;
};

export type SessionScore = {
  total: number;
  answered: number;
  correct: number;
  /** Share of answered reps that were correct, 0–1. Null until one is answered. */
  accuracy: number | null;
  scoredReps: ScoredRep[];
  skills: SkillResult[];
  strength: SkillCategory | null;
  needsWork: SkillCategory | null;
  nextFocus: string | null;
};

function accuracyOf(result: SkillResult): number {
  return result.attempted === 0 ? 0 : result.correct / result.attempted;
}

export function scoreSession(reps: Rep[], responses: PlayerResponse[]): SessionScore {
  const responseByRep = new Map(responses.map((response) => [response.repId, response]));

  const scoredReps: ScoredRep[] = reps.map((rep) => ({
    rep,
    response: responseByRep.get(rep.id) ?? null,
  }));

  const answeredReps = scoredReps.filter((scored) => scored.response !== null);
  const correct = answeredReps.filter((scored) => scored.response?.isCorrect).length;

  const skillMap = new Map<SkillCategory, SkillResult>();
  for (const { rep, response } of answeredReps) {
    const existing = skillMap.get(rep.category) ?? {
      category: rep.category,
      attempted: 0,
      correct: 0,
    };
    skillMap.set(rep.category, {
      category: rep.category,
      attempted: existing.attempted + 1,
      correct: existing.correct + (response?.isCorrect ? 1 : 0),
    });
  }

  const skills = [...skillMap.values()].sort((a, b) =>
    SKILL_CATEGORY_LABELS[a.category].localeCompare(SKILL_CATEGORY_LABELS[b.category]),
  );

  // Several categories are often all-correct in a five-rep session; call the
  // hardest of them the strength rather than whichever sorted first.
  const hardestByCategory = new Map<SkillCategory, number>();
  for (const { rep } of answeredReps) {
    hardestByCategory.set(
      rep.category,
      Math.max(hardestByCategory.get(rep.category) ?? 0, DIFFICULTY_WEIGHT[rep.difficulty]),
    );
  }

  const ranked = [...skills].sort(
    (a, b) =>
      accuracyOf(b) - accuracyOf(a) ||
      (hardestByCategory.get(b.category) ?? 0) - (hardestByCategory.get(a.category) ?? 0),
  );
  const strength = ranked.length > 0 && accuracyOf(ranked[0]) > 0 ? ranked[0].category : null;
  const worst = ranked.at(-1) ?? null;
  const needsWork = worst && accuracyOf(worst) < 1 ? worst.category : null;

  const firstMiss =
    scoredReps.find(
      (scored) => scored.response && !scored.response.isCorrect && scored.rep.category === needsWork,
    ) ?? scoredReps.find((scored) => scored.response && !scored.response.isCorrect);

  return {
    total: reps.length,
    answered: answeredReps.length,
    correct,
    accuracy: answeredReps.length === 0 ? null : correct / answeredReps.length,
    scoredReps,
    skills,
    strength,
    needsWork,
    nextFocus: firstMiss?.rep.coachingCue ?? null,
  };
}

/** Aggregates skill results across every completed session, for the profile snapshot. */
export function aggregateSkills(entries: { reps: Rep[]; session: TrainingSession }[]): SkillResult[] {
  const totals = new Map<SkillCategory, SkillResult>();

  for (const { reps, session } of entries) {
    for (const skill of scoreSession(reps, session.responses).skills) {
      const existing = totals.get(skill.category) ?? {
        category: skill.category,
        attempted: 0,
        correct: 0,
      };
      totals.set(skill.category, {
        category: skill.category,
        attempted: existing.attempted + skill.attempted,
        correct: existing.correct + skill.correct,
      });
    }
  }

  return [...totals.values()].sort((a, b) =>
    SKILL_CATEGORY_LABELS[a.category].localeCompare(SKILL_CATEGORY_LABELS[b.category]),
  );
}
