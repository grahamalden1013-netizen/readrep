import "server-only";
import OpenAI from "openai";
import { AiError, toAiError } from "@/lib/ai/errors";
import { assertAiConfigured } from "@/lib/ai/config";
import { DEFAULT_DISCOVERY_MODEL } from "./limits";

export type FrameProbe = { timestampSeconds: number; dataUrl: string };

export type LiveFrameVerdict = {
  timestampSeconds: number;
  /** True only for clearly live half-court or transition basketball. */
  liveGame: boolean;
  /** studio | commercial | halftime | timeout | replay | crowd | bench | scoreboard | dead-ball | live | unclear */
  kind: string;
};

const VERDICT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["frames"],
  properties: {
    frames: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["index", "liveGame", "kind"],
        properties: {
          index: { type: "integer" },
          liveGame: { type: "boolean" },
          kind: {
            type: "string",
            enum: [
              "live",
              "dead-ball",
              "timeout",
              "halftime",
              "replay",
              "studio",
              "commercial",
              "crowd",
              "bench",
              "scoreboard",
              "unclear",
            ],
          },
        },
      },
    },
  },
} as const;

function model(): string {
  return (process.env.OPENAI_DISCOVERY_MODEL || DEFAULT_DISCOVERY_MODEL).trim();
}

/**
 * Cheap pass: label a small batch of low-res frames as live game action or not.
 * `liveGame` is true only for real half-court / transition play — a dead-ball
 * inbound with players on court is `dead-ball`, false.
 */
export async function classifyLiveGame(
  frames: FrameProbe[],
): Promise<{ verdicts: LiveFrameVerdict[]; usage: { input: number; output: number }; model: string }> {
  assertAiConfigured();
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY!.trim(), timeout: 60_000, maxRetries: 1 });
  const used = model();

  const content: OpenAI.Responses.ResponseInputContent[] = [
    {
      type: "input_text",
      text:
        "You are filtering a basketball broadcast. For each image, decide if it shows LIVE game action — real half-court offense/defense or a transition possession with the ball in play. " +
        "Not live: studio desks, commercials, halftime, timeouts, bench/huddle shots, crowd shots, full-screen scoreboard/logo graphics, slow-motion replays, and dead-ball moments (free throws, inbounds, players walking) even if the court is visible. " +
        "Return one entry per image, in order, with its 0-based index.",
    },
    ...frames.map((f): OpenAI.Responses.ResponseInputContent => ({
      type: "input_image",
      image_url: f.dataUrl,
      detail: "low",
    })),
  ];

  let response: OpenAI.Responses.Response;
  try {
    response = await client.responses.create({
      model: used,
      input: [{ role: "user", content }],
      max_output_tokens: 1_500,
      text: {
        format: {
          type: "json_schema",
          name: "live_frame_verdicts",
          strict: true,
          schema: VERDICT_SCHEMA as unknown as Record<string, unknown>,
        },
      },
    });
  } catch (cause) {
    throw toAiError(cause);
  }

  const text = response.output_text?.trim();
  if (!text) throw new AiError("invalid-output", "The discovery model returned nothing.");
  let parsed: { frames?: { index: number; liveGame: boolean; kind: string }[] };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new AiError("invalid-output", "The discovery model returned invalid JSON.");
  }

  const byIndex = new Map((parsed.frames ?? []).map((v) => [v.index, v]));
  const verdicts: LiveFrameVerdict[] = frames.map((f, i) => {
    const v = byIndex.get(i);
    return {
      timestampSeconds: f.timestampSeconds,
      liveGame: v?.liveGame === true,
      kind: v?.kind ?? "unclear",
    };
  });

  return {
    verdicts,
    usage: {
      input: response.usage?.input_tokens ?? 0,
      output: response.usage?.output_tokens ?? 0,
    },
    model: used,
  };
}
