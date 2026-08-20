# Roadmap

Ordered by what most increases the number of people who say "again".

## 1. Host migration

The biggest reliability gap. Today, if the host's phone dies mid-game the room
has nobody who can advance it. The fix is small — promote the longest-connected
player when the host is absent for ~20 seconds, in the `session` function, and
tell the room — and it prevents the single worst failure a party game can have:
ending because of a phone rather than because everyone stopped laughing.

## 2. Play Again that actually keeps the room together

PLAY AGAIN currently returns to the home screen. It should keep the same room,
the same players and the same approved decks, and start a fresh session in one
tap — with an offer to switch modes, since a group that just finished Truth or
Cap is in exactly the right mood to try No Context.

Play-again rate is the number-one metric for this product, and this is the
cheapest thing that moves it.

## 3. Better candidate ranking

The heuristics are decent and honest about being heuristics. The two upgrades
with the best ratio of effort to payoff:

- **Learn from KEEP and NOPE.** The approval deck is a labelled dataset that
  the person generates for free. Adjusting weights per-user, on-device, would
  make the second game noticeably better than the first.
- **A small Core ML model** for "does this photo have a story in it". Slot it in
  behind `PhotoCandidateScoring`; nothing else changes.

Neither requires sending a photo anywhere, which is what makes them worth doing.

---

## Later

- **Sign in with Apple**, so exclusions, history and preferences survive a
  reinstall. Scaffolded already; links to the existing anonymous uid.
- **Push notifications** for "it's your turn" when a phone is backgrounded.
- **Party packs** — the plausible first paid feature. Themed prompts and
  round types, bought once. Explicitly not: ads, coins, loot boxes, fake
  scarcity, or a subscription.
- **A shared test-vector fixture** run by both the Swift and TypeScript suites,
  so the two copies of the rules cannot drift silently.
- **Localisation**, which also means a better sensitive-text matcher for
  non-English text — currently the weakest part of the safety pass.
- **Spectator mode** for the person whose phone is plugged into the TV.
- **Swift 6 strict concurrency**, as a deliberate refactor rather than a flag.

## Deliberately not on the roadmap

A feed, followers, public profiles, DMs, stranger matchmaking, streaks, XP,
levels, daily missions, a battle pass, location features, facial recognition, an
AI chatbot, or automatic public posting.

Every one of them would make the app worse at the only thing it is for: six
people in a room, one photo, and somebody who has some explaining to do.
