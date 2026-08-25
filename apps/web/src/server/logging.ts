import "server-only";
import { createLogger, createInMemoryMetricsSink } from "@readrep/observability";
import { config } from "./config";

/**
 * The application logger.
 *
 * `@readrep/observability` redacts every field it is given, so this is the only
 * logger the server may use. `console` is banned by ESLint outside tests.
 */
export const logger = createLogger({
  component: "web",
  level: config.logLevel,
});

/**
 * Phase 0 metrics sink: in memory, so nothing is persisted or shipped anywhere.
 * Phase 1 replaces this with a real store. Cost records exist from the start so
 * per-game economics are measurable when the spending begins.
 */
export const metrics = createInMemoryMetricsSink();
