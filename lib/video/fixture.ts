import { createHmac } from "node:crypto";
import { z } from "zod";
import { readJsonFile, updateJsonFile } from "@/lib/db/json-file";
import { verifySignedWebhook } from "./mux";
import {
  VideoProviderError,
  type AssetStatus,
  type CreateDirectUploadInput,
  type DirectUpload,
  type PlaybackInfo,
  type UploadStatus,
  type VideoProvider,
  type VideoWebhookEvent,
} from "./provider";

const FIXTURE_FILE = "fixture-uploads.json";

/**
 * Fixture mode is development-only and openly labelled, so this secret is a
 * fixed constant rather than a credential. It exists so that the webhook route
 * exercises real signature verification even without Mux.
 */
export const FIXTURE_WEBHOOK_SECRET = "nextrep-fixture-webhook-secret";

/** How long the fixture pretends to transcode, so "preparing" is observable. */
const FIXTURE_TRANSCODE_MS = 2500;

/**
 * The committed demo film stands in for the uploaded file. Fixture mode never
 * receives real bytes — the PUT is counted and discarded.
 */
const FIXTURE_PLAYBACK_ENCODINGS = [
  { src: "/demo/dragons-film.webm", type: 'video/webm; codecs="vp9"' },
  { src: "/demo/dragons-film.mp4", type: 'video/mp4; codecs="avc1.42E01E"' },
];
const FIXTURE_POSTER = "/demo/dragons-film-poster.png";
export const FIXTURE_DURATION_SECONDS = 118;
export const FIXTURE_ASPECT_RATIO = "16:9";

const recordSchema = z.object({
  uploadId: z.string(),
  assetId: z.string().nullable(),
  passthrough: z.string(),
  status: z.enum(["waiting", "asset_created", "errored", "cancelled", "timed_out"]),
  bytesReceived: z.number(),
  assetReadyAt: z.number().nullable(),
  error: z.string().nullable(),
});

type FixtureRecord = z.infer<typeof recordSchema>;
type FixtureFile = { uploads: FixtureRecord[] };

const EMPTY: FixtureFile = { uploads: [] };

async function readAll(): Promise<FixtureRecord[]> {
  const file = await readJsonFile<FixtureFile>(FIXTURE_FILE, EMPTY);
  const parsed = z.object({ uploads: z.array(recordSchema) }).safeParse(file);
  return parsed.success ? parsed.data.uploads : [];
}

export class FixtureVideoProvider implements VideoProvider {
  readonly kind = "fixture" as const;
  readonly isConfigured = true;

  private readonly now: () => number;

  constructor(now: () => number = () => Date.now()) {
    this.now = now;
  }

  async createDirectUpload(input: CreateDirectUploadInput): Promise<DirectUpload> {
    const uploadId = `fixup_${Math.random().toString(36).slice(2, 12)}`;
    const record: FixtureRecord = {
      uploadId,
      assetId: null,
      passthrough: input.passthrough,
      status: "waiting",
      bytesReceived: 0,
      assetReadyAt: null,
      error: null,
    };

    await updateJsonFile<FixtureFile, void>(FIXTURE_FILE, EMPTY, (current) => ({
      next: { uploads: [record, ...current.uploads].slice(0, 50) },
      result: undefined,
    }));

    return { uploadId, url: `/api/fixture/upload/${uploadId}` };
  }

  /** Called by the fixture PUT route once the browser has streamed the file. */
  async completeUpload(uploadId: string, bytesReceived: number): Promise<FixtureRecord> {
    const readyAt = this.now() + FIXTURE_TRANSCODE_MS;

    const updated = await updateJsonFile<FixtureFile, FixtureRecord | null>(
      FIXTURE_FILE,
      EMPTY,
      (current) => {
        let result: FixtureRecord | null = null;
        const uploads = current.uploads.map((record) => {
          if (record.uploadId !== uploadId) return record;
          result = {
            ...record,
            status: "asset_created" as const,
            assetId: record.assetId ?? `fixasset_${uploadId.slice(6)}`,
            bytesReceived,
            assetReadyAt: readyAt,
          };
          return result;
        });
        return { next: { uploads }, result };
      },
    );

    if (!updated) {
      throw new VideoProviderError("not_found", "No fixture upload with that id.");
    }
    return updated;
  }

  private async find(uploadId: string): Promise<FixtureRecord> {
    const record = (await readAll()).find((item) => item.uploadId === uploadId);
    if (!record) {
      throw new VideoProviderError("not_found", "No fixture upload with that id.");
    }
    return record;
  }

  async getUpload(uploadId: string): Promise<UploadStatus> {
    const record = await this.find(uploadId);
    return {
      uploadId: record.uploadId,
      status: record.status,
      assetId: record.assetId,
      error: record.error,
    };
  }

  async cancelUpload(uploadId: string): Promise<void> {
    await updateJsonFile<FixtureFile, void>(FIXTURE_FILE, EMPTY, (current) => ({
      next: {
        uploads: current.uploads.map((record) =>
          record.uploadId === uploadId && record.status === "waiting"
            ? { ...record, status: "cancelled" as const }
            : record,
        ),
      },
      result: undefined,
    }));
  }

  async getAsset(assetId: string): Promise<AssetStatus> {
    const record = (await readAll()).find((item) => item.assetId === assetId);
    if (!record) {
      throw new VideoProviderError("not_found", "No fixture asset with that id.");
    }

    const ready = record.assetReadyAt !== null && this.now() >= record.assetReadyAt;
    return {
      assetId,
      status: record.error ? "errored" : ready ? "ready" : "preparing",
      playbackId: ready ? `fixplay_${assetId.slice(9)}` : null,
      durationSeconds: ready ? FIXTURE_DURATION_SECONDS : null,
      aspectRatio: ready ? FIXTURE_ASPECT_RATIO : null,
      error: record.error,
    };
  }

  async getPlayback(): Promise<PlaybackInfo> {
    return { kind: "progressive", encodings: FIXTURE_PLAYBACK_ENCODINGS, posterSrc: FIXTURE_POSTER };
  }

  async deleteAsset(assetId: string): Promise<void> {
    await updateJsonFile<FixtureFile, void>(FIXTURE_FILE, EMPTY, (current) => ({
      next: { uploads: current.uploads.filter((record) => record.assetId !== assetId) },
      result: undefined,
    }));
  }

  /** Identical verification to the real provider, replay window included. */
  verifyWebhook(rawBody: string, headers: Headers): VideoWebhookEvent {
    return verifySignedWebhook(rawBody, headers, FIXTURE_WEBHOOK_SECRET);
  }

  /** Test and local-tooling helper: produces a header the route will accept. */
  static signWebhook(rawBody: string, atSeconds = Math.floor(Date.now() / 1000)): string {
    const signature = createHmac("sha256", FIXTURE_WEBHOOK_SECRET)
      .update(`${atSeconds}.${rawBody}`)
      .digest("hex");
    return `t=${atSeconds},v1=${signature}`;
  }
}
