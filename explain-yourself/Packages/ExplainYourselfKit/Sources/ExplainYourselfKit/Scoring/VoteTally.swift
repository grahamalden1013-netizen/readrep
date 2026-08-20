import Foundation

/// Vote totals for one round. Constructed only where results are allowed out.
public struct VoteTally: Codable, Hashable, Sendable {
    public let mode: GameMode
    public let counts: [TallyEntry]
    public let totalVotes: Int

    public struct TallyEntry: Codable, Hashable, Sendable, Identifiable {
        public let choice: VoteChoice
        public let count: Int
        public let voterIDs: [PlayerID]
        public var id: String { "\(choice)" }

        public init(choice: VoteChoice, count: Int, voterIDs: [PlayerID]) {
            self.choice = choice; self.count = count; self.voterIDs = voterIDs
        }
    }

    public init(votes: [Vote], mode: GameMode) {
        self.mode = mode
        self.totalVotes = votes.count

        var buckets: [VoteChoice: [PlayerID]] = [:]
        for vote in votes {
            buckets[vote.choice, default: []].append(vote.voterID)
        }
        self.counts = buckets
            .map { TallyEntry(choice: $0.key, count: $0.value.count, voterIDs: $0.value.sorted()) }
            // Sort by count, then by a stable key, so two devices rendering the
            // same tally never disagree about the order of a tie.
            .sorted { ($0.count, "\($1.choice)") > ($1.count, "\($0.choice)") }
    }

    public func count(_ choice: VoteChoice) -> Int {
        counts.first { $0.choice == choice }?.count ?? 0
    }

    public var winner: VoteChoice? {
        guard let top = counts.first else { return nil }
        // A tie has no winner. Saying "nobody agreed" is funnier and more
        // honest than breaking a tie with an invisible rule.
        let tied = counts.filter { $0.count == top.count }
        return tied.count == 1 ? top.choice : nil
    }

    public var isTie: Bool { winner == nil && !counts.isEmpty }

    /// Did strictly more than half of the votes cast go to `choice`?
    public func isMajority(_ choice: VoteChoice) -> Bool {
        guard totalVotes > 0 else { return false }
        return count(choice) * 2 > totalVotes
    }

    public func voters(for choice: VoteChoice) -> [PlayerID] {
        counts.first { $0.choice == choice }?.voterIDs ?? []
    }
}
