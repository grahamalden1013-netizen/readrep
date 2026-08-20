import Foundation

/// One player's approved gameplay deck, already ordered best-first for the
/// chosen intensity. Only ever contains assets the owner explicitly kept.
public struct AssetPool: Codable, Hashable, Sendable {
    public let ownerID: PlayerID
    public let assetIDs: [AssetID]

    public init(ownerID: PlayerID, assetIDs: [AssetID]) {
        self.ownerID = ownerID
        self.assetIDs = assetIDs
    }
}

public struct DealtRound: Hashable, Sendable {
    public let ownerID: PlayerID
    public let assetID: AssetID
}

/// Decides whose photo comes up next.
///
/// Pure randomness is bad here. In a six player, ten round game it will
/// routinely put one person up three times running, and that person stops
/// finding it funny. So: fewest appearances first, never the same person twice
/// in a row when there is an alternative, and never the same photo twice.
public struct RoundDealer: Sendable {
    private var rng: SeededGenerator

    public init(seed: UInt64) { self.rng = SeededGenerator(seed: seed) }

    public init(rng: SeededGenerator) { self.rng = rng }

    public mutating func deal(
        pools: [AssetPool],
        history: [Round],
        index: Int,
        mode: GameMode
    ) -> DealtRound? {
        let usedAssets = Set(history.map(\.assetID))
        let lastOwner = history.last?.ownerID

        // Only pools with something left to show.
        let available = pools
            .map { AssetPool(ownerID: $0.ownerID, assetIDs: $0.assetIDs.filter { !usedAssets.contains($0) }) }
            .filter { !$0.assetIDs.isEmpty }

        guard !available.isEmpty else { return nil }

        var appearances: [PlayerID: Int] = [:]
        for round in history { appearances[round.ownerID, default: 0] += 1 }

        // Prefer anyone who is not the player who just got roasted.
        var eligible = available.filter { $0.ownerID != lastOwner }
        if eligible.isEmpty { eligible = available }

        let fewest = eligible.map { appearances[$0.ownerID] ?? 0 }.min() ?? 0
        let leastSeen = eligible.filter { (appearances[$0.ownerID] ?? 0) == fewest }

        guard let pool = leastSeen.randomElement(using: &rng) else { return nil }
        guard let asset = pickAsset(from: pool.assetIDs) else { return nil }
        return DealtRound(ownerID: pool.ownerID, assetID: asset)
    }

    /// Weighted toward the front of the deck — the scorer already ranked these
    /// — but not deterministic, because a deck that always plays its best card
    /// first gets boring by round four.
    private mutating func pickAsset(from assets: [AssetID]) -> AssetID? {
        guard !assets.isEmpty else { return nil }
        // Triangular weighting: index 0 is `n` times as likely as index n-1.
        let weights = (0..<assets.count).map { Double(assets.count - $0) }
        let total = weights.reduce(0, +)
        var pick = Double.random(in: 0..<total, using: &rng)
        for (i, w) in weights.enumerated() {
            pick -= w
            if pick <= 0 { return assets[i] }
        }
        return assets.last
    }

    /// Truth or Cap's coin flip, kept here so the same seed reproduces a whole
    /// game exactly — which is what makes the QA scenario replayable.
    public mutating func dealSecret() -> SecretReveal {
        let instruction: SecretInstruction = Bool.random(using: &rng) ? .tellTheTruth : .lie
        return SecretReveal(instruction: instruction, nonce: SecretCommitment.makeNonce(using: &rng))
    }

    /// How many rounds this set of decks can actually sustain.
    public static func maxRounds(pools: [AssetPool]) -> Int {
        pools.reduce(0) { $0 + $1.assetIDs.count }
    }
}
