/**
 * @readrep/ai — narrow, typed AI operation contracts.
 *
 * Phase 0 makes no paid model calls. The default provider is
 * `notConfiguredProvider`, which fails loudly rather than returning invented
 * analysis. What lives here is the shape later phases must satisfy: strict
 * input and output schemas, timeouts, cost ceilings, prompt and schema
 * versions, and a provider seam that keeps vendors replaceable.
 */
export * from "./operation.js";
export * from "./shared.js";
export * from "./operations/index.js";
export * from "./provider.js";
export * from "./runner.js";
