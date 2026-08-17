import "server-only";

/**
 * Server-side environment access.
 *
 * Nothing in this module may be imported from a Client Component — every value
 * here is a secret or a server-only connection string. Google's client secret
 * in particular must never reach the browser bundle.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. See .env.example for setup instructions.`,
    );
  }
  return value;
}

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

export const serverEnv = {
  get databaseUrl() {
    return required("DATABASE_URL");
  },
  get betterAuthSecret() {
    return required("BETTER_AUTH_SECRET");
  },
  get betterAuthUrl() {
    return required("BETTER_AUTH_URL");
  },
  // Optional at boot so the app can start and explain what is missing rather
  // than crashing the build. `integrationStatus().google` gates the UI, and
  // Better Auth rejects the OAuth flow if these are still blank.
  get googleClientId() {
    return optional("GOOGLE_CLIENT_ID") ?? "";
  },
  get googleClientSecret() {
    return optional("GOOGLE_CLIENT_SECRET") ?? "";
  },
  get anthropicApiKey() {
    return optional("ANTHROPIC_API_KEY");
  },
  get cronSecret() {
    return optional("CRON_SECRET");
  },
};

/**
 * Reports which optional integrations are configured, so the UI can explain
 * what still needs setting up instead of failing at request time.
 */
export function integrationStatus() {
  return {
    google: Boolean(
      process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
    ),
    studyCoach: Boolean(process.env.ANTHROPIC_API_KEY),
  };
}
