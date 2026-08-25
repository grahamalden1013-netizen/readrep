import { z } from "zod";

/**
 * Cost and latency records.
 *
 * The blueprint requires per-game economics from the start, because a product
 * that cannot say what a processed game costs cannot be priced. These records
 * carry identifiers and numbers only — never media, never prompt text.
 */

export const CostCategory = z.enum([
  "video_ingest",
  "video_storage",
  "video_delivery",
  "gpu_compute",
  "model_inference",
  "object_storage",
]);
export type CostCategory = z.infer<typeof CostCategory>;

export const CostRecord = z.object({
  category: CostCategory,
  /** What incurred the cost. An id, never a name or a path. */
  subjectId: z.string().max(80),
  gameId: z.string().max(80).nullable().default(null),
  teamId: z.string().max(80).nullable().default(null),
  /** Micro-USD as an integer, so per-game totals do not drift. */
  amountMicroUsd: z.number().int().nonnegative(),
  /** Units consumed: tokens, GPU-seconds, gigabyte-months, delivery minutes. */
  quantity: z.number().nonnegative().nullable().default(null),
  unit: z.string().max(24).nullable().default(null),
  occurredAt: z.string().datetime({ offset: true }),
});
export type CostRecord = z.infer<typeof CostRecord>;

export const LatencyRecord = z.object({
  operation: z.string().max(80),
  subjectId: z.string().max(80),
  durationMs: z.number().int().nonnegative(),
  outcome: z.enum(["succeeded", "failed", "timed_out"]),
  occurredAt: z.string().datetime({ offset: true }),
});
export type LatencyRecord = z.infer<typeof LatencyRecord>;

/** Where cost and latency records are sent. Phase 1 wires a real store. */
export type MetricsSink = {
  recordCost(record: CostRecord): void;
  recordLatency(record: LatencyRecord): void;
};

/** Collects records in memory. The Phase 0 sink, and the sink tests use. */
export const createInMemoryMetricsSink = (): MetricsSink & {
  costs: CostRecord[];
  latencies: LatencyRecord[];
  totalMicroUsd(): number;
} => {
  const costs: CostRecord[] = [];
  const latencies: LatencyRecord[] = [];
  return {
    costs,
    latencies,
    recordCost: (r) => void costs.push(CostRecord.parse(r)),
    recordLatency: (r) => void latencies.push(LatencyRecord.parse(r)),
    totalMicroUsd: () => costs.reduce((sum, c) => sum + c.amountMicroUsd, 0),
  };
};

/** Formats micro-USD for display without floating-point drift. */
export const formatMicroUsd = (micro: number): string =>
  `$${(micro / 1_000_000).toFixed(micro < 10_000 ? 4 : 2)}`;
