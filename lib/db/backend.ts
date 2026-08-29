import type { Game, Rep, VideoAsset } from "@/lib/reps/schema";

/**
 * Durable storage for authored content — games, their video assets, and reps.
 *
 * Sessions are deliberately not here: they are anonymous and per-device, and
 * live in a cookie so the demo works with no account. Games and reps are the
 * things that must survive, be shared, and be owned.
 */

export type NewGame = {
  title: string;
  opponent: string;
  playedOn: string;
  identity: Game["identity"];
  fileName: string | null;
};

export type BackendKind = "supabase" | "file";

export interface ContentBackend {
  readonly kind: BackendKind;
  /** Human-readable note rendered in the UI so storage is never a mystery. */
  readonly label: string;

  createGame(input: NewGame): Promise<Game>;
  getGame(gameId: string): Promise<Game | null>;
  listGames(): Promise<Game[]>;
  deleteGame(gameId: string): Promise<void>;

  setVideoAsset(gameId: string, asset: VideoAsset): Promise<void>;
  /** Webhooks arrive with provider ids, not our game id. */
  findGameByUploadId(uploadId: string): Promise<Game | null>;
  findGameByAssetId(assetId: string): Promise<Game | null>;

  listReps(gameId: string, options?: { includeDrafts?: boolean }): Promise<Rep[]>;
  getRep(repId: string): Promise<Rep | null>;
  saveRep(rep: Rep): Promise<void>;
  deleteRep(repId: string): Promise<void>;

  /**
   * Records a provider event id. Returns false when it has been seen before,
   * which is how repeated webhook deliveries stay idempotent.
   */
  recordWebhookEvent(eventId: string, type: string): Promise<boolean>;

  /**
   * Releases a claimed event id. Called when applying an event failed, so the
   * provider's retry is not mistaken for a duplicate and silently dropped.
   */
  forgetWebhookEvent(eventId: string): Promise<void>;
}
