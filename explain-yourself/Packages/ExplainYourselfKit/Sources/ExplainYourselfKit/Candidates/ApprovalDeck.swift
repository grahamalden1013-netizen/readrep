import Foundation

public enum ApprovalDecision: String, Codable, Hashable, Sendable {
    /// Into the private gameplay deck. The only path to a photo being uploaded.
    case keep
    /// Not this session. Might come back next time.
    case nope
    /// Never suggest this again, on this device, until exclusions are reset.
    case neverUse
}

/// The review deck's model.
///
/// The whole product principle lives in this type: the player is handed a stack
/// and is mostly saying no. They are never asked to go looking for something
/// embarrassing about themselves — that framing makes people pick safe photos,
/// and safe photos make a boring game.
public struct ApprovalDeck: Sendable {
    public private(set) var pending: [AssetID]
    public private(set) var approved: [AssetID]
    public private(set) var rejected: [AssetID]
    public private(set) var excluded: [AssetID]

    /// The band where the deck is worth playing. Below `minimum` the game shows
    /// WE NEED MORE EVIDENCE rather than starting and running out.
    public static let idealRange = 10...20
    public static let minimum = 5

    public init(candidates: [AssetID]) {
        self.pending = candidates
        self.approved = []
        self.rejected = []
        self.excluded = []
    }

    public var current: AssetID? { pending.first }
    public var upNext: AssetID? { pending.dropFirst().first }
    public var reviewedCount: Int { approved.count + rejected.count + excluded.count }
    public var totalCount: Int { reviewedCount + pending.count }
    public var isFinished: Bool { pending.isEmpty }
    public var hasEnough: Bool { approved.count >= Self.minimum }
    public var hitIdealTarget: Bool { approved.count >= ApprovalDeck.idealRange.lowerBound }

    public var progressText: String {
        "\(approved.count) APPROVED"
    }

    /// Nudge copy under the counter. Encouraging, never nagging, and it never
    /// implies the player should approve something they do not want to.
    public var hint: String? {
        switch approved.count {
        case 0:            return "Keep a few and the game has something to work with."
        case 1..<Self.minimum: return "A few more and you're in."
        case Self.minimum..<ApprovalDeck.idealRange.lowerBound:
            return "Playable. \(ApprovalDeck.idealRange.lowerBound) is the sweet spot."
        default:           return nil
        }
    }

    /// Decisions in the order they were made, so undo is exact rather than
    /// "whichever of the three lists happens to look most recent".
    public private(set) var history: [(asset: AssetID, decision: ApprovalDecision)] = []

    @discardableResult
    public mutating func decide(_ decision: ApprovalDecision) -> AssetID? {
        guard !pending.isEmpty else { return nil }
        let asset = pending.removeFirst()
        switch decision {
        case .keep:     approved.append(asset)
        case .nope:     rejected.append(asset)
        case .neverUse: excluded.append(asset)
        }
        history.append((asset, decision))
        return asset
    }

    /// Undo the last decision. Somebody will always tap NOPE on the one photo
    /// they actually wanted to keep, and making them restart the deck over that
    /// is exactly the kind of small cruelty that gets an app deleted.
    ///
    /// NEVER USE is undoable here too, but the caller must also drop the
    /// exclusion it persisted — see `PhotoExclusionStore.remove`.
    @discardableResult
    public mutating func undo() -> (asset: AssetID, decision: ApprovalDecision)? {
        guard let last = history.popLast() else { return nil }
        switch last.decision {
        case .keep:     approved.removeAll { $0 == last.asset }
        case .nope:     rejected.removeAll { $0 == last.asset }
        case .neverUse: excluded.removeAll { $0 == last.asset }
        }
        pending.insert(last.asset, at: 0)
        return last
    }

    public var canUndo: Bool { !history.isEmpty }

    /// Append freshly analysed candidates — from SELECT MORE PHOTOS, or from a
    /// background pass finishing while the player is still reviewing.
    public mutating func append(_ candidates: [AssetID]) {
        let known = Set(pending + approved + rejected + excluded)
        pending.append(contentsOf: candidates.filter { !known.contains($0) })
    }
}
