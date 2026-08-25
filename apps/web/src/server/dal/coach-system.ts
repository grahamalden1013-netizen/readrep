import "server-only";
import type { CoachRule, CoachSystem, TeamId } from "@readrep/domain";
import { localStore } from "../store/local-store";
import { recordAudit, requirePermission } from "../auth/authorize";
import {
  QUESTIONS,
  type QuestionnaireSubmission,
  resolveAnswer,
} from "../questionnaire";

export type CoachRuleDTO = {
  id: string;
  key: string;
  topic: string;
  statement: string;
  detail: string | null;
  revision: number;
};

export type CoachSystemDTO = {
  id: string;
  revision: number;
  status: string;
  summary: string | null;
  createdAt: string;
  rules: CoachRuleDTO[];
  /** Answers keyed by question id, so the form can be re-opened pre-filled. */
  answers: Record<string, { value: string; followUp: string | null }>;
};

const toRuleDTO = (rule: CoachRule): CoachRuleDTO => ({
  id: rule.id,
  key: rule.key,
  topic: rule.topic,
  statement: rule.statement,
  detail: rule.detail,
  revision: rule.revision,
});

/** The team's active coach system, or null when the survey has not been done. */
export const getActiveCoachSystem = async (
  teamId: TeamId,
): Promise<CoachSystemDTO | null> => {
  await requirePermission({
    action: "coach_system.view",
    resource: { type: "team", teamId },
    audit: {
      action: "coach_system.created",
      resourceType: "coach_system",
      resourceId: teamId,
    },
  });

  const system = await localStore.coachSystems.findActiveForTeam(teamId);
  if (!system) return null;
  const rules = await localStore.coachSystems.listRulesForSystem(system.id);

  const answers: CoachSystemDTO["answers"] = {};
  for (const rule of rules) {
    if (rule.sourceQuestionId) {
      const question = QUESTIONS.find((q) => q.id === rule.sourceQuestionId);
      const option = question?.options.find((o) => o.statement === rule.statement);
      if (option) {
        answers[rule.sourceQuestionId] = { value: option.value, followUp: rule.detail };
      }
    }
  }

  return {
    id: system.id,
    revision: system.revision,
    status: system.status,
    summary: system.summary,
    createdAt: system.createdAt,
    rules: rules.map(toRuleDTO),
    answers,
  };
};

export type SystemHistoryDTO = { revision: number; status: string; createdAt: string };

export const getCoachSystemHistory = async (
  teamId: TeamId,
): Promise<SystemHistoryDTO[]> => {
  await requirePermission({
    action: "coach_system.view",
    resource: { type: "team", teamId },
    audit: {
      action: "coach_system.created",
      resourceType: "coach_system",
      resourceId: teamId,
    },
  });
  const systems = await localStore.coachSystems.listForTeam(teamId);
  return systems
    .sort((a, b) => b.revision - a.revision)
    .map((s) => ({ revision: s.revision, status: s.status, createdAt: s.createdAt }));
};

/**
 * Saves the survey as a new coach-system revision.
 *
 * Revisions are immutable: an edit creates revision N+1 and supersedes N rather
 * than rewriting rules in place. A learning moment approved last month still
 * cites the rule text that was actually in force when the coach approved it,
 * which is the whole reason rules carry an id per revision.
 */
export const saveCoachSystem = async (params: {
  teamId: TeamId;
  submission: QuestionnaireSubmission;
}): Promise<{ revision: number; ruleCount: number }> => {
  const actor = await requirePermission({
    action: "coach_system.edit",
    resource: { type: "team", teamId: params.teamId },
    audit: {
      action: "coach_system.created",
      resourceType: "coach_system",
      resourceId: params.teamId,
    },
  });

  const existing = await localStore.coachSystems.listForTeam(params.teamId);
  const revision = Math.max(0, ...existing.map((s) => s.revision)) + 1;
  const now = new Date().toISOString();
  const systemId = `coachsys-${params.teamId}-r${revision}`;

  const system: CoachSystem = {
    id: systemId as never,
    teamId: params.teamId,
    revision,
    status: "active",
    authoredByUserId: actor.userId,
    summary: params.submission.summary?.trim() || null,
    createdAt: now,
    activatedAt: now,
    supersededAt: null,
  };

  const rules: CoachRule[] = [];
  for (const answer of params.submission.answers) {
    const resolved = resolveAnswer(answer);
    // An answer naming a question or option that does not exist is dropped
    // rather than trusted: form input is user input.
    if (!resolved) continue;
    rules.push({
      id: `rule-${resolved.question.id}-r${revision}` as never,
      key: resolved.question.id,
      coachSystemId: systemId as never,
      teamId: params.teamId,
      revision,
      topic: resolved.question.topic,
      statement: resolved.option.statement,
      detail: answer.followUp?.trim() || null,
      terminology: [],
      appliesTo: resolved.question.appliesTo,
      sourceQuestionId: resolved.question.id,
      createdAt: now,
    });
  }

  // Supersede the previous active revision only once the new one is built, so a
  // failure part-way through cannot leave the team with no active system.
  await localStore.coachSystems.create(system);
  await localStore.coachSystems.createRules(rules);

  for (const previous of existing.filter((s) => s.status === "active")) {
    await localStore.coachSystems.update({
      ...previous,
      status: "superseded",
      supersededAt: now,
    });
  }

  const team = await localStore.identity.findTeamById(params.teamId);
  if (team) {
    await localStore.identity.updateTeam({
      ...team,
      activeCoachSystemRevision: revision,
    });
  }

  await recordAudit({
    action: "coach_system.activated",
    resourceType: "coach_system",
    resourceId: systemId,
    outcome: "allowed",
    actorUserId: actor.userId,
    teamId: params.teamId,
    metadata: { revision, ruleCount: rules.length },
  });

  return { revision, ruleCount: rules.length };
};
