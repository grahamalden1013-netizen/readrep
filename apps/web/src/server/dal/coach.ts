import "server-only";
import type { TeamId } from "@readrep/domain";
import { localStore } from "../store/local-store";
import { getCurrentActor, requirePermission } from "../auth/authorize";

export type RosterEntryDTO = {
  playerId: string;
  displayName: string;
  isMinor: boolean;
  /** Consent scopes currently granted. Absence is shown, never assumed. */
  grantedConsents: string[];
  approvedMomentCount: number;
  assignmentsAssigned: number;
  assignmentsCompleted: number;
  /**
   * Distribution of decision quality across attempts. Deliberately not a single
   * score: blueprint §14 warns against inventing a basketball IQ number before
   * it has a defensible definition.
   */
  attemptQuality: Record<string, number>;
  revisitRequests: number;
};

export type CoachDashboardDTO = {
  teamId: string;
  teamName: string;
  season: string;
  coachSystemRevision: number | null;
  ruleCount: number;
  pendingReviewCount: number;
  roster: RosterEntryDTO[];
};

/** The team the caller coaches or administers, if any. */
export const getCoachTeamId = async (): Promise<TeamId | null> => {
  const actor = await getCurrentActor();
  if (!actor) return null;
  const membership = actor.memberships.find(
    (m) => (m.role === "coach" || m.role === "program_admin") && m.status === "active",
  );
  return membership?.teamId ?? null;
};

export const getCoachDashboard = async (
  teamId: TeamId,
): Promise<CoachDashboardDTO | null> => {
  await requirePermission({
    action: "team.view",
    resource: { type: "team", teamId },
    audit: { action: "moment.viewed", resourceType: "team", resourceId: teamId },
  });

  const team = await localStore.identity.findTeamById(teamId);
  if (!team) return null;

  const [players, candidates, assignments, system] = await Promise.all([
    localStore.identity.listPlayersForTeam(teamId),
    localStore.candidates.listForTeam(teamId),
    localStore.learning.listAssignmentsForTeam(teamId),
    localStore.coachSystems.findActiveForTeam(teamId),
  ]);

  const rules = system
    ? await localStore.coachSystems.listRulesForSystem(system.id)
    : [];

  const roster: RosterEntryDTO[] = [];
  for (const player of players) {
    const [moments, attempts, reflections, consents] = await Promise.all([
      localStore.learning.listMomentsForPlayer(player.id),
      localStore.learning.listAttemptsForPlayer(player.id),
      localStore.learning.listReflectionsForPlayer(player.id),
      localStore.consents.listForPlayer(player.id),
    ]);

    const playerAssignments = assignments.filter((a) => a.playerId === player.id);
    const attemptQuality: Record<string, number> = {};
    for (const attempt of attempts) {
      attemptQuality[attempt.decisionQuality] =
        (attemptQuality[attempt.decisionQuality] ?? 0) + 1;
    }

    roster.push({
      playerId: player.id,
      displayName: player.displayName,
      isMinor: player.isMinor,
      grantedConsents: consents
        .filter((c) => c.state === "granted")
        .map((c) => c.scope),
      approvedMomentCount: moments.length,
      assignmentsAssigned: playerAssignments.length,
      assignmentsCompleted: playerAssignments.filter((a) => a.status === "completed")
        .length,
      attemptQuality,
      revisitRequests: reflections.filter((r) => r.revisit).length,
    });
  }

  return {
    teamId,
    teamName: team.name,
    season: team.season,
    coachSystemRevision: team.activeCoachSystemRevision,
    ruleCount: rules.length,
    pendingReviewCount: candidates.filter(
      (c) => c.status === "proposed" || c.status === "in_review",
    ).length,
    roster,
  };
};

export type AssignableMomentDTO = {
  id: string;
  playerId: string;
  playerName: string;
  category: string;
  visualCue: string;
  alreadyAssigned: boolean;
};

/** Approved moments a coach can put into a session. */
export const getAssignableMoments = async (
  teamId: TeamId,
): Promise<AssignableMomentDTO[]> => {
  await requirePermission({
    action: "moment.view",
    resource: { type: "team", teamId },
    audit: {
      action: "moment.viewed",
      resourceType: "learning_moment",
      resourceId: teamId,
    },
  });

  const [players, assignments] = await Promise.all([
    localStore.identity.listPlayersForTeam(teamId),
    localStore.learning.listAssignmentsForTeam(teamId),
  ]);
  const assigned = new Set(assignments.flatMap((a) => a.momentIds as string[]));

  const out: AssignableMomentDTO[] = [];
  for (const player of players) {
    const moments = await localStore.learning.listMomentsForPlayer(player.id);
    for (const moment of moments) {
      if (moment.retiredAt !== null) continue;
      out.push({
        id: moment.id,
        playerId: player.id,
        playerName: player.displayName,
        category: moment.interpretation.category,
        visualCue: moment.interpretation.visualCue,
        alreadyAssigned: assigned.has(moment.id),
      });
    }
  }
  return out;
};
