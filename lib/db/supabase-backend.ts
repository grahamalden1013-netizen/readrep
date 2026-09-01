import type { SupabaseClient } from "@supabase/supabase-js";
import { AuthRequiredError } from "@/lib/errors";
import {
  gameSchema,
  repSchema,
  type Game,
  type Rep,
  type VideoAsset,
} from "@/lib/reps/schema";
import type { ContentBackend, NewGame } from "./backend";

/** Row shapes. Kept narrow so a schema drift surfaces as a parse error, not a crash. */
type GameRow = {
  id: string;
  title: string;
  opponent: string;
  played_on: string;
  jersey_number: string;
  team_color: string;
  marker: string | null;
  origin: string;
  created_at: string;
  video_assets: VideoAssetRow[] | VideoAssetRow | null;
};

type VideoAssetRow = {
  game_id: string;
  provider: string;
  status: string;
  upload_id: string | null;
  asset_id: string | null;
  playback_id: string | null;
  duration_seconds: number | null;
  aspect_ratio: string | null;
  error: string | null;
  file_name: string | null;
  ready_at: string | null;
  updated_at: string;
};

type RepRow = {
  id: string;
  game_id: string;
  position: number;
  status: string;
  published_at: string | null;
  title: string;
  category: string;
  difficulty: string;
  clip_start_ms: number;
  decision_pause_ms: number;
  clip_end_ms: number;
  situation: string;
  prompt: string;
  correct_choice_id: string;
  actual_choice_id: string;
  actual_outcome: string;
  explanation: string;
  coaching_cue: string;
  answer_choices: { choice_id: string; label: string; position: number }[];
};

const GAME_SELECT = "id, title, opponent, played_on, jersey_number, team_color, marker, origin, created_at, video_assets(*)";
const REP_SELECT =
  "id, game_id, position, status, published_at, title, category, difficulty, clip_start_ms, decision_pause_ms, clip_end_ms, situation, prompt, correct_choice_id, actual_choice_id, actual_outcome, explanation, coaching_cue, answer_choices(choice_id, label, position)";

function firstAsset(value: GameRow["video_assets"]): VideoAssetRow | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function toVideoAsset(row: VideoAssetRow | null): VideoAsset | null {
  if (!row) return null;
  return {
    provider: row.provider === "mux" ? "mux" : "fixture",
    status: row.status as VideoAsset["status"],
    uploadId: row.upload_id,
    assetId: row.asset_id,
    playbackId: row.playback_id,
    durationSeconds: row.duration_seconds,
    aspectRatio: row.aspect_ratio,
    error: row.error,
    fileName: row.file_name,
    readyAt: row.ready_at,
    updatedAt: row.updated_at,
  };
}

function toGame(row: GameRow): Game {
  return gameSchema.parse({
    id: row.id,
    title: row.title,
    opponent: row.opponent,
    playedOn: row.played_on,
    identity: {
      jerseyNumber: row.jersey_number,
      teamColor: row.team_color,
      ...(row.marker ? { marker: row.marker } : {}),
    },
    video: null,
    videoAsset: toVideoAsset(firstAsset(row.video_assets)),
    origin: row.origin === "demo" ? "demo" : "upload",
    createdAt: row.created_at,
  });
}

function toRep(row: RepRow): Rep {
  return repSchema.parse({
    id: row.id,
    gameId: row.game_id,
    order: row.position,
    status: row.status,
    publishedAt: row.published_at,
    title: row.title,
    category: row.category,
    difficulty: row.difficulty,
    clipStartMs: row.clip_start_ms,
    decisionPauseMs: row.decision_pause_ms,
    clipEndMs: row.clip_end_ms,
    situation: row.situation,
    prompt: row.prompt,
    choices: [...row.answer_choices]
      .sort((a, b) => a.position - b.position)
      .map((choice) => ({ id: choice.choice_id, label: choice.label })),
    correctChoiceId: row.correct_choice_id,
    actualChoiceId: row.actual_choice_id,
    actualOutcome: row.actual_outcome,
    explanation: row.explanation,
    coachingCue: row.coaching_cue,
  });
}

export class SupabaseError extends Error {
  constructor(operation: string, cause: { message: string; code?: string }) {
    // Postgres error messages are safe to surface; they never carry the key.
    super(`${operation} failed: ${cause.message}`);
    this.name = "SupabaseError";
  }
}

export class SupabaseContentBackend implements ContentBackend {
  readonly kind = "supabase" as const;
  readonly label = "Supabase";

  private readonly client: SupabaseClient;
  /** Null on the webhook path, where there is no signed-in user. */
  private readonly ownerId: string | null;

  constructor(client: SupabaseClient, ownerId: string | null) {
    this.client = client;
    this.ownerId = ownerId;
  }

  private requireOwner(): string {
    if (!this.ownerId) {
      // Defence in depth: protected Server Actions resolve the owner from the
      // session before they get here. If one slips through, fail with the typed
      // auth error so the client can prompt a re-login, not a generic 500.
      throw new AuthRequiredError();
    }
    return this.ownerId;
  }

  async createGame(input: NewGame): Promise<Game> {
    const { data, error } = await this.client
      .from("games")
      .insert({
        owner_id: this.requireOwner(),
        title: input.title,
        opponent: input.opponent,
        played_on: input.playedOn,
        jersey_number: input.identity.jerseyNumber,
        team_color: input.identity.teamColor,
        marker: input.identity.marker ?? null,
        origin: "upload",
      })
      .select(GAME_SELECT)
      .single<GameRow>();

    if (error) throw new SupabaseError("Creating the game", error);
    return toGame(data);
  }

  async getGame(gameId: string): Promise<Game | null> {
    const { data, error } = await this.client
      .from("games")
      .select(GAME_SELECT)
      .eq("id", gameId)
      .maybeSingle<GameRow>();

    if (error) throw new SupabaseError("Loading the game", error);
    return data ? toGame(data) : null;
  }

  async listGames(): Promise<Game[]> {
    const { data, error } = await this.client
      .from("games")
      .select(GAME_SELECT)
      .order("created_at", { ascending: false })
      .returns<GameRow[]>();

    if (error) throw new SupabaseError("Listing games", error);
    return (data ?? []).map(toGame);
  }

  async deleteGame(gameId: string): Promise<void> {
    const { error } = await this.client.from("games").delete().eq("id", gameId);
    if (error) throw new SupabaseError("Deleting the game", error);
  }

  async setVideoAsset(gameId: string, asset: VideoAsset): Promise<void> {
    const { error } = await this.client.from("video_assets").upsert(
      {
        game_id: gameId,
        provider: asset.provider,
        status: asset.status,
        upload_id: asset.uploadId,
        asset_id: asset.assetId,
        playback_id: asset.playbackId,
        duration_seconds: asset.durationSeconds,
        aspect_ratio: asset.aspectRatio,
        error: asset.error,
        file_name: asset.fileName,
        ready_at: asset.readyAt,
        updated_at: asset.updatedAt,
      },
      { onConflict: "game_id" },
    );

    if (error) throw new SupabaseError("Saving the video asset", error);
  }

  private async findGameByAssetColumn(column: string, value: string): Promise<Game | null> {
    const { data, error } = await this.client
      .from("video_assets")
      .select("game_id")
      .eq(column, value)
      .maybeSingle<{ game_id: string }>();

    if (error) throw new SupabaseError("Looking up the game", error);
    return data ? this.getGame(data.game_id) : null;
  }

  findGameByUploadId(uploadId: string): Promise<Game | null> {
    return this.findGameByAssetColumn("upload_id", uploadId);
  }

  findGameByAssetId(assetId: string): Promise<Game | null> {
    return this.findGameByAssetColumn("asset_id", assetId);
  }

  async listReps(gameId: string, options?: { includeDrafts?: boolean }): Promise<Rep[]> {
    let query = this.client.from("reps").select(REP_SELECT).eq("game_id", gameId);
    if (!options?.includeDrafts) query = query.eq("status", "published");

    const { data, error } = await query.order("position", { ascending: true }).returns<RepRow[]>();
    if (error) throw new SupabaseError("Listing reps", error);
    return (data ?? []).map(toRep);
  }

  async getRep(repId: string): Promise<Rep | null> {
    const { data, error } = await this.client
      .from("reps")
      .select(REP_SELECT)
      .eq("id", repId)
      .maybeSingle<RepRow>();

    if (error) throw new SupabaseError("Loading the rep", error);
    return data ? toRep(data) : null;
  }

  async saveRep(rep: Rep): Promise<void> {
    const { error } = await this.client.from("reps").upsert({
      id: rep.id,
      game_id: rep.gameId,
      position: rep.order,
      status: rep.status,
      published_at: rep.publishedAt,
      title: rep.title,
      category: rep.category,
      difficulty: rep.difficulty,
      clip_start_ms: rep.clipStartMs,
      decision_pause_ms: rep.decisionPauseMs,
      clip_end_ms: rep.clipEndMs,
      situation: rep.situation,
      prompt: rep.prompt,
      correct_choice_id: rep.correctChoiceId,
      actual_choice_id: rep.actualChoiceId,
      actual_outcome: rep.actualOutcome,
      explanation: rep.explanation,
      coaching_cue: rep.coachingCue,
    });
    if (error) throw new SupabaseError("Saving the rep", error);

    // Replace the choice set wholesale: editing a draft can remove a choice.
    const { error: deleteError } = await this.client
      .from("answer_choices")
      .delete()
      .eq("rep_id", rep.id);
    if (deleteError) throw new SupabaseError("Replacing answer choices", deleteError);

    const { error: insertError } = await this.client.from("answer_choices").insert(
      rep.choices.map((choice, index) => ({
        rep_id: rep.id,
        choice_id: choice.id,
        label: choice.label,
        position: index,
      })),
    );
    if (insertError) throw new SupabaseError("Saving answer choices", insertError);
  }

  async deleteRep(repId: string): Promise<void> {
    const { error } = await this.client.from("reps").delete().eq("id", repId);
    if (error) throw new SupabaseError("Deleting the rep", error);
  }

  async recordWebhookEvent(eventId: string, type: string): Promise<boolean> {
    // The primary key does the dedupe; a conflict means we have seen this event.
    const { error } = await this.client
      .from("webhook_events")
      .insert({ id: eventId, type })
      .select("id")
      .single();

    if (!error) return true;
    if (error.code === "23505") return false;
    throw new SupabaseError("Recording the webhook event", error);
  }

  async forgetWebhookEvent(eventId: string): Promise<void> {
    const { error } = await this.client.from("webhook_events").delete().eq("id", eventId);
    if (error) throw new SupabaseError("Releasing the webhook event", error);
  }
}
