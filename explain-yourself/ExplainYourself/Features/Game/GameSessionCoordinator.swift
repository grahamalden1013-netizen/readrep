import SwiftUI
import Combine
import ExplainYourselfKit

/// The one object the game screens bind to.
///
/// It holds a `GameSessionView` — already redacted for this device — and turns
/// taps into intents. It contains no rules: it cannot decide that a vote is
/// valid, that a round is over, or whose photo comes next. It asks, and it
/// renders the answer.
///
/// The two things it *does* own are the things that genuinely belong on a
/// device: the reconnection loop, and firing the local cues (haptics, sound)
/// that make a phase change feel like a moment rather than a screen swap.
@MainActor
final class GameSessionCoordinator: ObservableObject {
    @Published private(set) var view: GameSessionView?
    @Published private(set) var room: GameRoom?
    @Published private(set) var connection: ConnectionState = .connecting
    @Published private(set) var banner: BannerMessage?
    @Published var pendingAnswer: String = ""
    @Published private(set) var isSubmitting = false

    enum ConnectionState: Equatable {
        case connecting
        case live
        /// Showing the last good state while the socket comes back.
        case reconnecting(since: Date)
        case failed(String)
    }

    struct BannerMessage: Identifiable, Equatable {
        let id = UUID()
        let text: String
        var isWarning = false
    }

    private let backend: GameBackend
    private let identity: PlayerIdentity
    private let analytics: AnalyticsService
    private let approvals: PhotoApprovalService?

    private var observation: Task<Void, Never>?
    private var deadlineTimer: Task<Void, Never>?
    private var lastRevision = -1
    private var lastPhase: GamePhase?
    private var lastRoundID: RoundID?
    private var disconnectedAt: Date?

    init(
        backend: GameBackend,
        identity: PlayerIdentity,
        approvals: PhotoApprovalService? = nil,
        analytics: AnalyticsService = NoopAnalyticsService()
    ) {
        self.backend = backend
        self.identity = identity
        self.approvals = approvals
        self.analytics = analytics
    }

    deinit {
        observation?.cancel()
        deadlineTimer?.cancel()
    }

    var me: PlayerID { identity.id }
    var isHost: Bool { view?.isHost ?? false }
    var phase: GamePhase { view?.phase ?? .waiting }
    var round: RoundView? { view?.round }
    var isMyPhoto: Bool { round?.isYours ?? false }

    // MARK: - Lifecycle

    func start(room: GameRoom) {
        self.room = room
        observation?.cancel()
        connection = .connecting

        observation = Task { [weak self] in
            guard let self else { return }
            while !Task.isCancelled {
                do {
                    let stream = self.backend.observe(room: room.id, player: self.identity.id)
                    for try await snapshot in stream {
                        if Task.isCancelled { return }
                        self.receive(snapshot)
                    }
                    // The stream ended cleanly. If the game is not over, that
                    // is a dropped connection rather than a finished one.
                    if self.view?.phase != .gameComplete {
                        self.enterReconnecting()
                    } else {
                        return
                    }
                } catch {
                    self.enterReconnecting()
                }

                guard !Task.isCancelled else { return }
                try? await Task.sleep(for: .seconds(2))
            }
        }
    }

    func stop() {
        observation?.cancel(); observation = nil
        deadlineTimer?.cancel(); deadlineTimer = nil
    }

    private func receive(_ snapshot: GameSnapshot) {
        room = snapshot.room

        guard let incoming = snapshot.view else { return }

        // Out-of-order delivery is normal on a phone. Anything not strictly
        // newer than what we already have is dropped, which is why a late
        // packet can never rewind a reveal that already landed.
        guard incoming.revision > lastRevision else { return }
        lastRevision = incoming.revision

        if let since = disconnectedAt {
            analytics.track(.reconnected(afterSeconds: Int(Date().timeIntervalSince(since))))
            disconnectedAt = nil
        }
        connection = .live

        let previousPhase = lastPhase
        let previousRound = lastRoundID
        view = incoming
        lastPhase = incoming.phase
        lastRoundID = incoming.round?.id

        reactToPhaseChange(from: previousPhase, to: incoming.phase, previousRound: previousRound)
        armDeadline(incoming.phaseDeadline)
    }

    private func enterReconnecting() {
        guard connection == .live || connection == .connecting else { return }
        disconnectedAt = disconnectedAt ?? Date()
        connection = .reconnecting(since: disconnectedAt ?? Date())
    }

    /// Fires the local cues. Deliberately driven off the phase *change* rather
    /// than the render, so a re-layout does not buzz the phone again.
    private func reactToPhaseChange(
        from previous: GamePhase?,
        to current: GamePhase,
        previousRound: RoundID?
    ) {
        guard previous != current || previousRound != view?.round?.id else { return }

        let cue: GameCue?
        switch current {
        case .roundIntro:        cue = .countdownTick
        case .photoReveal:       cue = .revealHit
        case .ownerReveal:       cue = .nameDrop
        case .secretInstruction: cue = isMyPhoto ? .secretCard : nil
        case .voting:            cue = nil
        case .resultReveal:      cue = .resultSting
        case .gameComplete:      cue = .gameOver
        default:                 cue = nil
        }

        if let cue {
            HapticsService.shared.play(cue)
            SoundService.shared.play(cue)
        }
        // Warm the generator for the beat that is coming next, so the drop
        // lands on time rather than a frame late.
        if current == .photoReveal { HapticsService.shared.prepare(.nameDrop) }

        if current == .roundIntro, let round = view?.round {
            analytics.track(.roundStarted(index: round.index, mode: round.mode))
        }
        if previousRound != nil, view?.round?.id != previousRound,
           let retired = view?.round?.status, retired == .removedByOwner {
            // Never says whose, never says why.
            banner = BannerMessage(text: "Round skipped.")
        }
    }

    /// Every device watches its own clock, and whichever one notices first
    /// tells the server. The server ignores it unless the deadline really has
    /// passed, so this is safe to do from six phones at once.
    private func armDeadline(_ deadline: Date?) {
        deadlineTimer?.cancel()
        guard let deadline else { return }

        deadlineTimer = Task { [weak self] in
            let wait = max(0, deadline.timeIntervalSinceNow)
            try? await Task.sleep(for: .seconds(wait + 0.15))
            guard let self, !Task.isCancelled else { return }
            await self.nudgeDeadline()
        }
    }

    private func nudgeDeadline() async {
        guard let room, view?.phase.isInRound == true else { return }
        if let supabase = backend as? SupabaseGameBackend {
            try? await supabase.reportDeadlineElapsed(room: room.id)
        } else {
            // Demo mode: advance locally.
            try? await backend.advance(room: room.id, actor: room.hostID)
        }
    }

    // MARK: - Intents

    func vote(_ choice: VoteChoice) async {
        guard let room, let round = view?.round, !isSubmitting else { return }
        isSubmitting = true
        defer { isSubmitting = false }

        HapticsService.shared.play(.voteLock)
        SoundService.shared.play(.voteLock)
        analytics.track(.voteSubmitted(mode: round.mode))

        await perform {
            try await backend.submitVote(choice, round: round.id, room: room.id, player: me)
        }
    }

    func submitAnswer() async {
        guard let room, let round = view?.round, !isSubmitting else { return }
        let text = PlayerAnswer.sanitize(pendingAnswer)
        guard !text.isEmpty else { return }

        isSubmitting = true
        defer { isSubmitting = false }
        analytics.track(.answerSubmitted)

        await perform {
            try await backend.submitAnswer(text, round: round.id, room: room.id, player: me)
        }
        pendingAnswer = ""
    }

    func hostAdvance() async {
        guard let room, isHost else { return }
        await perform { try await backend.advance(room: room.id, actor: me) }
    }

    func hostSkip() async {
        guard let room, isHost else { return }
        analytics.track(.roundSkipped)
        await perform { try await backend.skipRound(room: room.id, actor: me) }
    }

    func hostEnd() async {
        guard let room, isHost else { return }
        await perform { try await backend.endGame(room: room.id, actor: me) }
    }

    /// REMOVE PHOTO.
    ///
    /// Available to the owner at every moment their photo is on screen. No
    /// confirmation dialogue, no "are you sure", no reason field: somebody
    /// reaching for this is already uncomfortable, and making them justify it
    /// to a modal is the worst possible response.
    func removeMyPhoto() async {
        guard let room, let round = view?.round, round.isYours else { return }
        analytics.track(.photoRemoved)
        HapticsService.shared.play(.roundRemoved)

        await perform {
            try await backend.removePhoto(round: round.id, room: room.id, actor: me)
            approvals?.forget(remoteAsset: round.assetID)
        }
    }

    /// Anyone can flag the photo currently on screen. One report ends the round.
    func reportCurrentPhoto() async {
        guard let room, let round = view?.round else { return }
        await perform {
            try await backend.reportPhoto(round: round.id, room: room.id, actor: me)
        }
        banner = BannerMessage(text: "Round skipped.")
    }

    func leave() async {
        guard let room else { return }
        stop()
        try? await backend.leaveRoom(room.id, player: me)
    }

    private func perform(_ work: () async throws -> Void) async {
        do {
            try await work()
        } catch let error as GameBackendError {
            banner = BannerMessage(text: error.message, isWarning: true)
            analytics.track(.errorShown(code: error.title))
        } catch {
            banner = BannerMessage(text: "Try that again in a second.", isWarning: true)
        }
    }

    func dismissBanner() { banner = nil }

    // MARK: - Derived copy

    var ownerName: String {
        guard let view, let owner = view.round?.ownerID else { return "SOMEONE" }
        return view.nickname(owner).uppercased()
    }

    var waitingCopy: String? {
        guard let view else { return nil }
        let pending = view.phase == .answering ? view.pendingAnswerers : view.pendingVoters
        guard !pending.isEmpty else { return nil }
        if pending.count == 1 { return "WAITING ON \(pending[0].nickname.uppercased())" }
        return "WAITING ON \(pending.count)"
    }

    /// Computed on device from the rounds the server already published, so
    /// every screen in the room shows the same six lines without anyone having
    /// to trust six separate deliveries to agree.
    var results: GameResults? { view?.results }
}
