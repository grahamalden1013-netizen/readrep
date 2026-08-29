import { randomUUID } from "node:crypto";
import { z } from "zod";
import { gameSchema, repSchema, type Game, type Rep, type VideoAsset } from "@/lib/reps/schema";
import { readJsonFile, updateJsonFile } from "./json-file";
import type { ContentBackend, NewGame } from "./backend";

const CONTENT_FILE = "content.json";

const fileSchema = z.object({
  games: z.array(gameSchema),
  reps: z.array(repSchema),
  webhookEvents: z.array(z.object({ id: z.string(), type: z.string(), seenAt: z.string() })),
});

type ContentFile = z.infer<typeof fileSchema>;

const EMPTY: ContentFile = { games: [], reps: [], webhookEvents: [] };

async function read(): Promise<ContentFile> {
  const raw = await readJsonFile<unknown>(CONTENT_FILE, EMPTY);
  const parsed = fileSchema.safeParse(raw);
  return parsed.success ? parsed.data : EMPTY;
}

/**
 * Development-only backend. It exists so that fixture mode can exercise the
 * full upload → studio → publish → session flow without Supabase; `getBackend()`
 * refuses to select it in production, and the UI labels it.
 */
export class FileContentBackend implements ContentBackend {
  readonly kind = "file" as const;
  readonly label = "Local development file store (.nextrep-data)";

  async createGame(input: NewGame): Promise<Game> {
    const game = gameSchema.parse({
      id: `game_${randomUUID()}`,
      title: input.title,
      opponent: input.opponent,
      playedOn: input.playedOn,
      identity: input.identity,
      video: null,
      videoAsset: null,
      origin: "upload",
      createdAt: new Date().toISOString(),
    });

    await updateJsonFile<ContentFile, void>(CONTENT_FILE, EMPTY, (current) => ({
      next: { ...current, games: [game, ...current.games] },
      result: undefined,
    }));

    return game;
  }

  async getGame(gameId: string): Promise<Game | null> {
    return (await read()).games.find((game) => game.id === gameId) ?? null;
  }

  async listGames(): Promise<Game[]> {
    return (await read()).games;
  }

  async deleteGame(gameId: string): Promise<void> {
    await updateJsonFile<ContentFile, void>(CONTENT_FILE, EMPTY, (current) => ({
      next: {
        ...current,
        games: current.games.filter((game) => game.id !== gameId),
        reps: current.reps.filter((rep) => rep.gameId !== gameId),
      },
      result: undefined,
    }));
  }

  async setVideoAsset(gameId: string, asset: VideoAsset): Promise<void> {
    await updateJsonFile<ContentFile, void>(CONTENT_FILE, EMPTY, (current) => ({
      next: {
        ...current,
        games: current.games.map((game) => (game.id === gameId ? { ...game, videoAsset: asset } : game)),
      },
      result: undefined,
    }));
  }

  async findGameByUploadId(uploadId: string): Promise<Game | null> {
    return (await read()).games.find((game) => game.videoAsset?.uploadId === uploadId) ?? null;
  }

  async findGameByAssetId(assetId: string): Promise<Game | null> {
    return (await read()).games.find((game) => game.videoAsset?.assetId === assetId) ?? null;
  }

  async listReps(gameId: string, options?: { includeDrafts?: boolean }): Promise<Rep[]> {
    const reps = (await read()).reps
      .filter((rep) => rep.gameId === gameId)
      .filter((rep) => options?.includeDrafts || rep.status === "published");
    return reps.sort((a, b) => a.order - b.order);
  }

  async getRep(repId: string): Promise<Rep | null> {
    return (await read()).reps.find((rep) => rep.id === repId) ?? null;
  }

  async saveRep(rep: Rep): Promise<void> {
    await updateJsonFile<ContentFile, void>(CONTENT_FILE, EMPTY, (current) => ({
      next: {
        ...current,
        reps: [rep, ...current.reps.filter((existing) => existing.id !== rep.id)],
      },
      result: undefined,
    }));
  }

  async deleteRep(repId: string): Promise<void> {
    await updateJsonFile<ContentFile, void>(CONTENT_FILE, EMPTY, (current) => ({
      next: { ...current, reps: current.reps.filter((rep) => rep.id !== repId) },
      result: undefined,
    }));
  }

  async recordWebhookEvent(eventId: string, type: string): Promise<boolean> {
    return updateJsonFile<ContentFile, boolean>(CONTENT_FILE, EMPTY, (current) => {
      if (current.webhookEvents.some((event) => event.id === eventId)) {
        return { next: current, result: false };
      }
      return {
        next: {
          ...current,
          webhookEvents: [
            { id: eventId, type, seenAt: new Date().toISOString() },
            ...current.webhookEvents,
          ].slice(0, 200),
        },
        result: true,
      };
    });
  }

  async forgetWebhookEvent(eventId: string): Promise<void> {
    await updateJsonFile<ContentFile, void>(CONTENT_FILE, EMPTY, (current) => ({
      next: {
        ...current,
        webhookEvents: current.webhookEvents.filter((event) => event.id !== eventId),
      },
      result: undefined,
    }));
  }
}
