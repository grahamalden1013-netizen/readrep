#!/usr/bin/env bash
#
# Securely set ANTHROPIC_API_KEY in .env.local.
#
# The key is read from a hidden prompt: it is never echoed to the terminal,
# never passed as an argument (so it can't land in `ps` output or shell
# history), and never printed back. Only its presence and length are reported.
#
#   ./scripts/set-anthropic-key.sh
#
set -euo pipefail

# Resolve the repo root from this script's location, so it works from anywhere.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/.env.local"
DEFAULT_MODEL="claude-opus-5"

cd "$ROOT"

printf '\nReadRep — Anthropic API key setup\n'
printf '  file:  %s\n' "$ENV_FILE"
printf '  get a key at: https://console.anthropic.com/settings/keys\n\n'

# --- Refuse to run if this file could ever be committed ----------------------
# Tracked first: git reports a tracked file as "not ignored", so checking
# ignore status first would give the wrong reason.
if git ls-files --error-unmatch .env.local >/dev/null 2>&1; then
  printf 'ABORTED: .env.local is tracked by git. Untrack it first:\n' >&2
  printf '  git rm --cached .env.local\n' >&2
  exit 1
fi
if ! git check-ignore -q .env.local 2>/dev/null; then
  printf 'ABORTED: .env.local is not gitignored in this checkout.\n' >&2
  printf 'Add ".env*" to .gitignore before storing a key here.\n' >&2
  exit 1
fi

# --- Hidden input ------------------------------------------------------------
# `read -s` suppresses echo. Reading from /dev/tty rather than stdin means a
# piped or redirected stdin can't silently feed a key in — this must be typed
# by a human at a real terminal.
if [ ! -r /dev/tty ]; then
  printf 'ABORTED: no terminal available.\n' >&2
  printf 'Run this directly in a terminal, not through a pipe or a CI job.\n' >&2
  exit 1
fi

printf 'Paste your Anthropic API key (input is hidden, nothing will be shown): '
IFS= read -rs API_KEY < /dev/tty || true
printf '\n'

if [ -z "${API_KEY:-}" ]; then
  printf '\nNothing entered. No changes made.\n' >&2
  exit 1
fi

# Strip stray whitespace a paste may carry.
API_KEY="$(printf '%s' "$API_KEY" | tr -d '[:space:]')"

case "$API_KEY" in
  sk-ant-*) ;;
  *)
    printf '\nThat does not look like an Anthropic key (they start with "sk-ant-").\n' >&2
    printf 'No changes made. The value was not stored or displayed.\n' >&2
    unset API_KEY
    exit 1
    ;;
esac

# --- Write atomically, preserving every other line ---------------------------
touch "$ENV_FILE"
chmod 600 "$ENV_FILE"

TMP="$(mktemp "${TMPDIR:-/tmp}/readrep-env.XXXXXX")"
chmod 600 "$TMP"
trap 'rm -f "$TMP"' EXIT

# Carry across everything except the two keys we manage.
grep -v -E '^[[:space:]]*ANTHROPIC_API_KEY=' "$ENV_FILE" \
  | grep -v -E '^[[:space:]]*ANTHROPIC_INTERVIEW_MODEL=' > "$TMP" || true

# Keep an existing model choice if the file already had one.
EXISTING_MODEL="$(grep -E '^[[:space:]]*ANTHROPIC_INTERVIEW_MODEL=' "$ENV_FILE" \
  | tail -n 1 | cut -d= -f2- | tr -d '[:space:]' || true)"
MODEL="${EXISTING_MODEL:-$DEFAULT_MODEL}"

# Trailing newline hygiene, so appends never join onto a previous line.
if [ -s "$TMP" ] && [ "$(tail -c 1 "$TMP" | wc -l)" -eq 0 ]; then
  printf '\n' >> "$TMP"
fi

{
  printf 'ANTHROPIC_API_KEY=%s\n' "$API_KEY"
  printf 'ANTHROPIC_INTERVIEW_MODEL=%s\n' "$MODEL"
} >> "$TMP"

mv "$TMP" "$ENV_FILE"
chmod 600 "$ENV_FILE"
trap - EXIT

KEY_LEN="${#API_KEY}"
unset API_KEY

# --- Verify without displaying the value -------------------------------------
printf '\nVerifying (the key itself is never printed):\n'

if grep -q -E '^ANTHROPIC_API_KEY=sk-ant-' "$ENV_FILE"; then
  printf '  ok   ANTHROPIC_API_KEY is set (%s characters)\n' "$KEY_LEN"
else
  printf '  FAIL ANTHROPIC_API_KEY was not written\n' >&2
  exit 1
fi

printf '  ok   ANTHROPIC_INTERVIEW_MODEL=%s\n' "$MODEL"
printf '  ok   .env.local permissions: %s\n' "$(ls -l "$ENV_FILE" | cut -c1-10)"

if git check-ignore -q .env.local; then
  printf '  ok   .env.local is gitignored and will not be committed\n'
fi

if git status --porcelain | grep -q '\.env\.local'; then
  printf '  FAIL .env.local shows up in git status — do not commit it\n' >&2
  exit 1
else
  printf '  ok   .env.local does not appear in git status\n'
fi

printf '\nNext:\n'
printf '  1. Restart the dev server (Ctrl-C, then: npm run dev)\n'
printf '  2. npm run ai:check     # confirms a REAL Anthropic call, not mock mode\n'
printf '  3. npm run test:live\n'
printf '  4. npm run test:sim\n\n'
