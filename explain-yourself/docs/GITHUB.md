# GitHub

## Why this lives in a subdirectory

The brief asked for a brand-new repository named `explain-yourself`. The session
that built it was pinned to an existing repository and branch, and pushing a new
repo would have meant ignoring that constraint. So the project was built as a
completely self-contained folder — its own `.gitignore`, `Makefile`, docs,
package and Xcode project, with no dependency on anything outside it — plus a
script that turns it into the standalone repository in one command.

`gh` was also not installed in that environment, which is the fallback path the
brief itself specifies: build locally, document the commands.

## Extracting it

```bash
./scripts/split-into-own-repo.sh ~/code/explain-yourself
```

This uses `git subtree split`, so the commit history of this folder is preserved
rather than squashed into one "initial commit".

## Creating the private repo

With the GitHub CLI:

```bash
cd ~/code/explain-yourself
gh auth status                     # confirm you are logged in
gh repo create explain-yourself --private --source=. --remote=origin --push
gh repo view --web
```

Without it: create an empty **private** repository on github.com, then

```bash
cd ~/code/explain-yourself
git remote add origin git@github.com:<you>/explain-yourself.git
git branch -M main
git push -u origin main
```

Confirm it is private before pushing. The repo contains no credentials — run
`make secret-scan` to check — but it does contain a complete description of the
privacy model, and a private repo is the right default for an unreleased app.

## Before every push

```bash
make secret-scan
make test-kit
```

## Suggested branch protection

Once there is more than one person on it: require a pull request for `main`,
require `make test-kit` to pass, and do not allow force pushes.

## Commit style

Conventional and scoped:

```
feat: add truth or cap commitment scheme
fix: stop late votes landing in the next round
test: cover redaction in every mode
chore: bump build number
```

Commit messages in this project explain *why* where the reason is not obvious
from the diff — particularly for the two bugs found while writing the tests,
which are worth being able to find again.
