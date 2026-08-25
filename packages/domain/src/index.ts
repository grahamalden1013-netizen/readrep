/**
 * @readrep/domain — the canonical ReadRep vocabulary.
 *
 * Everything the product means lives here: what a decision is, what confidence
 * and uncertainty are, who may see what, and how a processing run moves. Web
 * routes, services, and AI adapters all speak this vocabulary; none of them
 * define their own.
 */

export * from "./primitives.js";
export * from "./confidence.js";
export * from "./taxonomy.js";

export * from "./entities/identity.js";
export * from "./entities/game.js";
export * from "./entities/processing.js";
export * from "./entities/vision.js";
export * from "./entities/decision.js";
export * from "./entities/coach.js";
export * from "./entities/learning.js";
export * from "./entities/audit.js";
export * from "./entities/ai.js";

export * from "./state-machine/processing.js";

export * from "./permissions/policy.js";

export * from "./ports/repositories.js";
