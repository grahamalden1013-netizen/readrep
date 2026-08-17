/**
 * Configuration diagnostic.
 *
 *   npm run doctor
 *
 * Checks everything that has to be true before Google sign-in can work, and
 * names the exact fix for whatever is wrong. Never prints secret values — only
 * whether they are present and well-formed.
 */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

type Status = "ok" | "warn" | "fail";

const results: { status: Status; label: string; detail?: string }[] = [];

function record(status: Status, label: string, detail?: string) {
  results.push({ status, label, detail });
}

/** Confirms a secret is present and plausible without ever revealing it. */
function describeSecret(value: string | undefined): string {
  if (!value) return "not set";
  return `set (${value.length} chars)`;
}

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

const {
  DATABASE_URL,
  DIRECT_DATABASE_URL,
  BETTER_AUTH_SECRET,
  BETTER_AUTH_URL,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  ANTHROPIC_API_KEY,
} = process.env;

if (!DATABASE_URL) {
  record("fail", "DATABASE_URL", "not set — copy .env.example to .env");
} else if (DATABASE_URL.includes("user:password")) {
  record("fail", "DATABASE_URL", "still the placeholder from .env.example");
} else {
  record("ok", "DATABASE_URL", "set");
}

record(
  DIRECT_DATABASE_URL ? "ok" : "warn",
  "DIRECT_DATABASE_URL",
  DIRECT_DATABASE_URL ? "set" : "not set — needed by `prisma migrate` on pooled hosts",
);

if (!BETTER_AUTH_SECRET) {
  record("fail", "BETTER_AUTH_SECRET", "not set — run: openssl rand -base64 32");
} else if (BETTER_AUTH_SECRET.length < 32) {
  record("warn", "BETTER_AUTH_SECRET", "shorter than 32 chars; regenerate it");
} else {
  record("ok", "BETTER_AUTH_SECRET", describeSecret(BETTER_AUTH_SECRET));
}

if (!BETTER_AUTH_URL) {
  record("fail", "BETTER_AUTH_URL", "not set — use http://localhost:3000 locally");
} else {
  record("ok", "BETTER_AUTH_URL", BETTER_AUTH_URL);
}

// ---------------------------------------------------------------------------
// Google OAuth
// ---------------------------------------------------------------------------

if (!GOOGLE_CLIENT_ID) {
  record("fail", "GOOGLE_CLIENT_ID", "not set — sign-in will be disabled");
} else if (!GOOGLE_CLIENT_ID.endsWith(".apps.googleusercontent.com")) {
  record(
    "fail",
    "GOOGLE_CLIENT_ID",
    "does not end in .apps.googleusercontent.com — this is probably not the client ID",
  );
} else {
  record("ok", "GOOGLE_CLIENT_ID", "set and well-formed");
}

if (!GOOGLE_CLIENT_SECRET) {
  record("fail", "GOOGLE_CLIENT_SECRET", "not set");
} else if (GOOGLE_CLIENT_SECRET.endsWith(".apps.googleusercontent.com")) {
  record(
    "fail",
    "GOOGLE_CLIENT_SECRET",
    "looks like the client ID, not the secret — the secret usually starts with GOCSPX-",
  );
} else {
  record("ok", "GOOGLE_CLIENT_SECRET", describeSecret(GOOGLE_CLIENT_SECRET));
}

if (BETTER_AUTH_URL) {
  const redirectUri = `${BETTER_AUTH_URL.replace(/\/$/, "")}/api/auth/callback/google`;
  record(
    "ok",
    "Required redirect URI",
    `${redirectUri}  (must match Google exactly)`,
  );
}

record(
  ANTHROPIC_API_KEY ? "ok" : "warn",
  "ANTHROPIC_API_KEY",
  ANTHROPIC_API_KEY ? "set — Study Coach enabled" : "not set — Study Coach disabled (fine for now)",
);

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------

if (DATABASE_URL && !DATABASE_URL.includes("user:password")) {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: DATABASE_URL }),
  });
  try {
    await prisma.$queryRaw`SELECT 1`;
    record("ok", "Database connection", "reachable");

    const [{ count }] = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT count(*)::bigint AS count
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'assignments'
    `;
    if (Number(count) > 0) {
      const users = await prisma.user.count();
      const sources = await prisma.calendarSource.count();
      const assignments = await prisma.assignment.count();
      record("ok", "Schema", "migrations applied");
      record(
        "ok",
        "Data",
        `${users} user(s), ${sources} calendar source(s), ${assignments} assignment(s)`,
      );
    } else {
      record("fail", "Schema", "tables missing — run: npm run db:deploy");
    }
  } catch (error) {
    record(
      "fail",
      "Database connection",
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    await prisma.$disconnect();
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const ICON: Record<Status, string> = {
  ok: "\x1b[32m✓\x1b[0m",
  warn: "\x1b[33m!\x1b[0m",
  fail: "\x1b[31m✗\x1b[0m",
};

console.log("\n\x1b[1mHomework Agent — configuration check\x1b[0m\n");
for (const { status, label, detail } of results) {
  console.log(`  ${ICON[status]} ${label}${detail ? `: ${detail}` : ""}`);
}

const failures = results.filter((r) => r.status === "fail").length;
console.log();
if (failures === 0) {
  console.log("  \x1b[32mAll checks passed.\x1b[0m Run 'npm run dev' and sign in.\n");
} else {
  console.log(
    `  \x1b[31m${failures} problem(s) to fix.\x1b[0m See the notes above.\n`,
  );
  process.exitCode = 1;
}
