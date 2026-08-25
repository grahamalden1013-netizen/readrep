/**
 * @readrep/ai — narrow, typed AI operation contracts.
 *
 * Phase 0 makes no paid model calls. The default provider is
 * `notConfiguredProvider`, which fails loudly rather than returning invented
 * analysis. What lives here is the shape later phases must satisfy: strict
 * input and output schemas, timeouts, cost ceilings, prompt and schema
 * versions, and a provider seam that keeps vendors replaceable.
 */
export * from "./operation";
export * from "./shared";
export * from "./operations/index";
export * from "./provider";
export * from "./runner";
