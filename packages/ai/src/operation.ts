import type { z } from "zod";
import type { AiOperationName } from "@readrep/domain";

/**
 * Model tiers, named by what they are for rather than by vendor.
 *
 * The two-pass design in the blueprint depends on this distinction: a cheap
 * model proposes timestamps over the whole game, and a stronger one looks at
 * only the short windows that survived. Naming tiers by vendor would tie that
 * decision to a purchasing choice.
 */
export type ModelTier = "fast" | "balanced" | "deep";

/**
 * One narrow AI operation.
 *
 * Every operation declares its own strict input and output schemas, its own
 * timeout, and its own prompt version. There is deliberately no way to express
 * "send this free-form text to a model": the shape of this type is what
 * prevents ReadRep from growing a single mega-prompt.
 */
export type AiOperation<TInput, TOutput> = {
  name: AiOperationName;
  /** What this operation is allowed to decide. Read it before adding a field. */
  purpose: string;
  inputSchema: z.ZodType<TInput>;
  outputSchema: z.ZodType<TOutput>;
  /** Hard ceiling. A slow operation is a failed operation, not a late success. */
  timeoutMs: number;
  tier: ModelTier;
  promptVersion: `${number}.${number}.${number}`;
  schemaVersion: `${number}.${number}.${number}`;
  /** Upper bound on spend per call, enforced by the runner before dispatch. */
  maxCostMicroUsd: number;
};

export const defineOperation = <TInput, TOutput>(
  op: AiOperation<TInput, TOutput>,
): AiOperation<TInput, TOutput> => Object.freeze(op);
