import { DEFAULT_REP_MODEL, MODEL_PRICING } from "./limits";

export type UsageTokens = {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
};

export type CostEstimate = {
  isEstimate: true;
  usd: number | null;
  model: string;
  note: string;
};

/**
 * Rough dollar cost for one analysis. Labelled an estimate on purpose: token
 * accounting and prices both move.
 */
export function estimateCost(model: string, usage: UsageTokens): CostEstimate {
  const envIn = Number(process.env.OPENAI_REP_PRICE_INPUT);
  const envOut = Number(process.env.OPENAI_REP_PRICE_OUTPUT);
  const price =
    Number.isFinite(envIn) && Number.isFinite(envOut) && envIn > 0 && envOut > 0
      ? { inputPerMTok: envIn, outputPerMTok: envOut }
      : (MODEL_PRICING[model] ?? MODEL_PRICING[DEFAULT_REP_MODEL]);

  if (usage.inputTokens === null && usage.outputTokens === null) {
    return { isEstimate: true, usd: null, model, note: "No token usage was reported by the provider." };
  }

  const inTok = usage.inputTokens ?? 0;
  const outTok = usage.outputTokens ?? 0;
  const usd = (inTok / 1_000_000) * price.inputPerMTok + (outTok / 1_000_000) * price.outputPerMTok;

  return {
    isEstimate: true,
    usd: Math.round(usd * 10_000) / 10_000,
    model,
    note: "Estimate from configurable model pricing; not a billed amount.",
  };
}
