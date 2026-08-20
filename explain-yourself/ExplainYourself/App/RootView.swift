import SwiftUI
import ExplainYourselfKit

/// The app's one navigation decision, as a state machine rather than a stack.
///
/// A party game's flow is short and mostly linear, and a `NavigationStack` here
/// would mean a back button on screens where going back makes no sense — you
/// cannot un-join a game mid-round. So: an explicit route, and every transition
/// is a deliberate assignment.
struct RootView: View {
    @EnvironmentObject private var environment: AppEnvironment
    @StateObject private var router = RootRouter.shared

    @State private var route: Route = .launching
    @State private var coordinator: GameSessionCoordinator?
    @State private var room: GameRoom?

    enum Route: Equatable {
        case launching
        case onboarding
        case nickname
        case home
        case create
        case join
        case lobby
        case photoPermission
        case approving
        case notEnoughEvidence
        case playing
    }

    var body: some View {
        Group {
            switch route {
            case .launching:
                Color.clear.onAppear(perform: decideStart)

            case .onboarding:
                OnboardingView { advanceFromOnboarding() }

            case .nickname:
                NicknameView { route = .home }

            case .home:
                HomeView(
                    onCreate: { route = .create },
                    onJoin: { route = .join }
                )

            case .create:
                CreateGameView(
                    onCreated: { enterLobby($0) },
                    onCancel: { route = .home }
                )

            case .join:
                JoinGameView(
                    onJoined: { enterLobby($0) },
                    onCancel: { route = .home }
                )

            case .lobby:
                if let coordinator {
                    LobbyView(
                        coordinator: coordinator,
                        onPrepared: { beginPhotoFlow() },
                        onLeave: { returnHome() }
                    )
                    .onChange(of: coordinator.phase) { _, phase in
                        if phase.isInRound || phase == .gameComplete { route = .playing }
                    }
                }

            case .photoPermission:
                PhotoPermissionView(
                    onGranted: { startScanning() },
                    onSkipped: { markReadyWithoutPhotos() }
                )

            case .approving:
                ApprovalDeckView(
                    approvals: environment.approvals,
                    pipeline: environment.pipeline,
                    intensity: room?.settings.intensity ?? .dangerous,
                    onDone: { approved in finishApproving(approved) }
                )

            case .notEnoughEvidence:
                MoreEvidenceView(
                    approvedCount: environment.approvals.approvedCount,
                    onSelectMore: { environment.presentLimitedPicker() },
                    onChooseManually: { route = .approving },
                    onContinue: { finishApproving(environment.approvals.deck.approved) }
                )

            case .playing:
                if let coordinator, let room {
                    GameView(
                        coordinator: coordinator,
                        makeLoader: environment.makeImageLoader(room: room.id),
                        onExit: { returnHome() }
                    )
                }
            }
        }
        .animation(.easeInOut(duration: 0.2), value: route)
        .onReceive(router.$pendingJoinCode.compactMap { $0 }) { _ in
            if route == .home { route = .join }
        }
    }

    // MARK: - Flow

    private func decideStart() {
        if !environment.identity.hasCompletedOnboarding {
            route = .onboarding
        } else if !environment.identity.isReadyToPlay {
            route = .nickname
        } else {
            route = .home
        }
    }

    private func advanceFromOnboarding() {
        route = environment.identity.isReadyToPlay ? .home : .nickname
    }

    private func enterLobby(_ room: GameRoom) {
        self.room = room
        let coordinator = environment.makeCoordinator()
        coordinator.start(room: room)
        self.coordinator = coordinator
        route = .lobby
    }

    /// PREPARE MY PHOTOS. Asks for permission only if we do not already have it.
    private func beginPhotoFlow() {
        guard let room else { return }
        Task {
            try? await environment.backend.setStatus(
                .selectingPhotos,
                approvedCount: environment.approvals.approvedCount,
                room: room.id,
                player: environment.identity.ensurePlayerID()
            )
        }
        route = environment.photoLibrary.canRead ? .approving : .photoPermission
        if environment.photoLibrary.canRead { startScanning() }
    }

    private func startScanning() {
        environment.pipeline.run(intensity: room?.settings.intensity ?? .dangerous)
        route = .approving
    }

    /// Playing without contributing photos is a real option, not a failure.
    /// Somebody who declines still gets to vote, guess and accuse — they just
    /// never end up on the wrong end of a reveal.
    private func markReadyWithoutPhotos() {
        guard let room else { route = .home; return }
        Task {
            try? await environment.backend.setStatus(
                .ready, approvedCount: 0, room: room.id,
                player: environment.identity.ensurePlayerID()
            )
        }
        route = .lobby
    }

    private func finishApproving(_ approved: [AssetID]) {
        guard let room else { return }
        guard environment.approvals.hasEnoughEvidence else {
            route = .notEnoughEvidence
            return
        }

        route = .lobby
        Task {
            let me = environment.identity.ensurePlayerID()
            // Uploaded only now, and only the photos that were kept.
            await environment.approvals.uploadApproved(room: room.id, player: me)
            try? await environment.backend.setStatus(
                .ready,
                approvedCount: environment.approvals.approvedCount,
                room: room.id,
                player: me
            )
            environment.analytics.track(
                .playerReady(approvedCount: environment.approvals.approvedCount)
            )
        }
    }

    private func returnHome() {
        coordinator?.stop()
        coordinator = nil
        room = nil
        environment.pipeline.cancel()
        route = .home
    }
}
