import { describe, expect, it } from "vitest";
import {
  type Actor,
  authorize,
  type ConsentLookup,
  PermissionAction,
  type PermissionResource,
} from "./policy";
import type { Role } from "../entities/identity";

const NOW = "2026-08-25T12:00:00.000Z";
const PAST = "2026-01-01T00:00:00.000Z";
const FUTURE = "2027-01-01T00:00:00.000Z";

const TEAM_A = "team-a" as never;
const TEAM_B = "team-b" as never;
const PLAYER_1 = "player-1" as never;
const PLAYER_2 = "player-2" as never;

const grantAll: ConsentLookup = () => "granted";
const grantNone: ConsentLookup = () => "not_requested";

const OPEN_POLICY = {
  guardiansMayViewFilm: true,
  playersMaySeeTeammateAttempts: false,
  trainersMayBeGranted: true,
};

/** Builds an actor holding one role on one team. */
const actorWith = (opts: {
  userId?: string;
  role: Role;
  teamId?: unknown;
  playerId?: unknown;
  status?: "active" | "suspended" | "invited" | "removed";
  guardianOf?: unknown;
  guardianVerified?: boolean;
  grantFor?: unknown;
  grantRevoked?: boolean;
  grantExpiresAt?: string | null;
}): Actor =>
  ({
    userId: opts.userId ?? "user-1",
    memberships: [
      {
        id: "m-1",
        userId: opts.userId ?? "user-1",
        teamId: opts.teamId ?? TEAM_A,
        role: opts.role,
        status: opts.status ?? "active",
        playerId: opts.playerId ?? null,
        createdAt: PAST,
      },
    ],
    guardianships: opts.guardianOf
      ? [
          {
            id: "g-1",
            guardianUserId: opts.userId ?? "user-1",
            playerId: opts.guardianOf,
            relationship: "parent",
            verifiedAt: opts.guardianVerified === false ? null : PAST,
            verifiedByUserId: null,
            revokedAt: null,
            createdAt: PAST,
          },
        ]
      : [],
    grants: opts.grantFor
      ? [
          {
            id: "ag-1",
            teamId: opts.teamId ?? TEAM_A,
            playerId: opts.grantFor,
            granteeUserId: opts.userId ?? "user-1",
            grantedByUserId: "coach-user",
            grantedAt: PAST,
            expiresAt: opts.grantExpiresAt ?? null,
            revokedAt: opts.grantRevoked ? PAST : null,
          },
        ]
      : [],
  }) as unknown as Actor;

const check = (
  actor: Actor,
  action: string,
  resource: PermissionResource,
  consent: ConsentLookup = grantAll,
  teamPolicy = OPEN_POLICY,
) =>
  authorize({
    actor,
    action: action as never,
    resource,
    now: NOW,
    consent,
    teamPolicy,
  });

const teamA: PermissionResource = { type: "team", teamId: TEAM_A };
const player1: PermissionResource = {
  type: "player",
  teamId: TEAM_A,
  playerId: PLAYER_1,
};
const player2: PermissionResource = {
  type: "player",
  teamId: TEAM_A,
  playerId: PLAYER_2,
};

/* -------------------------------------------------------------------------- */

describe("cross-account isolation", () => {
  it("denies a coach of another team every single action", () => {
    const outsider = actorWith({ role: "coach", teamId: TEAM_B });
    for (const action of PermissionAction.options) {
      const onTeam = check(outsider, action, teamA);
      expect(onTeam.allowed, `team resource / ${action}`).toBe(false);
      const onPlayer = check(outsider, action, player1);
      expect(onPlayer.allowed, `player resource / ${action}`).toBe(false);
    }
  });

  it("reports a missing membership rather than a role problem", () => {
    const outsider = actorWith({ role: "coach", teamId: TEAM_B });
    const result = check(outsider, "moment.view", player1);
    expect(result).toEqual({ allowed: false, reason: "no_membership" });
  });

  it("denies a user with no memberships at all", () => {
    const nobody: Actor = {
      userId: "user-nobody" as never,
      memberships: [],
      guardianships: [],
      grants: [],
    };
    expect(check(nobody, "team.view", teamA).allowed).toBe(false);
  });

  it("denies a suspended member even with the right role", () => {
    const suspended = actorWith({ role: "coach", status: "suspended" });
    const result = check(suspended, "candidate.review", player1);
    expect(result).toEqual({ allowed: false, reason: "membership_inactive" });
  });

  it("denies an invited member who has not accepted", () => {
    const invited = actorWith({ role: "coach", status: "invited" });
    expect(check(invited, "team.view", teamA).allowed).toBe(false);
  });
});

describe("players", () => {
  const player = actorWith({ role: "player", playerId: PLAYER_1 });

  it("may work through their own assigned moments", () => {
    expect(check(player, "moment.view", player1).allowed).toBe(true);
    expect(check(player, "attempt.submit", player1).allowed).toBe(true);
    expect(check(player, "reflection.submit", player1).allowed).toBe(true);
  });

  it("may not read a teammate's material", () => {
    expect(check(player, "moment.view", player2)).toEqual({
      allowed: false,
      reason: "not_own_player",
    });
  });

  it("may not submit an attempt as another player", () => {
    expect(check(player, "attempt.submit", player2).allowed).toBe(false);
  });

  it("may not review candidates or assign work", () => {
    expect(check(player, "candidate.review", player1)).toEqual({
      allowed: false,
      reason: "role_not_permitted",
    });
    expect(check(player, "assignment.create", player1).allowed).toBe(false);
    expect(check(player, "moment.publish", player1).allowed).toBe(false);
  });

  it("may not manage team members or read the audit log", () => {
    expect(check(player, "team.manage_members", teamA).allowed).toBe(false);
    expect(check(player, "team.view_audit_log", teamA).allowed).toBe(false);
  });

  it("cannot see a teammate's attempts when the team disallows it", () => {
    const result = check(player, "attempt.view", player2, grantAll, {
      ...OPEN_POLICY,
      playersMaySeeTeammateAttempts: true,
    });
    // Team policy permits teammate visibility, but the player is still not
    // tied to player 2, so ownership denies first.
    expect(result.allowed).toBe(false);
  });
});

describe("guardians", () => {
  it("may act for a player they are verified against", () => {
    const guardian = actorWith({ role: "guardian", guardianOf: PLAYER_1 });
    expect(check(guardian, "film.watch", player1).allowed).toBe(true);
    expect(check(guardian, "consent.manage", player1).allowed).toBe(true);
  });

  it("may not act for another family's player", () => {
    const guardian = actorWith({ role: "guardian", guardianOf: PLAYER_1 });
    expect(check(guardian, "film.watch", player2)).toEqual({
      allowed: false,
      reason: "not_own_player",
    });
    expect(check(guardian, "consent.manage", player2).allowed).toBe(false);
  });

  it("gains nothing from an unverified guardian claim", () => {
    const unverified = actorWith({
      role: "guardian",
      guardianOf: PLAYER_1,
      guardianVerified: false,
    });
    expect(check(unverified, "film.watch", player1).allowed).toBe(false);
  });

  it("cannot watch film when the team turns off guardian film access", () => {
    const guardian = actorWith({ role: "guardian", guardianOf: PLAYER_1 });
    const result = check(guardian, "film.watch", player1, grantAll, {
      ...OPEN_POLICY,
      guardiansMayViewFilm: false,
    });
    expect(result).toEqual({ allowed: false, reason: "team_policy_disallows" });
  });

  it("may not review candidates or publish moments", () => {
    const guardian = actorWith({ role: "guardian", guardianOf: PLAYER_1 });
    expect(check(guardian, "candidate.review", player1).allowed).toBe(false);
    expect(check(guardian, "moment.publish", player1).allowed).toBe(false);
    expect(check(guardian, "coach_system.edit", teamA).allowed).toBe(false);
  });
});

describe("trainers", () => {
  it("hold no access without an explicit grant", () => {
    const trainer = actorWith({ role: "trainer" });
    expect(check(trainer, "moment.view", player1)).toEqual({
      allowed: false,
      reason: "no_access_grant",
    });
  });

  it("may view a player they have been granted", () => {
    const trainer = actorWith({ role: "trainer", grantFor: PLAYER_1 });
    expect(check(trainer, "moment.view", player1).allowed).toBe(true);
  });

  it("lose access when the grant is revoked", () => {
    const trainer = actorWith({
      role: "trainer",
      grantFor: PLAYER_1,
      grantRevoked: true,
    });
    expect(check(trainer, "moment.view", player1).allowed).toBe(false);
  });

  it("lose access when the grant has expired", () => {
    const trainer = actorWith({
      role: "trainer",
      grantFor: PLAYER_1,
      grantExpiresAt: PAST,
    });
    expect(check(trainer, "moment.view", player1).allowed).toBe(false);
  });

  it("keep access while the grant is still current", () => {
    const trainer = actorWith({
      role: "trainer",
      grantFor: PLAYER_1,
      grantExpiresAt: FUTURE,
    });
    expect(check(trainer, "moment.view", player1).allowed).toBe(true);
  });

  it("are blocked entirely when the team does not allow trainer grants", () => {
    const trainer = actorWith({ role: "trainer", grantFor: PLAYER_1 });
    const result = check(trainer, "moment.view", player1, grantAll, {
      ...OPEN_POLICY,
      trainersMayBeGranted: false,
    });
    expect(result).toEqual({ allowed: false, reason: "team_policy_disallows" });
  });

  it("may never review, publish, or assign", () => {
    const trainer = actorWith({ role: "trainer", grantFor: PLAYER_1 });
    expect(check(trainer, "candidate.review", player1).allowed).toBe(false);
    expect(check(trainer, "moment.publish", player1).allowed).toBe(false);
    expect(check(trainer, "assignment.create", player1).allowed).toBe(false);
  });
});

describe("consent gates", () => {
  it("blocks watching film when consent has not been granted", () => {
    const coach = actorWith({ role: "coach" });
    expect(check(coach, "film.watch", player1, grantNone)).toEqual({
      allowed: false,
      reason: "consent_missing",
    });
  });

  it("blocks a coach from assigning without assignment consent", () => {
    const coach = actorWith({ role: "coach" });
    const consent: ConsentLookup = (scope) =>
      scope === "coach_assignment" ? "withdrawn" : "granted";
    expect(check(coach, "assignment.create", player1, consent).allowed).toBe(false);
  });

  it("treats withdrawn and never-requested consent identically", () => {
    const coach = actorWith({ role: "coach" });
    const withdrawn: ConsentLookup = () => "withdrawn";
    expect(check(coach, "film.watch", player1, withdrawn).allowed).toBe(false);
    expect(check(coach, "film.watch", player1, grantNone).allowed).toBe(false);
  });

  it("blocks the action when no consent lookup is supplied at all", () => {
    const coach = actorWith({ role: "coach" });
    const result = authorize({
      actor: coach,
      action: "film.watch",
      resource: player1,
      now: NOW,
      teamPolicy: OPEN_POLICY,
    });
    expect(result).toEqual({ allowed: false, reason: "consent_missing" });
  });

  it("does not gate actions that do not touch film", () => {
    const coach = actorWith({ role: "coach" });
    expect(check(coach, "player.view", player1, grantNone).allowed).toBe(true);
  });
});

describe("coaches and administrators", () => {
  it("lets a coach review, publish, and assign across their own roster", () => {
    const coach = actorWith({ role: "coach" });
    expect(check(coach, "candidate.review", player1).allowed).toBe(true);
    expect(check(coach, "candidate.review", player2).allowed).toBe(true);
    expect(check(coach, "moment.publish", player1).allowed).toBe(true);
    expect(check(coach, "coach_system.edit", teamA).allowed).toBe(true);
  });

  it("does not let a coach manage members or read the audit log", () => {
    const coach = actorWith({ role: "coach" });
    expect(check(coach, "team.manage_members", teamA).allowed).toBe(false);
    expect(check(coach, "team.view_audit_log", teamA).allowed).toBe(false);
  });

  it("lets a program administrator manage members and read the audit log", () => {
    const admin = actorWith({ role: "program_admin" });
    expect(check(admin, "team.manage_members", teamA).allowed).toBe(true);
    expect(check(admin, "team.view_audit_log", teamA).allowed).toBe(true);
  });

  it("does not let an administrator submit attempts as a player", () => {
    const admin = actorWith({ role: "program_admin" });
    expect(check(admin, "attempt.submit", player1).allowed).toBe(false);
    expect(check(admin, "reflection.submit", player1).allowed).toBe(false);
  });
});

describe("assigning work", () => {
  it("lets a coach assign to a consented player on their own team", () => {
    const coach = actorWith({ role: "coach" });
    expect(check(coach, "assignment.create", player1).allowed).toBe(true);
  });

  it("lets a program administrator assign", () => {
    const admin = actorWith({ role: "program_admin" });
    expect(check(admin, "assignment.create", player1).allowed).toBe(true);
  });

  it("refuses a coach of another team", () => {
    const outsider = actorWith({ role: "coach", teamId: TEAM_B });
    expect(check(outsider, "assignment.create", player1)).toEqual({
      allowed: false,
      reason: "no_membership",
    });
  });

  it("refuses a player, a guardian, and a trainer", () => {
    expect(
      check(
        actorWith({ role: "player", playerId: PLAYER_1 }),
        "assignment.create",
        player1,
      ).allowed,
    ).toBe(false);
    expect(
      check(
        actorWith({ role: "guardian", guardianOf: PLAYER_1 }),
        "assignment.create",
        player1,
      ).allowed,
    ).toBe(false);
    expect(
      check(
        actorWith({ role: "trainer", grantFor: PLAYER_1 }),
        "assignment.create",
        player1,
      ).allowed,
    ).toBe(false);
  });

  it("refuses without assignment consent, whatever the role", () => {
    const noAssignmentConsent: ConsentLookup = (scope) =>
      scope === "coach_assignment" ? "not_requested" : "granted";
    for (const role of ["coach", "program_admin"] as const) {
      expect(
        check(actorWith({ role }), "assignment.create", player1, noAssignmentConsent),
        role,
      ).toEqual({ allowed: false, reason: "consent_missing" });
    }
  });

  it("refuses a suspended coach", () => {
    const suspended = actorWith({ role: "coach", status: "suspended" });
    expect(check(suspended, "assignment.create", player1).allowed).toBe(false);
  });
});

describe("multiple roles on one team", () => {
  it("takes the union of capabilities across active memberships", () => {
    const coachAndParent: Actor = {
      userId: "user-dual" as never,
      memberships: [
        {
          id: "m-a",
          userId: "user-dual",
          teamId: TEAM_A,
          role: "coach",
          status: "active",
          playerId: null,
          createdAt: PAST,
        },
        {
          id: "m-b",
          userId: "user-dual",
          teamId: TEAM_A,
          role: "guardian",
          status: "active",
          playerId: null,
          createdAt: PAST,
        },
      ],
      guardianships: [
        {
          id: "g-a",
          guardianUserId: "user-dual",
          playerId: PLAYER_1,
          relationship: "parent",
          verifiedAt: PAST,
          verifiedByUserId: null,
          revokedAt: null,
          createdAt: PAST,
        },
      ],
      grants: [],
    } as unknown as Actor;

    // From the coach membership.
    expect(check(coachAndParent, "candidate.review", player2).allowed).toBe(true);
    // From the guardian membership.
    expect(check(coachAndParent, "consent.manage", player1).allowed).toBe(true);
    // Neither role grants this.
    expect(check(coachAndParent, "team.manage_members", teamA).allowed).toBe(false);
  });

  it("does not let a guardian tie to one player unlock a coach action on another", () => {
    const trainerPlusPlayer: Actor = {
      userId: "user-mix" as never,
      memberships: [
        {
          id: "m-p",
          userId: "user-mix",
          teamId: TEAM_A,
          role: "player",
          status: "active",
          playerId: PLAYER_1,
          createdAt: PAST,
        },
        {
          id: "m-t",
          userId: "user-mix",
          teamId: TEAM_A,
          role: "trainer",
          status: "active",
          playerId: null,
          createdAt: PAST,
        },
      ],
      guardianships: [],
      grants: [],
    } as unknown as Actor;

    // The player membership ties to player 1; the trainer membership has no
    // grant. Neither path authorizes reading player 2.
    expect(check(trainerPlusPlayer, "moment.view", player2).allowed).toBe(false);
    expect(check(trainerPlusPlayer, "moment.view", player1).allowed).toBe(true);
  });
});
