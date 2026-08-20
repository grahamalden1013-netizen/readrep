# Explain Yourself

**Your camera roll will testify against you.**

A camera-roll party game for 3–10 friends in the same room. It finds ridiculous
photos in everyone's camera roll, then randomly puts someone on the spot and
makes them explain themselves.

---

## Status, honestly

This project was written in a Linux container with **no Swift toolchain, no
Xcode and no macOS**. It has therefore **never been compiled or run**. Do not
take "it's done" to mean "it builds" — expect to fix some compiler errors on the
first build. What *has* been verified is listed under
[What is actually verified](#what-is-actually-verified), and what has not is
listed in [docs/LIMITATIONS.md](docs/LIMITATIONS.md).

---

## The game

A group of friends are together. One creates a game; everyone joins with a
four-digit code or a QR code. Each player privately reviews photos the app found
in the photos *they* chose to allow, and removes anything off-limits. Then:

```
        BLACK SCREEN
        SOMEONE HERE HAS SOME EXPLAINING TO DO.
        3 · 2 · 1

        [ the photo appears ]
        …the room reacts, and nobody knows whose it is…

        JAKE.
        EXPLAIN YOURSELF.
```

Jake gets fifteen seconds to explain, out loud, to the room. Then everyone else
votes on whether they buy it.

### Modes

| Mode | The hook |
|---|---|
| **Explain Yourself** | Photo, pause, name. Fifteen seconds. FAIR ENOUGH or ABSOLUTE CAP. |
| **Truth or Cap** | The owner is *secretly* told to tell the truth — or to lie. Everyone else guesses. |
| **No Context** | Owner stays hidden. Everyone writes a fake explanation (120 characters). Funniest wins, then the owner tells the real story. |
| **Who Has to Explain This?** | Guess whose camera roll it crawled out of, *then* the reveal. |

### Intensity

`CHILL` prefers group photos and warm old ones. `DANGEROUS` (default) prefers
awkward, forgotten and slightly cursed. `CHAOS` prefers whatever is strangest.

Intensity only changes which photos are *suggested*. It never changes the rule
that a human has to approve them.

---

## The privacy model

This is the part that decides whether anyone trusts the app, so it is the part
with the most machinery behind it.

**Four gates stand between a photo and a server.** All four must pass:

1. iOS authorised the app to see it (full or limited access — limited is a
   first-class way to play, not a degraded one).
2. It survived the on-device safety pass.
3. **Its owner explicitly tapped KEEP on it.**
4. A live game actually needs it.

**What never happens.** The camera roll is never uploaded, never scanned in the
background, and never processed in the cloud. Rejected and NEVER USE photos are
not uploaded, not remotely thumbnailed, and not logged. `PHAsset.localIdentifier`
— a stable handle into a private library — never leaves the device; what travels
is `SHA-256(device-salt | localIdentifier)`.

**What leaves the device, when it does.** A ≤1600px JPEG, re-encoded locally
through an *allow-list* of metadata properties, so GPS, capture time, lens model
and camera serial number are absent rather than blanked. It goes to a private
bucket, is readable only once a round has dealt it, and its bytes are deleted
when the game ends.

**REMOVE PHOTO** is available to the owner at every moment their photo is on
screen. One tap, no confirmation dialogue, no reason field. The photo clears from
every device, its votes and answers are deleted, its bytes are purged, and the
other players see only `Round skipped.` It scores nothing and appears in no
statistic, so a removal can never be inferred from the recap.

Full detail: [docs/PRIVACY.md](docs/PRIVACY.md).

### The secret instruction

Truth or Cap only works if the instruction is genuinely hidden *and* genuinely
trustworthy at the reveal. So the server publishes only a commitment at round
start:

```
digest = SHA-256(nonce | instruction)
```

Everyone can see it; nobody can invert it. At the reveal, the nonce and the
instruction are published and every device recomputes the digest. A server —
or a tampered client — cannot pick the more interesting answer after seeing how
the vote went, and if a digest ever fails to match, the UI says `UNVERIFIED`
rather than quietly presenting a result nobody can check.

The instruction itself lives in `round_secrets`, whose row-level security policy
allows exactly one reader: the photo's owner, and only once their card has been
dealt. **The host has no exception.**

---

## Architecture

```
SwiftUI views  ──▶  feature view models  ──▶  GameSessionCoordinator
                                                      │
                                              protocol-backed services
                                                      │
                        ┌─────────────────────────────┴──────────────────┐
                        │                                                │
              SupabaseGameBackend                              LocalGameBackend
              (Postgres · Realtime · Storage)                  (demo mode, on-device)
```

Every game rule lives in **`ExplainYourselfKit`**, a local Swift package that
imports nothing but `Foundation` — no SwiftUI, no PhotoKit, no Vision. That is
what makes `swift test` runnable without a simulator, and what keeps the rules
inspectable in one place.

The same rules exist twice more, deliberately: in TypeScript in the `session`
edge function (the copy that is authoritative) and, for the redaction rules, in
SQL. The Swift copy drives demo mode and the tests; the server copy is the one
that actually protects anything.

```
explain-yourself/
├── ExplainYourself/              # app target
│   ├── App/                      # entry point, DI container, root router
│   ├── Config/                   # AppConfig + xcconfig (Secrets.xcconfig is ignored)
│   ├── DesignSystem/             # theme, components, motion
│   ├── Features/                 # one folder per screen
│   ├── Services/                 # photos, backend, identity, feedback, demo
│   └── Resources/                # Info.plist, entitlements, assets
├── ExplainYourselfTests/         # app tests (metadata stripping, approval gate)
├── Packages/ExplainYourselfKit/  # all game rules + 100+ unit tests
├── supabase/
│   ├── migrations/               # schema, RLS, storage, cleanup
│   └── functions/                # session engine, cleanup, optional flavour text
├── docs/
└── scripts/
```

**Zero third-party Swift packages.** Supabase is spoken to over plain
`URLSession` — PostgREST, RPC, anonymous auth, storage — plus a hand-rolled
Phoenix websocket client for Realtime. That is roughly 500 lines, which is
cheaper than a dependency tree in an app that handles people's photographs.

### The state machine

Thirteen phases (`waiting … gameComplete`), and the order they run in is *data*
per mode, not control flow:

```swift
GamePhase.sequence(for: .whoHasToExplainThis)
// [.roundIntro, .photoReveal, .voting, .ownerReveal, .explanationTimer, .resultReveal, .roundComplete]
```

Note that two modes run out of enum order. Who Has to Explain This votes
*before* the owner reveal — which is why visibility is tracked by explicit flags
on the round (`ownerRevealed`, `secretDelivered`, `resultsRevealed`) rather than
by comparing phases. An earlier version derived it from `phase >= .ownerReveal`
and would have handed every device the answer it was being asked to guess.

### Realtime

The server is authoritative. Clients send *intents*; the server writes state
with a monotonic `revision` and broadcasts. Clients apply only strictly-increasing
revisions, so out-of-order delivery is harmless, and every realtime event
triggers a fresh snapshot fetch rather than a delta — one code path produces the
state a device renders, so a dropped event cannot leave a phone showing a game
that never happened.

The broadcast payload is written **pre-redacted**. It is built without reference
to any particular reader, so it cannot leak to one player something it does not
also send to everyone. Private facts (your vote, your secret instruction, which
anonymous answer is yours) are fetched separately from RLS-protected tables and
merged in on-device.

---

## Requirements

- macOS 14+ with **Xcode 16+** (the project uses synchronized file groups)
- An iPhone on **iOS 17+**, or the simulator
- Optional: [Supabase CLI](https://supabase.com/docs/guides/cli), Docker for a
  local stack

---

## Local setup

```bash
git clone <this-repo>
cd explain-yourself
make setup          # creates the git-ignored Secrets.xcconfig
open ExplainYourself.xcodeproj
```

**With no backend configured, the app runs in demo mode** — entirely on device,
no network calls at all — so you can see the whole game in a simulator before
creating a Supabase project. Home → DEV → *Add 5 demo players* → *Mark everyone
ready* → back → START GAME.

If Xcode dislikes the checked-in project file (a merge conflict in a pbxproj is
the usual cause):

```bash
brew install xcodegen && xcodegen generate
```

### Running on your iPhone

1. Plug the phone in and trust the Mac.
2. Xcode → *Signing & Capabilities* → pick your personal team. The bundle id
   `com.explainyourself.app.dev` will need changing to something unique to you.
3. Remove the `com.apple.developer.sensitivecontentanalysis.client` entitlement
   from `ExplainYourself/Resources/ExplainYourself.entitlements` unless Apple has
   granted it to your account — a personal team cannot sign with it. The app
   degrades gracefully without it.
4. Select your phone as the destination and hit run.
5. On the phone: *Settings → General → VPN & Device Management* → trust your
   developer certificate.

To play with real friends you need a backend; see below.

---

## Supabase setup

```bash
supabase init                       # if you haven't
supabase link --project-ref <ref>
supabase db push                    # applies migrations/0010 … 0050
supabase functions deploy session
supabase functions deploy cleanup --no-verify-jwt
```

Then enable **anonymous sign-ins** (Dashboard → Authentication → Providers) —
this is the entire account system for v1 — and put the project URL and anon key
in `ExplainYourself/Config/xcconfig/Secrets.xcconfig`.

Both of those values are safe in the app binary: the anon key is a public
project identifier, and every RLS policy in this project assumes an attacker
already has it. The **service role key must never** appear in the app, this
repo, or any client. Details: [docs/SUPABASE.md](docs/SUPABASE.md).

### Database

`profiles · devices · game_rooms · game_players · game_sessions ·
game_session_private · rounds · round_secrets · round_votes · player_answers ·
approved_game_assets · photo_exclusions · game_results · photo_reports`

`approved_game_assets` holds one row per photo a human tapped KEEP on, for one
specific game, with an `expires_at`. There is no table here that can hold a
camera roll.

Note `game_session_private` is a separate table rather than a column on
`game_sessions`. Realtime publishes whole rows, so keeping the authoritative
state (which contains owner ids for concealed rounds) in an unpublished table is
a real control; a revoked column would have relied on Realtime honouring
column-level grants, which is not a guarantee worth betting a game mechanic on.

### Environment variables

See [`.env.example`](.env.example). Short version: `SUPABASE_URL` and
`SUPABASE_ANON_KEY` are client-safe; `SUPABASE_SERVICE_ROLE_KEY` and
`SUPABASE_DB_PASSWORD` are server-only. `AI_PROVIDER` defaults to `none` and the
game is fully playable that way.

---

## Testing

```bash
make test-kit    # domain rules — no simulator needed, runs on Linux CI
make test        # everything, in the simulator
```

The domain suite includes the brief's exact QA scenario as an executable test
(`FullGameScenarioTests`): six players, ten rounds of Truth or Cap, someone
disconnects and reconnects, someone pulls a photo mid-round, awards come out,
and PLAY AGAIN works.

The tests that matter most are in `PrivacyTests.swift`. The strongest of them
asserts that the broadcast copy of a round never carries a secret, in every
mode, at every phase.

### Testing multiplayer locally

Demo mode covers one device. For real multi-device testing, run
`supabase start`, point `Secrets.xcconfig` at `http://<your-mac-lan-ip>:54321`,
and install the app on two or more phones on the same wifi.

---

## What is actually verified

Because none of this could be compiled here, verification was done with the
strongest tools available in a Linux container:

| Check | Tool | Result |
|---|---|---|
| Swift syntax, every file | `tree-sitter-swift` grammar | 37/37 parse clean |
| SQL syntax, every migration | real PostgreSQL grammar via `pglast` | 5/5 parse clean |
| PL/pgSQL function bodies | the `plpgsql` parser | 15/15 parse clean |
| Edge functions | `tsc --strict --noEmit` | clean |
| Xcode project integrity | OpenStep plist parser + reference resolution | all references resolve |
| Info.plist / entitlements / scheme | `plistlib`, XML parser | valid |
| No committed credentials | `scripts/secret-scan.sh` | clean |

**Not verified:** that it compiles, that it links, that it launches, that the
layouts look right, or that any of it works against a real Supabase project.
Type errors, missing imports and SwiftUI generic-inference complaints are the
expected first-build failures.

---

## Git workflow

Commits are scoped and conventional (`feat:`, `fix:`, `test:`, `chore:`). Run
`make secret-scan` before pushing.

This project lives in a subdirectory because this session was pinned to an
existing repository. To extract it into the standalone private repo the brief
asked for, with history preserved:

```bash
./scripts/split-into-own-repo.sh ~/code/explain-yourself
cd ~/code/explain-yourself
gh repo create explain-yourself --private --source=. --remote=origin --push
```

---

## Documentation

- [docs/PRIVACY.md](docs/PRIVACY.md) — the photo privacy model, end to end
- [docs/SECURITY.md](docs/SECURITY.md) — threat model, RLS, the security tests
- [docs/SUPABASE.md](docs/SUPABASE.md) — backend setup and deployment
- [docs/APPSTORE.md](docs/APPSTORE.md) — what App Review will want
- [docs/LIMITATIONS.md](docs/LIMITATIONS.md) — what is not done, and what is not true
- [docs/ROADMAP.md](docs/ROADMAP.md) — what to build next and why

---

## What this is not

No feed, no followers, no public profiles, no DMs, no stranger matchmaking, no
streaks, no XP, no levels, no coins, no battle pass, no ads, no location
tracking, no facial recognition, no chatbot, no background upload, no cloud
processing of anyone's library, no permanent archive of anything.

V1 is free. There is no monetisation in it.

---

## The one thing that matters

When a decision is between adding a feature and making the core moment faster,
funnier, safer or more surprising — the core moment wins.

> A ridiculous photo appears. Everyone reacts. Someone realises they're in
> trouble. Then: **JAKE. EXPLAIN YOURSELF.**
