# Known limitations

Written plainly, because a limitations document that undersells its own gaps is
worse than none.

## It has never been compiled

The single most important caveat. This was built in a Linux container with no
Swift toolchain, no Xcode and no macOS. **No part of the iOS app has been
compiled, linked, run, or seen on a screen.**

What that means for you:

- Expect compiler errors on the first build. Likely candidates: SwiftUI generic
  inference in the more deeply nested view builders, actor-isolation warnings
  around `LocalGameBackend` and `GameSessionCoordinator`, and a
  `@MainActor`/`nonisolated` mismatch or two.
- Expect layout to need adjusting. No screen has been looked at.
- `SWIFT_STRICT_CONCURRENCY` is deliberately set to `minimal`. Swift 6 strict
  concurrency across this codebase is worthwhile work, but it is a refactor, not
  a setting, and doing it blind would have been guessing.

What *was* verified is in the README's
[What is actually verified](../README.md#what-is-actually-verified) table:
grammar-level Swift parsing, real PostgreSQL and PL/pgSQL parsing, `tsc --strict`
on the edge functions, and full reference resolution on the Xcode project.

## Not verified against a live backend

The migrations parse but have not been applied. The RLS policies are reasoned
about but have not been executed. The realtime client implements the Phoenix
protocol from its specification and has never held a socket open.

### Before real users

1. `supabase db reset` locally and confirm the migrations apply in order.
2. Sign in as two anonymous users. As user B, attempt to select user A's
   `round_secrets` row. It must return **zero rows**, not an error.
3. Confirm the host — who is a member of the room — also gets zero rows.
4. Confirm a bucket object is unreadable before its round is dealt.
5. Confirm a signed URL 403s after five minutes.
6. Confirm two concurrent `submit_vote` calls produce one row.
7. Confirm `game_session_private` returns nothing to `authenticated`.
8. Watch a Realtime payload on the wire and confirm no `owner_id` appears during
   a No Context round.

## Product gaps

- **Host migration is not implemented.** If the host leaves mid-game, the room
  has no one who can advance it. Players can still leave. This was scoped out
  deliberately; it is the single biggest reliability gap.
- **No push notifications**, so a backgrounded phone will not be nudged when its
  turn comes.
- **Timers are wall-clock.** A device with a badly wrong clock will disagree
  about deadlines. The server's `phaseDeadline` is authoritative and self-corrects
  on the next snapshot, but the local countdown could look wrong briefly.
- **Sign in with Apple is scaffolded, not built.** Exclusions and history are
  device-local for now, so a reinstall loses them.
- **No iPad layout.** Portrait iPhone only, on purpose.
- **No localisation.** English only, and the sensitive-text matcher is
  English-biased, so the safety pass is weaker in other languages.
- **Sound files are not included.** `SoundService` looks for them and stays
  silent if they are absent, which is a perfectly good state to ship in.
- **The app icon is a placeholder.** `AppIcon.appiconset` has no image in it, so
  archiving for the App Store will fail until one is added.

## Technical debt taken knowingly

- **The game rules exist three times** — Swift, TypeScript, and partly SQL. The
  TypeScript copy is authoritative; the Swift copy drives demo mode and the
  tests. They can drift, and nothing currently detects it. A shared test-vector
  fixture run by both suites would fix this and is the first thing to do if a
  divergence bug ever appears.
- **Every realtime event triggers a full snapshot fetch** rather than applying a
  delta. That is one extra small request per transition, bought deliberately: it
  means one code path produces the state a device renders. Revisit only if it
  shows up in practice.
- **`RoundDealer`'s fairness bound is two, not one.** When the only least-seen
  player is the one who just went, the dealer would rather deal somebody slightly
  over-exposed than put the same person up twice running. A player can therefore
  fall two appearances behind for a round. This is tested and intentional.
- **The candidate scorer is heuristics, not a model.** It does not know what is
  embarrassing and the product does not claim it does. It finds photos with the
  *shape* of a story. `PhotoCandidateScoring` exists so a Core ML model can
  replace it later without touching anything else.
- **Analysis is capped at 900 assets.** Half recent, half sampled across the
  library. A very large library will have photos the app never looks at.

## Things that are true but easy to misread

- The safety filter is **not** a guarantee. It is English-biased, it will miss
  things, and human approval is mandatory precisely because of that.
- `SCSensitivityAnalyzer` returns "unknown" when the user has Sensitive Content
  Warning switched off or the entitlement is not granted. The evaluator treats
  unknown as unknown, never as safe.
- Demo mode makes **no** network calls, and its images are generated gradients,
  never photographs.
