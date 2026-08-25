import { z } from "zod";
import { brandedId, Instant, shortText, TimestampMs } from "../primitives.js";
import { PlayerId, TeamId, UserId } from "./identity.js";

export const GameId = brandedId("GameId");
export type GameId = z.infer<typeof GameId>;

export const VideoAssetId = brandedId("VideoAssetId");
export type VideoAssetId = z.infer<typeof VideoAssetId>;

/* -------------------------------------------------------------------------- */
/* Game                                                                        */
/* -------------------------------------------------------------------------- */

/** Which direction the team of interest attacks, per half. Needed to read possessions. */
export const PlayDirection = z.enum(["left_to_right", "right_to_left", "unknown"]);
export type PlayDirection = z.infer<typeof PlayDirection>;

/**
 * The context an uploader supplies (blueprint §4.1).
 *
 * Collected because analysis genuinely needs it, not to build a profile. Every
 * field here is used by a later processing stage.
 */
export const GameUploadContext = z.object({
  opponentName: shortText(120),
  playedOn: Instant,
  /** Uniform colour of the team of interest, as free text the coach recognises. */
  uniformColor: shortText(40),
  opponentUniformColor: shortText(40).nullable().default(null),
  firstHalfDirection: PlayDirection.default("unknown"),
  /** Whether the target player started, which constrains early-game identity search. */
  targetPlayerStarted: z.boolean().nullable().default(null),
  /** What the uploader wants reviewed, in their own words. */
  reviewFocus: z.string().trim().max(600).nullable().default(null),
});
export type GameUploadContext = z.infer<typeof GameUploadContext>;

export const GameStatus = z.enum([
  "draft",
  "awaiting_upload",
  "processing",
  "ready",
  "failed",
  "deleting",
  "deleted",
]);
export type GameStatus = z.infer<typeof GameStatus>;

export const Game = z.object({
  id: GameId,
  teamId: TeamId,
  title: shortText(160),
  status: GameStatus,
  uploadedByUserId: UserId,
  context: GameUploadContext,
  /** Players this game is being processed for. Usually one in the pilot. */
  targetPlayerIds: z.array(PlayerId).min(1),
  videoAssetId: VideoAssetId.nullable().default(null),
  createdAt: Instant,
  updatedAt: Instant,
});
export type Game = z.infer<typeof Game>;

/* -------------------------------------------------------------------------- */
/* Video asset                                                                 */
/* -------------------------------------------------------------------------- */

export const VideoAssetStatus = z.enum([
  "reserved",
  "uploading",
  "processing",
  "ready",
  "errored",
  "deleted",
]);
export type VideoAssetStatus = z.infer<typeof VideoAssetStatus>;

export const VideoRendition = z.object({
  name: shortText(40),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  bitrateKbps: z.number().int().positive().nullable().default(null),
});
export type VideoRendition = z.infer<typeof VideoRendition>;

/**
 * Metadata about a video held by an external provider.
 *
 * Deliberately stores no playable URL. A provider URL in the database is a
 * provider URL that eventually reaches a client. Playback is issued at request
 * time by the data-access layer as a short-lived, authorized ticket; see
 * `PlaybackGrant` in services/video.
 */
export const VideoAsset = z.object({
  id: VideoAssetId,
  gameId: GameId,
  status: VideoAssetStatus,

  /** Opaque identifiers from the provider. Never rendered to a client. */
  providerName: z.enum(["none", "mux", "local_file"]),
  providerAssetId: shortText(200).nullable().default(null),
  providerUploadId: shortText(200).nullable().default(null),
  /** Provider playback identifier. Exchanged server-side for a signed token. */
  providerPlaybackId: shortText(200).nullable().default(null),

  durationMs: TimestampMs.nullable().default(null),
  renditions: z.array(VideoRendition).default([]),

  /** Scheduled deletion instant driven by the team's retention policy. */
  retentionExpiresAt: Instant.nullable().default(null),
  deletedAt: Instant.nullable().default(null),

  createdAt: Instant,
  updatedAt: Instant,
});
export type VideoAsset = z.infer<typeof VideoAsset>;

/**
 * Whether film can actually be played for this asset right now.
 *
 * Phase 0 has no authorized footage and no video provider, so this is `false`
 * for every seeded record. The interface must render an honest
 * "authorized clip required" state rather than a broken player.
 */
export const isPlayable = (
  asset: Pick<VideoAsset, "status" | "providerPlaybackId" | "deletedAt">,
): boolean =>
  asset.status === "ready" &&
  asset.providerPlaybackId !== null &&
  asset.deletedAt === null;
