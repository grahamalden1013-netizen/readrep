import "server-only";
import {
  type AssignmentId,
  type DecisionQuality,
  type LearningMoment,
  type LearningMomentId,
  type PlayerResponse,
  qualityForResponse,
  type CourtArea,
  type ResponseType,
} from "@readrep/domain";
import { localStore } from "../store/local-store";
import {
  getCurrentActor,
  playerIdForActor,
  recordAudit,
  requirePermission,
} from "../auth/authorize";

/* -------------------------------------------------------------------------- */
/* DTOs                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * What the browser receives BEFORE the player commits.
 *
 * This type is the enforcement point for the product's central rule. It carries
 * option ids and labels and nothing else — no `quality`, no `rationale`, no
 * preferred option, no explanation, no outcome. A player who reads the page
 * source, the network response, or the React payload finds no answer there,
 * because the answer is never sent until an attempt has been stored.
 *
 * Widening this type is how the whole product quietly stops working.
 */
export type PreRevealMomentDTO = {
  id: string;
  position: number;
  prompt: string;
  responseType: ResponseType;
  choices: { id: string; label: string }[];
  selectableAreas: CourtArea[];
  clip: { startMs: number; endMs: number; pausePointMs: number };
  film: FilmAvailabilityDTO;
  /** Present when this moment was already answered in an earlier sitting. */
  completed: boolean;
};

/**
 * Whether film can actually be played.
 *
 * Phase 0 has no video provider and no authorized footage, so `available` is
 * false and `reason` explains it. The interface renders an honest
 * "authorized clip required" panel; it never renders a broken player or a
 * placeholder that implies footage exists.
 */
export type FilmAvailabilityDTO = {
  available: boolean;
  reason: "no_authorized_footage" | "provider_not_configured" | "playable";
  detail: string;
};

/** What the player receives AFTER committing. Returned only by the action. */
export type RevealDTO = {
  momentId: string;
  chosen: {
    id: string;
    label: string;
    quality: DecisionQuality;
    rationale: string;
  } | null;
  chosenQuality: DecisionQuality;
  preferred: { id: string; label: string; rationale: string };
  observedFacts: string[];
  basketballInference: string[];
  visualCue: string;
  teachingCue: string;
  allOptions: {
    id: string;
    label: string;
    quality: DecisionQuality;
    rationale: string;
  }[];
  outcome: string;
  outcomeNote: string | null;
  /** Coach rules cited, resolved to their statements. Empty means ungrounded. */
  coachRules: { id: string; statement: string; topic: string }[];
  /**
   * How much authority this explanation carries. `general_reasoning` must be
   * labelled as such in the interface: the coach did not supply a rule here.
   */
  grounding: "coach_system" | "general_reasoning";
  uncertainty: { kind: string; detail: string }[];
  attemptId: string;
};

export type SessionDTO = {
  assignmentId: string;
  title: string;
  teamId: string;
  playerName: string;
  moments: PreRevealMomentDTO[];
  completedCount: number;
  status: string;
};

export type AssignmentSummaryDTO = {
  id: string;
  title: string;
  momentCount: number;
  completedCount: number;
  status: string;
  assignedAt: string;
  /** Soft deadline, or null. Nothing expires when it passes. */
  dueAt: string | null;
};

export type PlayerHomeDTO = {
  playerName: string;
  teamName: string;
  assignments: AssignmentSummaryDTO[];
};

/* -------------------------------------------------------------------------- */
/* Reads                                                                       */
/* -------------------------------------------------------------------------- */

const filmAvailability = async (
  moment: LearningMoment,
): Promise<FilmAvailabilityDTO> => {
  const asset = await localStore.games.findVideoAssetById(moment.videoAssetId);
  if (!asset || asset.providerName === "none" || asset.providerPlaybackId === null) {
    return {
      available: false,
      reason: "no_authorized_footage",
      detail:
        "This repetition is built from a manually authored timestamp. No authorized game film is attached, and ReadRep will not stand in a placeholder clip.",
    };
  }
  return {
    available: false,
    reason: "provider_not_configured",
    detail:
      "A video asset is recorded for this moment, but no video provider is configured, so playback cannot be authorized.",
  };
};

export const getPlayerHome = async (): Promise<PlayerHomeDTO | null> => {
  const actor = await getCurrentActor();
  if (!actor) return null;

  const membership = actor.memberships.find((m) => m.role === "player" && m.playerId);
  if (!membership?.playerId) return null;

  await requirePermission({
    action: "assignment.view",
    resource: {
      type: "player",
      teamId: membership.teamId,
      playerId: membership.playerId,
    },
    audit: {
      action: "moment.viewed",
      resourceType: "assignment",
      resourceId: membership.playerId,
    },
  });

  const [player, team, assignments, attempts] = await Promise.all([
    localStore.identity.findPlayerById(membership.playerId),
    localStore.identity.findTeamById(membership.teamId),
    localStore.learning.listAssignmentsForPlayer(membership.playerId),
    localStore.learning.listAttemptsForPlayer(membership.playerId),
  ]);
  if (!player || !team) return null;

  const answered = new Set(attempts.map((a) => `${a.assignmentId}:${a.momentId}`));

  return {
    playerName: player.displayName,
    teamName: team.name,
    assignments: assignments
      .filter((a) => a.status !== "revoked")
      .sort((a, b) => (a.assignedAt < b.assignedAt ? 1 : -1))
      .map((a) => ({
        id: a.id,
        title: a.title,
        momentCount: a.momentIds.length,
        completedCount: a.momentIds.filter((m) => answered.has(`${a.id}:${m}`)).length,
        status: a.status,
        assignedAt: a.assignedAt,
        dueAt: a.dueAt,
      })),
  };
};

/**
 * Loads a session for the player to work through.
 *
 * Authorizes against the assignment's own player, so a player cannot open
 * another player's session by changing the id in the URL. The route parameter
 * is validated by the caller before it reaches here.
 */
export const getSessionForPlayer = async (
  assignmentId: AssignmentId,
): Promise<SessionDTO | null> => {
  const assignment = await localStore.learning.findAssignmentById(assignmentId);
  if (!assignment) return null;

  const actor = await requirePermission({
    action: "assignment.view",
    resource: {
      type: "player",
      teamId: assignment.teamId,
      playerId: assignment.playerId,
    },
    audit: {
      action: "moment.viewed",
      resourceType: "assignment",
      resourceId: assignment.id,
    },
  });

  if (assignment.status === "revoked") return null;

  const player = await localStore.identity.findPlayerById(assignment.playerId);
  if (!player) return null;

  const attempts = await localStore.learning.listAttemptsForAssignment(assignment.id);
  const answered = new Set(attempts.map((a) => a.momentId));

  const moments: PreRevealMomentDTO[] = [];
  for (const [index, momentId] of assignment.momentIds.entries()) {
    const moment = await localStore.learning.findMomentById(momentId);
    if (!moment || moment.retiredAt !== null) continue;

    const optionsById = new Map(moment.interpretation.options.map((o) => [o.id, o]));

    moments.push({
      id: moment.id,
      position: index + 1,
      prompt: moment.question.prompt,
      responseType: moment.question.responseType,
      // Label only. Quality and rationale stay on the server until the player
      // has committed, which is what makes the reveal a reveal.
      choices: moment.question.choiceOptionIds.flatMap((id) => {
        const option = optionsById.get(id);
        return option ? [{ id: option.id as string, label: option.label }] : [];
      }),
      selectableAreas: [...moment.question.selectableAreas],
      clip: {
        startMs: moment.clipRange.startMs,
        endMs: moment.clipRange.endMs,
        pausePointMs: moment.pausePointMs,
      },
      film: await filmAvailability(moment),
      completed: answered.has(moment.id),
    });
  }

  void actor;

  return {
    assignmentId: assignment.id,
    title: assignment.title,
    teamId: assignment.teamId,
    playerName: player.displayName,
    moments,
    completedCount: moments.filter((m) => m.completed).length,
    status: assignment.status,
  };
};

/* -------------------------------------------------------------------------- */
/* Mutations                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Records a committed decision and returns the reveal.
 *
 * The order is the product rule: the attempt is written first, and only then is
 * the explanation assembled and returned. There is no path through this
 * function that hands back an explanation without having stored a commitment.
 */
export const submitDecision = async (params: {
  assignmentId: AssignmentId;
  momentId: LearningMomentId;
  response: PlayerResponse;
  timeToDecideMs: number | null;
}): Promise<RevealDTO> => {
  const assignment = await localStore.learning.findAssignmentById(params.assignmentId);
  if (!assignment) throw new Error("Assignment not found.");

  const actor = await requirePermission({
    action: "attempt.submit",
    resource: {
      type: "player",
      teamId: assignment.teamId,
      playerId: assignment.playerId,
    },
    audit: {
      action: "attempt.viewed",
      resourceType: "player_attempt",
      resourceId: params.momentId,
    },
  });

  if (!assignment.momentIds.includes(params.momentId)) {
    throw new Error("That moment is not part of this session.");
  }

  const moment = await localStore.learning.findMomentById(params.momentId);
  if (!moment) throw new Error("Moment not found.");

  const quality = qualityForResponse(moment, params.response);
  const priorAttempts = await localStore.learning.listAttemptsForAssignment(
    assignment.id,
  );
  const attemptNumber =
    priorAttempts.filter((a) => a.momentId === params.momentId).length + 1;

  const committedAt = new Date().toISOString();
  const attempt = await localStore.learning.createAttempt({
    id: `attempt-${crypto.randomUUID()}` as never,
    momentId: moment.id,
    assignmentId: assignment.id,
    playerId: assignment.playerId,
    teamId: assignment.teamId,
    response: params.response,
    decisionQuality: quality,
    committedAt,
    // Set in the same write: the reveal is happening now, after the commit.
    revealedAt: committedAt,
    timeToDecideMs: params.timeToDecideMs,
    attemptNumber,
    createdAt: committedAt,
  });

  if (assignment.status === "assigned") {
    await localStore.learning.updateAssignment({
      ...assignment,
      status: "in_progress",
      startedAt: assignment.startedAt ?? committedAt,
    });
  }

  const options = moment.interpretation.options;
  const preferred = options.find(
    (o) => o.id === moment.interpretation.preferredOptionId,
  );
  if (!preferred) throw new Error("This moment has no preferred read recorded.");

  // Bound to a local so the discriminated union narrows; a property access on
  // `params` would not.
  const response = params.response;
  const chosenOption =
    response.type === "multiple_choice"
      ? options.find((o) => o.id === response.optionId)
      : response.type === "select_court_area"
        ? options.find((o) => o.courtArea === response.area)
        : response.type === "select_player"
          ? options.find((o) => o.trackId === response.trackId)
          : undefined;

  const rules = await Promise.all(
    moment.interpretation.citation.coachRuleIds.map((id) =>
      localStore.coachSystems.findRuleById(id),
    ),
  );
  const coachRules = rules.flatMap((r) =>
    r ? [{ id: r.id as string, statement: r.statement, topic: r.topic }] : [],
  );

  await recordAudit({
    action: "moment.viewed",
    resourceType: "learning_moment",
    resourceId: moment.id,
    outcome: "allowed",
    actorUserId: actor.userId,
    teamId: assignment.teamId,
    metadata: { attemptNumber, decisionQuality: quality },
  });

  return {
    momentId: moment.id,
    chosen: chosenOption
      ? {
          id: chosenOption.id as string,
          label: chosenOption.label,
          quality: chosenOption.quality,
          rationale: chosenOption.rationale,
        }
      : null,
    chosenQuality: quality,
    preferred: {
      id: preferred.id as string,
      label: preferred.label,
      rationale: preferred.rationale,
    },
    observedFacts: [...moment.interpretation.observedFacts],
    basketballInference: [...moment.interpretation.basketballInference],
    visualCue: moment.interpretation.visualCue,
    teachingCue: moment.interpretation.teachingCue,
    allOptions: options.map((o) => ({
      id: o.id as string,
      label: o.label,
      quality: o.quality,
      rationale: o.rationale,
    })),
    outcome: moment.interpretation.outcome,
    outcomeNote: moment.interpretation.outcomeNote,
    coachRules,
    grounding: coachRules.length > 0 ? "coach_system" : "general_reasoning",
    uncertainty: moment.interpretation.citation.uncertainty.map((u) => ({
      kind: u.kind,
      detail: u.detail,
    })),
    attemptId: attempt.id,
  };
};

/** Records the player's reflection. Requires an attempt they own. */
export const submitReflection = async (params: {
  attemptId: string;
  missedCue: string | null;
  revisit: boolean;
}): Promise<void> => {
  const attempt = await localStore.learning.findAttemptById(params.attemptId as never);
  if (!attempt) throw new Error("Attempt not found.");

  await requirePermission({
    action: "reflection.submit",
    resource: { type: "player", teamId: attempt.teamId, playerId: attempt.playerId },
    audit: {
      action: "attempt.viewed",
      resourceType: "reflection",
      resourceId: params.attemptId,
    },
  });

  await localStore.learning.createReflection({
    id: `reflection-${crypto.randomUUID()}` as never,
    attemptId: attempt.id,
    momentId: attempt.momentId,
    playerId: attempt.playerId,
    teamId: attempt.teamId,
    missedCue: params.missedCue,
    revisit: params.revisit,
    provenance: "player_input",
    createdAt: new Date().toISOString(),
  });
};

/** Marks a session finished once every moment has an attempt. */
export const completeSession = async (assignmentId: AssignmentId): Promise<void> => {
  const assignment = await localStore.learning.findAssignmentById(assignmentId);
  if (!assignment) throw new Error("Assignment not found.");

  await requirePermission({
    action: "attempt.submit",
    resource: {
      type: "player",
      teamId: assignment.teamId,
      playerId: assignment.playerId,
    },
    audit: {
      action: "attempt.viewed",
      resourceType: "assignment",
      resourceId: assignment.id,
    },
  });

  const attempts = await localStore.learning.listAttemptsForAssignment(assignment.id);
  const answered = new Set(attempts.map((a) => a.momentId));
  const allAnswered = assignment.momentIds.every((id) => answered.has(id));
  if (!allAnswered) return;

  await localStore.learning.updateAssignment({
    ...assignment,
    status: "completed",
    completedAt: new Date().toISOString(),
  });
};

export { playerIdForActor };
