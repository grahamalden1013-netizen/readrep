import "server-only";
import OpenAI from "openai";
import { toAiError } from "@/lib/ai/errors";
import { assertAiConfigured } from "@/lib/ai/config";
import { DEFAULT_REP_MODEL, PROVIDER_TIMEOUT_MS } from "@/lib/ai/limits";
import { fetchMuxFrame } from "@/lib/video/mux-frame-source";
import type { CoachingProfile } from "@/lib/coaching/profile";
import { relevantPreferences, type DecisionTag } from "@/lib/coaching/profile";
import { POSSESSION_FRAMES, POSSESSION_FRAME_WIDTH } from "./limits";
import { buildPossessionPrompt } from "./prompt";
import { evaluatePossessionResult, type CandidateDraft, type GateResult } from "./gate";
import { possessionResultSchema, POSSESSION_JSON_SCHEMA, CANDIDATE_PROMPT_VERSION, type PossessionResult } from "./schema";
import { verifyDecision, verifierAgrees, type VerifierVerdict } from "./verify";

export type { CandidateDraft } from "./gate";
export type Target = { jerseyNumber: string; teamColor: string; marker: string | null };
export type ReferenceFrame = { timestampSeconds: number; dataUrl: string };

type Usage = { input: number; output: number };
type Frame = { timestampSeconds: number; dataUrl: string };

export type AnalyzedPossession =
  | { kind: "candidate"; draft: CandidateDraft; usage: Usage; model: string; verifier?: VerifierVerdict }
  | { kind: "rejected"; reason: string; detail: string; usage: Usage; model: string; verifier?: VerifierVerdict }
  | { kind: "flagged"; draft: CandidateDraft; reason: string; usage: Usage; model: string; verifier?: VerifierVerdict };

function reasoningModel(): string {
  return (process.env.OPENAI_REP_MODEL || DEFAULT_REP_MODEL).trim();
}

/** Evenly spaced timestamps across the window, denser toward the middle. */
function windowFrameTimestamps(startSeconds: number, endSeconds: number): number[] {
  const n = POSSESSION_FRAMES;
  const out: number[] = [];
  for (let i = 0; i < n; i += 1) {
    const u = i / (n - 1);
    const biased = 0.5 + (u - 0.5) * (0.7 + 0.6 * Math.abs(u - 0.5) * 2);
    const t = startSeconds + Math.min(1, Math.max(0, biased)) * (endSeconds - startSeconds);
    out.push(Math.round(t * 100) / 100);
  }
  return [...new Set(out)].sort((a, b) => a - b);
}

const BROAD_TAGS: DecisionTag[] = [
  "drive-help",
  "closeout",
  "help-defense",
  "on-ball-defense",
  "ball-screen-defense",
  "switching",
  "transition-offense",
  "transition-defense",
  "shot-selection",
  "late-clock",
  "spacing",
  "paint-touch",
  "offensive-rebound",
  "defensive-rebound",
  "pace",
];

type DiscoveryOutput = {
  analyzed: AnalyzedPossession;
  frames: Frame[];
  frameTimestamps: number[];
};

async function runDiscovery(
  playbackId: string,
  window: { startSeconds: number; endSeconds: number },
  target: Target,
  referenceFrames: ReferenceFrame[],
  profile: CoachingProfile | null,
  referenceHint: { cues: string[]; anyNumberVisible: boolean } | undefined,
): Promise<DiscoveryOutput> {
  const model = reasoningModel();
  const emptyUsage: Usage = { input: 0, output: 0 };

  const tss = windowFrameTimestamps(window.startSeconds, window.endSeconds);
  const frames: Frame[] = [];
  for (const t of tss) {
    const f = await fetchMuxFrame(playbackId, t, POSSESSION_FRAME_WIDTH, 7_000);
    if (f) frames.push({ timestampSeconds: t, dataUrl: f.dataUrl });
  }
  const frameTimestamps = frames.map((f) => f.timestampSeconds);
  if (frames.length < 8) {
    return {
      analyzed: { kind: "rejected", reason: "frames-unavailable", detail: `only ${frames.length} frames`, usage: emptyUsage, model },
      frames,
      frameTimestamps,
    };
  }

  const prefs = relevantPreferences(profile, BROAD_TAGS).map((p) => ({
    questionId: p.questionId,
    prompt: p.prompt,
    label: p.label,
  }));

  const prompt = buildPossessionPrompt({
    target,
    referenceFrameCount: referenceFrames.length,
    referenceCues: referenceHint?.cues ?? [],
    referenceNumberConfirmed: referenceHint?.anyNumberVisible ?? false,
    window,
    frameTimestampsSeconds: frameTimestamps,
    coachPreferences: prefs,
  });

  const content: OpenAI.Responses.ResponseInputContent[] = [
    { type: "input_text", text: prompt.userIntro },
    ...referenceFrames.map(
      (f): OpenAI.Responses.ResponseInputContent => ({ type: "input_image", image_url: f.dataUrl, detail: "high" }),
    ),
    ...frames.map(
      (f): OpenAI.Responses.ResponseInputContent => ({ type: "input_image", image_url: f.dataUrl, detail: "high" }),
    ),
  ];

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY!.trim(), timeout: PROVIDER_TIMEOUT_MS, maxRetries: 3 });
  let response: OpenAI.Responses.Response;
  try {
    response = await client.responses.create({
      model,
      instructions: prompt.system,
      input: [{ role: "user", content }],
      max_output_tokens: 4_500,
      text: {
        format: {
          type: "json_schema",
          name: "nextrep_possession_result",
          strict: true,
          schema: POSSESSION_JSON_SCHEMA as unknown as Record<string, unknown>,
        },
      },
    });
  } catch (cause) {
    throw toAiError(cause);
  }

  const usage: Usage = { input: response.usage?.input_tokens ?? 0, output: response.usage?.output_tokens ?? 0 };
  const text = response.output_text?.trim();
  if (!text) {
    return { analyzed: { kind: "rejected", reason: "invalid-output", detail: "empty", usage, model }, frames, frameTimestamps };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { analyzed: { kind: "rejected", reason: "invalid-output", detail: "not json", usage, model }, frames, frameTimestamps };
  }

  const parsed = possessionResultSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      analyzed: { kind: "rejected", reason: "invalid-output", detail: parsed.error.issues[0]?.message ?? "schema", usage, model },
      frames,
      frameTimestamps,
    };
  }

  const gate = evaluatePossessionResult(parsed.data, window, frameTimestamps);
  const analyzed: AnalyzedPossession =
    gate.kind === "rejected"
      ? { ...gate, usage, model }
      : gate.kind === "flagged"
        ? { kind: "flagged", draft: gate.draft, reason: gate.reason, usage, model }
        : { kind: "candidate", draft: gate.draft, usage, model };

  onRaw?.({ raw: parsed.data, gate });
  return { analyzed, frames, frameTimestamps };
}

/**
 * Discovery pass only: temporal frames -> reasoning model against the strict
 * decision definition -> deterministic gate. The model is free to return
 * `decision: false`; most windows should.
 */
export async function analyzePossession(
  playbackId: string,
  window: { startSeconds: number; endSeconds: number },
  target: Target,
  referenceFrames: ReferenceFrame[],
  profile: CoachingProfile | null,
  referenceHint?: { cues: string[]; anyNumberVisible: boolean },
): Promise<AnalyzedPossession> {
  assertAiConfigured();
  return (await runDiscovery(playbackId, window, target, referenceFrames, profile, referenceHint)).analyzed;
}

/**
 * Discovery + gate + an INDEPENDENT verification pass over the same frames. A
 * candidate is accepted only when discovery, the gate, and the verifier all
 * pass; if the verifier disagrees on any pillar the result is downgraded to
 * `flagged` (the worker stores that as `needs_attention`, never published).
 */
export async function analyzePossessionVerified(
  playbackId: string,
  window: { startSeconds: number; endSeconds: number },
  target: Target,
  referenceFrames: ReferenceFrame[],
  profile: CoachingProfile | null,
  referenceHint?: { cues: string[]; anyNumberVisible: boolean },
): Promise<AnalyzedPossession> {
  assertAiConfigured();
  const { analyzed, frames } = await runDiscovery(playbackId, window, target, referenceFrames, profile, referenceHint);
  if (analyzed.kind === "rejected") return analyzed;

  const draft = analyzed.draft;
  let verifierUsage: Usage = { input: 0, output: 0 };
  let verdict: VerifierVerdict;
  try {
    const v = await verifyDecision(frames, referenceFrames, target, {
      decisionSeconds: draft.decisionSeconds,
      prompt: draft.prompt,
      situation: draft.situation,
      actualAction: draft.actualAction,
      actualActionSeconds: draft.actualActionSeconds,
      visibleOutcome: draft.visibleOutcome,
      visibleOutcomeSeconds: draft.visibleOutcomeSeconds,
      plausibleAlternatives: draft.plausibleAlternatives,
    });
    verdict = v.verdict;
    verifierUsage = v.usage;
  } catch {
    // Verifier unavailable => cannot confirm => needs_attention, never a silent pass.
    verdict = {
      correctTarget: false,
      meaningfulDecision: false,
      twoAlternativesVisible: false,
      pauseBeforeCommitment: false,
      outcomeVisible: false,
      notes: "verifier pass did not complete",
    };
  }

  const usage: Usage = {
    input: analyzed.usage.input + verifierUsage.input,
    output: analyzed.usage.output + verifierUsage.output,
  };

  if (verifierAgrees(verdict) && analyzed.kind === "candidate") {
    return { kind: "candidate", draft, usage, model: analyzed.model, verifier: verdict };
  }
  const failed = (
    [
      ["target", verdict.correctTarget],
      ["decision", verdict.meaningfulDecision],
      ["alternatives", verdict.twoAlternativesVisible],
      ["pause", verdict.pauseBeforeCommitment],
      ["outcome", verdict.outcomeVisible],
    ] as const
  )
    .filter(([, ok]) => !ok)
    .map(([k]) => k);
  return {
    kind: "flagged",
    draft,
    reason:
      analyzed.kind === "flagged"
        ? `${analyzed.reason}; verifier disagrees on: ${failed.join(", ") || "none"}`
        : `verifier disagrees on: ${failed.join(", ")}`,
    usage,
    model: analyzed.model,
    verifier: verdict,
  };
}

/** Optional hook so a debug/eval script can capture the raw model verdict + gate result. */
type RawHook = (x: { raw: PossessionResult; gate: GateResult }) => void;
let onRaw: RawHook | undefined;
export function __setRawHook(fn: RawHook | undefined): void {
  onRaw = fn;
}

export { CANDIDATE_PROMPT_VERSION };
