#!/usr/bin/env bash
#
# Fail if a tracked file looks like it contains a real credential.
#
# This looks for *shapes* — a JWT, a PEM block, an Anthropic key — rather than
# for the word "secret", because the word appears legitimately all over this
# project (in .gitignore rules, in documentation, and in the name of the game
# mechanic itself). Matching on the word produces a scanner everyone learns to
# ignore, which is worse than no scanner.
#
set -uo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

# Files whose job is to talk about credentials without containing any.
EXCLUDE='^(\.gitignore|\.env\.example|Makefile|scripts/secret-scan\.sh|docs/SECURITY\.md|docs/SUPABASE\.md|README\.md|ExplainYourself/Config/xcconfig/Secrets\.example\.xcconfig)$'

PATTERNS='(-----BEGIN [A-Z ]*PRIVATE KEY-----'
PATTERNS+='|sk-ant-[A-Za-z0-9_-]{24,}'
PATTERNS+='|eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}'  # a real JWT
PATTERNS+='|SUPABASE_SERVICE_ROLE_KEY[[:space:]]*=[[:space:]]*[A-Za-z0-9._-]{24,}'
PATTERNS+='|AKIA[0-9A-Z]{16}'
PATTERNS+='|ghp_[A-Za-z0-9]{30,})'

echo "Scanning tracked files for credential-shaped strings…"

hits=$(git ls-files \
  | grep -Ev "$EXCLUDE" \
  | while read -r file; do
      [ -f "$file" ] || continue
      if grep -qE "$PATTERNS" "$file" 2>/dev/null; then echo "$file"; fi
    done)

if [ -n "$hits" ]; then
  echo
  echo "Possible credential in:"
  echo "$hits" | sed 's/^/  /'
  echo
  echo "Do not commit this. If it is a false positive, add the file to EXCLUDE"
  echo "in scripts/secret-scan.sh and say why."
  exit 1
fi

# Also make sure the git-ignored files really are ignored.
for f in ExplainYourself/Config/xcconfig/Secrets.xcconfig .env supabase/.env; do
  if git ls-files --error-unmatch "$f" >/dev/null 2>&1; then
    echo "$f is TRACKED and must not be. Remove it from the index." >&2
    exit 1
  fi
done

echo "Clean."
