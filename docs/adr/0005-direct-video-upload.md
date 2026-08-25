# 0005 — Direct-to-provider video upload and playback

**Status:** Accepted · interface only, no implementation

## Context

A full game is several gigabytes. The blueprint is specific: the application
must never proxy the file through a web request, uploads must be resumable, and
no public storage URL may exist.

## Decision

The boundary lives in `services/video` and is interface-only in Phase 0. Two
rules the Phase 1 implementation may not break:

1. **The application never handles the bytes.** The browser receives a
   short-lived, single-use `DirectUploadTicket` scoped to one game and uploads
   directly to the provider.
2. **A raw provider URL never reaches a client, and is never stored.**
   `VideoAsset` holds opaque provider identifiers only. Playback is a
   `PlaybackGrant` issued per request after the DAL has authorized the caller,
   and it expires (`PLAYBACK_TTL_SECONDS`, currently 300).

Webhooks are verified before they are parsed, and every event carries an
`idempotencyKey` that feeds the processing run's dedupe log — providers deliver
at least once, and a re-delivered `asset.ready` must not advance a run twice.

The Phase 0 provider is `notConfiguredVideoProvider`. Every method throws. It
does not return a placeholder ticket or a fake playback token, because an
interface that appears to play film it does not have is the fake success state
the blueprint prohibits.

## Alternatives considered

**Mux, named now.** Mux is the blueprint's suggestion and the likely choice. It
is not named in code: the interface is what ReadRep owns, and a provider swap
should be an adapter change.

**Self-hosted storage plus ffmpeg.** Cheaper per gigabyte, and it makes ReadRep
responsible for transcoding, delivery, and a signed-URL scheme for video of
minors. Not a pilot-stage problem to take on.

**Proxying uploads through the web tier.** Simplest to write, and it puts
multi-gigabyte transfers through a serverless function with a request timeout.

## Consequences

- Phase 0 has no film. The interface renders an honest "authorized clip
  required" panel showing the timestamps a moment is built from.
- Phase 1 needs real credentials (`docs/REQUIRED_CREDENTIALS.md`) and must ship
  webhook signature tests and replay-rejection tests before it is trusted.

## What would make this wrong

If the pilot's footage arrives as files on a coach's laptop rather than through
a browser, the upload half changes shape; the playback rules do not.
