import Foundation

/// Picks the deck the player actually flicks through.
///
/// Ranking alone produces a terrible deck. If someone took forty photos at one
/// party, the top forty candidates are that one party, and the review screen
/// becomes "swipe past the same night twice a minute for two minutes". The
/// player gets bored, approves nothing, and the game has no evidence.
///
/// So this is a greedy maximal-marginal-relevance pass: take the best remaining
/// candidate, then penalise everything that resembles what has already been
/// taken — same year, same kind, same number of faces, visually near-identical.
/// The result is a deck that keeps surprising you, which is the whole job.
public struct DiversitySelector: Sendable {
    /// How hard to push against repetition. 0 = pure ranking, 1 = pure variety.
    public var diversityWeight: Double
    /// Hamming distance under which two perceptual hashes count as the same
    /// photo. 10 bits out of 64 is roughly "burst of the same moment".
    public var duplicateHammingThreshold: Int

    public init(diversityWeight: Double = 0.55, duplicateHammingThreshold: Int = 10) {
        self.diversityWeight = diversityWeight
        self.duplicateHammingThreshold = duplicateHammingThreshold
    }

    public func select(
        scores: [CandidateScore],
        signals: [AssetID: PhotoSignals],
        limit: Int,
        calendar: Calendar = .current
    ) -> [CandidateScore] {
        let pool = scores
            .filter(\.isEligible)
            .sorted { $0.total > $1.total }
        guard limit > 0, !pool.isEmpty else { return [] }

        var chosen: [CandidateScore] = []
        var chosenSignals: [PhotoSignals] = []
        var remaining = pool

        while chosen.count < limit, !remaining.isEmpty {
            var bestIndex = 0
            var bestValue = -Double.infinity

            for (index, candidate) in remaining.enumerated() {
                guard let signal = signals[candidate.assetID] else { continue }
                let penalty = similarity(signal, to: chosenSignals, calendar: calendar)
                let value = candidate.total - diversityWeight * penalty
                if value > bestValue {
                    bestValue = value
                    bestIndex = index
                }
            }

            let picked = remaining.remove(at: bestIndex)
            chosen.append(picked)
            if let signal = signals[picked.assetID] { chosenSignals.append(signal) }
        }

        return chosen
    }

    /// 0 = nothing like anything already picked, 1 = we already have this photo.
    func similarity(
        _ candidate: PhotoSignals,
        to chosen: [PhotoSignals],
        calendar: Calendar
    ) -> Double {
        guard !chosen.isEmpty else { return 0 }

        var worst = 0.0
        for existing in chosen {
            // A near-duplicate is disqualifying on its own, no averaging.
            let distance = (candidate.perceptualHash ^ existing.perceptualHash).nonzeroBitCount
            if candidate.perceptualHash != 0, existing.perceptualHash != 0,
               distance <= duplicateHammingThreshold {
                return 1
            }

            var score = 0.0
            if candidate.kind == existing.kind { score += 0.40 }
            if candidate.year(calendar: calendar) == existing.year(calendar: calendar) { score += 0.25 }
            if faceBucket(candidate) == faceBucket(existing) { score += 0.15 }
            if candidate.isPortrait == existing.isPortrait { score += 0.10 }
            if sameDay(candidate, existing, calendar: calendar) { score += 0.25 }
            worst = max(worst, min(1, score))
        }

        // Saturating: being a bit like five things is worse than being a bit
        // like one thing.
        let crowding = min(1.0, Double(chosen.count) / 40.0) * 0.15
        return min(1, worst + crowding)
    }

    private func faceBucket(_ signals: PhotoSignals) -> Int {
        switch signals.faceCount {
        case 0: return 0
        case 1: return 1
        case 2...3: return 2
        default: return 3
        }
    }

    private func sameDay(_ a: PhotoSignals, _ b: PhotoSignals, calendar: Calendar) -> Bool {
        guard let lhs = a.creationDate, let rhs = b.creationDate else { return false }
        return calendar.isDate(lhs, inSameDayAs: rhs)
    }

    /// A quick, honest description of how varied a deck actually is. Used by the
    /// diversity test and by development mode's deck inspector.
    public static func spread(
        of assets: [AssetID],
        signals: [AssetID: PhotoSignals],
        calendar: Calendar = .current
    ) -> DeckSpread {
        let found = assets.compactMap { signals[$0] }
        return DeckSpread(
            kinds: Set(found.map(\.kind)),
            years: Set(found.compactMap { $0.year(calendar: calendar) }),
            faceBuckets: Set(found.map { min(3, $0.faceCount) }),
            count: found.count
        )
    }
}

public struct DeckSpread: Hashable, Sendable {
    public let kinds: Set<PhotoSignals.Kind>
    public let years: Set<Int>
    public let faceBuckets: Set<Int>
    public let count: Int

    public init(kinds: Set<PhotoSignals.Kind>, years: Set<Int>, faceBuckets: Set<Int>, count: Int) {
        self.kinds = kinds; self.years = years; self.faceBuckets = faceBuckets; self.count = count
    }
}
