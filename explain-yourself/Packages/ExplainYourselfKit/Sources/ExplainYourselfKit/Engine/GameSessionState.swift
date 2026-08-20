import Foundation

/// The authoritative snapshot every device renders from.
///
/// One struct, one `revision`, one source of truth. There is deliberately no
/// `isVoting`, no `showingResults`, no `hasRevealed` — the phase *is* the state,
/// and a screen is a pure function of it.
public struct GameSessionState: Codable, Hashable, Sendable {
    public let roomID: RoomID
    public var settings: GameSettings
    public var phase: GamePhase
    /// `-1` before the first round starts.
    public var roundIndex: Int
    public var currentRound: Round?
    public var completedRounds: [Round]
    public var scores: [PlayerID: Int]
    /// Monotonic. A device drops any snapshot whose revision is not strictly
    /// greater than the one it already holds, which is what makes out-of-order
    /// realtime delivery harmless.
    public var revision: Int
    /// When the current phase auto-advances, if it does.
    public var phaseDeadline: Date?
    public var endedReason: EndReason?

    public init(
        roomID: RoomID,
        settings: GameSettings,
        phase: GamePhase = .waiting,
        roundIndex: Int = -1,
        currentRound: Round? = nil,
        completedRounds: [Round] = [],
        scores: [PlayerID: Int] = [:],
        revision: Int = 0,
        phaseDeadline: Date? = nil,
        endedReason: EndReason? = nil
    ) {
        self.roomID = roomID
        self.settings = settings
        self.phase = phase
        self.roundIndex = roundIndex
        self.currentRound = currentRound
        self.completedRounds = completedRounds
        self.scores = scores
        self.revision = revision
        self.phaseDeadline = phaseDeadline
        self.endedReason = endedReason
    }

    public var mode: GameMode { settings.mode }
    public var totalRounds: Int { settings.roundCount }
    /// 1-based, for display. "ROUND 3 OF 10".
    public var displayRoundNumber: Int { max(1, roundIndex + 1) }
    public var isFinished: Bool { phase == .gameComplete }

    public func score(_ player: PlayerID) -> Int { scores[player] ?? 0 }

    /// Rounds that actually resolved. Removed and skipped rounds are excluded
    /// from every statistic — a photo somebody pulled should leave no trace.
    public var scoredRounds: [Round] {
        completedRounds.filter { $0.status == .complete }
    }
}

// `[PlayerID: Int]` would otherwise encode as an array, because `PlayerID` is
// not a `String`. Keeping it a real JSON object matters: this column is read by
// SQL and by the recap generator.
extension GameSessionState {
    private enum CodingKeys: String, CodingKey {
        case roomID, settings, phase, roundIndex, currentRound, completedRounds
        case scores, revision, phaseDeadline, endedReason
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        roomID = try c.decode(RoomID.self, forKey: .roomID)
        settings = try c.decode(GameSettings.self, forKey: .settings)
        phase = try c.decode(GamePhase.self, forKey: .phase)
        roundIndex = try c.decode(Int.self, forKey: .roundIndex)
        currentRound = try c.decodeIfPresent(Round.self, forKey: .currentRound)
        completedRounds = try c.decodeIfPresent([Round].self, forKey: .completedRounds) ?? []
        let rawScores = try c.decodeIfPresent([String: Int].self, forKey: .scores) ?? [:]
        scores = Dictionary(uniqueKeysWithValues: rawScores.map { (PlayerID($0.key), $0.value) })
        revision = try c.decode(Int.self, forKey: .revision)
        phaseDeadline = try c.decodeIfPresent(Date.self, forKey: .phaseDeadline)
        endedReason = try c.decodeIfPresent(EndReason.self, forKey: .endedReason)
    }

    public func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(roomID, forKey: .roomID)
        try c.encode(settings, forKey: .settings)
        try c.encode(phase, forKey: .phase)
        try c.encode(roundIndex, forKey: .roundIndex)
        try c.encodeIfPresent(currentRound, forKey: .currentRound)
        try c.encode(completedRounds, forKey: .completedRounds)
        try c.encode(
            Dictionary(uniqueKeysWithValues: scores.map { ($0.key.raw, $0.value) }),
            forKey: .scores
        )
        try c.encode(revision, forKey: .revision)
        try c.encodeIfPresent(phaseDeadline, forKey: .phaseDeadline)
        try c.encodeIfPresent(endedReason, forKey: .endedReason)
    }
}

/// What a single device is allowed to render. Produced from `GameSessionState`
/// by `RoundRedactor`; this is the type the UI binds to.
public struct GameSessionView: Hashable, Sendable {
    public let roomID: RoomID
    public let settings: GameSettings
    public let phase: GamePhase
    public let roundNumber: Int
    public let totalRounds: Int
    public let round: RoundView?
    /// Every round that has finished, in order. Only ever populated with fully
    /// revealed rounds, so it carries nothing that is still secret.
    public let finishedRounds: [RoundView]
    public let players: [Player]
    public let scores: [PlayerID: Int]
    public let phaseDeadline: Date?
    public let viewer: PlayerID
    public let isHost: Bool
    public let revision: Int

    public init(
        roomID: RoomID, settings: GameSettings, phase: GamePhase, roundNumber: Int,
        totalRounds: Int, round: RoundView?, finishedRounds: [RoundView] = [],
        players: [Player], scores: [PlayerID: Int],
        phaseDeadline: Date?, viewer: PlayerID, isHost: Bool, revision: Int
    ) {
        self.roomID = roomID; self.settings = settings; self.phase = phase
        self.roundNumber = roundNumber; self.totalRounds = totalRounds; self.round = round
        self.finishedRounds = finishedRounds
        self.players = players; self.scores = scores; self.phaseDeadline = phaseDeadline
        self.viewer = viewer; self.isHost = isHost; self.revision = revision
    }

    /// The end-game recap, computed on device from the published rounds.
    public var results: GameResults? {
        guard phase == .gameComplete else { return nil }
        let rounds = finishedRounds.compactMap { Round(finished: $0) }
        let engine = AwardEngine()
        var state = GameSessionState(roomID: roomID, settings: settings, phase: .gameComplete)
        state.completedRounds = rounds
        state.scores = scores
        return engine.results(state: state, players: players)
    }

    public func nickname(_ id: PlayerID) -> String {
        players.first { $0.id == id }?.nickname ?? "Someone"
    }

    public var owner: Player? {
        guard let ownerID = round?.ownerID else { return nil }
        return players.first { $0.id == ownerID }
    }

    /// Everyone still expected to vote. Drives "WAITING ON 2" without ever
    /// leaking which way anyone leaned.
    public var pendingVoters: [Player] {
        guard let round else { return [] }
        let voted = Set(round.votedPlayerIDs)
        return players.filter {
            $0.status != .disconnected && $0.id != round.ownerID && !voted.contains($0.id)
        }
    }

    public var pendingAnswerers: [Player] {
        guard let round, round.mode.usesWrittenAnswers else { return [] }
        let answered = Set(round.answeredPlayerIDs)
        return players.filter {
            $0.status != .disconnected && $0.id != round.ownerID && !answered.contains($0.id)
        }
    }

    public static func project(
        state: GameSessionState,
        players: [Player],
        hostID: PlayerID,
        viewer: PlayerID
    ) -> GameSessionView {
        let round = state.currentRound.map { RoundRedactor.redact($0, viewer: viewer) }
        return GameSessionView(
            roomID: state.roomID,
            settings: state.settings,
            phase: state.phase,
            roundNumber: state.displayRoundNumber,
            totalRounds: state.totalRounds,
            round: round,
            finishedRounds: state.completedRounds.map { RoundRedactor.redact($0, viewer: viewer) },
            players: players,
            scores: state.scores,
            phaseDeadline: state.phaseDeadline,
            viewer: viewer,
            isHost: hostID == viewer,
            revision: state.revision
        )
    }
}
