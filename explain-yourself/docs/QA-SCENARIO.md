# The QA scenario

The brief specifies an exact game to run before calling the MVP complete. It is
implemented as an executable test — `FullGameScenarioTests.testTheWholeNight
RunsWithoutTheGameGettingStuck` in `Packages/ExplainYourselfKit/Tests` — so it
runs in CI rather than depending on six people being free.

```bash
make test-kit
```

## What the test drives

Players: Jake (host), Sam, Alex, Ryan, Maya, Emma. Ten rounds of Truth or Cap.

| The brief asks for | How the test proves it |
|---|---|
| Everyone approves at least 10 photos | fixture asserts `approvedAssetCount >= 10` |
| Multiple players' photos appear | asset ids are unique and owners are spread |
| At least one TELL THE TRUTH | `sawTruthInstruction` |
| At least one LIE | `sawLieInstruction` |
| Everyone votes | each round drives every eligible voter |
| Someone fools the group | `someoneFooledTheGroup` |
| Someone guesses correctly | `someoneGuessedRight` |
| A player disconnects | Emma goes `.disconnected` during round 3 |
| That player reconnects | Emma returns in round 4 |
| A player uses REMOVE PHOTO mid-round | during `explanationTimer` in round 6 |
| The photo disappears immediately | the archived round has `status == .removedByOwner` and zero votes |
| The round skips cleanly | the game moves straight to the next `roundIntro` |
| Remaining rounds continue | ten completed rounds |
| Awards appear | `results.awards` is non-empty and deterministic across runs |
| Play Again works | a fresh session on the same room, scores at zero |

And the verifications the brief lists afterwards:

| Claim | Where it is proven |
|---|---|
| Unapproved photos were never uploaded | `ApprovalGateTests.testOnlyKeptPhotosAreEverOfferedForUpload` |
| Rejected photos were never uploaded | same test |
| NEVER USE images remain excluded | `testNeverUseIsPersistedImmediatelyAndFiltersFutureDecks` |
| Players cannot access another's photos | storage read policy, `0040_storage.sql` |
| Private storage is actually private | bucket created with `public = false` |
| Signed URLs expire | 300s lifetime, `Tuning.signedURLLifetime` |
| GPS metadata is stripped | `GameplayImageRendererTests` |
| Secret instructions are inaccessible to others | `PrivacyTests`, plus `round_secrets_owner_only` |
| Voting cannot be duplicated | `testPlayerCannotVoteTwice` + a Postgres primary key |
| Reconnect restores correct state | `testReconnectingDeviceAdoptsTheAuthoritativeSnapshot` |

## What this does *not* prove

The four rows in the middle of the second table are **design-level claims backed
by SQL that has never been executed**. The storage policies, the bucket privacy
setting and the signed-URL expiry are all reasoned about and reviewed, but until
the migrations are applied to a real project and probed with two anonymous users,
they are not verified.

Do the manual pass in [LIMITATIONS.md](LIMITATIONS.md#before-real-users) before
letting real people play.

## Running it by hand

On one device, with no backend:

1. Build and run. With no `Secrets.xcconfig` values the app is in demo mode.
2. Home → **DEV** → *Add 5 demo players* → *Mark everyone ready*.
3. Close the sheet → **CREATE GAME** → Truth or Cap → 10 rounds → DANGEROUS.
4. **PREPARE MY PHOTOS**, approve a few, **DONE**.
5. **START GAME**.
6. Mid-round, use **REMOVE PHOTO** on one of your own. It should vanish and the
   round should skip with `Round skipped.` and no explanation.
7. DEV → *Simulate disconnect (Emma)* then *Simulate reconnect (Emma)*.
8. Play out to **THE DAMAGE**.
