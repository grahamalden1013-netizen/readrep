import type { AiRepResult } from "./schemas";

/** One normalised, already-fetched still frame. `dataUrl` is a base64 data: URI. */
export type AnalysisFrame = {
  timestampSeconds: number;
  dataUrl: string;
  byteLength: number;
  width: number;
  mimeType: string;
};

export type AnalysisInput = {
  target: {
    jerseyNumber: string;
    teamColor: string;
    marker?: string | null;
  };
  clip: {
    clipStartSeconds: number;
    decisionSeconds: number;
    clipEndSeconds: number;
  };
  /** Chronological, deduped, clamped to the clip. */
  frames: AnalysisFrame[];
};

export type AnalysisUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
};

export type AnalysisMetadata = {
  provider: "openai";
  /** The model that actually produced the result. */
  model: string;
  /** True when the configured primary model failed and the fallback was used. */
  modelFallbackUsed: boolean;
  promptVersion: string;
  latencyMs: number;
  usage: AnalysisUsage;
};

export type AnalysisOutcome = {
  /** Raw, still-untrusted model object. The caller validates it. */
  raw: unknown;
  metadata: AnalysisMetadata;
};

export interface RepAiProvider {
  readonly kind: "openai";
  /**
   * A minimal, non-sensitive server-side check that the configured account can
   * reach the configured model. Throws `AiError("not-configured" | "model-unavailable" | ...)`.
   */
  capabilityCheck(): Promise<{ model: string }>;
  /**
   * Runs the vision analysis. Never persists frames, never logs the API key.
   * Returns the raw model object plus audit metadata; validation is the
   * caller's job (`validateAiRepResult`).
   */
  analyzePossession(input: AnalysisInput): Promise<AnalysisOutcome>;
}

/** Re-exported so callers only import from one place. */
export type { AiRepResult };
