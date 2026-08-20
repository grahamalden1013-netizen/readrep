import SwiftUI
import Photos
import ExplainYourselfKit

/// The permission ask.
///
/// Written to be true rather than persuasive. It says what the app will do,
/// says what it will not do, and offers NOT NOW as a real option rather than a
/// greyed-out formality — because the fastest way to lose someone's trust with
/// a camera roll is to make the refusal feel like a trick.
struct PhotoPermissionView: View {
    @EnvironmentObject private var environment: AppEnvironment
    let onGranted: () -> Void
    let onSkipped: () -> Void

    @State private var isAsking = false

    var body: some View {
        EYScreen {
            Spacer()

            VStack(alignment: .leading, spacing: EY.Space.snug) {
                Text("FIND GAME-WORTHY PHOTOS")
                    .font(EY.Typography.title(32))
                    .foregroundStyle(EY.Colour.ink)

                Text("Explain Yourself can privately look through the photos you choose to create your game deck.")
                    .font(EY.Typography.body)
                    .foregroundStyle(EY.Colour.inkSecondary)
                    .fixedSize(horizontal: false, vertical: true)

                Text("Nothing is shown to your friends until you approve it.")
                    .font(EY.Typography.body)
                    .foregroundStyle(EY.Colour.ink)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .accessibilityElement(children: .combine)
            .accessibilityAddTraits(.isHeader)

            VStack(alignment: .leading, spacing: EY.Space.tight) {
                promise("Photos are analysed on your phone, not on a server.")
                promise("Only photos you tap KEEP are ever uploaded.")
                promise("Location data is stripped before anything is sent.")
                promise("Game photos are deleted when the game ends.")
            }

            Spacer()

            VStack(spacing: EY.Space.snug) {
                // "Choose photos" first, on purpose. Limited access is a
                // perfectly good way to play this game, and offering it as the
                // primary option is the honest ordering.
                EYButton(title: "CHOOSE PHOTOS", isBusy: isAsking) { ask() }
                EYButton(title: "ALLOW PHOTO ACCESS", kind: .secondary, isBusy: isAsking) { ask() }
                EYButton(title: "NOT NOW", kind: .quiet) { onSkipped() }
            }
        }
        .task { environment.analytics.track(.photoPermissionStarted) }
    }

    private func promise(_ text: String) -> some View {
        HStack(alignment: .top, spacing: EY.Space.tight) {
            Image(systemName: "lock.fill")
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(EY.Colour.inkTertiary)
                .padding(.top, 3)
            Text(text)
                .font(EY.Typography.caption)
                .foregroundStyle(EY.Colour.inkSecondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .accessibilityElement(children: .combine)
    }

    private func ask() {
        isAsking = true
        Task {
            let status = await environment.photoLibrary.requestAccess()
            isAsking = false
            switch status {
            case .authorized, .limited:
                environment.analytics.track(
                    .photoPermissionGranted(scope: environment.photoLibrary.scope)
                )
                onGranted()
            default:
                onSkipped()
            }
        }
    }
}

/// Shown when there is not enough to play with.
struct MoreEvidenceView: View {
    @EnvironmentObject private var environment: AppEnvironment
    let approvedCount: Int
    let onSelectMore: () -> Void
    let onChooseManually: () -> Void
    let onContinue: () -> Void

    var body: some View {
        EYScreen {
            Spacer()

            VStack(alignment: .leading, spacing: EY.Space.snug) {
                Text("WE NEED MORE EVIDENCE")
                    .font(EY.Typography.title(32))
                    .foregroundStyle(EY.Colour.ink)
                Text(message)
                    .font(EY.Typography.body)
                    .foregroundStyle(EY.Colour.inkSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .accessibilityElement(children: .combine)

            Spacer()

            VStack(spacing: EY.Space.snug) {
                EYButton(title: "SELECT MORE PHOTOS", action: onSelectMore)
                if environment.photoLibrary.authorization == .limited {
                    EYButton(title: "ALLOW MORE ACCESS", kind: .secondary, action: onSelectMore)
                }
                EYButton(title: "CHOOSE MANUALLY", kind: .secondary, action: onChooseManually)
                if approvedCount >= ApprovalDeck.minimum {
                    EYButton(title: "PLAY ANYWAY", kind: .quiet, action: onContinue)
                }
            }
        }
    }

    private var message: String {
        switch environment.photoLibrary.authorization {
        case .limited:
            return "We can only see the photos you picked. Add a few more and there's more to work with."
        case .denied, .restricted:
            return "Photo access is off, so there's nothing to find. You can still play — you just won't be the one explaining."
        default:
            return "You've approved \(approvedCount). \(ApprovalDeck.minimum) is enough to play, and 10 makes a better game."
        }
    }
}
