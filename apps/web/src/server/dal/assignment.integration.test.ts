import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Integration coverage for the assignment path.
 *
 * Exercises the real data-access layer against the real local adapter, through
 * the real authorization policy, with only the Next request primitives mocked.
 * Nothing here reaches around the data boundary: fixtures are written through
 * `localStore`, and every assignment is created by calling the guarded
 * `createAssignment`, never by inserting a row.
 */

const DATA_DIR = mkdtempSync(join(tmpdir(), "readrep-assign-"));
vi.stubEnv("READREP_DATA_DIR", DATA_DIR);
vi.stubEnv("READREP_SESSION_SECRET", "integration-test-secret-for-readrep-0123456789");

/** The session cookie the mocked request carries. Swapped to change actor. */
let cookieValue: string | undefined;

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (cookieValue ? { name, value: cookieValue } : undefined),
    set: () => {},
    delete: () => {},
  }),
  headers: async () => new Headers(),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { localStore, clearAllCollections } = await import("../store/local-store");
const { createAssignment, getAssignContext } = await import("./review");
const { encodeSession } = await import("../auth/session");
const { AuthorizationError } = await import("@readrep/domain");
const { NotAuthenticatedError } = await import("../auth/authorize");

afterAll(() => rmSync(DATA_DIR, { recursive: true, force: true }));

const AT = "2026-08-01T09:00:00.000Z";
const signInAs = (userId: string | null) => {
  cookieValue = userId ? encodeSession(userId, Date.now() + 3_600_000) : undefined;
};

const TEAM_A = "team-alpha";
const TEAM_B = "team-bravo";
const JORDAN = "player-jordan";
const TAYLOR = "player-taylor";
const RIVAL = "player-rival";

const team = (id: string, owner: string) => ({
  id,
  name: `Team ${id}`,
  programName: null,
  season: "2026",
  level: "aau_u16" as const,
  ownerUserId: owner,
  activeCoachSystemRevision: null,
  privacyDefaults: {
    guardiansMayViewFilm: true,
    playersMaySeeTeammateAttempts: false,
    trainersMayBeGranted: true,
    originalRetentionDays: 365,
  },
  createdAt: AT,
});

const player = (id: string, teamId: string, name: string) => ({
  id,
  teamId,
  fullName: name,
  displayName: name,
  userId: null,
  jerseyHistory: [],
  isMinor: true,
  createdAt: AT,
});

const membership = (id: string, userId: string, teamId: string, role: string) => ({
  id,
  userId,
  teamId,
  role,
  status: "active",
  playerId: null,
  createdAt: AT,
});

const consent = (playerId: string, state: string) => ({
  id: `consent-${playerId}-coach_assignment`,
  playerId,
  scope: "coach_assignment",
  state,
  grantedByUserId: state === "granted" ? "user-parent" : null,
  grantedAt: state === "granted" ? AT : null,
  expiresAt: null,
  withdrawnAt: null,
  method: state === "granted" ? "test fixture" : null,
  createdAt: AT,
  updatedAt: AT,
});

const moment = (id: string, teamId: string, playerId: string) => ({
  id,
  teamId,
  playerId,
  gameId: `game-${teamId}`,
  videoAssetId: `asset-${teamId}`,
  sourceCandidateId: `cand-${id}`,
  sourceReviewId: null,
  provenance: "manual_authoring",
  clipRange: { startMs: 1000, endMs: 9000 },
  pausePointMs: 5000,
  question: {
    prompt: "What is your best read?",
    responseType: "multiple_choice",
    choiceOptionIds: [`${id}-a`, `${id}-b`],
    selectableAreas: [],
    selectableTrackIds: [],
    postRevealHint: null,
  },
  interpretation: {
    category: "pick_and_roll_read",
    observedFacts: ["The low defender steps toward the roller."],
    basketballInference: [],
    visualCue: "The low defender left the weak-side corner.",
    options: [
      {
        id: `${id}-a`,
        label: "Skip weak side",
        quality: "preferred",
        rationale: "The corner is unattended.",
        courtArea: "left_corner",
        trackId: null,
      },
      {
        id: `${id}-b`,
        label: "Hit the roller",
        quality: "suboptimal",
        rationale: "The roll is tagged.",
        courtArea: "paint",
        trackId: null,
      },
    ],
    preferredOptionId: `${id}-a`,
    teachingCue: "Read the defender who leaves first.",
    outcome: "missed_shot",
    outcomeNote: null,
    citation: {
      provenance: "manual_authoring",
      clipRange: { startMs: 1000, endMs: 9000 },
      frameIds: [],
      artifactIds: [],
      trackIds: [],
      coachRuleIds: [],
      confidence: { score: 0.7, band: "medium", basis: "test fixture" },
      uncertainty: [
        {
          kind: "no_applicable_coach_rule",
          detail: "No rule covers this in the fixture.",
        },
      ],
    },
  },
  tags: [],
  citation: {
    provenance: "manual_authoring",
    clipRange: { startMs: 1000, endMs: 9000 },
    frameIds: [],
    artifactIds: [],
    trackIds: [],
    coachRuleIds: [],
    confidence: { score: 0.7, band: "medium", basis: "test fixture" },
    uncertainty: [{ kind: "no_applicable_coach_rule", detail: "No rule covers this." }],
  },
  createdAt: AT,
  retiredAt: null,
});

beforeEach(async () => {
  await clearAllCollections();

  for (const u of ["user-coach-a", "user-coach-b", "user-player", "user-parent"]) {
    await localStore.identity.createUser({
      id: u,
      email: `${u}@example.test`,
      displayName: u,
      createdAt: AT,
      deactivatedAt: null,
    } as never);
  }

  await localStore.identity.createTeam(team(TEAM_A, "user-coach-a") as never);
  await localStore.identity.createTeam(team(TEAM_B, "user-coach-b") as never);

  await localStore.identity.createPlayer(player(JORDAN, TEAM_A, "Jordan") as never);
  await localStore.identity.createPlayer(player(TAYLOR, TEAM_A, "Taylor") as never);
  await localStore.identity.createPlayer(player(RIVAL, TEAM_B, "Rival") as never);

  await localStore.identity.createMembership(
    membership("m-a", "user-coach-a", TEAM_A, "coach") as never,
  );
  await localStore.identity.createMembership(
    membership("m-b", "user-coach-b", TEAM_B, "coach") as never,
  );
  await localStore.identity.createMembership({
    ...membership("m-p", "user-player", TEAM_A, "player"),
    playerId: JORDAN,
  } as never);

  // Jordan's guardian granted assignment consent; Taylor's did not.
  await localStore.consents.upsert(consent(JORDAN, "granted") as never);
  await localStore.consents.upsert(consent(TAYLOR, "not_requested") as never);
  await localStore.consents.upsert(consent(RIVAL, "granted") as never);

  await localStore.learning.createMoment(
    moment("moment-jordan", TEAM_A, JORDAN) as never,
  );
  await localStore.learning.createMoment(
    moment("moment-rival", TEAM_B, RIVAL) as never,
  );

  signInAs("user-coach-a");
});

const assign = (over: Record<string, unknown> = {}) =>
  createAssignment({
    teamId: TEAM_A as never,
    playerId: JORDAN as never,
    title: "Ball-screen reads",
    momentIds: ["moment-jordan"],
    dueAt: null,
    idempotencyKey: `key-${Math.random().toString(36).slice(2)}`,
    ...over,
  } as never);

/* -------------------------------------------------------------------------- */

describe("a coach assigning within their own team", () => {
  it("creates the assignment and puts it in the player's queue", async () => {
    const result = await assign();
    expect(result.deduplicated).toBe(false);

    // The proof that matters: it reaches the player through the same read path
    // their dashboard uses.
    const queue = await localStore.learning.listAssignmentsForPlayer(JORDAN as never);
    expect(queue).toHaveLength(1);
    expect(queue[0]?.id).toBe(result.assignmentId);
    expect(queue[0]?.title).toBe("Ball-screen reads");
    expect(queue[0]?.momentIds).toEqual(["moment-jordan"]);
    expect(queue[0]?.status).toBe("assigned");
    expect(queue[0]?.assignedByUserId).toBe("user-coach-a");
  });

  it("records an optional due date", async () => {
    const dueAt = new Date(Date.now() + 7 * 86_400_000).toISOString();
    const result = await assign({ dueAt });
    const stored = await localStore.learning.findAssignmentById(
      result.assignmentId as never,
    );
    expect(stored?.dueAt).toBe(dueAt);
  });

  it("defaults to no due date", async () => {
    const result = await assign();
    const stored = await localStore.learning.findAssignmentById(
      result.assignmentId as never,
    );
    expect(stored?.dueAt).toBeNull();
  });

  it("refuses a due date in the past", async () => {
    await expect(assign({ dueAt: "2020-01-01T00:00:00.000Z" })).rejects.toThrow(
      /due date cannot be in the past/i,
    );
  });

  it("writes an audit row for the creation", async () => {
    await assign();
    const events = await localStore.audit.listForTeam(TEAM_A as never, 50);
    expect(events.some((e) => e.action === "assignment.created")).toBe(true);
  });
});

describe("duplicate submissions", () => {
  it("returns the same assignment for a repeated idempotency key", async () => {
    const key = "stable-key-abcdef";
    const first = await assign({ idempotencyKey: key });
    const second = await assign({ idempotencyKey: key });

    expect(second.assignmentId).toBe(first.assignmentId);
    expect(first.deduplicated).toBe(false);
    expect(second.deduplicated).toBe(true);

    const queue = await localStore.learning.listAssignmentsForPlayer(JORDAN as never);
    expect(queue).toHaveLength(1);
  });

  it("survives concurrent submissions of the same key", async () => {
    const key = "concurrent-key-abcdef";
    const results = await Promise.all([
      assign({ idempotencyKey: key }),
      assign({ idempotencyKey: key }),
      assign({ idempotencyKey: key }),
    ]);
    const ids = new Set(results.map((r) => r.assignmentId));
    // The local adapter serializes writes, so all three resolve to one row.
    expect(ids.size).toBe(1);
    const queue = await localStore.learning.listAssignmentsForPlayer(JORDAN as never);
    expect(queue).toHaveLength(1);
  });

  it("still allows a deliberate second assignment under a new key", async () => {
    await assign({ idempotencyKey: "key-one" });
    await assign({ idempotencyKey: "key-two", title: "Second session" });
    const queue = await localStore.learning.listAssignmentsForPlayer(JORDAN as never);
    expect(queue).toHaveLength(2);
  });

  it("does not put the same moment in one assignment twice", async () => {
    const result = await assign({
      momentIds: ["moment-jordan", "moment-jordan"],
    });
    const stored = await localStore.learning.findAssignmentById(
      result.assignmentId as never,
    );
    expect(stored?.momentIds).toEqual(["moment-jordan"]);
  });
});

describe("authorization", () => {
  it("refuses a coach from another team", async () => {
    signInAs("user-coach-b");
    await expect(assign()).rejects.toBeInstanceOf(AuthorizationError);
    expect(
      await localStore.learning.listAssignmentsForPlayer(JORDAN as never),
    ).toHaveLength(0);
  });

  it("refuses a coach reaching into another team by passing its ids", async () => {
    signInAs("user-coach-b");
    await expect(
      assign({ teamId: TEAM_A, playerId: JORDAN, momentIds: ["moment-jordan"] }),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("refuses a player trying to assign to themselves", async () => {
    signInAs("user-player");
    await expect(assign()).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("refuses an unauthenticated caller", async () => {
    signInAs(null);
    await expect(assign()).rejects.toBeInstanceOf(NotAuthenticatedError);
  });

  it("refuses a player whose guardian has not granted assignment consent", async () => {
    await expect(assign({ playerId: TAYLOR })).rejects.toBeInstanceOf(
      AuthorizationError,
    );
  });

  it("refuses after consent is withdrawn", async () => {
    await localStore.consents.upsert({
      ...consent(JORDAN, "withdrawn"),
      withdrawnAt: AT,
    } as never);
    await expect(assign()).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("will not attach another player's moment to a session", async () => {
    // The coach is authorized for Jordan, but moment-rival is team B's film.
    await expect(assign({ momentIds: ["moment-rival"] })).rejects.toThrow(
      /belong to this player/i,
    );
    expect(
      await localStore.learning.listAssignmentsForPlayer(JORDAN as never),
    ).toHaveLength(0);
  });

  it("silently drops a foreign moment rather than assigning it", async () => {
    const result = await assign({ momentIds: ["moment-jordan", "moment-rival"] });
    const stored = await localStore.learning.findAssignmentById(
      result.assignmentId as never,
    );
    expect(stored?.momentIds).toEqual(["moment-jordan"]);
  });

  it("refuses a moment that does not exist", async () => {
    await expect(assign({ momentIds: ["moment-nonexistent"] })).rejects.toThrow(
      /belong to this player/i,
    );
  });
});

describe("the assign screen's context", () => {
  it("pre-selects the player whose film the moment came from", async () => {
    const context = await getAssignContext("moment-jordan");
    expect(context?.ownerPlayerId).toBe(JORDAN);
    expect(context?.teamId).toBe(TEAM_A);
  });

  it("marks a teammate ineligible for another player's film", async () => {
    const context = await getAssignContext("moment-jordan");
    const taylor = context?.players.find((p) => p.playerId === TAYLOR);
    expect(taylor?.mayBeAssigned).toBe(false);
    expect(taylor?.blockedReason).toMatch(/another player's film|consent/i);
  });

  it("lists only the owning team's roster", async () => {
    const context = await getAssignContext("moment-jordan");
    expect(context?.players.map((p) => p.playerId).sort()).toEqual(
      [JORDAN, TAYLOR].sort(),
    );
  });

  it("refuses a coach from another team", async () => {
    signInAs("user-coach-b");
    await expect(getAssignContext("moment-jordan")).rejects.toBeInstanceOf(
      AuthorizationError,
    );
  });

  it("returns null for a moment that does not exist", async () => {
    expect(await getAssignContext("moment-nonexistent")).toBeNull();
  });
});
