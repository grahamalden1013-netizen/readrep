import Foundation

public enum PlayerStatus: String, Codable, CaseIterable, Sendable {
    case joined
    case selectingPhotos
    case ready
    case disconnected

    public var display: String {
        switch self {
        case .joined:          return "JOINED"
        case .selectingPhotos: return "PREPARING PHOTOS"
        case .ready:           return "READY"
        case .disconnected:    return "DISCONNECTED"
        }
    }

    /// Deliberately not colour-only: VoiceOver and colour-blind players get the
    /// same information from the glyph and the label.
    public var glyph: String {
        switch self {
        case .joined:          return "circle"
        case .selectingPhotos: return "circle.lefthalf.filled"
        case .ready:           return "checkmark.circle.fill"
        case .disconnected:    return "exclamationmark.triangle.fill"
        }
    }
}

public struct Player: Identifiable, Codable, Hashable, Sendable {
    public let id: PlayerID
    public var nickname: String
    public var isHost: Bool
    public var status: PlayerStatus
    /// Count only. The library itself never leaves the device, and neither does
    /// any description of what is in it.
    public var approvedAssetCount: Int
    public var joinedAt: Date
    public var lastSeenAt: Date

    public init(
        id: PlayerID,
        nickname: String,
        isHost: Bool = false,
        status: PlayerStatus = .joined,
        approvedAssetCount: Int = 0,
        joinedAt: Date = Date(),
        lastSeenAt: Date = Date()
    ) {
        self.id = id
        self.nickname = nickname
        self.isHost = isHost
        self.status = status
        self.approvedAssetCount = approvedAssetCount
        self.joinedAt = joinedAt
        self.lastSeenAt = lastSeenAt
    }

    public var isReady: Bool { status == .ready }

    /// A player can contribute photos to the draw only if they actually approved
    /// some. Being "ready" with an empty deck still lets you play — you just
    /// never end up on the wrong end of a reveal.
    public var canContributeAssets: Bool { approvedAssetCount > 0 }
}

public enum NicknameValidator {
    public static let maxLength = 12
    public static let minLength = 1

    public enum Failure: Error, Equatable, Sendable {
        case empty
        case tooLong
        case duplicate
    }

    /// Trims, collapses whitespace and clips to `maxLength`.
    public static func normalize(_ raw: String) -> String {
        let collapsed = raw
            .components(separatedBy: .whitespacesAndNewlines)
            .filter { !$0.isEmpty }
            .joined(separator: " ")
        return String(collapsed.prefix(maxLength))
    }

    public static func validate(
        _ raw: String,
        existing: [String] = []
    ) -> Result<String, Failure> {
        let name = normalize(raw)
        guard name.count >= minLength else { return .failure(.empty) }
        guard raw.trimmingCharacters(in: .whitespacesAndNewlines).count <= maxLength else {
            return .failure(.tooLong)
        }
        let taken = existing.map { $0.lowercased() }
        guard !taken.contains(name.lowercased()) else { return .failure(.duplicate) }
        return .success(name)
    }
}
