import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import {
  type Actor,
  type AuditAction,
  type AuditResourceType,
  AuthorizationError,
  authorize as decide,
  type ConsentScope,
  type ConsentState,
  isActiveMembership,
  type PermissionAction,
  type PermissionResource,
  type PlayerId,
  type TeamId,
  type User,
} from "@readrep/domain";
import { localStore } from "../store/local-store";
import { logger } from "../logging";
import { readSessionUserId } from "./session";

/**
 * The authorization boundary for the whole application.
 *
 * Every read and every mutation goes through `requirePermission`. Route
 * handlers, Server Actions, and pages call it; components never do. `proxy.ts`
 * performs an optimistic redirect for signed-out visitors and is explicitly not
 * a security boundary — a request that bypasses it still cannot read anything,
 * because the check lives here.
 *
 * Per-request memoization comes from React `cache`, so a page that authorizes
 * six things resolves the actor once.
 */

/** The signed-in user, or null. Memoized per request. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const userId = await readSessionUserId();
  if (!userId) return null;
  const user = await localStore.identity.findUserById(userId as never);
  if (!user || user.deactivatedAt !== null) return null;
  return user;
});

/** Resolves the caller's memberships, guardianships, and grants from storage. */
export const getCurrentActor = cache(async (): Promise<Actor | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const [memberships, guardianships, grants] = await Promise.all([
    localStore.identity.listMembershipsForUser(user.id),
    localStore.identity.listGuardianshipsForUser(user.id),
    localStore.identity.listGrantsForUser(user.id),
  ]);
  return { userId: user.id, memberships, guardianships, grants };
});

export class NotAuthenticatedError extends Error {
  constructor() {
    super("You need to be signed in.");
    this.name = "NotAuthenticatedError";
  }
}

const consentLookupFor = async (playerId: PlayerId) => {
  const records = await localStore.consents.listForPlayer(playerId);
  const byScope = new Map(records.map((r) => [r.scope, r.state]));
  return (scope: ConsentScope): ConsentState => byScope.get(scope) ?? "not_requested";
};

const requestContext = async () => {
  try {
    const h = await headers();
    return {
      ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: h.get("user-agent"),
      requestId: h.get("x-request-id"),
    };
  } catch {
    return { ipAddress: null, userAgent: null, requestId: null };
  }
};

/** Records an audit row. Failures are logged, never thrown at the caller. */
export const recordAudit = async (params: {
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId: string;
  outcome: "allowed" | "denied" | "error";
  actorUserId?: string | null;
  teamId?: TeamId | null;
  metadata?: Record<string, string | number | boolean>;
}): Promise<void> => {
  try {
    const security = await requestContext();
    await localStore.audit.append({
      id: `audit-${crypto.randomUUID()}` as never,
      actorUserId: (params.actorUserId ?? null) as never,
      actorDescription: params.actorUserId ? "user" : "system",
      teamId: (params.teamId ?? null) as never,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      outcome: params.outcome,
      security,
      metadata: params.metadata ?? {},
      occurredAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("failed to record audit event", error, { action: params.action });
  }
};

export type PermissionCheck = {
  action: PermissionAction;
  resource: PermissionResource;
  /** Audit metadata, so a denial is traceable to a resource. */
  audit: { action: AuditAction; resourceType: AuditResourceType; resourceId: string };
};

/**
 * Authorizes the caller or throws.
 *
 * Denials are audited before the throw. A silent denial is a denial nobody can
 * investigate, and blueprint §10 requires an audit trail for exactly this.
 */
export const requirePermission = async (check: PermissionCheck): Promise<Actor> => {
  const actor = await getCurrentActor();
  if (!actor) {
    await recordAudit({ ...check.audit, outcome: "denied" });
    throw new NotAuthenticatedError();
  }

  const team = await localStore.identity.findTeamById(check.resource.teamId);
  const consent =
    check.resource.type === "player"
      ? await consentLookupFor(check.resource.playerId)
      : undefined;

  const decision = decide({
    actor,
    action: check.action,
    resource: check.resource,
    now: new Date().toISOString(),
    consent,
    teamPolicy: team?.privacyDefaults,
  });

  if (!decision.allowed) {
    await recordAudit({
      action: "authz.denied",
      resourceType: check.audit.resourceType,
      resourceId: check.audit.resourceId,
      outcome: "denied",
      actorUserId: actor.userId,
      teamId: check.resource.teamId,
      metadata: { attempted: check.action, reason: decision.reason },
    });
    throw new AuthorizationError(decision.reason);
  }

  return actor;
};

/** The active membership rows the caller holds on a team. */
export const activeRolesOnTeam = (actor: Actor, teamId: TeamId): string[] =>
  actor.memberships
    .filter((m) => m.teamId === teamId && isActiveMembership(m))
    .map((m) => m.role);

/** The player row this account is, when the caller is a player. */
export const playerIdForActor = (actor: Actor, teamId: TeamId): PlayerId | null =>
  actor.memberships.find(
    (m) => m.teamId === teamId && m.role === "player" && isActiveMembership(m),
  )?.playerId ?? null;
