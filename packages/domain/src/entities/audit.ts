import { z } from "zod";
import { brandedId, Instant, shortText } from "../primitives";
import { TeamId, UserId } from "./identity";

export const AuditEventId = brandedId("AuditEventId");
export type AuditEventId = z.infer<typeof AuditEventId>;

/**
 * The actions ReadRep records.
 *
 * The blueprint requires audit logs for viewing, sharing, downloading, coaching
 * changes, and administrative actions. Each of those has an entry here. Reads
 * of private media are audited, not just writes — knowing who watched a minor's
 * film is the point.
 */
export const AuditAction = z.enum([
  // Authentication
  "auth.signed_in",
  "auth.signed_out",
  "auth.sign_in_failed",
  "auth.session_revoked",

  // Access to private media and analysis
  "film.viewed",
  "film.playback_granted",
  "film.download_requested",
  "moment.viewed",
  "attempt.viewed",

  // Sharing and access control
  "access.granted",
  "access.revoked",
  "share.link_created",
  "share.link_revoked",

  // Coaching changes
  "coach_system.created",
  "coach_system.activated",
  "coach_rule.edited",
  "candidate.reviewed",
  "moment.published",
  "moment.retired",
  "assignment.created",
  "assignment.revoked",

  // Consent
  "consent.requested",
  "consent.granted",
  "consent.denied",
  "consent.withdrawn",

  // Administration and lifecycle
  "team.member_added",
  "team.member_removed",
  "team.role_changed",
  "game.uploaded",
  "game.deleted",
  "video.deleted",
  "retention.purged",

  // Authorization failures are security-relevant and always recorded.
  "authz.denied",
]);
export type AuditAction = z.infer<typeof AuditAction>;

export const AuditResourceType = z.enum([
  "user",
  "team",
  "player",
  "membership",
  "consent",
  "game",
  "video_asset",
  "processing_run",
  "decision_candidate",
  "coach_system",
  "coach_rule",
  "coach_review",
  "learning_moment",
  "assignment",
  "player_attempt",
  "reflection",
]);
export type AuditResourceType = z.infer<typeof AuditResourceType>;

/**
 * Request context attached to an audited action.
 *
 * IP address and user agent are coarse security signals. Neither media content
 * nor personally identifying media is ever placed in an audit record.
 */
export const AuditSecurityContext = z.object({
  ipAddress: z.string().max(45).nullable().default(null),
  userAgent: z.string().max(300).nullable().default(null),
  requestId: shortText(80).nullable().default(null),
});
export type AuditSecurityContext = z.infer<typeof AuditSecurityContext>;

export const AuditEvent = z.object({
  id: AuditEventId,
  /** Null for actions taken by scheduled jobs rather than a person. */
  actorUserId: UserId.nullable().default(null),
  actorDescription: shortText(80).default("system"),
  teamId: TeamId.nullable().default(null),

  action: AuditAction,
  resourceType: AuditResourceType,
  resourceId: shortText(80),

  /** Whether the action succeeded. Denials are the interesting rows. */
  outcome: z.enum(["allowed", "denied", "error"]),

  security: AuditSecurityContext,

  /**
   * Structured detail that is safe to persist.
   *
   * Scalars only, and never media content, names, or free text a player wrote.
   * `@readrep/observability` redacts before anything reaches a log sink; this
   * field is held to the same standard.
   */
  metadata: z
    .record(z.union([z.string().max(200), z.number(), z.boolean()]))
    .default({}),

  occurredAt: Instant,
});
export type AuditEvent = z.infer<typeof AuditEvent>;
