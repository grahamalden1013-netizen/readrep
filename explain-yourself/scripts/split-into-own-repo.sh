#!/usr/bin/env bash
#
# Extract `explain-yourself/` into a standalone git repository.
#
# The brief asked for a brand-new repository. This session was pinned to an
# existing one, so the project was built as a self-contained folder instead.
# Running this gives you the standalone repo, with this folder's commit history
# preserved rather than squashed into a single "initial commit".
#
#   ./scripts/split-into-own-repo.sh ~/code/explain-yourself
#
set -euo pipefail

DEST="${1:-$HOME/explain-yourself}"
SOURCE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SUBDIR="explain-yourself"

if [ -e "$DEST" ]; then
  echo "error: $DEST already exists. Pick a path that does not." >&2
  exit 1
fi

echo "Source repo : $SOURCE_ROOT"
echo "Subdirectory: $SUBDIR"
echo "Destination : $DEST"
echo

# `git subtree split` rewrites the history of just this folder onto a new branch
# whose root is the folder itself, which is exactly what a standalone repo wants.
cd "$SOURCE_ROOT"
BRANCH="split-explain-yourself-$$"
git subtree split --prefix="$SUBDIR" -b "$BRANCH"

git clone --no-local --single-branch --branch "$BRANCH" "$SOURCE_ROOT" "$DEST"
git branch -D "$BRANCH"

cd "$DEST"
git branch -m main
git remote remove origin 2>/dev/null || true

echo
echo "Done. $DEST is now a standalone repository on `main`."
echo
echo "To put it on GitHub as a PRIVATE repo:"
echo
echo "  cd \"$DEST\""
echo "  gh repo create explain-yourself --private --source=. --remote=origin --push"
echo
echo "Or, without the gh CLI: create an empty private repo on github.com, then"
echo
echo "  git remote add origin git@github.com:<you>/explain-yourself.git"
echo "  git push -u origin main"
