import Foundation
import ExplainYourselfKit

/// A complete game, on one device, with nobody else in the room.
///
/// This exists because the alternative is untestable. Verifying a six-player
/// party game otherwise means six phones, six people and several hundred real
/// photographs in the same room, which is not a thing anyone can do while
/// fixing a layout bug.
///
/// It is a real conformance to `GameBackend`, driven by the same
/// `GameStateMachine` the server runs, so the UI cannot tell the difference —
/// which is the point. Demo data is clearly marked, uses generated placeholder
/// images rather than anybody's photographs, and never touches the network.
actor LocalGameBackend: GameBackend, GameAssetUploading {
    private var room: GameRoom
    private var state: GameSessionState
    private var machine: GameStateMachine
    private var pools: [AssetPool] = []
    private var localImages: [AssetID: Data] = [:]
    private var continuations: [UUID: AsyncThrowingStream<GameSnapshot, Error>.Continuation] = [:]

    /// Development overrides. Each one exists because a specific thing is hard
    /// to reach on demand with real people.
    struct Overrides: Sendable {
        var forcedInstruction: SecretInstruction?
        var autoVote = true
        var autoVoteDelay: TimeInterval = 1.2
        var simulateDisconnect: PlayerID?
    }

    private var overrides = Overrides()

    init(host: PlayerIdentity, settings: GameSettings = .default, seed: UInt64 = 0xEEEE) {
        let hostPlayer = Player(id: host.id, nickname: host.nickname, isHost: true, status: .joined)
        self.room = GameRoom(
            id: RoomID("demo-room"),
            code: RoomCode("4821")!,
            hostID: host.id,
            settings: settings,
            players: [hostPlayer]
        )
        self.state = GameSessionState(roomID: RoomID("demo-room"), settings: settings)
        self.machine = GameStateMachine(dealer: RoundDealer(seed: seed))
    }

    func setOverrides(_ overrides: Overrides) { self.overrides = overrides }

    // MARK: - Fake company

    /// The QA cast from the brief. Every one of them gets a deck of clearly
    /// synthetic images so nothing in demo mode can ever be a real photograph.
    func addDemoPlayers(_ names: [String] = ["Sam", "Alex", "Ryan", "Maya", "Emma"], photosEach: Int = 12) {
        for name in names {
            let id = PlayerID("demo-\(name.lowercased())")
            guard !room.players.contains(where: { $0.id == id }) else { continue }
            room.players.append(
                Player(id: id, nickname: name, status: .ready, approvedAssetCount: photosEach)
            )
            pools.append(AssetPool(
                ownerID: id,
                assetIDs: (0..<photosEach).map { AssetID("demo-\(name.lowercased())-\($0)") }
            ))
        }
        publish()
    }

    func markEveryoneReady() {
        for index in room.players.indices {
            room.players[index].status = .ready
        }
        publish()
    }

    // MARK: - GameBackend

    func createRoom(host: PlayerIdentity, settings: GameSettings) async throws -> GameRoom {
        room.settings = settings
        state.settings = settings
        publish()
        return room
    }

    func joinRoom(code: RoomCode, player: PlayerIdentity) async throws -> GameRoom {
        guard !room.isFull else { throw GameBackendError.roomFull }
        if !room.players.contains(where: { $0.id == player.id }) {
            room.players.append(Player(id: player.id, nickname: player.nickname))
        }
        publish()
        return room
    }

    func leaveRoom(_ room: RoomID, player: PlayerID) async throws {
        self.room.players.removeAll { $0.id == player }
        publish()
    }

    func kickPlayer(_ target: PlayerID, from room: RoomID, actor: PlayerID) async throws {
        guard self.room.isHost(actor) else { throw GameBackendError.notAuthorised }
        self.room.players.removeAll { $0.id == target }
        publish()
    }

    func updateSettings(_ settings: GameSettings, room: RoomID, actor: PlayerID) async throws -> GameRoom {
        guard self.room.isHost(actor) else { throw GameBackendError.notAuthorised }
        self.room.settings = settings
        state.settings = settings
        publish()
        return self.room
    }

    func setStatus(_ status: PlayerStatus, approvedCount: Int, room: RoomID, player: PlayerID) async throws {
        guard let index = self.room.players.firstIndex(where: { $0.id == player }) else { return }
        self.room.players[index].status = status
        self.room.players[index].approvedAssetCount = approvedCount
        publish()
    }

    func fetchRoom(_ room: RoomID) async throws -> GameRoom { self.room }

    func startGame(room: RoomID, actor: PlayerID) async throws -> GameSessionState {
        try apply(.hostStartedGame(actor: actor))
        scheduleAutoPlay()
        return state
    }

    func submitVote(_ choice: VoteChoice, round: RoundID, room: RoomID, player: PlayerID) async throws {
        try apply(.voteCast(Vote(roundID: round, voterID: player, choice: choice)))
        scheduleAutoPlay()
    }

    func submitAnswer(_ text: String, round: RoundID, room: RoomID, player: PlayerID) async throws {
        try apply(.answerSubmitted(PlayerAnswer(roundID: round, authorID: player, text: text)))
        scheduleAutoPlay()
    }

    func advance(room: RoomID, actor: PlayerID) async throws {
        try apply(.hostAdvanced(actor: actor))
        scheduleAutoPlay()
    }

    func skipRound(room: RoomID, actor: PlayerID) async throws {
        try apply(.hostSkippedRound(actor: actor))
        scheduleAutoPlay()
    }

    func removePhoto(round: RoundID, room: RoomID, actor: PlayerID) async throws {
        try apply(.ownerRemovedPhoto(roundID: round, actor: actor))
        scheduleAutoPlay()
    }

    func reportPhoto(round: RoundID, room: RoomID, actor: PlayerID) async throws {
        try apply(.hostSkippedRound(actor: self.room.hostID))
    }

    func endGame(room: RoomID, actor: PlayerID) async throws {
        try apply(.hostEndedGame(actor: actor))
    }

    func snapshot(room: RoomID, player: PlayerID) async throws -> GameSnapshot {
        GameSnapshot(room: self.room, session: state, view: view(for: player))
    }

    nonisolated func observe(room: RoomID, player: PlayerID) -> AsyncThrowingStream<GameSnapshot, Error> {
        AsyncThrowingStream { continuation in
            let id = UUID()
            Task {
                await self.register(id: id, continuation: continuation, player: player)
            }
            continuation.onTermination = { _ in
                Task { await self.unregister(id: id) }
            }
        }
    }

    // MARK: - Assets

    func upload(_ payload: GameplayImagePayload, room: RoomID, player: PlayerID) async throws -> AssetID {
        let id = AssetID("local-\(UUID().uuidString.prefix(8))")
        localImages[id] = payload.jpegData
        if let index = pools.firstIndex(where: { $0.ownerID == player }) {
            pools[index] = AssetPool(
                ownerID: player, assetIDs: pools[index].assetIDs + [id]
            )
        } else {
            pools.append(AssetPool(ownerID: player, assetIDs: [id]))
        }
        return id
    }

    /// Demo mode has no server, so there is nothing to sign. Real photos the
    /// player approved are served from memory; demo players' photos are drawn.
    func signedURL(for asset: AssetID, room: RoomID, player: PlayerID) async throws -> URL {
        throw GameBackendError.assetUnavailable
    }

    func imageData(for asset: AssetID) -> Data? { localImages[asset] }

    func purge(asset: AssetID, room: RoomID, player: PlayerID) async throws {
        localImages.removeValue(forKey: asset)
        pools = pools.map {
            AssetPool(ownerID: $0.ownerID, assetIDs: $0.assetIDs.filter { $0 != asset })
        }
    }

    // MARK: - Simulation

    func simulateDisconnect(_ player: PlayerID) {
        guard let index = room.players.firstIndex(where: { $0.id == player }) else { return }
        room.players[index].status = .disconnected
        try? apply(.playersChanged(room.players))
        publish()
    }

    func simulateReconnect(_ player: PlayerID) {
        guard let index = room.players.firstIndex(where: { $0.id == player }) else { return }
        room.players[index].status = .ready
        try? apply(.playersChanged(room.players))
        publish()
    }

    /// The fake players vote so a solo developer can see a result screen.
    private func scheduleAutoPlay() {
        guard overrides.autoVote, state.phase == .voting || state.phase == .answering else { return }
        let delay = overrides.autoVoteDelay

        Task { [weak self] in
            try? await Task.sleep(for: .seconds(delay))
            await self?.playFakes()
        }
    }

    private func playFakes() {
        guard let round = state.currentRound else { return }
        let humans = room.players.filter { !$0.id.raw.hasPrefix("demo-") }.map(\.id)

        for voter in round.eligibleVoters(in: room.players) where !humans.contains(voter) {
            if state.phase == .answering {
                try? apply(.answerSubmitted(PlayerAnswer(
                    roundID: round.id, authorID: voter,
                    text: LocalGameBackend.fakeAnswers.randomElement() ?? "no idea"
                )))
            } else if state.phase == .voting {
                let options = VoteChoice.options(
                    for: round.mode,
                    players: room.players.filter { $0.id != round.ownerID },
                    answers: round.answers
                )
                guard let choice = options.randomElement() else { continue }
                try? apply(.voteCast(Vote(roundID: round.id, voterID: voter, choice: choice)))
            }
        }
    }

    private static let fakeAnswers = [
        "he lost a bet", "this is a rebrand", "nobody was supposed to see this",
        "it was for a school project", "the cone was already there",
        "this is the good outcome", "we were being chased"
    ]

    // MARK: - Plumbing

    private func apply(_ event: GameEvent) throws {
        let context = GameContext(
            players: room.players, hostID: room.hostID, pools: pools, now: Date()
        )
        let transition = machine.transition(state, on: event, context: context)
        if let rejection = transition.rejection {
            throw GameBackendError.rejected(rejection)
        }
        state = transition.state

        // Honour the development override *after* the machine dealt, so the
        // commitment still matches what gets revealed.
        if let forced = overrides.forcedInstruction,
           var round = state.currentRound,
           round.mode.usesSecretInstruction,
           round.secret?.instruction != forced {
            let nonce = SecretCommitment.makeNonce()
            round = Round(
                id: round.id, index: round.index, mode: round.mode,
                ownerID: round.ownerID, assetID: round.assetID,
                commitment: SecretCommitment(instruction: forced, nonce: nonce),
                secret: SecretReveal(instruction: forced, nonce: nonce),
                votes: round.votes, answers: round.answers, status: round.status,
                startedAt: round.startedAt, ownerRevealed: round.ownerRevealed,
                secretDelivered: round.secretDelivered, resultsRevealed: round.resultsRevealed
            )
            state.currentRound = round
        }

        publish()
    }

    private func register(
        id: UUID,
        continuation: AsyncThrowingStream<GameSnapshot, Error>.Continuation,
        player: PlayerID
    ) {
        continuations[id] = continuation
        continuation.yield(GameSnapshot(room: room, session: state, view: view(for: player)))
    }

    private func unregister(id: UUID) {
        continuations[id]?.finish()
        continuations.removeValue(forKey: id)
    }

    private func publish() {
        for (_, continuation) in continuations {
            continuation.yield(GameSnapshot(room: room, session: state, view: view(for: viewer)))
        }
    }

    /// In demo mode there is only ever one human looking at the screen.
    private var viewer: PlayerID { room.hostID }

    private func view(for player: PlayerID) -> GameSessionView {
        GameSessionView.project(
            state: state, players: room.players, hostID: room.hostID, viewer: player
        )
    }
}
