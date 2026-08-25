import { z } from "zod";
import { brandedId, Instant, shortText } from "../primitives";

export const UserId = brandedId("UserId");
export type UserId = z.infer<typeof UserId>;

export const TeamId = brandedId("TeamId");
export type TeamId = z.infer<typeof TeamId>;

export const PlayerId = brandedId("PlayerId");
export type PlayerId = z.infer<typeof PlayerId>;

export const MembershipId = brandedId("MembershipId");
export type MembershipId = z.infer<typeof MembershipId>;

export const GuardianRelationshipId = brandedId("GuardianRelationshipId");
export type GuardianRelationshipId = z.infer<typeof GuardianRelationshipId>;

export const ConsentRecordId = brandedId("ConsentRecordId");
export type ConsentRecordId = z.infer<typeof ConsentRecordId>;

/* -------------------------------------------------------------------------- */
/* Roles                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * The five roles the pilot supports (blueprint §3).
 *
 * A role is scoped to a team through a `Membership`. Nobody holds a role
 * globally — "coach" always means "coach of team X".
 */
export const Role = z.enum(["coach", "player", "guardian", "program_admin", "trainer"]);
export type Role = z.infer<typeof Role>;

export const ROLE_LABEL: Record<Role, string> = {
  coach: "Coach",
  player: "Player",
  guardian: "Parent or guardian",
  program_admin: "Program administrator",
  trainer: "Trainer",
};

export const MembershipStatus = z.enum(["invited", "active", "suspended", "removed"]);
export type MembershipStatus = z.infer<typeof MembershipStatus>;

/* -------------------------------------------------------------------------- */
/* User                                                                        */
/* -------------------------------------------------------------------------- */

export const User = z.object({
  id: UserId,
  email: z.string().email().max(320),
  displayName: shortText(120),
  createdAt: Instant,
  /** Set when the account is deactivated; deactivated users cannot authenticate. */
  deactivatedAt: Instant.nullable().default(null),
});
export type User = z.infer<typeof User>;

/**
 * The safe projection of a user for any interface.
 *
 * Email is deliberately absent. A player's session screen has no reason to
 * carry another person's email address into the browser.
 */
export const UserSummary = User.pick({ id: true, displayName: true });
export type UserSummary = z.infer<typeof UserSummary>;

/* -------------------------------------------------------------------------- */
/* Membership — the unit of authorization                                      */
/* -------------------------------------------------------------------------- */

/**
 * Binds a user to a team in a role.
 *
 * Every authorization decision in ReadRep resolves to "does this user hold a
 * membership on the team that owns this resource, and does that role permit
 * this action?". See `permissions/policy.ts`.
 */
export const Membership = z.object({
  id: MembershipId,
  userId: UserId,
  teamId: TeamId,
  role: Role,
  status: MembershipStatus,
  /**
   * Set when the membership's role is `player`, linking the account to the
   * roster entry. A guardian's membership links through GuardianRelationship
   * instead.
   */
  playerId: PlayerId.nullable().default(null),
  createdAt: Instant,
});
export type Membership = z.infer<typeof Membership>;

export const isActiveMembership = (m: Pick<Membership, "status">): boolean =>
  m.status === "active";

/* -------------------------------------------------------------------------- */
/* Team                                                                        */
/* -------------------------------------------------------------------------- */

export const TeamLevel = z.enum([
  "middle_school",
  "high_school_freshman",
  "high_school_jv",
  "high_school_varsity",
  "aau_u14",
  "aau_u15",
  "aau_u16",
  "aau_u17",
  "college",
  "other",
]);
export type TeamLevel = z.infer<typeof TeamLevel>;

/**
 * Privacy defaults for everything the team owns.
 *
 * Defaults are the restrictive option. Public rankings and public clips are not
 * representable: there is no `public` value, by design (blueprint §10).
 */
export const TeamPrivacyDefaults = z.object({
  /** Whether guardians can view film for their own player. */
  guardiansMayViewFilm: z.boolean().default(true),
  /** Whether players can see teammates' attempts. Off by default. */
  playersMaySeeTeammateAttempts: z.boolean().default(false),
  /** Whether a trainer may be granted access to individual players. */
  trainersMayBeGranted: z.boolean().default(false),
  /** Days of retention for original uploads before scheduled deletion. */
  originalRetentionDays: z.number().int().min(1).max(3650).default(365),
});
export type TeamPrivacyDefaults = z.infer<typeof TeamPrivacyDefaults>;

export const Team = z.object({
  id: TeamId,
  name: shortText(120),
  programName: shortText(120).nullable().default(null),
  season: shortText(40),
  level: TeamLevel,
  /** The user who administers the team. */
  ownerUserId: UserId,
  /** Revision of the coach system currently used to ground analysis. */
  activeCoachSystemRevision: z.number().int().positive().nullable().default(null),
  privacyDefaults: TeamPrivacyDefaults,
  createdAt: Instant,
});
export type Team = z.infer<typeof Team>;

/* -------------------------------------------------------------------------- */
/* Player                                                                      */
/* -------------------------------------------------------------------------- */

/** A jersey number held over a date range. Numbers change between seasons and games. */
export const JerseyAssignment = z.object({
  number: z.string().regex(/^\d{1,2}$/, { message: "jersey number must be 0-99" }),
  effectiveFrom: Instant,
  effectiveTo: Instant.nullable().default(null),
});
export type JerseyAssignment = z.infer<typeof JerseyAssignment>;

export const Player = z.object({
  id: PlayerId,
  teamId: TeamId,
  /** Full name. Personally identifying; never written to logs. */
  fullName: shortText(120),
  /** What the interface calls them. Safe to display within the team. */
  displayName: shortText(60),
  /**
   * Present only when the player has their own account. A rostered player
   * without an account still has consent and film handled through a guardian.
   */
  userId: UserId.nullable().default(null),
  jerseyHistory: z.array(JerseyAssignment).default([]),
  /** True when the player is a minor, which tightens consent requirements. */
  isMinor: z.boolean(),
  createdAt: Instant,
});
export type Player = z.infer<typeof Player>;

/** The jersey number in effect at a given instant, or null if unknown. */
export const jerseyNumberAt = (player: Player, at: Instant): string | null => {
  const match = player.jerseyHistory.find(
    (j) => j.effectiveFrom <= at && (j.effectiveTo === null || at < j.effectiveTo),
  );
  return match?.number ?? null;
};

/* -------------------------------------------------------------------------- */
/* Guardian relationship                                                       */
/* -------------------------------------------------------------------------- */

export const GuardianRelationshipType = z.enum([
  "parent",
  "legal_guardian",
  "authorized_adult",
]);
export type GuardianRelationshipType = z.infer<typeof GuardianRelationshipType>;

/**
 * Links a guardian's user account to a player.
 *
 * `verifiedAt` is what makes the relationship load-bearing. An unverified claim
 * to be someone's parent grants nothing.
 */
export const GuardianRelationship = z.object({
  id: GuardianRelationshipId,
  guardianUserId: UserId,
  playerId: PlayerId,
  relationship: GuardianRelationshipType,
  verifiedAt: Instant.nullable().default(null),
  /** Who verified it, for the audit trail. */
  verifiedByUserId: UserId.nullable().default(null),
  revokedAt: Instant.nullable().default(null),
  createdAt: Instant,
});
export type GuardianRelationship = z.infer<typeof GuardianRelationship>;

export const isEffectiveGuardianship = (
  g: Pick<GuardianRelationship, "verifiedAt" | "revokedAt">,
): boolean => g.verifiedAt !== null && g.revokedAt === null;

/* -------------------------------------------------------------------------- */
/* Consent                                                                     */
/* -------------------------------------------------------------------------- */

export const ConsentScope = z.enum([
  /** Film of this player may be uploaded and stored. */
  "film_upload",
  /** Automated analysis may run over film of this player. */
  "automated_analysis",
  /** The player's coach may assign learning moments to them. */
  "coach_assignment",
  /** A named trainer may be granted access. */
  "trainer_access",
  /** Film may be retained beyond the team's default retention window. */
  "extended_retention",
]);
export type ConsentScope = z.infer<typeof ConsentScope>;

export const ConsentState = z.enum([
  /** Never asked. Treated exactly like `denied` for access decisions. */
  "not_requested",
  "requested",
  "granted",
  "denied",
  "withdrawn",
  "expired",
]);
export type ConsentState = z.infer<typeof ConsentState>;

/**
 * Only `granted` permits the action.
 *
 * Everything else — including `not_requested` — denies. Absence of a consent
 * record is never permission (blueprint §10, private by default).
 */
export const permitsAction = (state: ConsentState): boolean => state === "granted";

export const ConsentRecord = z
  .object({
    id: ConsentRecordId,
    playerId: PlayerId,
    scope: ConsentScope,
    state: ConsentState,
    /** The guardian or adult player who answered. */
    grantedByUserId: UserId.nullable().default(null),
    grantedAt: Instant.nullable().default(null),
    expiresAt: Instant.nullable().default(null),
    withdrawnAt: Instant.nullable().default(null),
    /** Free-text record of how consent was obtained, for the audit trail. */
    method: shortText(200).nullable().default(null),
    createdAt: Instant,
    updatedAt: Instant,
  })
  .superRefine((c, ctx) => {
    if (c.state === "granted" && (!c.grantedByUserId || !c.grantedAt)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["grantedByUserId"],
        message: "granted consent must record who granted it and when",
      });
    }
    if (c.state === "withdrawn" && !c.withdrawnAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["withdrawnAt"],
        message: "withdrawn consent must record when it was withdrawn",
      });
    }
  });
export type ConsentRecord = z.infer<typeof ConsentRecord>;

/* -------------------------------------------------------------------------- */
/* Access grant                                                                */
/* -------------------------------------------------------------------------- */

export const AccessGrantId = brandedId("AccessGrantId");
export type AccessGrantId = z.infer<typeof AccessGrantId>;

/**
 * An explicit, revocable grant of access to one player's material.
 *
 * Trainers hold no access by virtue of their role. A trainer sees a player only
 * when a grant exists, it has not been revoked, and it has not expired. This is
 * the mechanism behind the `trainer_access` consent scope.
 */
export const AccessGrant = z.object({
  id: AccessGrantId,
  teamId: TeamId,
  playerId: PlayerId,
  /** The account receiving access. */
  granteeUserId: UserId,
  grantedByUserId: UserId,
  grantedAt: Instant,
  expiresAt: Instant.nullable().default(null),
  revokedAt: Instant.nullable().default(null),
});
export type AccessGrant = z.infer<typeof AccessGrant>;

export const isEffectiveGrant = (
  g: Pick<AccessGrant, "revokedAt" | "expiresAt">,
  now: Instant,
): boolean => g.revokedAt === null && (g.expiresAt === null || now < g.expiresAt);
