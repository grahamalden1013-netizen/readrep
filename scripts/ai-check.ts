/**
 * Proves ReadRep is talking to a real Anthropic model, not running mock mode.
 *
 *   npm run ai:check
 *
 * Goes through the same provider the Coach Interview uses, so a pass here
 * means the app's own path works — not that some separate curl worked. Prints
 * the model, latency and token counts. Never prints the key.
 */

import * as z from "zod/v4";

import { getProvider } from "@/lib/ai/anthropic";
import { API_KEY_VAR, MODEL_VAR, DEFAULT_MODEL, interviewModel, providerMode } from "@/lib/ai/anthropic";

const Probe = z.object({
  /** A trivial structured answer, so the structured-output path is exercised too. */
  coverage: z.enum(["drop", "switch", "hedge", "blitz", "ice", "under", "over"]),
});

function mask(value: string | undefined): string {
  // Length only. Not even the last few characters — a terminal transcript can
  // end up pasted anywhere.
  return value ? `set (${value.length} characters)` : "not set";
}

async function main() {
  const mode = providerMode();

  console.log("\nReadRep AI configuration");
  console.log(`  ${API_KEY_VAR}: ${mask(process.env[API_KEY_VAR])}`);
  console.log(`  ${MODEL_VAR}: ${process.env[MODEL_VAR] ?? `not set (defaulting to ${DEFAULT_MODEL})`}`);
  console.log(`  READREP_AI_MODE: ${process.env.READREP_AI_MODE ?? "not set"}`);
  console.log(`  resolved mode: ${mode}`);
  console.log(`  resolved model: ${interviewModel()}\n`);

  if (mode === "unconfigured") {
    console.log(`FAIL — no key. Run ./scripts/set-anthropic-key.sh, then restart.\n`);
    process.exit(1);
  }

  if (mode === "mock") {
    console.log(
      "FAIL — READREP_AI_MODE=mock is set, so the app is running scripted\n" +
        "responses, NOT a real model. Remove that line from .env.local.\n",
    );
    process.exit(1);
  }

  console.log("Calling Anthropic…");
  const result = await getProvider().generate({
    system:
      "You are a basketball assistant. Answer with the single coverage name that best fits.",
    messages: [
      {
        role: "user",
        content:
          "The big drops below the level of the screen and the guard fights over the top. Which ball-screen coverage is that?",
      },
    ],
    schema: Probe,
    maxTokens: 1024,
    effort: "low",
  });

  if (!result.ok) {
    console.log(`\nFAIL — ${result.kind}\n  ${result.message}\n`);
    explain(result.kind, result.message);
    process.exit(1);
  }

  console.log(`\nok — REAL Anthropic call succeeded.`);
  console.log(`  provider:      ${result.meta.provider}`);
  console.log(`  model:         ${result.meta.model}`);
  console.log(`  latency:       ${result.meta.latencyMs} ms`);
  console.log(`  input tokens:  ${result.meta.inputTokens}`);
  console.log(`  output tokens: ${result.meta.outputTokens}`);
  console.log(`  structured answer: coverage = ${result.data.coverage}`);

  if (result.meta.provider !== "anthropic") {
    console.log(`\nFAIL — provider reported "${result.meta.provider}", expected "anthropic".\n`);
    process.exit(1);
  }
  if (result.data.coverage !== "drop") {
    console.log(
      `\nnote — the model answered "${result.data.coverage}" rather than "drop".` +
        ` The call is real either way; this is a sanity check, not a gate.`,
    );
  }

  console.log(`\nThe Coach Interview will use this exact provider and model.\n`);
}

/** Turns the common Anthropic account problems into something actionable. */
function explain(kind: string, message: string) {
  const m = message.toLowerCase();

  if (kind === "unconfigured" || m.includes("rejected by the provider")) {
    console.log(
      "This is an authentication problem:\n" +
        "  · the key may be revoked, deleted, or from a different workspace\n" +
        "  · check https://console.anthropic.com/settings/keys\n" +
        "  · re-run ./scripts/set-anthropic-key.sh and restart the dev server\n",
    );
    return;
  }

  if (m.includes("credit") || m.includes("billing") || m.includes("quota")) {
    console.log(
      "This is a billing problem, not a code problem:\n" +
        "  · add credit at https://console.anthropic.com/settings/billing\n" +
        "  · a brand-new account often has a zero balance until you buy credits\n",
    );
    return;
  }

  if (m.includes("model") || m.includes("404") || m.includes("not_found")) {
    console.log(
      `This looks like a model problem:\n` +
        `  · ${MODEL_VAR} is currently "${interviewModel()}"\n` +
        `  · your account may not have access to it\n` +
        `  · try ${MODEL_VAR}=claude-sonnet-5 in .env.local, then restart\n`,
    );
    return;
  }

  if (kind === "rate_limit") {
    console.log(
      "Rate limited. Wait a minute and retry; if it persists, check your\n" +
        "workspace's rate limits at https://console.anthropic.com/settings/limits\n",
    );
    return;
  }

  if (kind === "network") {
    console.log(
      "Could not reach api.anthropic.com. Check your connection, VPN, or\n" +
        "corporate proxy.\n",
    );
    return;
  }

  console.log(
    "Unexpected provider error. The full message is above; if it mentions a\n" +
      "status code, that is Anthropic's, not ReadRep's.\n",
  );
}

void main().catch((error) => {
  console.error("\nFAIL — unexpected error:", error instanceof Error ? error.message : error);
  process.exit(1);
});
