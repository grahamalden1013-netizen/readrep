import type {
  AccessGrant,
  ConsentRecord,
  ConsentScope,
  GuardianRelationship,
  Membership,
  Player,
  PlayerId,
  Team,
  TeamId,
  User,
  UserId,
} from "../entities/identity";
import type { Game, GameId, VideoAsset, VideoAssetId } from "../entities/game";
import type { ProcessingRun, ProcessingRunId } from "../entities/processing";
import type {
  CoachReview,
  CoachReviewId,
  CoachRule,
  CoachSystem,
  CoachSystemId,
} from "../entities/coach";
import type { CoachRuleId } from "../confidence";
import type { DecisionCandidate, DecisionCandidateId } from "../entities/decision";
import type {
  Assignment,
  AssignmentId,
  LearningMoment,
  LearningMomentId,
  PlayerAttempt,
  PlayerAttemptId,
  Reflection,
} from "../entities/learning";
import type { AuditEvent } from "../entities/audit";

/**
 * Storage ports.
 *
 * The domain declares what persistence it needs; it never says how. Phase 0
 * satisfies these with a local file-backed adapter. Phase 1 satisfies the same
 * interfaces with managed PostgreSQL, and nothing above this line changes.
 *
 * These are deliberately narrow. There is no generic `find(query)`: every
 * method names a real product question, which is what stops a caller from
 * quietly widening a query past what it is authorized to read.
 *
 * Authorization is NOT performed here. Repositories fetch; the data-access
 * layer in apps/web decides. Keeping them separate means a repository can be
 * tested without an actor, and an authorization test cannot be fooled by a
 * repository that "helpfully" filters.
 */

export type Identity = {
  findUserById(id: UserId): Promise<User | null>;
  findUserByEmail(email: string): Promise<User | null>;
  createUser(user: User): Promise<User>;

  listMembershipsForUser(userId: UserId): Promise<Membership[]>;
  listMembershipsForTeam(teamId: TeamId): Promise<Membership[]>;
  createMembership(membership: Membership): Promise<Membership>;

  findTeamById(id: TeamId): Promise<Team | null>;
  listTeamsForUser(userId: UserId): Promise<Team[]>;
  createTeam(team: Team): Promise<Team>;
  updateTeam(team: Team): Promise<Team>;

  findPlayerById(id: PlayerId): Promise<Player | null>;
  listPlayersForTeam(teamId: TeamId): Promise<Player[]>;
  createPlayer(player: Player): Promise<Player>;

  listGuardianshipsForUser(userId: UserId): Promise<GuardianRelationship[]>;
  listGuardianshipsForPlayer(playerId: PlayerId): Promise<GuardianRelationship[]>;
  createGuardianship(link: GuardianRelationship): Promise<GuardianRelationship>;

  listGrantsForUser(userId: UserId): Promise<AccessGrant[]>;
  createGrant(grant: AccessGrant): Promise<AccessGrant>;
  revokeGrant(id: AccessGrant["id"], at: string): Promise<void>;
};

export type Consents = {
  listForPlayer(playerId: PlayerId): Promise<ConsentRecord[]>;
  findForPlayerAndScope(
    playerId: PlayerId,
    scope: ConsentScope,
  ): Promise<ConsentRecord | null>;
  upsert(record: ConsentRecord): Promise<ConsentRecord>;
};

export type Games = {
  findById(id: GameId): Promise<Game | null>;
  listForTeam(teamId: TeamId): Promise<Game[]>;
  create(game: Game): Promise<Game>;
  update(game: Game): Promise<Game>;

  findVideoAssetById(id: VideoAssetId): Promise<VideoAsset | null>;
  findVideoAssetForGame(gameId: GameId): Promise<VideoAsset | null>;
  upsertVideoAsset(asset: VideoAsset): Promise<VideoAsset>;
};

export type ProcessingRuns = {
  findById(id: ProcessingRunId): Promise<ProcessingRun | null>;
  findForGame(gameId: GameId): Promise<ProcessingRun | null>;
  create(run: ProcessingRun): Promise<ProcessingRun>;
  /**
   * Persists a run produced by the state machine.
   *
   * Implementations must be safe against concurrent workers; the local adapter
   * serializes writes, and the Phase 1 adapter will use optimistic concurrency
   * on `updatedAt`.
   */
  save(run: ProcessingRun): Promise<ProcessingRun>;
};

export type CoachSystems = {
  findById(id: CoachSystemId): Promise<CoachSystem | null>;
  findActiveForTeam(teamId: TeamId): Promise<CoachSystem | null>;
  listForTeam(teamId: TeamId): Promise<CoachSystem[]>;
  create(system: CoachSystem): Promise<CoachSystem>;
  update(system: CoachSystem): Promise<CoachSystem>;

  listRulesForSystem(systemId: CoachSystemId): Promise<CoachRule[]>;
  findRuleById(id: CoachRuleId): Promise<CoachRule | null>;
  /** Rules are immutable per revision; a change creates new rows, never an edit. */
  createRules(rules: readonly CoachRule[]): Promise<CoachRule[]>;
};

export type Candidates = {
  findById(id: DecisionCandidateId): Promise<DecisionCandidate | null>;
  listForTeam(teamId: TeamId): Promise<DecisionCandidate[]>;
  listForGame(gameId: GameId): Promise<DecisionCandidate[]>;
  create(candidate: DecisionCandidate): Promise<DecisionCandidate>;
  update(candidate: DecisionCandidate): Promise<DecisionCandidate>;

  findReviewById(id: CoachReviewId): Promise<CoachReview | null>;
  findReviewForCandidate(id: DecisionCandidateId): Promise<CoachReview | null>;
  createReview(review: CoachReview): Promise<CoachReview>;
};

export type Learning = {
  findMomentById(id: LearningMomentId): Promise<LearningMoment | null>;
  listMomentsForPlayer(playerId: PlayerId): Promise<LearningMoment[]>;
  createMoment(moment: LearningMoment): Promise<LearningMoment>;

  findAssignmentById(id: AssignmentId): Promise<Assignment | null>;
  /** Returns the assignment a previous identical request already created. */
  findAssignmentByIdempotencyKey(key: string): Promise<Assignment | null>;
  listAssignmentsForPlayer(playerId: PlayerId): Promise<Assignment[]>;
  listAssignmentsForTeam(teamId: TeamId): Promise<Assignment[]>;
  createAssignment(assignment: Assignment): Promise<Assignment>;
  /**
   * Creates the assignment unless one already carries the same idempotency key.
   *
   * The check and the insert must be atomic. A read-then-write lets two
   * concurrent submissions both see "absent" and both insert, which is exactly
   * the duplicate this key exists to prevent.
   */
  createAssignmentIfAbsent(
    assignment: Assignment,
  ): Promise<{ assignment: Assignment; created: boolean }>;
  updateAssignment(assignment: Assignment): Promise<Assignment>;

  findAttemptById(id: PlayerAttemptId): Promise<PlayerAttempt | null>;
  listAttemptsForAssignment(id: AssignmentId): Promise<PlayerAttempt[]>;
  listAttemptsForPlayer(playerId: PlayerId): Promise<PlayerAttempt[]>;
  createAttempt(attempt: PlayerAttempt): Promise<PlayerAttempt>;
  updateAttempt(attempt: PlayerAttempt): Promise<PlayerAttempt>;

  listReflectionsForPlayer(playerId: PlayerId): Promise<Reflection[]>;
  createReflection(reflection: Reflection): Promise<Reflection>;
};

export type AuditLog = {
  /** Append-only. There is no update and no delete, by design. */
  append(event: AuditEvent): Promise<void>;
  listForTeam(teamId: TeamId, limit: number): Promise<AuditEvent[]>;
};

/** The full set of ports an adapter must provide. */
export type ReadRepStore = {
  identity: Identity;
  consents: Consents;
  games: Games;
  processingRuns: ProcessingRuns;
  coachSystems: CoachSystems;
  candidates: Candidates;
  learning: Learning;
  audit: AuditLog;
};
