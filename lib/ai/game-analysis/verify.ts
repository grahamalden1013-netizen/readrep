import "server-only";
import OpenAI from "openai";
import { toAiError } from "@/lib/ai/errors";
import { assertAiConfigured } from "@/lib/ai/config";
import { DEFAULT_REP_MODEL, PROVIDER_TIMEOUT_MS } from "@/lib/ai/limits";
import type { CandidateDraft } from "./gate";

export type VerifierVerdict = {
  correctTarget: boolean;
  meaningfulDecision: boolean;
  twoAlternativesVisible: boolean;
  pauseBeforeCommitment: boolean;
  outcomeVisible: boolean;
  /** One or two sentences on anything the verifier could not confirm. */
  notes: string;
};

const VERIFIER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "correctTarget",
    "meaningfulDecision",
    "twoAlternativesVisible",
    "pauseBeforeCommitment",
    "outcomeVisible",
    "notes",
  ],
  properties: {
    correctTarget: { type: "boolean" },
    meaningfulDecision: { type: "boolean" },
    twoAlternativesVisible: { type: "boolean" },
    pauseBeforeCommitment: { type: "boolean" },
    outcomeVisible: { type: "boolean" },
    notes: { type: "string" },
  },
} as const;

export function verifierAgrees(v: VerifierVerdict): boolean {
  return (
    v.correctTarget && v.meaningfulDecision && v.twoAlternativesVisible && v.pauseBeforeCommitment && v.outcomeVisible
  );
}

/**
 * An INDEPENDENT second pass. It receives the same temporal frames and the
 * structured decision a first pass proposed, and is NOT told to keep it. It only
 * answers, from the frames alone, whether each pillar of the decision holds.
 */
export async function verifyDecision(
  frames: { timestampSeconds: number; dataUrl: string }[],
  referenceFrames: { timestampSeconds: number; dataUrl: string }[],
  target: { jerseyNumber: string; teamColor: string; marker: string | null },
  proposal: Pick<
    CandidateDraft,
    | "decisionSeconds"
    | "prompt"
    | "situation"
    | "actualAction"
    | "actualActionSeconds"
    | "visibleOutcome"
    | "visibleOutcomeSeconds"
    | "plausibleAlternatives"
  >,
): Promise<{ verdict: VerifierVerdict; usage: { input: number; output: number }; model: string }> {
  assertAiConfigured();
  const model = (process.env.OPENAI_REP_MODEL || DEFAULT_REP_MODEL).trim();
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY!.trim(), timeout: PROVIDER_TIMEOUT_MS, maxRetries: 3 });

  const altLines = proposal.plausibleAlternatives
    .map((a) => `  - "${a.action}" — claimed visible at t=${a.atSeconds}s: ${a.visibleEvidence}`)
    .join("\n");

  const system = [
    "You are an INDEPENDENT film reviewer. Another analyst has proposed a coaching 'decision moment'. You are NOT told to keep it — most proposals are wrong. Using ONLY the frames provided, answer five yes/no questions honestly. If a claim cannot be confirmed from these exact frames, answer false.",
    "The FIRST images are reference views of the target player. The REMAINING images are the possession in chronological order, each with a timestamp.",
    "",
    "Answer, strictly from what is visible:",
    "1. correctTarget — is the player the proposed decision is about actually " +
      `${target.teamColor} #${target.jerseyNumber}${target.marker ? ` (${target.marker})` : ""}, matched to the reference views by uniform, build and continuity? If you cannot tell, false.`,
    "2. meaningfulDecision — at the proposed decision timestamp, does the target genuinely face a real basketball choice with a live advantage or pressure — not a routine catch, cut, stance, spacing move, or dead-ball? If it is routine or already decided, false.",
    "3. twoAlternativesVisible — are AT LEAST TWO of the listed alternatives each supported by something you can actually see in a frame at or before the decision (an open lane, a defender's stance/position, a relocating teammate)? Generic basketball reasoning does not count. If fewer than two are visibly supported, false.",
    "4. pauseBeforeCommitment — does the proposed decision timestamp fall just BEFORE the target commits (before the pass/shot/drive/rotation leaves), with visible setup before it? If the action is already underway, false.",
    "5. outcomeVisible — do the frames after the pause actually show the committed action AND its immediate outcome? If the outcome is off-screen or ambiguous, false.",
    "",
    "Put anything you could not confirm in notes. Return ONLY the structured object.",
  ].join("\n");

  const userText = [
    `PROPOSED DECISION at t=${proposal.decisionSeconds}s into the game.`,
    proposal.situation ? `Situation: ${proposal.situation}` : "",
    proposal.prompt ? `Question at the pause: ${proposal.prompt}` : "",
    `Committed action: ${proposal.actualAction ?? "?"} (claimed visible at t=${proposal.actualActionSeconds ?? "?"}s).`,
    `Stated outcome: ${proposal.visibleOutcome ?? "?"} (claimed visible at t=${proposal.visibleOutcomeSeconds ?? "?"}s).`,
    "Listed plausible alternatives:",
    altLines || "  (none)",
    "",
    "Possession frames follow, in order:",
    frames.map((f, i) => `  image ${referenceFrames.length + i + 1}: t=${f.timestampSeconds}s`).join("\n"),
  ]
    .filter(Boolean)
    .join("\n");

  const content: OpenAI.Responses.ResponseInputContent[] = [
    { type: "input_text", text: userText },
    ...referenceFrames.map(
      (f): OpenAI.Responses.ResponseInputContent => ({ type: "input_image", image_url: f.dataUrl, detail: "high" }),
    ),
    ...frames.map(
      (f): OpenAI.Responses.ResponseInputContent => ({ type: "input_image", image_url: f.dataUrl, detail: "high" }),
    ),
  ];

  let response: OpenAI.Responses.Response;
  try {
    response = await client.responses.create({
      model,
      instructions: system,
      input: [{ role: "user", content }],
      max_output_tokens: 1_500,
      text: {
        format: {
          type: "json_schema",
          name: "nextrep_decision_verification",
          strict: true,
          schema: VERIFIER_SCHEMA as unknown as Record<string, unknown>,
        },
      },
    });
  } catch (cause) {
    throw toAiError(cause);
  }

  const text = response.output_text?.trim();
  let parsed: Partial<VerifierVerdict> = {};
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = {};
    }
  }
  // A verifier that returns nothing counts as disagreement, not a pass.
  const verdict: VerifierVerdict = {
    correctTarget: parsed.correctTarget === true,
    meaningfulDecision: parsed.meaningfulDecision === true,
    twoAlternativesVisible: parsed.twoAlternativesVisible === true,
    pauseBeforeCommitment: parsed.pauseBeforeCommitment === true,
    outcomeVisible: parsed.outcomeVisible === true,
    notes: typeof parsed.notes === "string" ? parsed.notes.slice(0, 600) : "",
  };
  return {
    verdict,
    usage: { input: response.usage?.input_tokens ?? 0, output: response.usage?.output_tokens ?? 0 },
    model,
  };
}
