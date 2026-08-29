import type { Game, VideoSource } from "@/lib/reps/schema";

const MUX_STREAM = "https://stream.mux.com";
const MUX_IMAGE = "https://image.mux.com";

const FIXTURE_SOURCE: VideoSource = {
  kind: "progressive",
  encodings: [
    { src: "/demo/dragons-film.webm", type: 'video/webm; codecs="vp9"' },
    { src: "/demo/dragons-film.mp4", type: 'video/mp4; codecs="avc1.42E01E"' },
  ],
  posterSrc: "/demo/dragons-film-poster.png",
  disclaimer: "Fixture video — the committed demo film stands in for your upload.",
};

/**
 * Resolves what the player should actually load for a game.
 *
 * Seeded games carry a static source. Uploaded games resolve from the provider
 * asset, and only once it is ready — a game that is still processing has no
 * playable video and must not silently fall back to something else.
 */
export function getPlayableVideo(game: Game): VideoSource | null {
  if (game.video) return game.video;

  const asset = game.videoAsset;
  if (!asset || asset.status !== "ready" || !asset.playbackId) return null;

  if (asset.provider === "fixture") {
    return FIXTURE_SOURCE;
  }

  return {
    kind: "hls",
    src: `${MUX_STREAM}/${asset.playbackId}.m3u8`,
    posterSrc: `${MUX_IMAGE}/${asset.playbackId}/thumbnail.jpg`,
  };
}

/** Video length in ms, when the provider has reported it. */
export function getVideoDurationMs(game: Game): number | null {
  const seconds = game.videoAsset?.durationSeconds;
  return seconds ? Math.round(seconds * 1000) : null;
}
