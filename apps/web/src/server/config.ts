import "server-only";
import { join } from "node:path";

/**
 * The only module in apps/web that reads `process.env`.
 *
 * Everything else imports from here. ESLint enforces the rule for the app
 * directory (`readrep/env-access-confined-to-dal`); this file is the reason
 * that rule can exist. Keeping configuration in one place is also what makes it
 * possible to say, honestly, which services are wired and which are not.
 */

const isProduction = process.env.NODE_ENV === "production";

/**
 * A fixed development secret.
 *
 * Deliberately obvious. It exists so `pnpm dev` works without setup, and it is
 * refused outright in production so it can never quietly become the real one.
 */
const DEV_SESSION_SECRET = "readrep-development-only-session-secret-do-not-deploy";

const MIN_SECRET_LENGTH = 32;

/**
 * Resolved lazily, on first use rather than at module load.
 *
 * A production *build* has no business holding the signing secret; a production
 * *server* must. Evaluating at module load would conflate the two and force the
 * real secret into CI just to run `next build`. The guard still fires on the
 * first request that needs to sign or verify a cookie, which is the moment it
 * actually matters.
 */
const readSessionSecret = (): string => {
  const configured = process.env.READREP_SESSION_SECRET?.trim();

  if (configured && configured.length >= MIN_SECRET_LENGTH) return configured;

  if (configured && configured.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `READREP_SESSION_SECRET is set but shorter than ${MIN_SECRET_LENGTH} characters. Use a longer value.`,
    );
  }
  if (isProduction) {
    throw new Error(
      `READREP_SESSION_SECRET must be set to at least ${MIN_SECRET_LENGTH} characters in production. ` +
        "Generate one with: openssl rand -hex 32",
    );
  }
  return DEV_SESSION_SECRET;
};

export const config = {
  isProduction,

  /** Signs the Phase 0 local session cookie. Never logged, never sent to a client. */
  get sessionSecret(): string {
    return readSessionSecret();
  },

  /** True when the obvious development secret is in use. The interface says so. */
  get usingDevelopmentSecret(): boolean {
    const configured = process.env.READREP_SESSION_SECRET?.trim() ?? "";
    return !isProduction && configured.length < MIN_SECRET_LENGTH;
  },

  /**
   * Where the Phase 0 local adapter keeps its JSON documents. Gitignored.
   *
   * turbopackIgnore keeps the bundler from tracing the whole project into the
   * server output because this path is computed at runtime.
   */
  get dataDir(): string {
    return (
      process.env.READREP_DATA_DIR?.trim() ||
      join(/* turbopackIgnore: true */ process.cwd(), ".data")
    );
  },

  get logLevel(): "debug" | "info" | "warn" | "error" {
    const level = process.env.READREP_LOG_LEVEL?.trim();
    return level === "debug" || level === "warn" || level === "error" ? level : "info";
  },
} as const;

/**
 * External services and whether they are actually wired.
 *
 * The interface reads this to describe its own state truthfully. Every value is
 * `false` in Phase 0 because no credential for any of these exists in this
 * repository, and claiming otherwise would be a fake success state.
 */
export const serviceStatus = {
  videoProvider: false,
  objectStorage: false,
  gpuCompute: false,
  modelProvider: false,
  billing: false,
} as const;

export type ServiceName = keyof typeof serviceStatus;

export const isServiceConfigured = (name: ServiceName): boolean => serviceStatus[name];
