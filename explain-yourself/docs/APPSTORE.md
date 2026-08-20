# App Store preparation

## Done in the repo

- `NSPhotoLibraryUsageDescription` and `NSPhotoLibraryAddUsageDescription`,
  written to describe what actually happens rather than to maximise tap-through.
- No unnecessary permissions requested. There is deliberately no camera,
  location, contacts or microphone usage string, because the game needs none of
  them and asking for one you do not use is a review rejection.
- Launch screen (`UILaunchScreen` with a colour asset).
- Portrait-only, dark mode, iPhone-only (`TARGETED_DEVICE_FAMILY = 1`).
- Separate Debug and Release configurations, with distinct bundle ids
  (`com.explainyourself.app.dev` and `com.explainyourself.app`).
- `ITSAppUsesNonExemptEncryption = false` — the app uses only HTTPS and a
  SHA-256 commitment, both exempt.
- Privacy policy URL placeholder, read from `EY_PRIVACY_POLICY_URL`.

## Still required before submitting

1. **An app icon.** `AppIcon.appiconset` currently has no image, so archiving
   will fail. Needs a 1024×1024 PNG with no alpha.
2. **A real privacy policy** at a real URL. [PRIVACY.md](PRIVACY.md) has the
   substance; it needs to become a hosted page.
3. **The privacy nutrition label** (App Store Connect → App Privacy). Based on
   this implementation:
   - *Photos* — collected, **not** linked to identity, **not** used for
     tracking. Purpose: App Functionality. Note that only user-approved photos
     are uploaded and that they are deleted when the game ends.
   - *User Content* — the written explanations in No Context. Not linked, not
     used for tracking.
   - *Identifiers* — a device-generated id. Not linked to a real identity.
   - *Diagnostics/Usage* — only if analytics is wired to a provider. It is not,
     by default.
   - **No** location, no contacts, no browsing history, no advertising data.
4. **The Sensitive Content Analysis entitlement.** Request at
   [developer.apple.com/contact/request/sensitive-content-analysis](https://developer.apple.com/contact/request/sensitive-content-analysis).
   Until it is granted, remove it from
   `ExplainYourself/Resources/ExplainYourself.entitlements` or signing will fail
   — the app degrades gracefully without it.
5. **Age rating.** Realistically 12+ (infrequent mild mature themes: the game is
   built around embarrassing photos). Be honest here rather than optimistic.
6. **Review notes.** Reviewers will not have five friends. Tell them:
   *"Build and run, tap DEV on the home screen, add demo players, mark them
   ready, then START GAME. Demo mode plays a full game on one device with
   generated placeholder images and makes no network calls."*
   Say plainly that no photo is uploaded without an explicit per-photo tap.
7. **Screenshots** for every required size.
8. **Export compliance** — confirm the `ITSAppUsesNonExemptEncryption = false`
   claim still holds if any crypto is added later.

## Guidelines worth re-reading before submitting

- **5.1.1** (data collection and storage) — the photo permission string and the
  in-app explanation must match what the app does. They do; keep it that way.
- **5.1.2** (data use and sharing) — relevant to the recap. Text-only sharing
  keeps this simple, which is one more reason not to add photo sharing casually.
- **1.2** (user-generated content) — the game shows user photos to other users,
  so the report and remove controls matter. Both exist, are one tap, and are
  reachable at every moment a photo is on screen.
- **4.2** (minimum functionality) — demo mode is what lets a reviewer see the
  whole game without a room full of people.

## Versioning

`MARKETING_VERSION` and `CURRENT_PROJECT_VERSION` live in `Shared.xcconfig`.
Bump the build number for every upload; bump the marketing version for anything
users would notice.
