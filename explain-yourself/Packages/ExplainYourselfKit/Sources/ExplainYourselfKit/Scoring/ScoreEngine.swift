import Foundation

/// Points, kept deliberately small.
///
/// The design brief for scoring is "the game should still be fun if nobody
/// cares about points", so there is exactly one point on offer per thing you
/// can be right about, and no multipliers, streaks or levels anywhere.
public struct ScoreEngine: Sendable {
    public init() {}

    public func apply(
        round: Round,
        to scores: [PlayerID: Int],
        players: [Player]
    ) -> [PlayerID: Int] {
        // Retired rounds score nothing. A photo somebody pulled must leave no
        // trace at all, including an unexplained bump on the scoreboard.
        guard round.status == .complete else { return scores }

        var next = scores
        for (player, points) in points(for: round, players: players) {
            next[player, default: 0] += points
        }
        return next
    }

    /// The points this single round awards, by player. Split out from `apply`
    /// so tests can assert one round in isolation.
    public func points(for round: Round, players: [Player]) -> [PlayerID: Int] {
        var award: [PlayerID: Int] = [:]
        let tally = VoteTally(votes: round.votes, mode: round.mode)

        switch round.mode {
        case .explainYourself:
            // No points. The payoff is the argument that follows.
            break

        case .truthOrCap:
            guard let instruction = round.secretInstruction else { break }
            let correct: VoteChoice = instruction == .tellTheTruth ? .truth : .cap
            let fooled: VoteChoice = instruction == .tellTheTruth ? .cap : .truth

            // +1 to everyone who read them right.
            for voter in tally.voters(for: correct) { award[voter, default: 0] += 1 }
            // +1 to the owner for taking the majority with them.
            if tally.isMajority(fooled) { award[round.ownerID, default: 0] += 1 }

        case .noContext:
            // +1 for the funniest fake explanation. A tie awards nobody, which
            // keeps the reveal honest.
            if case .answer(let winningID)? = tally.winner,
               let author = round.answers.first(where: { $0.id == winningID })?.authorID {
                award[author, default: 0] += 1
            }

        case .whoHasToExplainThis:
            // +1 for correctly identifying whose camera roll this came out of.
            for voter in tally.voters(for: .player(round.ownerID)) {
                award[voter, default: 0] += 1
            }
        }

        // Never award a point to somebody who is not in the room.
        let known = Set(players.map(\.id))
        return award.filter { known.contains($0.key) }
    }

    /// Scoreboard order: points down, then nickname, so every device draws the
    /// same list. An unstable leaderboard in a party game starts arguments.
    public static func leaderboard(
        scores: [PlayerID: Int],
        players: [Player]
    ) -> [(player: Player, score: Int)] {
        players
            .map { ($0, scores[$0.id] ?? 0) }
            .sorted {
                if $0.1 != $1.1 { return $0.1 > $1.1 }
                if $0.0.nickname != $1.0.nickname { return $0.0.nickname < $1.0.nickname }
                return $0.0.id < $1.0.id
            }
            .map { (player: $0.0, score: $0.1) }
    }
}
