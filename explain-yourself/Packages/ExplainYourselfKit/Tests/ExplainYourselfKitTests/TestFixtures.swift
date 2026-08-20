import Foundation
@testable import ExplainYourselfKit

/// The QA cast, used by every test so failures read like a game and not like
/// a UUID dump.
enum Cast {
    static let jake  = PlayerID("p-jake")
    static let sam   = PlayerID("p-sam")
    static let alex  = PlayerID("p-alex")
    static let ryan  = PlayerID("p-ryan")
    static let maya  = PlayerID("p-maya")
    static let emma  = PlayerID("p-emma")

    static let names: [PlayerID: String] = [
        jake: "Jake", sam: "Sam", alex: "Alex", ryan: "Ryan", maya: "Maya", emma: "Emma"
    ]

    static func player(
        _ id: PlayerID,
        host: Bool = false,
        status: PlayerStatus = .ready,
        assets: Int = 12
    ) -> Player {
        Player(
            id: id,
            nickname: names[id] ?? id.raw,
            isHost: host,
            status: status,
            approvedAssetCount: assets
        )
    }

    static var six: [Player] {
        [
            player(jake, host: true), player(sam), player(alex),
            player(ryan), player(maya), player(emma)
        ]
    }

    /// Ten approved assets each. Ids encode their owner so a test failure says
    /// "jake-3 came up twice" rather than a hex string.
    static func pools(for players: [Player], each: Int = 10) -> [AssetPool] {
        players.map { player in
            AssetPool(
                ownerID: player.id,
                assetIDs: (0..<each).map { AssetID("\(player.id.raw)-asset-\($0)") }
            )
        }
    }

    static func context(
        players: [Player] = Cast.six,
        host: PlayerID = Cast.jake,
        now: Date = Date(timeIntervalSince1970: 1_700_000_000)
    ) -> GameContext {
        GameContext(players: players, hostID: host, pools: pools(for: players), now: now)
    }

    static func session(
        mode: GameMode = .truthOrCap,
        rounds: Int = 10
    ) -> GameSessionState {
        GameSessionState(
            roomID: RoomID("room-1"),
            settings: GameSettings(mode: mode, roundCount: rounds, intensity: .dangerous),
            phase: .ready
        )
    }

    static func machine(seed: UInt64 = 42) -> GameStateMachine {
        GameStateMachine(dealer: RoundDealer(seed: seed))
    }
}

/// Drives a session through phases the way the app does, so tests can say
/// "get to voting" without spelling out five transitions.
struct GameDriver {
    var machine: GameStateMachine
    var state: GameSessionState
    var context: GameContext
    private(set) var effects: [GameEffect] = []

    init(
        mode: GameMode = .truthOrCap,
        rounds: Int = 10,
        players: [Player] = Cast.six,
        seed: UInt64 = 42
    ) {
        self.machine = Cast.machine(seed: seed)
        self.state = Cast.session(mode: mode, rounds: rounds)
        self.context = Cast.context(players: players)
    }

    @discardableResult
    mutating func send(_ event: GameEvent) -> GameTransition {
        let transition = machine.transition(state, on: event, context: context)
        if transition.rejection == nil { state = transition.state }
        effects = transition.effects
        return transition
    }

    mutating func start() { send(.hostStartedGame(actor: context.hostID)) }

    /// Advance until the given phase, or give up. Guards against a flow change
    /// silently turning a test into an infinite loop.
    mutating func run(to target: GamePhase, limit: Int = 12) {
        var steps = 0
        while state.phase != target, steps < limit {
            send(.phaseElapsed)
            steps += 1
        }
    }

    var round: Round? { state.currentRound }

    /// Everyone but the owner votes the same way.
    mutating func everyoneVotes(_ choice: VoteChoice) {
        guard let round = state.currentRound else { return }
        for voter in round.eligibleVoters(in: context.players) {
            send(.voteCast(Vote(roundID: round.id, voterID: voter, choice: choice)))
        }
    }

    /// Split the vote: `correct` players vote one way, the rest the other.
    mutating func votesSplit(_ first: VoteChoice, count: Int, rest: VoteChoice) {
        guard let round = state.currentRound else { return }
        for (index, voter) in round.eligibleVoters(in: context.players).enumerated() {
            send(.voteCast(Vote(roundID: round.id, voterID: voter, choice: index < count ? first : rest)))
        }
    }
}
