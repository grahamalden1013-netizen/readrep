import Foundation

public struct Award: Identifiable, Hashable, Sendable {
    public let kind: AwardKind
    public let winner: Player
    /// The number behind it — shown small, under the name.
    public let detail: String
    public var id: String { "\(kind.rawValue):\(winner.id.raw)" }

    public init(kind: AwardKind, winner: Player, detail: String) {
        self.kind = kind; self.winner = winner; self.detail = detail
    }
}

public enum AwardKind: String, CaseIterable, Hashable, Sendable {
    case mostExposed
    case bestLiar
    case bestDetective
    case worstDefense
    case mostAccused
    case mostVotedCap

    public var title: String {
        switch self {
        case .mostExposed:   return "MOST EXPOSED"
        case .bestLiar:      return "BEST LIAR"
        case .bestDetective: return "BEST DETECTIVE"
        case .worstDefense:  return "WORST DEFENSE"
        case .mostAccused:   return "MOST ACCUSED"
        case .mostVotedCap:  return "MOST VOTED CAP"
        }
    }

    public var emoji: String {
        switch self {
        case .mostExposed:   return "💀"
        case .bestLiar:      return "🧢"
        case .bestDetective: return "🔍"
        case .worstDefense:  return "🫠"
        case .mostAccused:   return "👀"
        case .mostVotedCap:  return "📉"
        }
    }
}

public struct GameStats: Hashable, Sendable {
    public let roundsPlayed: Int
    public let accusations: Int
    public let successfulLies: Int
    public let correctReads: Int
    public let photosRemoved: Int

    public init(
        roundsPlayed: Int, accusations: Int, successfulLies: Int,
        correctReads: Int, photosRemoved: Int
    ) {
        self.roundsPlayed = roundsPlayed
        self.accusations = accusations
        self.successfulLies = successfulLies
        self.correctReads = correctReads
        self.photosRemoved = photosRemoved
    }

    /// Lines for the recap card. Deliberately no per-player breakdown of who
    /// removed what.
    public var lines: [String] {
        var out = ["\(roundsPlayed) round\(roundsPlayed == 1 ? "" : "s")"]
        if accusations > 0 { out.append("\(accusations) accusation\(accusations == 1 ? "" : "s")") }
        if successfulLies > 0 { out.append("\(successfulLies) successful lie\(successfulLies == 1 ? "" : "s")") }
        if correctReads > 0 { out.append("\(correctReads) correct read\(correctReads == 1 ? "" : "s")") }
        return out
    }
}

public struct GameResults: Hashable, Sendable {
    public let mode: GameMode
    public let leaderboard: [LeaderboardRow]
    public let awards: [Award]
    public let stats: GameStats

    public struct LeaderboardRow: Identifiable, Hashable, Sendable {
        public let player: Player
        public let score: Int
        public var id: PlayerID { player.id }
    }

    public init(mode: GameMode, leaderboard: [LeaderboardRow], awards: [Award], stats: GameStats) {
        self.mode = mode; self.leaderboard = leaderboard; self.awards = awards; self.stats = stats
    }
}

/// Turns a finished game into the six lines people actually screenshot.
///
/// Fully deterministic: same rounds in, same awards out, on every device. Ties
/// break on nickname then id, never on dictionary order — two phones showing
/// different "BEST LIAR" would be worse than showing none.
public struct AwardEngine: Sendable {
    public init() {}

    public func results(
        state: GameSessionState,
        players: [Player]
    ) -> GameResults {
        let rounds = state.scoredRounds
        let leaderboard = ScoreEngine.leaderboard(scores: state.scores, players: players)
            .map { GameResults.LeaderboardRow(player: $0.player, score: $0.score) }

        return GameResults(
            mode: state.mode,
            leaderboard: leaderboard,
            awards: awards(rounds: rounds, players: players),
            stats: stats(state: state)
        )
    }

    public func stats(state: GameSessionState) -> GameStats {
        let rounds = state.scoredRounds
        var accusations = 0
        var lies = 0
        var reads = 0

        for round in rounds {
            let tally = VoteTally(votes: round.votes, mode: round.mode)
            accusations += tally.count(.cap) + tally.count(.absoluteCap)

            guard round.mode == .truthOrCap, let instruction = round.secretInstruction else {
                if round.mode == .whoHasToExplainThis {
                    reads += tally.count(.player(round.ownerID))
                }
                continue
            }
            let correct: VoteChoice = instruction == .tellTheTruth ? .truth : .cap
            let fooled: VoteChoice = instruction == .tellTheTruth ? .cap : .truth
            reads += tally.count(correct)
            if instruction == .lie && tally.isMajority(fooled) { lies += 1 }
        }

        return GameStats(
            roundsPlayed: rounds.count,
            accusations: accusations,
            successfulLies: lies,
            correctReads: reads,
            // Count only. Never who, never which photo.
            photosRemoved: state.completedRounds.filter { $0.status == .removedByOwner }.count
        )
    }

    public func awards(rounds: [Round], players: [Player]) -> [Award] {
        guard !rounds.isEmpty, !players.isEmpty else { return [] }

        var exposures: [PlayerID: Int] = [:]
        var successfulLies: [PlayerID: Int] = [:]
        var correctReads: [PlayerID: Int] = [:]
        var capsReceived: [PlayerID: Int] = [:]
        var accusedAs: [PlayerID: Int] = [:]
        var defenceOpportunities: [PlayerID: Int] = [:]

        for round in rounds {
            exposures[round.ownerID, default: 0] += 1
            let tally = VoteTally(votes: round.votes, mode: round.mode)

            let caps = tally.count(.cap) + tally.count(.absoluteCap)
            if caps > 0 { capsReceived[round.ownerID, default: 0] += caps }
            if round.mode == .explainYourself || round.mode == .truthOrCap {
                defenceOpportunities[round.ownerID, default: 0] += max(1, tally.totalVotes)
            }

            switch round.mode {
            case .truthOrCap:
                guard let instruction = round.secretInstruction else { break }
                let correct: VoteChoice = instruction == .tellTheTruth ? .truth : .cap
                let fooled: VoteChoice = instruction == .tellTheTruth ? .cap : .truth
                for voter in tally.voters(for: correct) { correctReads[voter, default: 0] += 1 }
                if instruction == .lie && tally.isMajority(fooled) {
                    successfulLies[round.ownerID, default: 0] += 1
                }
            case .whoHasToExplainThis:
                for entry in tally.counts {
                    if case .player(let guessed) = entry.choice {
                        accusedAs[guessed, default: 0] += entry.count
                    }
                }
                for voter in tally.voters(for: .player(round.ownerID)) {
                    correctReads[voter, default: 0] += 1
                }
            case .noContext, .explainYourself:
                break
            }
        }

        // "Worst defense" is a rate, not a count — otherwise it just re-awards
        // whoever came up most often, which is already MOST EXPOSED.
        var defenceRate: [PlayerID: Double] = [:]
        for (player, caps) in capsReceived {
            let opportunities = defenceOpportunities[player] ?? 0
            if opportunities >= 2 { defenceRate[player] = Double(caps) / Double(opportunities) }
        }

        var out: [Award] = []
        func add(_ kind: AwardKind, _ tallies: [PlayerID: Int], _ suffix: (Int) -> String) {
            guard let win = best(tallies, players: players) else { return }
            out.append(Award(kind: kind, winner: win.player, detail: suffix(win.value)))
        }

        add(.mostExposed, exposures) { "\($0) round\($0 == 1 ? "" : "s") on the spot" }
        add(.bestLiar, successfulLies) { "\($0) clean getaway\($0 == 1 ? "" : "s")" }
        add(.bestDetective, correctReads) { "\($0) correct read\($0 == 1 ? "" : "s")" }
        if let win = best(defenceRate, players: players) {
            out.append(Award(
                kind: .worstDefense,
                winner: win.player,
                detail: "\(Int((win.value * 100).rounded()))% didn't buy it"
            ))
        }
        add(.mostAccused, accusedAs) { "\($0) wrong accusation\($0 == 1 ? "" : "s")" }
        add(.mostVotedCap, capsReceived) { "\($0) cap\($0 == 1 ? "" : "s") received" }

        return out
    }

    /// Highest value wins; zeroes never win; ties break on nickname then id.
    private func best<Value: Comparable & Numeric>(
        _ tallies: [PlayerID: Value],
        players: [Player]
    ) -> (player: Player, value: Value)? {
        let byID = Dictionary(uniqueKeysWithValues: players.map { ($0.id, $0) })
        let ranked = tallies
            .compactMap { entry -> (Player, Value)? in
                guard entry.value > .zero, let player = byID[entry.key] else { return nil }
                return (player, entry.value)
            }
            .sorted {
                if $0.1 != $1.1 { return $0.1 > $1.1 }
                if $0.0.nickname != $1.0.nickname { return $0.0.nickname < $1.0.nickname }
                return $0.0.id < $1.0.id
            }
        guard let top = ranked.first else { return nil }
        return (player: top.0, value: top.1)
    }
}
