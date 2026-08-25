/**
 * @readrep/domain — the canonical ReadRep vocabulary.
 *
 * Everything the product means lives here: what a decision is, what confidence
 * and uncertainty are, who may see what, and how a processing run moves. Web
 * routes, services, and AI adapters all speak this vocabulary; none of them
 * define their own.
 */

export * from "./primitives";
export * from "./confidence";
export * from "./taxonomy";

export * from "./entities/identity";
export * from "./entities/game";
export * from "./entities/processing";
export * from "./entities/vision";
export * from "./entities/decision";
export * from "./entities/coach";
export * from "./entities/learning";
export * from "./entities/audit";
export * from "./entities/ai";

export * from "./state-machine/processing";

export * from "./permissions/policy";

export * from "./ports/repositories";
