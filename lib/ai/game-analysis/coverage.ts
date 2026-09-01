import "server-only";
import { toAiError } from "@/lib/ai/errors";
import type { CoachingProfile } from "@/lib/coaching/profile";
import { MAX_WINDOW_ATTEMPTS } from "./limits";
import { analyzePossession, type AnalyzedPossession, type ReferenceFrame, type Target } from "./possession";
import type { PossessionWindow } from "./segments";
import { classifyOutcome, type WindowLedgerEntry } from "./coverage-outcomes";

export { classifyOutcome, summariseLedger } from "./coverage-outcomes";
export type { WindowOutcome, WindowLedgerEntry } from "./coverage-outcomes";

export type WindowResult = {
  ledger: WindowLedgerEntry;
  analyzed: AnalyzedPossession | null;
  usage: { input: number; output: number };
  model: string;
  retries: number;
};

/**
 * Analyse one window to a terminal state. Thrown provider/transport errors are
 * retried up to {@link MAX_WINDOW_ATTEMPTS}; after that the window is
 * `processing-failure`, never left pending. A schema/gate rejection is terminal
 * on the first try — retrying would not change it.
 */
export async function analyzeWindowToTerminal(
  index: number,
  window: PossessionWindow,
  playbackId: string,
  target: Target,
  referenceFrames: ReferenceFrame[],
  profile: CoachingProfile | null,
  referenceHint: { cues: string[]; anyNumberVisible: boolean },
): Promise<WindowResult> {
  let attempts = 0;
  let lastErr = "unknown";

  while (attempts < MAX_WINDOW_ATTEMPTS) {
    attempts += 1;
    try {
      const analyzed = await analyzePossession(playbackId, window, target, referenceFrames, profile, referenceHint);
      const { outcome, reason } = classifyOutcome(analyzed);
      const draft = analyzed.kind === "candidate" || analyzed.kind === "flagged" ? analyzed.draft : null;
      return {
        ledger: {
          index,
          startSeconds: window.startSeconds,
          endSeconds: window.endSeconds,
          outcome,
          reason,
          attempts,
          ...(draft ? { decisionSeconds: draft.decisionSeconds } : {}),
          ...(analyzed.kind === "flagged" ? { flaggedLowConfidence: true } : {}),
        },
        analyzed,
        usage: analyzed.usage,
        model: analyzed.model,
        retries: attempts - 1,
      };
    } catch (cause) {
      lastErr = toAiError(cause).code;
      if (attempts < MAX_WINDOW_ATTEMPTS) await new Promise((r) => setTimeout(r, 1500 * attempts));
    }
  }

  return {
    ledger: {
      index,
      startSeconds: window.startSeconds,
      endSeconds: window.endSeconds,
      outcome: "processing-failure",
      reason: lastErr,
      attempts,
    },
    analyzed: null,
    usage: { input: 0, output: 0 },
    model: "",
    retries: attempts - 1,
  };
}
