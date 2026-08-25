import { z } from "zod";
import {
  type AccessGrant,
  type ConsentScope,
  type ConsentState,
  type GuardianRelationship,
  isActiveMembership,
  isEffectiveGrant,
  isEffectiveGuardianship,
  type Membership,
  type PlayerId,
  permitsAction,
  type Role,
  type TeamId,
  type UserId,
} from "../entities/identity";
import type { Instant } from "../primitives";

/* -------------------------------------------------------------------------- */
/* Actions and resources                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Every distinct thing a caller can try to do.
 *
 * Kept coarse enough to reason about and fine enough that "view the roster" and
 * "watch a minor's game film" are never the same permission.
 */
export const PermissionAction = z.enum([
  "team.view",
  "team.manage_members",
  "team.view_audit_log",

  "player.view",
  "player.manage",

  "consent.view",
  "consent.manage",

  "game.view",
  "game.upload",
  "game.delete",

  "film.watch",
  "film.export",

  "coach_system.view",
  "coach_system.edit",

  "candidate.view",
  "candidate.review",

  "moment.view",
  "moment.publish",

  "assignment.view",
  "assignment.create",

  "attempt.submit",
  "attempt.view",

  "reflection.submit",
]);
export type PermissionAction = z.infer<typeof PermissionAction>;

/**
 * What is being acted on.
 *
 * Every resource carries the team that owns it. A resource without an owning
 * team cannot be authorized, which is the property that makes cross-account
 * access a type error rather than a code review question.
 */
export type PermissionResource =
  | { type: "team"; teamId: TeamId }
  /** Player-scoped resources: film, moments, attempts, consent, assignments. */
  | { type: "player"; teamId: TeamId; playerId: PlayerId };

/** The caller, resolved from storage. Never built from client-supplied data. */
export type Actor = {
  userId: UserId;
  /** All memberships this user holds. Inactive ones are ignored by the policy. */
  memberships: readonly Membership[];
  /** Guardian links this user holds. Unverified ones are ignored. */
  guardianships: readonly GuardianRelationship[];
  /** Explicit grants, used by trainers. */
  grants: readonly AccessGrant[];
};

/** Consent lookup for a player, supplied by the data-access layer. */
export type ConsentLookup = (scope: ConsentScope) => ConsentState;

export type Decision = { allowed: true } | { allowed: false; reason: DenialReason };

export type DenialReason =
  | "no_membership"
  | "membership_inactive"
  | "role_not_permitted"
  | "not_own_player"
  | "no_access_grant"
  | "consent_missing"
  | "team_policy_disallows";

export const DENIAL_MESSAGE: Record<DenialReason, string> = {
  no_membership: "You are not a member of this team.",
  membership_inactive: "Your membership on this team is not active.",
  role_not_permitted: "Your role does not permit this action.",
  not_own_player: "You may only act on your own player.",
  no_access_grant: "You have not been granted access to this player.",
  consent_missing: "The required consent has not been granted.",
  team_policy_disallows: "This team's privacy settings do not permit this.",
};

const ALLOW: Decision = { allowed: true };
const deny = (reason: DenialReason): Decision => ({ allowed: false, reason });

/* -------------------------------------------------------------------------- */
/* Role capabilities                                                           */
/* -------------------------------------------------------------------------- */

/**
 * What each role may do, before ownership and consent are considered.
 *
 * Passing this table is necessary but never sufficient: a coach appears here
 * with `film.watch`, and still cannot watch film for a player whose guardian
 * has not granted consent.
 */
const ROLE_CAPABILITIES: Readonly<Record<Role, readonly PermissionAction[]>> =
  Object.freeze({
    program_admin: [
      "team.view",
      "team.manage_members",
      "team.view_audit_log",
      "player.view",
      "player.manage",
      "consent.view",
      "consent.manage",
      "game.view",
      "game.upload",
      "game.delete",
      "film.watch",
      "film.export",
      "coach_system.view",
      "coach_system.edit",
      "candidate.view",
      "candidate.review",
      "moment.view",
      "moment.publish",
      "assignment.view",
      "assignment.create",
      "attempt.view",
    ],
    coach: [
      "team.view",
      "player.view",
      "consent.view",
      "game.view",
      "game.upload",
      "game.delete",
      "film.watch",
      "coach_system.view",
      "coach_system.edit",
      "candidate.view",
      "candidate.review",
      "moment.view",
      "moment.publish",
      "assignment.view",
      "assignment.create",
      "attempt.view",
    ],
    player: [
      "team.view",
      "game.view",
      "film.watch",
      "coach_system.view",
      "moment.view",
      "assignment.view",
      "attempt.submit",
      "attempt.view",
      "reflection.submit",
    ],
    guardian: [
      "team.view",
      "player.view",
      "consent.view",
      "consent.manage",
      "game.view",
      "game.upload",
      "film.watch",
      "moment.view",
      "assignment.view",
      "attempt.view",
    ],
    trainer: [
      "team.view",
      "player.view",
      "game.view",
      "film.watch",
      "coach_system.view",
      "moment.view",
      "assignment.view",
      "attempt.view",
    ],
  });

/** Actions that require a granted consent record before they may proceed. */
const CONSENT_REQUIRED: Partial<Record<PermissionAction, ConsentScope>> = {
  "film.watch": "film_upload",
  "film.export": "film_upload",
  "game.upload": "film_upload",
  "assignment.create": "coach_assignment",
};

/** Roles whose access to a player is limited to players they are tied to. */
const PLAYER_SCOPED_ROLES: readonly Role[] = ["player", "guardian", "trainer"];

/* -------------------------------------------------------------------------- */
/* The decision                                                                */
/* -------------------------------------------------------------------------- */

const activeMembershipsFor = (actor: Actor, teamId: TeamId): Membership[] =>
  actor.memberships.filter((m) => m.teamId === teamId && isActiveMembership(m));

/** Whether a player-scoped role is actually tied to this specific player. */
const isTiedToPlayer = (
  actor: Actor,
  membership: Membership,
  playerId: PlayerId,
  now: Instant,
): boolean => {
  switch (membership.role) {
    case "player":
      return membership.playerId === playerId;
    case "guardian":
      return actor.guardianships.some(
        (g) => g.playerId === playerId && isEffectiveGuardianship(g),
      );
    case "trainer":
      return actor.grants.some(
        (g) =>
          g.playerId === playerId &&
          g.granteeUserId === actor.userId &&
          isEffectiveGrant(g, now),
      );
    default:
      return true;
  }
};

/**
 * The single authorization decision for ReadRep.
 *
 * Called by the data-access layer on every read and every mutation, after the
 * resource has been loaded and its owning team is known. It is pure: no I/O, no
 * clock, no globals, so it is exhaustively testable and cannot behave
 * differently in a Server Action than it does in a page.
 *
 * It is never called from a component, and hiding a button is never a
 * substitute for calling it.
 */
export const authorize = (params: {
  actor: Actor;
  action: PermissionAction;
  resource: PermissionResource;
  now: Instant;
  /** Consent state for the player in question. Required for player resources. */
  consent?: ConsentLookup;
  /** The owning team's privacy defaults, when the action is gated by them. */
  teamPolicy?: {
    guardiansMayViewFilm: boolean;
    playersMaySeeTeammateAttempts: boolean;
    trainersMayBeGranted: boolean;
  };
}): Decision => {
  const { actor, action, resource, now, consent, teamPolicy } = params;

  const all = actor.memberships.filter((m) => m.teamId === resource.teamId);
  if (all.length === 0) return deny("no_membership");

  const active = activeMembershipsFor(actor, resource.teamId);
  if (active.length === 0) return deny("membership_inactive");

  // A user may hold several roles on one team. Any role that fully permits the
  // action is enough; each is evaluated end to end so a capability from one
  // role can never be combined with an ownership tie from another.
  let strongestDenial: DenialReason = "role_not_permitted";

  for (const membership of active) {
    const capable = ROLE_CAPABILITIES[membership.role].includes(action);
    if (!capable) continue;

    if (resource.type === "player") {
      if (
        PLAYER_SCOPED_ROLES.includes(membership.role) &&
        !isTiedToPlayer(actor, membership, resource.playerId, now)
      ) {
        strongestDenial =
          membership.role === "trainer" ? "no_access_grant" : "not_own_player";
        continue;
      }

      if (
        membership.role === "guardian" &&
        action === "film.watch" &&
        teamPolicy &&
        !teamPolicy.guardiansMayViewFilm
      ) {
        strongestDenial = "team_policy_disallows";
        continue;
      }

      if (
        membership.role === "trainer" &&
        teamPolicy &&
        !teamPolicy.trainersMayBeGranted
      ) {
        strongestDenial = "team_policy_disallows";
        continue;
      }

      // A player viewing an attempt that is not their own is a teammate view.
      if (
        membership.role === "player" &&
        action === "attempt.view" &&
        membership.playerId !== resource.playerId &&
        teamPolicy &&
        !teamPolicy.playersMaySeeTeammateAttempts
      ) {
        strongestDenial = "team_policy_disallows";
        continue;
      }

      const requiredScope = CONSENT_REQUIRED[action];
      if (requiredScope) {
        if (!consent) {
          strongestDenial = "consent_missing";
          continue;
        }
        if (!permitsAction(consent(requiredScope))) {
          strongestDenial = "consent_missing";
          continue;
        }
      }
    }

    return ALLOW;
  }

  return deny(strongestDenial);
};

/** Convenience wrapper for call sites that want to throw rather than branch. */
export class AuthorizationError extends Error {
  readonly reason: DenialReason;
  constructor(reason: DenialReason) {
    super(DENIAL_MESSAGE[reason]);
    this.name = "AuthorizationError";
    this.reason = reason;
  }
}
