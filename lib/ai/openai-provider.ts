import "server-only";
import OpenAI from "openai";
import { AiError, toAiError } from "./errors";
import { DEFAULT_REP_MODEL, DEFAULT_REP_MODEL_FALLBACK, PROVIDER_TIMEOUT_MS } from "./limits";
import { buildRepCopilotPrompt, PROMPT_VERSION } from "./prompts";
import type {
  AnalysisInput,
  AnalysisOutcome,
  AnalysisUsage,
  RepAiProvider,
} from "./provider";

/** Strict JSON Schema for the Responses API `text.format`. The real gate is the
 *  Zod schema in `schemas.ts`; this only shapes the model output. */
const OUTPUT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "targetPlayerVisible",
    "targetIdentificationConfidence",
    "confidence",
    "title",
    "skillCategory",
    "difficulty",
    "situation",
    "prompt",
    "answerChoices",
    "bestReadChoiceId",
    "actualDecisionChoiceId",
    "actualDecision",
    "outcome",
    "coachingExplanation",
    "situationSummary",
    "targetPlayerLocation",
    "visibleOptions",
    "whatRemainsUncertain",
    "visibleEvidence",
    "inferences",
    "warnings",
  ],
  properties: {
    targetPlayerVisible: { type: "boolean" },
    targetIdentificationConfidence: { type: "number", minimum: 0, maximum: 1 },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    title: { type: ["string", "null"] },
    skillCategory: {
      type: ["string", "null"],
      enum: [
        "help-recognition",
        "closeout-attack",
        "transition-decision",
        "pick-and-roll-read",
        "defensive-rotation",
        null,
      ],
    },
    difficulty: { type: ["string", "null"], enum: ["easy", "medium", "hard", null] },
    situation: { type: ["string", "null"] },
    prompt: { type: ["string", "null"] },
    answerChoices: {
      type: "array",
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "text"],
        properties: { id: { type: "string" }, text: { type: "string" } },
      },
    },
    bestReadChoiceId: { type: ["string", "null"] },
    actualDecisionChoiceId: { type: ["string", "null"] },
    actualDecision: { type: ["string", "null"] },
    outcome: { type: ["string", "null"] },
    coachingExplanation: { type: ["string", "null"] },
    situationSummary: { type: ["string", "null"] },
    targetPlayerLocation: { type: ["string", "null"] },
    visibleOptions: { type: "array", maxItems: 6, items: { type: "string" } },
    whatRemainsUncertain: { type: "array", maxItems: 8, items: { type: "string" } },
    visibleEvidence: {
      type: "array",
      maxItems: 24,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["timestampSeconds", "observation"],
        properties: {
          timestampSeconds: { type: "number" },
          observation: { type: "string" },
        },
      },
    },
    inferences: {
      type: "array",
      maxItems: 12,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["statement", "confidence"],
        properties: {
          statement: { type: "string" },
          confidence: { type: "number", minimum: 0, maximum: 1 },
        },
      },
    },
    warnings: { type: "array", maxItems: 12, items: { type: "string" } },
  },
} as const;

type ModelChoice = { primary: string; fallback: string | null };

function resolveModels(): ModelChoice {
  const primary = (process.env.OPENAI_REP_MODEL || DEFAULT_REP_MODEL).trim();
  const rawFallback = (process.env.OPENAI_REP_MODEL_FALLBACK ?? DEFAULT_REP_MODEL_FALLBACK).trim();
  const fallback = rawFallback && rawFallback !== primary ? rawFallback : null;
  return { primary, fallback };
}

export class OpenAiRepProvider implements RepAiProvider {
  readonly kind = "openai" as const;
  private readonly client: OpenAI;
  private readonly models: ModelChoice;

  constructor(apiKey: string) {
    // `timeout` is the SDK's own request timeout; we also race an AbortController.
    this.client = new OpenAI({ apiKey, timeout: PROVIDER_TIMEOUT_MS, maxRetries: 1 });
    this.models = resolveModels();
  }

  async capabilityCheck(): Promise<{ model: string }> {
    try {
      // Cheapest possible confirmation the account can reach the model: a
      // 1-token, no-image Responses call. No sensitive content, no key logged.
      await this.client.responses.create({
        model: this.models.primary,
        input: "ok",
        max_output_tokens: 16,
      });
      return { model: this.models.primary };
    } catch (cause) {
      if (this.models.fallback) {
        try {
          await this.client.responses.create({
            model: this.models.fallback,
            input: "ok",
            max_output_tokens: 16,
          });
          return { model: this.models.fallback };
        } catch {
          throw toAiError(cause);
        }
      }
      throw toAiError(cause);
    }
  }

  async analyzePossession(input: AnalysisInput): Promise<AnalysisOutcome> {
    const prompt = buildRepCopilotPrompt(input.target, {
      clipStartSeconds: input.clip.clipStartSeconds,
      decisionSeconds: input.clip.decisionSeconds,
      clipEndSeconds: input.clip.clipEndSeconds,
      frameTimestampsSeconds: input.frames.map((f) => f.timestampSeconds),
    });

    const content: OpenAI.Responses.ResponseInputContent[] = [
      { type: "input_text", text: prompt.userIntro },
      ...input.frames.map(
        (frame): OpenAI.Responses.ResponseInputContent => ({
          type: "input_image",
          image_url: frame.dataUrl,
          // High detail so the model can actually read jersey numbers; "low"
          // downsamples every frame to 512px and makes identification hopeless.
          detail: "high",
        }),
      ),
    ];

    const request: OpenAI.Responses.ResponseCreateParamsNonStreaming = {
      model: this.models.primary,
      instructions: prompt.system,
      input: [{ role: "user", content }],
      max_output_tokens: 4_000,
      text: {
        format: {
          type: "json_schema",
          name: "nextrep_ai_rep_result",
          strict: true,
          schema: OUTPUT_JSON_SCHEMA as unknown as Record<string, unknown>,
        },
      },
    };

    const started = Date.now();
    let modelUsed = this.models.primary;
    let fallbackUsed = false;
    let response: OpenAI.Responses.Response;

    try {
      response = await this.callWithTimeout(request);
    } catch (cause) {
      const err = toAiError(cause);
      const canFallback =
        this.models.fallback && (err.code === "model-unavailable" || err.code === "provider-unavailable");
      if (!canFallback) throw err;
      modelUsed = this.models.fallback as string;
      fallbackUsed = true;
      response = await this.callWithTimeout({ ...request, model: modelUsed });
    }

    const latencyMs = Date.now() - started;
    const text = response.output_text?.trim();
    if (!text) {
      throw new AiError("invalid-output", "The AI returned an empty response.");
    }

    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      throw new AiError("invalid-output", "The AI returned output that was not valid JSON.");
    }

    return {
      raw,
      metadata: {
        provider: "openai",
        model: modelUsed,
        modelFallbackUsed: fallbackUsed,
        promptVersion: PROMPT_VERSION,
        latencyMs,
        usage: readUsage(response),
      },
    };
  }

  private async callWithTimeout(
    request: OpenAI.Responses.ResponseCreateParamsNonStreaming,
  ): Promise<OpenAI.Responses.Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
    try {
      return await this.client.responses.create(request, { signal: controller.signal });
    } catch (cause) {
      if (controller.signal.aborted) throw new AiError("timeout", "The AI analysis timed out.");
      throw cause;
    } finally {
      clearTimeout(timer);
    }
  }
}

function readUsage(response: OpenAI.Responses.Response): AnalysisUsage {
  const u = response.usage;
  return {
    inputTokens: u?.input_tokens ?? null,
    outputTokens: u?.output_tokens ?? null,
    totalTokens: u?.total_tokens ?? null,
  };
}
