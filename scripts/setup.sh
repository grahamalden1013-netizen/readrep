#!/usr/bin/env bash
#
# Local setup for Homework Agent.
#
# Idempotent: safe to re-run. Never overwrites an existing value in .env, and
# never echoes a secret to the terminal or to your shell history.
#
#   ./scripts/setup.sh
#
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"

bold() { printf '\033[1m%s\033[0m\n' "$1"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$1"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$1"; }
fail() { printf '  \033[31m✗\033[0m %s\n' "$1"; }

bold "Homework Agent — local setup"
echo "Working in $ROOT"
echo

# ---------------------------------------------------------------------------
# 1. Prerequisites
# ---------------------------------------------------------------------------
bold "1. Checking prerequisites"

if ! command -v node >/dev/null 2>&1; then
  fail "node not found. Install Node.js 20.9 or newer, then re-run."
  exit 1
fi
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 20 ]; then
  fail "Node $(node -v) is too old. Next.js 16 needs 20.9 or newer."
  exit 1
fi
ok "node $(node -v)"

if ! command -v psql >/dev/null 2>&1; then
  warn "psql not found. Install PostgreSQL (e.g. 'brew install postgresql@16'"
  warn "or Postgres.app) if you want the database created automatically."
else
  ok "psql $(psql --version | awk '{print $3}')"
fi

# ---------------------------------------------------------------------------
# 2. Dependencies
# ---------------------------------------------------------------------------
echo
bold "2. Installing dependencies"
if [ -d node_modules ]; then
  ok "node_modules present (run 'npm install' yourself to refresh)"
else
  npm install
  ok "dependencies installed"
fi

# ---------------------------------------------------------------------------
# 3. .env
# ---------------------------------------------------------------------------
echo
bold "3. Configuring .env"

if [ ! -f .env ]; then
  cp .env.example .env
  ok "created .env from .env.example"
else
  ok ".env already exists (existing values are left untouched)"
fi

# Reads the current value of a key from .env, ignoring surrounding quotes.
env_value() {
  local key="$1"
  grep -E "^${key}=" .env 2>/dev/null | tail -n1 | cut -d= -f2- | sed 's/^"//; s/"$//'
}

# Writes key="value" into .env, replacing any existing line for that key.
set_env() {
  local key="$1" value="$2" tmp
  tmp="$(mktemp)"
  grep -vE "^${key}=" .env > "$tmp" 2>/dev/null || true
  printf '%s="%s"\n' "$key" "$value" >> "$tmp"
  mv "$tmp" .env
  chmod 600 .env
}

if [ -z "$(env_value BETTER_AUTH_SECRET)" ]; then
  if command -v openssl >/dev/null 2>&1; then
    set_env BETTER_AUTH_SECRET "$(openssl rand -base64 32)"
  else
    set_env BETTER_AUTH_SECRET "$(node -e 'console.log(require("crypto").randomBytes(32).toString("base64"))')"
  fi
  ok "generated BETTER_AUTH_SECRET"
else
  ok "BETTER_AUTH_SECRET already set (left alone — changing it signs you out)"
fi

if [ -z "$(env_value BETTER_AUTH_URL)" ]; then
  set_env BETTER_AUTH_URL "http://localhost:3000"
  ok "set BETTER_AUTH_URL to http://localhost:3000"
else
  ok "BETTER_AUTH_URL = $(env_value BETTER_AUTH_URL)"
fi

DB_NAME="homework_agent"
# $USER is not exported in every shell; fall back to whoami.
DB_USER="${USER:-$(whoami)}"
if [ -z "$(env_value DATABASE_URL)" ] || [[ "$(env_value DATABASE_URL)" == *"user:password"* ]]; then
  DB_URL="postgresql://${DB_USER}@localhost:5432/${DB_NAME}?schema=public"
  set_env DATABASE_URL "$DB_URL"
  set_env DIRECT_DATABASE_URL "$DB_URL"
  ok "set DATABASE_URL for local Postgres as user '${DB_USER}'"
else
  ok "DATABASE_URL already configured"
fi

# Google credentials: prompted silently, never echoed, never logged.
if [ -z "$(env_value GOOGLE_CLIENT_ID)" ]; then
  echo
  warn "GOOGLE_CLIENT_ID is empty."
  echo "  Paste it below (input is hidden), or press Enter to skip for now."
  read -rs -p "  Google client ID: " GC_ID; echo
  if [ -n "$GC_ID" ]; then
    set_env GOOGLE_CLIENT_ID "$GC_ID"
    ok "stored GOOGLE_CLIENT_ID in .env"
  else
    warn "skipped — the app will show 'Google sign-in not configured'"
  fi
  unset GC_ID
else
  ok "GOOGLE_CLIENT_ID already set"
fi

if [ -z "$(env_value GOOGLE_CLIENT_SECRET)" ]; then
  read -rs -p "  Google client secret: " GC_SECRET; echo
  if [ -n "$GC_SECRET" ]; then
    set_env GOOGLE_CLIENT_SECRET "$GC_SECRET"
    ok "stored GOOGLE_CLIENT_SECRET in .env"
  else
    warn "skipped"
  fi
  unset GC_SECRET
else
  ok "GOOGLE_CLIENT_SECRET already set"
fi

chmod 600 .env

# ---------------------------------------------------------------------------
# 4. Database
# ---------------------------------------------------------------------------
echo
bold "4. Preparing the database"

if command -v psql >/dev/null 2>&1; then
  if psql -lqt 2>/dev/null | cut -d\| -f1 | grep -qw "$DB_NAME"; then
    ok "database '$DB_NAME' already exists"
  elif command -v createdb >/dev/null 2>&1 && createdb "$DB_NAME" 2>/dev/null; then
    ok "created database '$DB_NAME'"
  else
    warn "could not create '$DB_NAME' automatically."
    warn "Is the Postgres server running? Then: createdb $DB_NAME"
  fi
else
  warn "skipping database creation (psql not installed)"
fi

echo
MIGRATIONS_OK=1
if npx prisma migrate deploy 2>&1 | sed 's/^/  /'; then
  ok "migrations applied"
else
  MIGRATIONS_OK=0
  fail "migrations failed"
  warn "Check that Postgres is running and that DATABASE_URL in .env names a"
  warn "role that can connect. On macOS with Homebrew the role is usually your"
  warn "own username; with Postgres.app it may be 'postgres'."
fi

# ---------------------------------------------------------------------------
# 5. Result
# ---------------------------------------------------------------------------
echo
if [ "$MIGRATIONS_OK" -eq 1 ]; then
  bold "Setup complete"
  echo
  echo "  Check your configuration:  npm run doctor"
  echo "  Start the app:             npm run dev"
  echo
  echo "  Then open http://localhost:3000 and sign in with Google."
else
  bold "Setup incomplete"
  echo
  echo "  The database step did not finish. Run 'npm run doctor' for a"
  echo "  detailed diagnosis, fix DATABASE_URL in .env, then re-run this script."
  echo
  exit 1
fi
