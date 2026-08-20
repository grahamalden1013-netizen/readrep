import SwiftUI
import PhotosUI
import ExplainYourselfKit

/// WE FOUND SOME 💀
///
/// The most important screen in the app after the reveal, and the one that
/// decides whether anybody trusts this thing.
///
/// The framing is deliberate and is the whole product principle: the player is
/// handed a stack and is mostly saying no. They are never asked to go looking
/// for something embarrassing about themselves — that framing makes people pick
/// safe photos, and safe photos make a boring game.
struct ApprovalDeckView: View {
    @EnvironmentObject private var environment: AppEnvironment
    @ObservedObject var approvals: PhotoApprovalService
    @ObservedObject var pipeline: CandidatePipeline

    let intensity: Intensity
    let onDone: ([AssetID]) -> Void

    @State private var image: UIImage?
    @State private var nextImage: UIImage?
    @State private var showingPicker = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var deck: ApprovalDeck { approvals.deck }

    var body: some View {
        EYScreen {
            header

            if let current = deck.current {
                card(for: current)
                    .id(current)
                    .transition(
                        reduceMotion
                            ? .opacity
                            : .asymmetric(
                                insertion: .move(edge: .bottom).combined(with: .opacity),
                                removal: .scale(scale: 0.85).combined(with: .opacity)
                            )
                    )

                controls
            } else if pipeline.isRunning {
                scanning
            } else {
                finished
            }
        }
        .animation(EYMotion.reveal(reduceMotion), value: deck.current)
        .task(id: deck.current) { await loadImages() }
        .onChange(of: pipeline.candidates) { _, candidates in
            approvals.loadDeck(candidates)
        }
        .photosPicker(
            isPresented: $showingPicker,
            selection: .constant([]),
            maxSelectionCount: 30,
            matching: .images
        )
    }

    // MARK: - Pieces

    private var header: some View {
        VStack(alignment: .leading, spacing: EY.Space.hair) {
            Text("WE FOUND SOME 💀")
                .font(EY.Typography.title(32))
                .foregroundStyle(EY.Colour.ink)
            Text("Remove anything you never want appearing in the game.")
                .font(EY.Typography.body)
                .foregroundStyle(EY.Colour.inkSecondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(.isHeader)
    }

    private func card(for asset: AssetID) -> some View {
        ZStack {
            RoundedRectangle(cornerRadius: EY.Radius.photo, style: .continuous)
                .fill(EY.Colour.surface)

            if let image {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
                    .clipShape(RoundedRectangle(cornerRadius: EY.Radius.photo, style: .continuous))
            } else {
                ProgressView().tint(EY.Colour.inkTertiary)
            }
        }
        .frame(maxWidth: .infinity)
        .frame(height: 420)
        .clipped()
        // The image cannot be described, and describing it would defeat the
        // point anyway. VoiceOver gets position in the deck instead, which is
        // the thing a screen reader user actually needs to navigate this.
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Photo \(deck.reviewedCount + 1) of \(deck.totalCount)")
        .accessibilityHint("Choose keep, nope, or never use.")
    }

    private var controls: some View {
        VStack(spacing: EY.Space.snug) {
            HStack(spacing: EY.Space.snug) {
                EYButton(title: "NOPE", kind: .secondary) { decide(.nope) }
                EYButton(title: "KEEP", kind: .primary) { decide(.keep) }
            }

            HStack(spacing: EY.Space.snug) {
                EYButton(title: "NEVER USE", kind: .quiet) { decide(.neverUse) }
                if deck.canUndo {
                    EYButton(title: "UNDO", kind: .quiet) {
                        approvals.undo()
                        HapticsService.shared.play(.voteLock)
                    }
                }
            }

            progress
        }
    }

    private var progress: some View {
        VStack(spacing: EY.Space.hair) {
            HStack {
                Text(deck.progressText)
                    .font(EY.Typography.headline)
                    .foregroundStyle(deck.hasEnough ? EY.Colour.truth : EY.Colour.ink)
                Spacer()
                if pipeline.isRunning {
                    Text("STILL LOOKING…")
                        .font(EY.Typography.caption)
                        .foregroundStyle(EY.Colour.inkTertiary)
                }
            }
            if let hint = deck.hint {
                HStack {
                    Text(hint)
                        .font(EY.Typography.caption)
                        .foregroundStyle(EY.Colour.inkTertiary)
                    Spacer()
                }
            }
        }
        .accessibilityElement(children: .combine)
    }

    private var scanning: some View {
        VStack(spacing: EY.Space.base) {
            Spacer()
            ProgressView(value: pipeline.progress)
                .tint(EY.Colour.ink)
            Text("LOOKING THROUGH WHAT YOU ALLOWED")
                .font(EY.Typography.caption)
                .foregroundStyle(EY.Colour.inkSecondary)
                .tracking(1.2)
            Text("This happens on your phone. Nothing has been sent anywhere.")
                .font(EY.Typography.caption)
                .foregroundStyle(EY.Colour.inkTertiary)
                .multilineTextAlignment(.center)
            Spacer()
        }
    }

    @ViewBuilder
    private var finished: some View {
        Spacer()

        if deck.hasEnough {
            VStack(alignment: .leading, spacing: EY.Space.snug) {
                Text("\(deck.approved.count) APPROVED")
                    .font(EY.Typography.display(48))
                    .foregroundStyle(EY.Colour.ink)
                Text("You won't know which one comes up, or when.")
                    .font(EY.Typography.body)
                    .foregroundStyle(EY.Colour.inkSecondary)
            }
        } else {
            // The WE NEED MORE EVIDENCE state, inline rather than as a dead end.
            VStack(alignment: .leading, spacing: EY.Space.snug) {
                Text("WE NEED MORE EVIDENCE")
                    .font(EY.Typography.title(30))
                    .foregroundStyle(EY.Colour.ink)
                Text("You've got \(deck.approved.count). \(ApprovalDeck.minimum) is enough to play.")
                    .font(EY.Typography.body)
                    .foregroundStyle(EY.Colour.inkSecondary)
            }
        }

        Spacer()

        VStack(spacing: EY.Space.snug) {
            EYButton(
                title: "DONE",
                kind: .primary,
                isEnabled: deck.hasEnough
            ) {
                onDone(deck.approved)
            }
            EYButton(title: "SELECT MORE PHOTOS", kind: .secondary) {
                selectMore()
            }
            if environment.photoLibrary.authorization == .limited {
                EYButton(title: "ALLOW MORE ACCESS", kind: .quiet) {
                    selectMore()
                }
            }
        }
    }

    // MARK: - Actions

    private func decide(_ decision: ApprovalDecision) {
        HapticsService.shared.play(decision == .keep ? .revealHit : .voteLock)
        approvals.decide(decision)
        image = nextImage
        nextImage = nil
    }

    /// Under limited access this reopens the system picker, which is the only
    /// way to widen the selection without sending someone to Settings.
    private func selectMore() {
        environment.presentLimitedPicker()
    }

    private func loadImages() async {
        guard let current = deck.current else { return }
        let size = CGSize(width: 900, height: 1200)
        if image == nil {
            image = await approvals.thumbnail(for: current, size: size)
        }
        if let upcoming = deck.upNext {
            nextImage = await approvals.thumbnail(for: upcoming, size: size)
        }
    }
}
