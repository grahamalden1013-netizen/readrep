import { z } from "zod";
import { FixtureVideoProvider } from "./fixture";
import { MuxVideoProvider } from "./mux";
import { VideoProviderError, type VideoProvider } from "./provider";

const muxEnvSchema = z.object({
  tokenId: z.string().min(1),
  tokenSecret: z.string().min(1),
  webhookSecret: z.string().min(1).nullable(),
});

export type VideoProviderKind = "mux" | "fixture";

export type VideoConfig =
  | { kind: "mux"; webhooksConfigured: boolean }
  | { kind: "fixture"; reason: "no-credentials" | "forced" }
  | { kind: "unavailable"; reason: string };

function readMuxCredentials() {
  const parsed = muxEnvSchema.safeParse({
    tokenId: process.env.MUX_TOKEN_ID,
    tokenSecret: process.env.MUX_TOKEN_SECRET,
    webhookSecret: process.env.MUX_WEBHOOK_SECRET || null,
  });
  return parsed.success ? parsed.data : null;
}

function fixtureAllowed(): boolean {
  if (process.env.NEXTREP_VIDEO_PROVIDER === "fixture") return true;
  // Production must never quietly serve fixture results as real processing.
  return process.env.NODE_ENV !== "production";
}

/**
 * Describes which pipeline is active without touching credentials. Safe to
 * render in the UI so a fixture run is never mistaken for a real one.
 */
export function getVideoConfig(): VideoConfig {
  if (process.env.NEXTREP_VIDEO_PROVIDER === "fixture") {
    return { kind: "fixture", reason: "forced" };
  }

  const credentials = readMuxCredentials();
  if (credentials) {
    return { kind: "mux", webhooksConfigured: credentials.webhookSecret !== null };
  }

  if (fixtureAllowed()) {
    return { kind: "fixture", reason: "no-credentials" };
  }

  return {
    kind: "unavailable",
    reason:
      "MUX_TOKEN_ID and MUX_TOKEN_SECRET are not set. Fixture video is disabled outside development, so uploads are unavailable.",
  };
}

export function getVideoProvider(): VideoProvider {
  const config = getVideoConfig();

  if (config.kind === "mux") {
    const credentials = readMuxCredentials();
    if (!credentials) {
      throw new VideoProviderError("not_configured", "Mux credentials disappeared between checks.");
    }
    return new MuxVideoProvider(credentials);
  }

  if (config.kind === "fixture") {
    return new FixtureVideoProvider();
  }

  throw new VideoProviderError("not_configured", config.reason);
}

export { VideoProviderError };
export type { VideoProvider };
