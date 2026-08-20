import Foundation

public enum GameCue: String, Codable, Hashable, Sendable {
    case countdownTick
    case revealHit
    case nameDrop
    case secretCard
    case timerWarning
    case timeUp
    case voteLock
    case resultSting
    case roundRemoved
    case gameOver
}

public enum GameRejection: String, Error, Codable, Hashable, Sendable {
    case notHost
    case notOwner
    case notEligibleToVote
    case alreadyVoted
    case alreadyAnswered
    case wrongPhase
    case wrongRound
    case emptyAnswer
    case notEnoughPlayers
    case notEnoughAssets
    case gameAlreadyFinished

    /// Player-facing. Never shows a raw error, never blames the player for
    /// something the network did.
    public var message: String {
        switch self {
        case .notHost:              return "Only the host can do that."
        case .notOwner:             return "That isn't your photo."
        case .notEligibleToVote:    return "You can't vote on your own photo."
        case .alreadyVoted:         return "Your vote is already locked in."
        case .alreadyAnswered:      return "You already sent one."
        case .wrongPhase:           return "That moment has passed."
        case .wrongRound:           return "This round already moved on."
        case .emptyAnswer:          return "Write something first."
        case .notEnoughPlayers:     return "You need at least \(GameRoom.minPlayers) players."
        case .notEnoughAssets:      return "WE NEED MORE EVIDENCE"
        case .gameAlreadyFinished:  return "This game is over."
        }
    }
}

public enum GameEffect: Hashable, Sendable {
    /// Arm a local timer. Every device arms its own; the server's `phaseDeadline`
    /// is the shared truth, so drift self-corrects on the next snapshot.
    case scheduleAdvance(Date)
    case cancelScheduledAdvance
    case cue(GameCue)
    case archiveRound(RoundID)
    case scoresChanged
    case gameEnded(EndReason)
    case rejected(GameRejection)
}

public struct GameContext: Sendable {
    public var players: [Player]
    public var hostID: PlayerID
    public var pools: [AssetPool]
    public var now: Date

    public init(players: [Player], hostID: PlayerID, pools: [AssetPool], now: Date = Date()) {
        self.players = players
        self.hostID = hostID
        self.pools = pools
        self.now = now
    }

    public func isHost(_ id: PlayerID) -> Bool { id == hostID }
}

public enum GameEvent: Sendable {
    case playersChanged([Player])
    case hostStartedGame(actor: PlayerID)
    /// The phase's own clock ran out.
    case phaseElapsed
    /// The host tapped NEXT, usually because the room is still laughing.
    case hostAdvanced(actor: PlayerID)
    case voteCast(Vote)
    case answerSubmitted(PlayerAnswer)
    /// The owner tapped REMOVE PHOTO. No reason is asked for or recorded.
    case ownerRemovedPhoto(roundID: RoundID, actor: PlayerID)
    case hostSkippedRound(actor: PlayerID)
    case hostEndedGame(actor: PlayerID)
    /// Enough devices failed to load the asset that continuing is pointless.
    case assetUnavailable(roundID: RoundID)
}

public struct GameTransition: Sendable {
    public let state: GameSessionState
    public let effects: [GameEffect]

    public var rejection: GameRejection? {
        for effect in effects {
            if case .rejected(let r) = effect { return r }
        }
        return nil
    }
}

/// The whole game, as one pure-ish function.
///
/// `transition` is the only thing allowed to change `GameSessionState`. On the
/// server it runs inside the Edge Function that owns the room row; on device it
/// runs in demo mode and in optimistic-update paths. Same code, same rules —
/// which is why a client cannot invent a state the server would not have
/// produced.
public struct GameStateMachine: Sendable {
    public var dealer: RoundDealer
    private let scorer: ScoreEngine

    public init(dealer: RoundDealer, scorer: ScoreEngine = ScoreEngine()) {
        self.dealer = dealer
        self.scorer = scorer
    }

    public mutating func transition(
        _ state: GameSessionState,
        on event: GameEvent,
        context: GameContext
    ) -> GameTransition {
        // A finished game still accepts roster updates (people leaving the
        // results screen) but nothing that would move the game on.
        if state.isFinished {
            if case .playersChanged = event {} else {
                return reject(state, .gameAlreadyFinished)
            }
        }

        switch event {
        case .playersChanged(let players):
            return playersChanged(state, players: players, context: context)

        case .hostStartedGame(let actor):
            guard context.isHost(actor) else { return reject(state, .notHost) }
            guard state.phase.isLobby else { return reject(state, .wrongPhase) }
            let ready = context.players.filter(\.isReady)
            guard ready.count >= GameRoom.minPlayers else { return reject(state, .notEnoughPlayers) }
            guard !context.pools.filter({ !$0.assetIDs.isEmpty }).isEmpty else {
                return reject(state, .notEnoughAssets)
            }
            return beginRound(state, index: 0, context: context)

        case .phaseElapsed:
            guard state.phase.isInRound else { return reject(state, .wrongPhase) }
            return advance(state, context: context)

        case .hostAdvanced(let actor):
            guard context.isHost(actor) else { return reject(state, .notHost) }
            guard state.phase.isInRound else { return reject(state, .wrongPhase) }
            return advance(state, context: context)

        case .voteCast(let vote):
            return castVote(state, vote: vote, context: context)

        case .answerSubmitted(let answer):
            return submitAnswer(state, answer: answer, context: context)

        case .ownerRemovedPhoto(let roundID, let actor):
            guard let round = state.currentRound, round.id == roundID else {
                return reject(state, .wrongRound)
            }
            guard round.ownerID == actor else { return reject(state, .notOwner) }
            return retireRound(state, status: .removedByOwner, context: context)

        case .hostSkippedRound(let actor):
            guard context.isHost(actor) else { return reject(state, .notHost) }
            guard state.currentRound != nil else { return reject(state, .wrongRound) }
            return retireRound(state, status: .skipped, context: context)

        case .assetUnavailable(let roundID):
            guard let round = state.currentRound, round.id == roundID else {
                return reject(state, .wrongRound)
            }
            return retireRound(state, status: .skipped, context: context)

        case .hostEndedGame(let actor):
            guard context.isHost(actor) else { return reject(state, .notHost) }
            var next = state
            if var round = next.currentRound {
                round.status = .skipped
                next.completedRounds.append(round)
                next.currentRound = nil
            }
            return finish(next, reason: .hostEnded)
        }
    }

    // MARK: - Lobby

    private mutating func playersChanged(
        _ state: GameSessionState,
        players: [Player],
        context: GameContext
    ) -> GameTransition {
        var next = state

        if state.phase.isLobby {
            let connected = players.filter { $0.status != .disconnected }
            if connected.isEmpty {
                next.phase = .waiting
            } else if connected.allSatisfy(\.isReady) && connected.count >= GameRoom.minPlayers {
                next.phase = .ready
            } else if connected.contains(where: { $0.status == .selectingPhotos }) {
                next.phase = .preparingPhotos
            } else {
                next.phase = .waiting
            }
            return bump(next, effects: [])
        }

        // Mid-game. If the person on the spot walked out, do not leave the room
        // staring at a photo nobody will explain.
        if let round = state.currentRound,
           let owner = players.first(where: { $0.id == round.ownerID }),
           owner.status == .disconnected {
            var ctx = context
            ctx.players = players
            return retireRound(next, status: .skipped, context: ctx)
        }

        // Everybody who still had to vote has now left. Do not hang.
        if state.phase == .voting || state.phase == .answering,
           let round = state.currentRound {
            var ctx = context
            ctx.players = players
            let done = state.phase == .voting
                ? round.everyoneVoted(in: players)
                : round.everyoneAnswered(in: players)
            if done { return advance(next, context: ctx) }
        }

        return bump(next, effects: [])
    }

    // MARK: - Round lifecycle

    private mutating func beginRound(
        _ state: GameSessionState,
        index: Int,
        context: GameContext
    ) -> GameTransition {
        guard index < state.totalRounds else { return finish(state, reason: .completed) }

        guard let dealt = dealer.deal(
            pools: context.pools,
            history: state.completedRounds,
            index: index,
            mode: state.mode
        ) else {
            // The decks ran dry early. That is a finished game, not an error —
            // ending on a high note beats an apology screen.
            return finish(state, reason: .completed)
        }

        var secret: SecretReveal?
        var commitment: SecretCommitment?
        if state.mode.usesSecretInstruction {
            let reveal = dealer.dealSecret()
            secret = reveal
            commitment = SecretCommitment(instruction: reveal.instruction, nonce: reveal.nonce)
        }

        let round = Round(
            index: index,
            mode: state.mode,
            ownerID: dealt.ownerID,
            assetID: dealt.assetID,
            commitment: commitment,
            secret: secret,
            startedAt: context.now
        )

        var next = state
        next.roundIndex = index
        next.currentRound = round
        next.phase = .roundIntro
        return enterPhase(next, phase: .roundIntro, context: context, extra: [])
    }

    private mutating func advance(
        _ state: GameSessionState,
        context: GameContext
    ) -> GameTransition {
        let sequence = GamePhase.sequence(for: state.mode)
        guard let position = sequence.firstIndex(of: state.phase) else {
            return reject(state, .wrongPhase)
        }

        // End of the round.
        guard position + 1 < sequence.count else {
            return completeRound(state, context: context)
        }

        let upcoming = sequence[position + 1]
        if upcoming == .roundComplete {
            return completeRound(state, context: context)
        }
        return enterPhase(state, phase: upcoming, context: context, extra: [])
    }

    private func enterPhase(
        _ state: GameSessionState,
        phase: GamePhase,
        context: GameContext,
        extra: [GameEffect]
    ) -> GameTransition {
        var next = state
        next.phase = phase

        if var round = next.currentRound {
            switch phase {
            case .ownerReveal:   round.ownerRevealed = true
            case .secretInstruction: round.secretDelivered = true
            case .resultReveal:
                round.resultsRevealed = true
                round.ownerRevealed = true
            default: break
            }
            next.currentRound = round
        }

        var effects = extra
        if let duration = phase.duration(for: state.mode) {
            let deadline = context.now.addingTimeInterval(duration)
            next.phaseDeadline = deadline
            effects.append(.scheduleAdvance(deadline))
        } else {
            next.phaseDeadline = nil
            effects.append(.cancelScheduledAdvance)
        }

        if let cue = Self.cue(for: phase) { effects.append(.cue(cue)) }
        return bump(next, effects: effects)
    }

    private static func cue(for phase: GamePhase) -> GameCue? {
        switch phase {
        case .roundIntro:        return .countdownTick
        case .photoReveal:       return .revealHit
        case .ownerReveal:       return .nameDrop
        case .secretInstruction: return .secretCard
        case .explanationTimer:  return .timerWarning
        case .resultReveal:      return .resultSting
        case .gameComplete:      return .gameOver
        default:                 return nil
        }
    }

    private mutating func completeRound(
        _ state: GameSessionState,
        context: GameContext
    ) -> GameTransition {
        guard var round = state.currentRound else { return reject(state, .wrongRound) }
        round.status = .complete
        round.resultsRevealed = true
        round.ownerRevealed = true

        var next = state
        next.currentRound = nil
        next.completedRounds.append(round)
        next.scores = scorer.apply(round: round, to: state.scores, players: context.players)

        let nextIndex = round.index + 1
        if nextIndex >= state.totalRounds {
            return finish(next, reason: .completed)
        }
        var transition = beginRound(next, index: nextIndex, context: context)
        transition = GameTransition(
            state: transition.state,
            effects: [.archiveRound(round.id), .scoresChanged] + transition.effects
        )
        return transition
    }

    /// A round that ends without a result: the owner pulled the photo, the host
    /// skipped, the asset vanished. Scores are untouched and no statistic
    /// records it, so removing a photo can never be inferred from the recap.
    private mutating func retireRound(
        _ state: GameSessionState,
        status: RoundStatus,
        context: GameContext
    ) -> GameTransition {
        guard var round = state.currentRound else { return reject(state, .wrongRound) }
        round.status = status
        // Wipe the evidence from the shared state immediately. Other devices
        // see the round vanish, not a redacted placeholder.
        round.votes = []
        round.answers = []

        var next = state
        next.currentRound = nil
        next.completedRounds.append(round)

        let nextIndex = round.index + 1
        if nextIndex >= state.totalRounds {
            var done = finish(next, reason: .completed)
            done = GameTransition(state: done.state, effects: [.cue(.roundRemoved)] + done.effects)
            return done
        }

        var transition = beginRound(next, index: nextIndex, context: context)
        transition = GameTransition(
            state: transition.state,
            effects: [.cue(.roundRemoved), .archiveRound(round.id)] + transition.effects
        )
        return transition
    }

    private func finish(_ state: GameSessionState, reason: EndReason) -> GameTransition {
        var next = state
        next.phase = .gameComplete
        next.currentRound = nil
        next.phaseDeadline = nil
        next.endedReason = reason
        return bump(next, effects: [
            .cancelScheduledAdvance, .cue(.gameOver), .gameEnded(reason)
        ])
    }

    // MARK: - Player actions

    private mutating func castVote(
        _ state: GameSessionState,
        vote: Vote,
        context: GameContext
    ) -> GameTransition {
        guard state.phase == .voting else { return reject(state, .wrongPhase) }
        guard var round = state.currentRound, round.id == vote.roundID else {
            return reject(state, .wrongRound)
        }
        guard round.eligibleVoters(in: context.players).contains(vote.voterID) else {
            return reject(state, .notEligibleToVote)
        }
        // One vote each. Enforced here *and* by a unique index in Postgres —
        // the UI hiding the buttons is not a control.
        guard round.vote(by: vote.voterID) == nil else { return reject(state, .alreadyVoted) }

        round.votes.append(vote)
        var next = state
        next.currentRound = round

        if round.everyoneVoted(in: context.players) {
            return advance(bump(next, effects: []).state, context: context)
        }
        return bump(next, effects: [.cue(.voteLock)])
    }

    private mutating func submitAnswer(
        _ state: GameSessionState,
        answer: PlayerAnswer,
        context: GameContext
    ) -> GameTransition {
        guard state.phase == .answering else { return reject(state, .wrongPhase) }
        guard var round = state.currentRound, round.id == answer.roundID else {
            return reject(state, .wrongRound)
        }
        guard round.eligibleAnswerers(in: context.players).contains(answer.authorID) else {
            return reject(state, .notEligibleToVote)
        }
        guard round.answer(by: answer.authorID) == nil else { return reject(state, .alreadyAnswered) }
        guard !answer.text.isEmpty else { return reject(state, .emptyAnswer) }

        round.answers.append(answer)
        var next = state
        next.currentRound = round

        if round.everyoneAnswered(in: context.players) {
            return advance(bump(next, effects: []).state, context: context)
        }
        return bump(next, effects: [.cue(.voteLock)])
    }

    // MARK: - Plumbing

    private func bump(_ state: GameSessionState, effects: [GameEffect]) -> GameTransition {
        var next = state
        next.revision += 1
        return GameTransition(state: next, effects: effects)
    }

    private func reject(_ state: GameSessionState, _ reason: GameRejection) -> GameTransition {
        // The state is returned untouched *and* un-bumped: a rejected action
        // must not cause other devices to re-render.
        GameTransition(state: state, effects: [.rejected(reason)])
    }
}
