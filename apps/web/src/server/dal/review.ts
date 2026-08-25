import "server-only";
import {
  type CoachReview,
  type DecisionCandidateId,
  type DecisionQuality,
  effectiveInterpretation,
  type LearningMoment,
  type PlayerId,
  type RejectionReason,
  type TeamId,
} from "@readrep/domain";
import { localStore } from "../store/local-store";
import { recordAudit, requirePermission } from "../auth/authorize";

/* -------------------------------------------------------------------------- */
/* DTOs                                                                        */
/* -------------------------------------------------------------------------- */

export type ReviewQueueItemDTO = {
  candidateId: string;
  playerName: string;
  gameTitle: string;
  category: string;
  teachability: number;
  confidenceBand: string;
  status: string;
  /** How this proposal was produced. Shown on the card; never presented as truth. */
  provenance: string;
  uncertaintyCount: number;
  pausePointMs: number;
};

/**
 * The review screen's payload.
 *
 * `observedFacts` and `basketballInference` stay in separate arrays all the way
 * to the interface, which renders them in separate columns. A coach reviewing
 * quickly needs to see at a glance what the system claims to have *seen*
 * against what it *concluded*.
 */
export type CandidateReviewDTO = {
  candidateId: string;
  teamId: string;
  playerId: string;
  playerName: string;
  gameTitle: string;
  category: string;
  provenance: string;
  evidenceWindow: { startMs: number; endMs: number };
  pausePointMs: number;
  film: { available: boolean; detail: string };

  observedFacts: string[];
  basketballInference: string[];
  visualCue: string;
  teachingCue: string;

  options: { id: string; label: string; quality: DecisionQuality; rationale: string }[];
  preferredOptionId: string;

  outcome: string;
  outcomeNote: string | null;

  applicableRules: { id: string; statement: string; topic: string; cited: boolean }[];
  grounding: "coach_system" | "general_reasoning";

  confidence: { score: number; band: string; basis: string };
  uncertainty: { kind: string; detail: string }[];

  existingReview: { verdict: string; reviewedAt: string } | null;
};

/* -------------------------------------------------------------------------- */
/* Reads                                                                       */
/* -------------------------------------------------------------------------- */

export const getReviewQueue = async (teamId: TeamId): Promise<ReviewQueueItemDTO[]> => {
  await requirePermission({
    action: "candidate.view",
    resource: { type: "team", teamId },
    audit: {
      action: "candidate.reviewed",
      resourceType: "decision_candidate",
      resourceId: teamId,
    },
  });

  const candidates = await localStore.candidates.listForTeam(teamId);
  const items: ReviewQueueItemDTO[] = [];

  for (const candidate of candidates) {
    if (candidate.status === "superseded") continue;
    const [player, game] = await Promise.all([
      localStore.identity.findPlayerById(candidate.playerId),
      localStore.games.findById(candidate.gameId),
    ]);
    items.push({
      candidateId: candidate.id,
      playerName: player?.displayName ?? "Unknown player",
      gameTitle: game?.title ?? "Unknown game",
      category: candidate.interpretation.category,
      teachability: candidate.teachabilityScore,
      confidenceBand: candidate.rankConfidence.band,
      status: candidate.status,
      provenance: candidate.interpretation.citation.provenance,
      uncertaintyCount: candidate.interpretation.citation.uncertainty.length,
      pausePointMs: candidate.pausePointMs,
    });
  }

  // Highest teachability first: a coach's review time is the scarce resource.
  return items.sort((a, b) => b.teachability - a.teachability);
};

export const getCandidateForReview = async (
  candidateId: DecisionCandidateId,
): Promise<CandidateReviewDTO | null> => {
  const candidate = await localStore.candidates.findById(candidateId);
  if (!candidate) return null;

  await requirePermission({
    action: "candidate.view",
    resource: {
      type: "player",
      teamId: candidate.teamId as TeamId,
      playerId: candidate.playerId,
    },
    audit: {
      action: "candidate.reviewed",
      resourceType: "decision_candidate",
      resourceId: candidate.id,
    },
  });

  const [player, game, asset, review] = await Promise.all([
    localStore.identity.findPlayerById(candidate.playerId),
    localStore.games.findById(candidate.gameId),
    localStore.games.findVideoAssetById(candidate.videoAssetId),
    localStore.candidates.findReviewForCandidate(candidate.id),
  ]);

  const interpretation = candidate.interpretation;
  const citedIds = new Set<string>(interpretation.citation.coachRuleIds);

  // Show the coach every rule that could apply to this category, marking which
  // ones the proposal actually cited. A rule the proposal missed is exactly
  // what a coach should be able to spot in one glance.
  const system = await localStore.coachSystems.findActiveForTeam(
    candidate.teamId as TeamId,
  );
  const allRules = system
    ? await localStore.coachSystems.listRulesForSystem(system.id)
    : [];
  const applicableRules = allRules
    .filter(
      (r) =>
        r.appliesTo.includes(interpretation.category) || citedIds.has(r.id as string),
    )
    .map((r) => ({
      id: r.id as string,
      statement: r.statement,
      topic: r.topic,
      cited: citedIds.has(r.id as string),
    }));

  const playable =
    asset?.status === "ready" &&
    asset.providerPlaybackId !== null &&
    asset.deletedAt === null;

  return {
    candidateId: candidate.id,
    teamId: candidate.teamId as string,
    playerId: candidate.playerId as string,
    playerName: player?.displayName ?? "Unknown player",
    gameTitle: game?.title ?? "Unknown game",
    category: interpretation.category,
    provenance: interpretation.citation.provenance,
    evidenceWindow: {
      startMs: candidate.evidenceWindow.startMs,
      endMs: candidate.evidenceWindow.endMs,
    },
    pausePointMs: candidate.pausePointMs,
    film: {
      available: playable,
      detail: playable
        ? "Film is available."
        : "No authorized film is attached to this candidate. Review the written evidence below; ReadRep will not show a stand-in clip.",
    },
    observedFacts: [...interpretation.observedFacts],
    basketballInference: [...interpretation.basketballInference],
    visualCue: interpretation.visualCue,
    teachingCue: interpretation.teachingCue,
    options: interpretation.options.map((o) => ({
      id: o.id as string,
      label: o.label,
      quality: o.quality,
      rationale: o.rationale,
    })),
    preferredOptionId: interpretation.preferredOptionId as string,
    outcome: interpretation.outcome,
    outcomeNote: interpretation.outcomeNote,
    applicableRules,
    grounding: citedIds.size > 0 ? "coach_system" : "general_reasoning",
    confidence: {
      score: interpretation.citation.confidence.score,
      band: interpretation.citation.confidence.band,
      basis: interpretation.citation.confidence.basis,
    },
    uncertainty: interpretation.citation.uncertainty.map((u) => ({
      kind: u.kind,
      detail: u.detail,
    })),
    existingReview: review
      ? { verdict: review.verdict, reviewedAt: review.reviewedAt }
      : null,
  };
};

/* -------------------------------------------------------------------------- */
/* Mutations                                                                   */
/* -------------------------------------------------------------------------- */

export type ReviewDecision = {
  candidateId: DecisionCandidateId;
  verdict: "approved" | "rejected" | "needs_more_evidence";
  /** The coach's choice, which may differ from the proposal's. */
  preferredOptionId: string | null;
  /** The coach's category, when they recategorize. */
  category: string | null;
  /** Edited teaching language, when the coach rewrites it. */
  editedVisualCue: string | null;
  editedTeachingCue: string | null;
  note: string | null;
  confidenceScore: number;
  confidenceBasis: string;
  rejectionReason: RejectionReason | null;
  rejectionDetail: string | null;
};

/**
 * Records a coach's review and, on approval, publishes a learning moment.
 *
 * The candidate is never mutated. The coach's changes live on the review as
 * `editedInterpretation`, and the published moment records both ids. That is
 * what keeps "what the system proposed" and "what the coach approved"
 * permanently distinguishable, which the blueprint requires and which is also
 * the only way to learn a coach's preferences later without overwriting the
 * evidence of what they changed.
 */
export const submitReview = async (
  decision: ReviewDecision,
): Promise<{ momentId: string | null }> => {
  const candidate = await localStore.candidates.findById(decision.candidateId);
  if (!candidate) throw new Error("Candidate not found.");

  const actor = await requirePermission({
    action: "candidate.review",
    resource: {
      type: "player",
      teamId: candidate.teamId as TeamId,
      playerId: candidate.playerId,
    },
    audit: {
      action: "candidate.reviewed",
      resourceType: "decision_candidate",
      resourceId: candidate.id,
    },
  });

  const existing = await localStore.candidates.findReviewForCandidate(candidate.id);
  if (existing) throw new Error("This candidate has already been reviewed.");

  const now = new Date().toISOString();
  const proposal = candidate.interpretation;

  const changedPreferred =
    decision.preferredOptionId !== null &&
    decision.preferredOptionId !== (proposal.preferredOptionId as string);
  const changedCategory =
    decision.category !== null && decision.category !== proposal.category;
  const changedText =
    decision.editedVisualCue !== null || decision.editedTeachingCue !== null;

  let editedInterpretation = null;
  if (changedPreferred || changedCategory || changedText) {
    // Re-rate the options so the coach's preferred read is the one marked
    // `preferred`; the schema refuses an interpretation where they disagree.
    const options = proposal.options.map((o) => {
      if (!changedPreferred) return o;
      if ((o.id as string) === decision.preferredOptionId) {
        return { ...o, quality: "preferred" as DecisionQuality };
      }
      return o.quality === "preferred"
        ? { ...o, quality: "acceptable" as DecisionQuality }
        : o;
    });

    editedInterpretation = {
      ...proposal,
      category: (decision.category ?? proposal.category) as typeof proposal.category,
      options,
      preferredOptionId: (decision.preferredOptionId ??
        proposal.preferredOptionId) as typeof proposal.preferredOptionId,
      visualCue: decision.editedVisualCue ?? proposal.visualCue,
      teachingCue: decision.editedTeachingCue ?? proposal.teachingCue,
    };
  }

  const review: CoachReview = {
    id: `review-${crypto.randomUUID()}` as never,
    candidateId: candidate.id,
    teamId: candidate.teamId as TeamId,
    reviewerUserId: actor.userId,
    verdict: decision.verdict,
    editedInterpretation,
    preferredOptionId: (decision.preferredOptionId ?? null) as never,
    note: decision.note,
    confidence: {
      score: decision.confidenceScore,
      band:
        decision.confidenceScore < 0.5
          ? "low"
          : decision.confidenceScore < 0.8
            ? "medium"
            : "high",
      basis: decision.confidenceBasis,
    },
    rejectionReason: decision.verdict === "rejected" ? decision.rejectionReason : null,
    rejectionDetail: decision.verdict === "rejected" ? decision.rejectionDetail : null,
    coachSystemRevision: candidate.coachSystemRevision,
    reviewedAt: now,
  };

  await localStore.candidates.createReview(review);
  await localStore.candidates.update({
    ...candidate,
    status:
      decision.verdict === "approved"
        ? "approved"
        : decision.verdict === "rejected"
          ? "rejected"
          : "in_review",
    updatedAt: now,
  });

  await recordAudit({
    action: "candidate.reviewed",
    resourceType: "coach_review",
    resourceId: review.id,
    outcome: "allowed",
    actorUserId: actor.userId,
    teamId: candidate.teamId as TeamId,
    metadata: {
      verdict: decision.verdict,
      edited: editedInterpretation !== null,
      recategorized: changedCategory,
    },
  });

  if (decision.verdict !== "approved") return { momentId: null };

  const published = effectiveInterpretation(proposal, review);
  const moment: LearningMoment = {
    id: `moment-${crypto.randomUUID()}` as never,
    teamId: candidate.teamId as TeamId,
    playerId: candidate.playerId,
    gameId: candidate.gameId,
    videoAssetId: candidate.videoAssetId,
    sourceCandidateId: candidate.id,
    sourceReviewId: review.id,
    // Coach-approved, not AI-generated and not manually authored: the coach
    // signed off on it, and that is what the player is being shown.
    provenance: "coach_approved",
    clipRange: candidate.evidenceWindow,
    pausePointMs: candidate.pausePointMs,
    question: {
      prompt: "What is your best read here?",
      responseType: "multiple_choice",
      choiceOptionIds: published.options.map((o) => o.id),
      selectableAreas: [],
      selectableTrackIds: [],
      postRevealHint: null,
    },
    interpretation: published,
    tags: [published.category],
    citation: {
      ...published.citation,
      provenance: "coach_approved",
      modelVersion: undefined,
      promptVersion: undefined,
    },
    createdAt: now,
    retiredAt: null,
  };

  await localStore.learning.createMoment(moment);

  await recordAudit({
    action: "moment.published",
    resourceType: "learning_moment",
    resourceId: moment.id,
    outcome: "allowed",
    actorUserId: actor.userId,
    teamId: candidate.teamId as TeamId,
    metadata: { candidateId: candidate.id },
  });

  return { momentId: moment.id };
};

/** Assigns approved moments to a player. */
export const createAssignment = async (params: {
  teamId: TeamId;
  playerId: PlayerId;
  title: string;
  momentIds: string[];
}): Promise<{ assignmentId: string }> => {
  const actor = await requirePermission({
    action: "assignment.create",
    resource: { type: "player", teamId: params.teamId, playerId: params.playerId },
    audit: {
      action: "assignment.created",
      resourceType: "assignment",
      resourceId: params.playerId,
    },
  });

  // Only moments that belong to this player on this team may be assigned.
  const owned = await localStore.learning.listMomentsForPlayer(params.playerId);
  const allowed = new Set(
    owned.filter((m) => m.teamId === params.teamId).map((m) => m.id),
  );
  const momentIds = params.momentIds.filter((id) => allowed.has(id as never));
  if (momentIds.length === 0) {
    throw new Error("None of those moments belong to this player.");
  }

  const now = new Date().toISOString();
  const assignment = await localStore.learning.createAssignment({
    id: `assignment-${crypto.randomUUID()}` as never,
    teamId: params.teamId,
    playerId: params.playerId,
    assignedByUserId: actor.userId,
    title: params.title,
    momentIds: momentIds as never,
    status: "assigned",
    assignedAt: now,
    startedAt: null,
    completedAt: null,
    revokedAt: null,
  });

  await recordAudit({
    action: "assignment.created",
    resourceType: "assignment",
    resourceId: assignment.id,
    outcome: "allowed",
    actorUserId: actor.userId,
    teamId: params.teamId,
    metadata: { momentCount: momentIds.length },
  });

  return { assignmentId: assignment.id };
};
