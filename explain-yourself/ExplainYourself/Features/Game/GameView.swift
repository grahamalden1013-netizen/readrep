import SwiftUI
import ExplainYourselfKit

/// The game, routed entirely off `phase`.
///
/// One switch, thirteen cases, and no boolean state of its own. That is the
/// payoff of the state machine: every device in the room renders a pure
/// function of the same authoritative value, so two phones cannot disagree
/// about what is happening.
struct GameView: View {
    @ObservedObject var coordinator: GameSessionCoordinator
    @StateObject private var loader: GameImageLoader
    let onExit: () -> Void

    @State private var showingHostMenu = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    init(
        coordinator: GameSessionCoordinator,
        loader: GameImageLoader,
        onExit: @escaping () -> Void
    ) {
        self.coordinator = coordinator
        self._loader = StateObject(wrappedValue: loader)
        self.onExit = onExit
    }

    var body: some View {
        ZStack {
            EY.Colour.background.ignoresSafeArea()
            content
            overlays
        }
        .animation(EYMotion.reveal(reduceMotion), value: coordinator.phase)
        .preferredColorScheme(.dark)
        .statusBarHidden()
    }

    @ViewBuilder
    private var content: some View {
        switch coordinator.phase {
        case .waiting, .preparingPhotos, .ready:
            ProgressView().tint(EY.Colour.inkSecondary)

        case .roundIntro:
            EYCountdownView(
                deadline: coordinator.view?.phaseDeadline ?? Date().addingTimeInterval(3),
                taunt: FlavourLines.standard.introTaunts.randomElement()
                    ?? "SOMEONE HERE HAS SOME EXPLAINING TO DO."
            )

        case .photoReveal:
            photoOnly

        case .ownerReveal:
            OwnerRevealView(
                name: coordinator.ownerName,
                isYou: coordinator.isMyPhoto,
                stage: photoOnly
            )

        case .secretInstruction:
            SecretInstructionView(
                instruction: coordinator.round?.yourSecretInstruction,
                stage: photoOnly
            )

        case .explanationTimer:
            ExplanationView(coordinator: coordinator, stage: photoOnly)

        case .answering:
            AnsweringView(coordinator: coordinator, stage: photoOnly)

        case .voting:
            VotingView(coordinator: coordinator, stage: photoOnly)

        case .resultReveal, .roundComplete:
            ResultRevealView(coordinator: coordinator, stage: photoOnly)

        case .gameComplete:
            GameCompleteView(coordinator: coordinator, onExit: onExit)
        }
    }

    private var photoOnly: some View {
        Group {
            if let round = coordinator.round {
                PhotoStage(
                    asset: round.assetID,
                    loader: loader,
                    isYours: round.isYours,
                    onRemove: round.isYours ? { Task { await removePhoto(round.assetID) } } : nil,
                    onReport: round.isYours ? nil : { Task { await coordinator.reportCurrentPhoto() } },
                    onUnavailable: { Task { await coordinator.hostAdvance() } }
                )
            } else {
                Color.clear
            }
        }
    }

    private func removePhoto(_ asset: AssetID) async {
        loader.forget(asset)
        await coordinator.removeMyPhoto()
    }

    @ViewBuilder
    private var overlays: some View {
        VStack {
            HStack(alignment: .top) {
                if coordinator.phase.isInRound, let view = coordinator.view {
                    EYTag(text: "ROUND \(view.roundNumber)/\(view.totalRounds)")
                }
                Spacer()
                connectionChip
            }
            .padding(EY.Space.base)
            .padding(.top, EY.Space.tight)

            Spacer()

            if let banner = coordinator.banner {
                BannerView(message: banner) { coordinator.dismissBanner() }
                    .padding(.bottom, EY.Space.base)
            }

            if coordinator.isHost, coordinator.phase.isInRound {
                hostBar
            }
        }
        .allowsHitTesting(true)
    }

    @ViewBuilder
    private var connectionChip: some View {
        switch coordinator.connection {
        case .live:
            EmptyView()
        case .connecting:
            EYTag(text: "CONNECTING", glyph: "wifi")
        case .reconnecting:
            // Deliberately not a full-screen takeover. The room is mid-round;
            // covering the photo with a spinner is worse than a quiet chip
            // while the socket comes back on its own.
            EYTag(text: "RECONNECTING", glyph: "wifi.exclamationmark", tint: EY.Colour.cap)
        case .failed(let reason):
            EYTag(text: reason.uppercased(), glyph: "exclamationmark.triangle.fill", tint: EY.Colour.accusation)
        }
    }

    /// The host's controls. Note what is missing: there is no way to see a
    /// secret instruction, because the server never sends the host one.
    private var hostBar: some View {
        HStack(spacing: EY.Space.snug) {
            Button {
                showingHostMenu = true
            } label: {
                Image(systemName: "ellipsis")
                    .font(.system(size: 17, weight: .bold))
                    .foregroundStyle(EY.Colour.ink)
                    .frame(width: EY.Touch.comfortable, height: EY.Touch.comfortable)
                    .background(.ultraThinMaterial, in: Circle())
            }
            .accessibilityLabel("Host controls")

            if canAdvance {
                EYButton(title: "NEXT", kind: .primary) {
                    Task { await coordinator.hostAdvance() }
                }
            }
        }
        .padding(EY.Space.base)
        .confirmationDialog("Host controls", isPresented: $showingHostMenu, titleVisibility: .visible) {
            Button("Skip this round") { Task { await coordinator.hostSkip() } }
            Button("End game", role: .destructive) { Task { await coordinator.hostEnd() } }
            Button("Cancel", role: .cancel) {}
        }
    }

    /// The host only gets NEXT where the game is waiting on a human. Everywhere
    /// else the phase has its own clock, and a host button would just be a way
    /// to cut somebody off mid-sentence.
    private var canAdvance: Bool {
        coordinator.phase == .resultReveal
            || coordinator.phase == .roundComplete
            || coordinator.phase == .explanationTimer
    }
}

private struct BannerView: View {
    let message: GameSessionCoordinator.BannerMessage
    let onDismiss: () -> Void

    var body: some View {
        Text(message.text)
            .font(EY.Typography.headline)
            .foregroundStyle(message.isWarning ? EY.Colour.background : EY.Colour.ink)
            .padding(.horizontal, EY.Space.loose)
            .padding(.vertical, EY.Space.snug)
            .background(
                message.isWarning ? EY.Colour.cap : EY.Colour.surfaceRaised,
                in: Capsule()
            )
            .onTapGesture(perform: onDismiss)
            .task {
                try? await Task.sleep(for: .seconds(3))
                onDismiss()
            }
            .accessibilityAddTraits(.isStaticText)
    }
}
