import "server-only";
import OpenAI from "openai";
import { toAiError } from "@/lib/ai/errors";
import { assertAiConfigured } from "@/lib/ai/config";
import { DEFAULT_REP_MODEL, PROVIDER_TIMEOUT_MS } from "@/lib/ai/limits";
import { fetchMuxFrame } from "@/lib/video/mux-frame-source";
import type { CoachingProfile } from "@/lib/coaching/profile";
import { relevantPreferences, type DecisionTag } from "@/lib/coaching/profile";
import {
  CANDIDATE_DECISION_CONFIDENCE_MIN,
  CANDIDATE_ID_CONFIDENCE_MIN,
  POSSESSION_FRAMES,
  POSSESSION_FRAME_WIDTH,
} from "./limits";
import { buildPossessionPrompt } from "./prompt";
import {
  possessionResultSchema,
  POSSESSION_JSON_SCHEMA,
  CANDIDATE_PROMPT_VERSION,
  type PossessionResult,
} from "./schema";

export type Target = { jerseyNumber: string; teamColor: string; marker: string | null };
export type ReferenceFrame = { timestampSeconds: number; dataUrl: string };

export type AnalyzedPossession =
  | { kind: "candidate"; draft: CandidateDraft; usage: Usage; model: string }
  | { kind: "rejected"; reason: string; detail: string; usage: Usage; model: string }
  | { kind: "flagged"; draft: CandidateDraft; reason: string; usage: Usage; model: string };

type Usage = { input: number; output: number };

export type CandidateDraft = {
  clipStartSeconds: number;
  decisionSeconds: number;
  clipEndSeconds: number;
  title: string | null;
  skillCategory: PossessionResult["skillCategory"];
  difficulty: PossessionResult["difficulty"];
  situation: string | null;
  prompt: string | null;
  answerChoices: { id: string; text: string }[];
  bestReadChoiceId: string | null;
  actualDecisionChoiceId: string | null;
  actualDecision: string | null;
  outcome: string | null;
  coachingExplanation: string | null;
  visibleEvidence: { timestampSeconds: number; observation: string }[];
  basketballInferences: { statement: string; confidence: number }[];
  coachPreferenceBasis: { questionId: string; influence: string }[];
  involvement: string | null;
  uncertainty: string[];
  playerIdConfidence: number;
  decisionConfidence: number;
  teachingValue: number;
  decisionTags: string[];
  warnings: string[];
};

function reasoningModel(): string {
  return (process.env.OPENAI_REP_MODEL || DEFAULT_REP_MODEL).trim();
}

/** Evenly spaced timestamps across the window, denser toward the middle. */
function windowFrameTimestamps(startSeconds: number, endSeconds: number): number[] {
  const n = POSSESSION_FRAMES;
  const out: number[] = [];
  for (let i = 0; i < n; i += 1) {
    // Slight centre bias: more resolution where the decision usually sits.
    const u = i / (n - 1);
    const biased = 0.5 + (u - 0.5) * (0.7 + 0.6 * Math.abs(u - 0.5) * 2);
    const t = startSeconds + Math.min(1, Math.max(0, biased)) * (endSeconds - startSeconds);
    out.push(Math.round(t * 100) / 100);
  }
  return [...new Set(out)].sort((a, b) => a - b);
}

/**
 * Stage C+D+E for one possession window. Retrieves frames, runs the reasoning
 * model with the coach's applicable preferences, validates, and returns a
 * candidate, a rejection, or a low-confidence flag.
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
  const model = reasoningModel();
  const emptyUsage: Usage = { input: 0, output: 0 };

  const tss = windowFrameTimestamps(window.startSeconds, window.endSeconds);
  const frames: { timestampSeconds: number; dataUrl: string }[] = [];
  for (const t of tss) {
    const f = await fetchMuxFrame(playbackId, t, POSSESSION_FRAME_WIDTH, 7_000);
    if (f) frames.push({ timestampSeconds: t, dataUrl: f.dataUrl });
  }
  if (frames.length < 8) {
    return { kind: "rejected", reason: "frames-unavailable", detail: `only ${frames.length} frames`, usage: emptyUsage, model };
  }

  // A broad pref set: every preference whose decision tags could plausibly apply
  // to any read. The model is told to use only the ones the *visible* situation
  // warrants and to report which it used.
  const broadTags: DecisionTag[] = [
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
  const prefs = relevantPreferences(profile, broadTags).map((p) => ({
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
    frameTimestampsSeconds: frames.map((f) => f.timestampSeconds),
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
      max_output_tokens: 4_000,
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

  const usage: Usage = {
    input: response.usage?.input_tokens ?? 0,
    output: response.usage?.output_tokens ?? 0,
  };
  const text = response.output_text?.trim();
  if (!text) return { kind: "rejected", reason: "invalid-output", detail: "empty", usage, model };

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { kind: "rejected", reason: "invalid-output", detail: "not json", usage, model };
  }

  const parsed = possessionResultSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      kind: "rejected",
      reason: "invalid-output",
      detail: parsed.error.issues[0]?.message ?? "schema",
      usage,
      model,
    };
  }
  const r = parsed.data;

  if (!r.targetVisible) {
    return { kind: "rejected", reason: "target-not-visible", detail: r.involvement ?? "", usage, model };
  }
  if (r.targetIdentificationConfidence < CANDIDATE_ID_CONFIDENCE_MIN) {
    return {
      kind: "rejected",
      reason: "low-identification",
      detail: `id ${r.targetIdentificationConfidence.toFixed(2)}`,
      usage,
      model,
    };
  }
  if (!r.hasDecision || r.decisionOffsetSeconds === null) {
    return { kind: "rejected", reason: "no-decision", detail: r.involvement ?? "", usage, model };
  }

  // --- turn the window-relative offset into absolute clip timing, verified ---
  const decisionSeconds = round(window.startSeconds + r.decisionOffsetSeconds);
  const clipStartSeconds = round(Math.max(0, decisionSeconds - 7));
  const clipEndSeconds = round(Math.min(window.endSeconds, decisionSeconds + 6));
  if (!(clipStartSeconds < decisionSeconds && decisionSeconds < clipEndSeconds && clipEndSeconds - clipStartSeconds >= 5)) {
    return { kind: "rejected", reason: "bad-timing", detail: `d=${decisionSeconds}`, usage, model };
  }
  if (clipEndSeconds - decisionSeconds < 2) {
    return { kind: "rejected", reason: "no-outcome-room", detail: "", usage, model };
  }

  // --- evidence must sit inside the window; drop strays, fail if too many ---
  const lo = window.startSeconds - 1;
  const hi = window.endSeconds + 1;
  const keptEvidence = r.visibleEvidence
    .filter((e) => e.timestampSeconds >= lo && e.timestampSeconds <= hi)
    .map((e) => ({ ...e, timestampSeconds: round(clamp(e.timestampSeconds, window.startSeconds, window.endSeconds)) }))
    .sort((a, b) => a.timestampSeconds - b.timestampSeconds);
  if (keptEvidence.length < 2) {
    return { kind: "rejected", reason: "weak-evidence", detail: `${keptEvidence.length} in-window`, usage, model };
  }

  const choices = r.answerChoices;
  const ids = choices.map((c) => c.id);
  const uniqueText = new Set(choices.map((c) => c.text.trim().toLowerCase()));
  if (choices.length < 2 || uniqueText.size !== choices.length || !r.bestReadChoiceId || !ids.includes(r.bestReadChoiceId)) {
    return { kind: "rejected", reason: "bad-choices", detail: `${choices.length} choices`, usage, model };
  }
  if (!r.title || !r.situation || !r.prompt || !r.outcome || !r.coachingExplanation) {
    return { kind: "rejected", reason: "incomplete-draft", detail: "", usage, model };
  }

  const draft: CandidateDraft = {
    clipStartSeconds,
    decisionSeconds,
    clipEndSeconds,
    title: r.title,
    skillCategory: r.skillCategory,
    difficulty: r.difficulty,
    situation: r.situation,
    prompt: r.prompt,
    answerChoices: choices,
    bestReadChoiceId: r.bestReadChoiceId,
    actualDecisionChoiceId: r.actualDecisionChoiceId && ids.includes(r.actualDecisionChoiceId) ? r.actualDecisionChoiceId : null,
    actualDecision: r.actualDecision,
    outcome: r.outcome,
    coachingExplanation: r.coachingExplanation,
    visibleEvidence: keptEvidence,
    basketballInferences: r.basketballInferences,
    coachPreferenceBasis: r.coachPreferenceBasis,
    involvement: r.involvement,
    uncertainty: r.uncertainty,
    playerIdConfidence: r.targetIdentificationConfidence,
    decisionConfidence: r.decisionConfidence,
    teachingValue: r.teachingValue,
    decisionTags: r.decisionTags,
    warnings: r.warnings,
  };

  if (r.decisionConfidence < CANDIDATE_DECISION_CONFIDENCE_MIN) {
    return { kind: "flagged", draft, reason: `low decision confidence ${r.decisionConfidence.toFixed(2)}`, usage, model };
  }
  return { kind: "candidate", draft, usage, model };
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export { CANDIDATE_PROMPT_VERSION };
