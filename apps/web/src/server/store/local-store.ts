import "server-only";
import type {
  AccessGrant,
  Assignment,
  AuditEvent,
  CoachReview,
  CoachRule,
  CoachSystem,
  ConsentRecord,
  DecisionCandidate,
  Game,
  GuardianRelationship,
  LearningMoment,
  Membership,
  Player,
  PlayerAttempt,
  ProcessingRun,
  ReadRepStore,
  Reflection,
  Team,
  User,
  VideoAsset,
} from "@readrep/domain";
import { config } from "../config";
import { JsonCollection } from "./json-store";

/** Local credentials for the Phase 0 development sign-in. */
export type LocalCredential = {
  id: string;
  userId: string;
  /** scrypt hash. The plaintext password is never stored or logged. */
  passwordHash: string;
  salt: string;
};

const collections = {
  users: new JsonCollection<User & { id: string }>(config.dataDir, "users"),
  credentials: new JsonCollection<LocalCredential>(config.dataDir, "credentials"),
  memberships: new JsonCollection<Membership & { id: string }>(
    config.dataDir,
    "memberships",
  ),
  teams: new JsonCollection<Team & { id: string }>(config.dataDir, "teams"),
  players: new JsonCollection<Player & { id: string }>(config.dataDir, "players"),
  guardianships: new JsonCollection<GuardianRelationship & { id: string }>(
    config.dataDir,
    "guardianships",
  ),
  grants: new JsonCollection<AccessGrant & { id: string }>(config.dataDir, "grants"),
  consents: new JsonCollection<ConsentRecord & { id: string }>(
    config.dataDir,
    "consents",
  ),
  games: new JsonCollection<Game & { id: string }>(config.dataDir, "games"),
  videoAssets: new JsonCollection<VideoAsset & { id: string }>(
    config.dataDir,
    "video-assets",
  ),
  processingRuns: new JsonCollection<ProcessingRun & { id: string }>(
    config.dataDir,
    "processing-runs",
  ),
  coachSystems: new JsonCollection<CoachSystem & { id: string }>(
    config.dataDir,
    "coach-systems",
  ),
  coachRules: new JsonCollection<CoachRule & { id: string }>(
    config.dataDir,
    "coach-rules",
  ),
  candidates: new JsonCollection<DecisionCandidate & { id: string }>(
    config.dataDir,
    "decision-candidates",
  ),
  reviews: new JsonCollection<CoachReview & { id: string }>(
    config.dataDir,
    "coach-reviews",
  ),
  moments: new JsonCollection<LearningMoment & { id: string }>(
    config.dataDir,
    "learning-moments",
  ),
  assignments: new JsonCollection<Assignment & { id: string }>(
    config.dataDir,
    "assignments",
  ),
  attempts: new JsonCollection<PlayerAttempt & { id: string }>(
    config.dataDir,
    "attempts",
  ),
  reflections: new JsonCollection<Reflection & { id: string }>(
    config.dataDir,
    "reflections",
  ),
  audit: new JsonCollection<AuditEvent & { id: string }>(
    config.dataDir,
    "audit-events",
  ),
} as const;

export type Collections = typeof collections;

/** Direct access, for the seed script and tests only. Never used by the DAL. */
export const rawCollections = collections;

export const clearAllCollections = async (): Promise<void> => {
  for (const collection of Object.values(collections)) await collection.clear();
};

export const invalidateAllCollections = (): void => {
  for (const collection of Object.values(collections)) collection.invalidate();
};

/**
 * The Phase 0 implementation of the domain's repository ports.
 *
 * Fetching only. It performs no authorization, by design: the data-access layer
 * decides who may see what, and a repository that quietly filtered would make
 * the authorization tests meaningless.
 */
export const localStore: ReadRepStore = {
  identity: {
    findUserById: (id) => collections.users.findById(id),
    findUserByEmail: (email) =>
      collections.users.find((u) => u.email.toLowerCase() === email.toLowerCase()),
    createUser: (user) => collections.users.put(user),

    listMembershipsForUser: (userId) =>
      collections.memberships.filter((m) => m.userId === userId),
    listMembershipsForTeam: (teamId) =>
      collections.memberships.filter((m) => m.teamId === teamId),
    createMembership: (membership) => collections.memberships.put(membership),

    findTeamById: (id) => collections.teams.findById(id),
    listTeamsForUser: async (userId) => {
      const memberships = await collections.memberships.filter(
        (m) => m.userId === userId,
      );
      const ids = new Set(memberships.map((m) => m.teamId));
      return collections.teams.filter((t) => ids.has(t.id));
    },
    createTeam: (team) => collections.teams.put(team),
    updateTeam: (team) => collections.teams.put(team),

    findPlayerById: (id) => collections.players.findById(id),
    listPlayersForTeam: (teamId) =>
      collections.players.filter((p) => p.teamId === teamId),
    createPlayer: (player) => collections.players.put(player),

    listGuardianshipsForUser: (userId) =>
      collections.guardianships.filter((g) => g.guardianUserId === userId),
    listGuardianshipsForPlayer: (playerId) =>
      collections.guardianships.filter((g) => g.playerId === playerId),
    createGuardianship: (link) => collections.guardianships.put(link),

    listGrantsForUser: (userId) =>
      collections.grants.filter((g) => g.granteeUserId === userId),
    createGrant: (grant) => collections.grants.put(grant),
    revokeGrant: async (id, at) => {
      const grant = await collections.grants.findById(id);
      if (grant) await collections.grants.put({ ...grant, revokedAt: at as never });
    },
  },

  consents: {
    listForPlayer: (playerId) =>
      collections.consents.filter((c) => c.playerId === playerId),
    findForPlayerAndScope: (playerId, scope) =>
      collections.consents.find((c) => c.playerId === playerId && c.scope === scope),
    upsert: (record) => collections.consents.put(record),
  },

  games: {
    findById: (id) => collections.games.findById(id),
    listForTeam: (teamId) => collections.games.filter((g) => g.teamId === teamId),
    create: (game) => collections.games.put(game),
    update: (game) => collections.games.put(game),
    findVideoAssetById: (id) => collections.videoAssets.findById(id),
    findVideoAssetForGame: (gameId) =>
      collections.videoAssets.find((a) => a.gameId === gameId),
    upsertVideoAsset: (asset) => collections.videoAssets.put(asset),
  },

  processingRuns: {
    findById: (id) => collections.processingRuns.findById(id),
    findForGame: (gameId) =>
      collections.processingRuns.find((r) => r.gameId === gameId),
    create: (run) => collections.processingRuns.put(run),
    save: (run) => collections.processingRuns.put(run),
  },

  coachSystems: {
    findById: (id) => collections.coachSystems.findById(id),
    findActiveForTeam: (teamId) =>
      collections.coachSystems.find(
        (s) => s.teamId === teamId && s.status === "active",
      ),
    listForTeam: (teamId) =>
      collections.coachSystems.filter((s) => s.teamId === teamId),
    create: (system) => collections.coachSystems.put(system),
    update: (system) => collections.coachSystems.put(system),
    listRulesForSystem: (systemId) =>
      collections.coachRules.filter((r) => r.coachSystemId === systemId),
    findRuleById: (id) => collections.coachRules.findById(id),
    createRules: (rules) => collections.coachRules.putMany(rules),
  },

  candidates: {
    findById: (id) => collections.candidates.findById(id),
    listForTeam: (teamId) => collections.candidates.filter((c) => c.teamId === teamId),
    listForGame: (gameId) => collections.candidates.filter((c) => c.gameId === gameId),
    create: (candidate) => collections.candidates.put(candidate),
    update: (candidate) => collections.candidates.put(candidate),
    findReviewById: (id) => collections.reviews.findById(id),
    findReviewForCandidate: (id) =>
      collections.reviews.find((r) => r.candidateId === id),
    createReview: (review) => collections.reviews.put(review),
  },

  learning: {
    findMomentById: (id) => collections.moments.findById(id),
    listMomentsForPlayer: (playerId) =>
      collections.moments.filter((m) => m.playerId === playerId),
    createMoment: (moment) => collections.moments.put(moment),

    findAssignmentById: (id) => collections.assignments.findById(id),
    listAssignmentsForPlayer: (playerId) =>
      collections.assignments.filter((a) => a.playerId === playerId),
    listAssignmentsForTeam: (teamId) =>
      collections.assignments.filter((a) => a.teamId === teamId),
    createAssignment: (assignment) => collections.assignments.put(assignment),
    updateAssignment: (assignment) => collections.assignments.put(assignment),

    findAttemptById: (id) => collections.attempts.findById(id),
    listAttemptsForAssignment: (id) =>
      collections.attempts.filter((a) => a.assignmentId === id),
    listAttemptsForPlayer: (playerId) =>
      collections.attempts.filter((a) => a.playerId === playerId),
    createAttempt: (attempt) => collections.attempts.put(attempt),
    updateAttempt: (attempt) => collections.attempts.put(attempt),

    listReflectionsForPlayer: (playerId) =>
      collections.reflections.filter((r) => r.playerId === playerId),
    createReflection: (reflection) => collections.reflections.put(reflection),
  },

  audit: {
    append: async (event) => {
      await collections.audit.put(event);
    },
    listForTeam: async (teamId, limit) => {
      const rows = await collections.audit.filter((e) => e.teamId === teamId);
      return rows
        .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1))
        .slice(0, limit);
    },
  },
};
