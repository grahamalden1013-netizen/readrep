# Security

## Threat model

The people this design defends against, in priority order:

1. **A player with a patched client.** Most likely and most damaging: someone in
   the room who wants to see the secret instruction, vote twice, or find out
   whose photo is coming. Every control below assumes the client is hostile.
2. **A player of a *different* game.** Room codes are four digits and get spoken
   out loud; they must not be a credential.
3. **Anyone who obtains the anon key.** It is compiled into the app, so assume
   they have it. Every RLS policy is written on that assumption.
4. **A curious operator.** Minimised by not storing much: no camera rolls, no
   locations, no recognised text, six-hour asset expiry.

Explicitly *not* defended against: a jailbroken device screenshotting its own
screen, or a player showing their secret card to the person next to them. Those
are social problems and the game is played in one room.

## Identity

Supabase anonymous sign-in. `auth.uid()` is the player. Nobody registers an
email to play a party game in a living room, and there is no password to leak.

Per-install secrets live in the Keychain with
`kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly` — not in `UserDefaults`,
which is a plist in a backup.

## Authorisation

Every player action runs through a `SECURITY DEFINER` function with a pinned
`search_path`, and every one re-derives the caller from `auth.uid()` rather than
trusting a parameter. A client sends an intent; the server decides what happened.

There is deliberately **no insert/update policy** on `game_rooms`, `rounds`,
`round_votes` or `player_answers`. A client cannot make itself a host, deal
itself a round, or write a vote directly.

### Host actions are server-validated

`kick_player`, `update_room_settings`, `skip`, `advance` and `end` all check
`is_room_host()` in the database. The `session` edge function checks it *again*
before running the state machine. The UI hiding a button is not a control.

### One vote per player

Enforced by `primary key (round_id, voter_id)` on `round_votes`, so two devices
racing on a flaky network cannot both land. `on conflict do nothing` makes the
retry idempotent rather than an error the player sees. The state machine enforces
the same rule independently.

### The secret instruction

The one policy the whole game mode depends on:

```sql
create policy round_secrets_owner_only on public.round_secrets
    for select to authenticated
    using (
        owner_id = auth.uid()
        and exists (select 1 from public.rounds r
                    where r.id = round_id and r.secret_delivered = true)
    );
```

Owner only, and only after their card has been dealt. **The host has no
exception.** There is no insert/update/delete policy, so a client cannot change
its own instruction after seeing how the room is reacting.

And the instruction is never in the broadcast at all — only a
`SHA-256(nonce | instruction)` commitment, published at round start so the answer
cannot be chosen after the votes are in. At the reveal, every device recomputes
the digest; a mismatch renders as `UNVERIFIED` rather than being quietly trusted.

### The owner's identity

In No Context and Who Has to Explain This, `rounds.owner_id` *is* the answer to
the question being asked. So:

- `rounds` is not granted to `authenticated` at all.
- The broadcast payload is written **pre-redacted**, by
  `publicState()` in the edge function, which is built without reference to any
  reader. It cannot leak to one player something it does not send to everyone.
- Visibility is tracked by explicit flags (`owner_revealed`,
  `secret_delivered`, `results_revealed`) rather than derived from the phase.
  This is not stylistic: two of the four modes run their phases out of enum
  order, and an earlier `phase >= .ownerReveal` comparison would have handed
  every device the answer during voting in Who Has to Explain This.

### Realtime

Only `game_sessions` and `game_players` are published. Explicitly not published,
and worth stating so a future migration does not helpfully add them:
`game_session_private`, `rounds`, `round_secrets`, `round_votes`,
`player_answers`, `approved_game_assets`.

The authoritative state lives in `game_session_private`, a separate table with
**no RLS policy at all** — which under an enabled RLS is the deny. It is a
separate table rather than a column because Realtime publishes whole rows, and a
revoked column would rely on Realtime honouring column-level grants. That is not
a guarantee worth betting a game mechanic on.

### Storage

Private bucket, no public URLs, 5-minute signed URLs, 3 MB size cap, JPEG only.

Write policy: your own folder, in a room you are in. No update policy at all — a
gameplay copy is written once, because allowing overwrite would let somebody swap
the photo after the room had already reacted to it.

Read policy: your own photo, or a photo a round has actually dealt in a room you
are in. Pre-fetching the deck is not possible.

### Room codes

Four digits, unique only among joinable rooms, recycled when a game finishes.
They are a *lookup* key, not a credential: `join_room` checks the room is in its
lobby and has space, takes a `for update` lock so the tenth and eleventh player
cannot race the capacity check, and every subsequent action is authorised by the
player's own identity rather than by knowing the code. Room ids are uuids and
cannot be enumerated.

## Security tests

| Claim | Where |
|---|---|
| No player can read another's secret instruction | `PrivacyTests.testSecretInstructionIsNeverVisibleToAnyoneButTheOwner` |
| The host has no special access | `testHostHasNoSpecialAccessToTheSecretInstruction` |
| The broadcast never carries a secret, in any mode, at any phase | `testTheBroadcastCopyOfARoundNeverCarriesASecret` |
| A tampered reveal fails verification | `testTamperedRevealFailsVerification` |
| Hidden-owner modes conceal the owner during voting | `testHiddenOwnerModesConcealTheOwnerFromEveryoneElseDuringVoting` |
| No partial vote totals before everyone votes | `testNoPartialVoteTotalsBeforeEveryoneHasVoted` |
| Players cannot vote twice | `StateMachineTests.testPlayerCannotVoteTwice` + a Postgres primary key |
| Owners cannot vote on their own photo | `testOwnerCannotVoteOnTheirOwnPhoto` |
| Only the host can start, skip, advance or end | `testOnlyHostCanStart`, `testOnlyHostCanSkipAdvanceOrEnd` |
| Only the owner can remove their photo | `testOnlyTheOwnerCanRemoveThePhoto` |
| A removed photo leaves no trace | `testOwnerCanRemoveTheirPhotoMidRoundAndTheRoundVanishes` |
| Rejected and NEVER USE photos are never uploaded | `ApprovalGateTests.testOnlyKeptPhotosAreEverOfferedForUpload` |
| GPS is stripped from uploads | `GameplayImageRendererTests.testRenderedGameplayCopyCarriesNoLocationOrDeviceMetadata` |
| Local identifiers never travel | `testAssetIdentifiersAreSaltedHashesRatherThanPhotoKitIdentifiers` |
| Analytics carries no free-form strings | `testAnalyticsEventsCarryNoFreeformStrings` |
| A late vote cannot land in the next round | `testLateVoteFromABeforeADropDoesNotLeakIntoTheNextRound` |

**Not yet tested against a live database.** The RLS policies are reasoned about
and reviewed but have not been executed. Before any real users, run the checks
in [LIMITATIONS.md](LIMITATIONS.md#before-real-users) — in particular, sign in as
two anonymous users and confirm that user B genuinely gets zero rows from
`round_secrets` for user A's round.

## Secrets hygiene

- `SUPABASE_SERVICE_ROLE_KEY` appears only in edge function environments and the
  local `.env`. It is not in the app, not in the repo, and not in any client.
- The anon key *is* in the app, on purpose. It is a public identifier.
- `.gitignore` covers `.env`, `Secrets.xcconfig`, `*.p8`, `*.p12`, `*.mobileprovision`,
  `*.pem`, `*.key`, and anything matching `*service_role*`.
- `make secret-scan` looks for credential *shapes* (PEM blocks, real JWTs,
  `sk-ant-…`, `AKIA…`) rather than for the word "secret", which appears
  legitimately throughout this project. A scanner that cries wolf is one people
  learn to ignore.

## Reporting

Security issues: open a private security advisory on the repository rather than
a public issue.
