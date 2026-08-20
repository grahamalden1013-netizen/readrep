# Photo privacy

The product asks people to put their camera roll on a table in front of their
friends. Everything below exists because that only works if the promises are
real and checkable.

## The four gates

A photo's bytes reach a server only after **all four** of these:

1. **iOS authorised it.** Full or limited access. Limited is a first-class way
   to play — if someone picks eleven photos, the game works with eleven photos.
2. **It survived the local safety pass.** See below.
3. **Its owner tapped KEEP.** This is the only gate that matters, and the only
   one a human controls.
4. **A live game needs it.** Uploads happen when a player becomes READY in a
   specific room, not at approval time.

`PhotoApprovalService.uploadApproved` reads `deck.approved` and has no parameter
for *which* photos. A caller cannot ask it to upload something that was not kept.

## What never happens

- The camera roll is never uploaded, in whole or in sample.
- Analysis never happens in the cloud. Vision and
  `SensitiveContentAnalysis` run on the device.
- The library is never scanned in the background.
- Rejected and NEVER USE photos are never uploaded, never remotely thumbnailed,
  never logged, and their analysis is discarded immediately.
- `PHAsset.localIdentifier` never leaves the device. It is a stable handle into
  a private library; what travels is `SHA-256(device-salt | localIdentifier)`,
  where the salt is a random per-install value in the Keychain. Stable enough to
  remember a NEVER USE, useless to anyone else.
- Precise location is never stored, sent, or asked for. The app has no
  `NSLocationWhenInUseUsageDescription` because it has no use for one.

## What leaves the device

A JPEG, at most 1600px on its longest edge, at quality 0.82 — roughly 400 KB
instead of the original's 12 MB, and indistinguishable on a phone held across a
table.

`GameplayImageRenderer` redraws the image into a fresh bitmap (which is what
discards the metadata) and re-encodes it through an **allow-list**:

```swift
let properties: [CFString: Any] = [
    kCGImageDestinationLossyCompressionQuality: quality,
    kCGImagePropertyOrientation: CGImagePropertyOrientation.up.rawValue
]
```

Anything not named there is simply absent from the file — a much stronger
guarantee than trying to enumerate every metadata block worth removing. GPS,
`DateTimeOriginal`, lens model, camera serial number and Apple maker notes are
gone, not blanked. Orientation is baked into the pixels, so there is no tag left
for a viewer to misread.

`GameplayImageRendererTests` asserts this against a fixture that genuinely
carries GPS, a capture date and a serial number — and separately asserts the
fixture carries them, so the stripping test cannot pass vacuously.

## Storage

One private bucket, `gameplay-photos`. No public URLs; there is no
public-URL method on the client at all. Reads go through short-lived signed URLs
(5 minutes).

The read policy is stricter than "members of a room can read its photos", which
would let a curious player list the bucket before the game and see every photo
everyone approved. An object is readable only if:

- it is your own photo, **or**
- you are in the room **and** a round has actually dealt it.

A photo that was uploaded but never came up is unreadable by anyone but its
owner. Removed photos are unreadable by anyone at all.

## Retention

- Rows carry `expires_at` (6 hours by default).
- Bytes are purged when the game finishes, when the owner removes the photo,
  when a player leaves or is kicked, and when a room is abandoned.
- The `cleanup` edge function turns `purged_at` into actually deleted objects.
- Finished rooms keep their recap — text and numbers only, no photographs — for
  seven days so PLAY AGAIN and SHARE RESULTS still work the next morning.

## The safety pass

Before a candidate reaches the approval deck, the app tries to exclude sensitive
content locally. Signals:

| Source | Used for |
|---|---|
| `SCSensitivityAnalyzer` (Apple, on-device) | nudity → hard block |
| `VNRecognizeTextRequest` + keyword/regex matching | credentials, financial, identity documents, medical → hard block |
| `VNDetectBarcodesRequest` | QR and barcodes → deprioritise (they can carry auth links, and a code on a big screen is scannable by everyone in the room) |
| text density + no faces on a screenshot | someone's conversation → deprioritise |

**The filter is not perfect and the product never says it is.** It is
English-biased, it will miss things, and it will occasionally flag a pizza
receipt. Both failure modes are acceptable *because the human still decides*.
What the filter buys is that a person can flick through the deck quickly in
company without their own bank statement appearing on screen.

Recognised text is treated as radioactive: `SensitiveTextMatcher.categories(in:)`
returns a `Set<SensitiveCategory>` and nothing else. There is no signature by
which the text could escape that call site, and it is never stored, hashed,
logged or attached to an event.

### Faces, not people

`VNDetectFaceRectanglesRequest` only. The app detects *that* a face exists — a
rectangle, a count, a size — and is incapable of telling two people apart. No
face landmarks, no faceprints, no clustering, no identification, ever.

## Emergency removal

REMOVE PHOTO is available to the owner at every moment their photo is on screen,
in every phase. One tap. No confirmation dialogue, no "are you sure", no reason
field — somebody reaching for it is already uncomfortable, and a modal demanding
justification is the worst possible response.

What happens: the round retires, the photo clears from every device, its votes
and answers are deleted, its bytes are purged immediately rather than at the next
cleanup pass, and the other players see `Round skipped.` — never who, never why.

It scores nothing and appears in no statistic, so a removal cannot be inferred
from the recap. `photosRemoved` is a count on the whole game and is not
attributed to anyone.

Anyone else can report the photo on screen; one report ends the round and purges
the asset. There is deliberately no free-text reason and no moderation queue: in
a room of friends, the cost of a false positive is one skipped photo and the cost
of a false negative is somebody's evening.

## Analytics

`AnalyticsEvent` is a closed enum. There is no
`track(_ name: String, properties: [String: Any])` anywhere in the app, because
that signature is exactly how photo captions end up in a third-party dashboard.

Every property is an `Int`, a `Bool`, or a `String` drawn from a closed enum's
raw values or a bucket label defined in that one file. Counts derived from the
library are bucketed (`"10-19"`, `"50+"`) because an exact library size is a
fingerprint. `PrivacyTests` asserts that no event emits a string outside the
allowed set.

Never sent: pixels, thumbnails, filenames, local identifiers, recognised text,
captions, coordinates, per-photo timestamps, nicknames, room codes.

## The shareable recap

Text and statistics only. `RecapRenderer` cannot embed a gameplay photo — there
is no code path that takes one.

The photos in a game were approved by their owners for one evening in one room.
A share sheet is a completely different audience, and turning "Jake approved this
for five friends" into "Jake is on someone's story" is exactly the betrayal this
product cannot afford. If photo sharing is ever added it must be per-photo,
opt-in, and asked of the *owner* — not of whoever is holding the phone at the end.

## Optional AI

The app ships with `AI_PROVIDER=none` and is fully playable that way; the
fallback is hand-written lines. It is not marketed as AI-powered.

If a provider is enabled, the `flavour` edge function is given a game mode and a
round number. That is the entire request body — there is nowhere in it to put a
photo, a name or a location. Responses are re-checked against a banned-topic
filter before they can reach a screen, because a system prompt is guidance and a
filter is a control.

AI is never used to identify people, or to infer sexuality, religion, health,
ethnicity, politics or criminality. See `AISafetyPolicy`.
