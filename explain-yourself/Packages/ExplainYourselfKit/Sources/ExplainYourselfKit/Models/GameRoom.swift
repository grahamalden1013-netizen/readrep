import Foundation

public enum RoomLifecycle: String, Codable, Sendable {
    case lobby
    case inProgress
    case finished
    case expired
}

public struct GameSettings: Codable, Hashable, Sendable {
    public var mode: GameMode
    public var roundCount: Int
    public var intensity: Intensity
    public var soundEnabled: Bool

    public static let allowedRoundCounts = [5, 10, 15, 20]
    public static let `default` = GameSettings(
        mode: .explainYourself, roundCount: 10, intensity: .dangerous, soundEnabled: true
    )

    public init(
        mode: GameMode = .explainYourself,
        roundCount: Int = 10,
        intensity: Intensity = .dangerous,
        soundEnabled: Bool = true
    ) {
        self.mode = mode
        self.roundCount = Self.allowedRoundCounts.contains(roundCount) ? roundCount : 10
        self.intensity = intensity
        self.soundEnabled = soundEnabled
    }
}

public struct GameRoom: Identifiable, Codable, Hashable, Sendable {
    public static let minPlayers = 3
    public static let maxPlayers = 10
    /// A room with no traffic for this long is fair game for the cleanup job.
    public static let idleExpiry: TimeInterval = 60 * 60 * 6

    public let id: RoomID
    public let code: RoomCode
    public var hostID: PlayerID
    public var settings: GameSettings
    public var players: [Player]
    public var lifecycle: RoomLifecycle
    public let createdAt: Date
    public var updatedAt: Date

    public init(
        id: RoomID,
        code: RoomCode,
        hostID: PlayerID,
        settings: GameSettings = .default,
        players: [Player] = [],
        lifecycle: RoomLifecycle = .lobby,
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.code = code
        self.hostID = hostID
        self.settings = settings
        self.players = players
        self.lifecycle = lifecycle
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    public var connectedPlayers: [Player] { players.filter { $0.status != .disconnected } }
    public var readyPlayers: [Player] { players.filter(\.isReady) }
    public var isFull: Bool { players.count >= Self.maxPlayers }

    public func player(_ id: PlayerID) -> Player? { players.first { $0.id == id } }
    public func isHost(_ id: PlayerID) -> Bool { hostID == id }

    /// The host may start once there are enough humans, everybody has finished
    /// deciding, and at least two people actually put photos in. One person's
    /// deck being the only source would out them instantly.
    public var canStart: Bool {
        guard lifecycle == .lobby else { return false }
        let ready = readyPlayers
        return ready.count >= Self.minPlayers
            && ready.count == connectedPlayers.count
            && ready.filter(\.canContributeAssets).count >= 2
    }

    public var startBlockedReason: String? {
        guard lifecycle == .lobby else { return "This game already started." }
        let ready = readyPlayers
        if connectedPlayers.count < Self.minPlayers {
            let needed = Self.minPlayers - connectedPlayers.count
            return "Need \(needed) more player\(needed == 1 ? "" : "s")."
        }
        if ready.count != connectedPlayers.count {
            let waiting = connectedPlayers.count - ready.count
            return "Waiting on \(waiting) player\(waiting == 1 ? "" : "s")."
        }
        if ready.filter(\.canContributeAssets).count < 2 {
            return "At least 2 players need approved photos."
        }
        return nil
    }
}

/// A four digit code, spoken out loud across a room. It is a *lookup* key, not a
/// credential: joining still requires the server to check the room is in its
/// lobby and has space, and every subsequent action is authorised by the
/// player's own token rather than by knowing the code.
public struct RoomCode: Hashable, Codable, Sendable, CustomStringConvertible {
    public let value: String

    public init?(_ raw: String) {
        let digits = raw.filter(\.isNumber)
        guard digits.count == 4 else { return nil }
        self.value = digits
    }

    public init(from decoder: Decoder) throws {
        let raw = try decoder.singleValueContainer().decode(String.self)
        guard let code = RoomCode(raw) else {
            throw DecodingError.dataCorrupted(
                .init(codingPath: decoder.codingPath, debugDescription: "Bad room code \(raw)")
            )
        }
        self = code
    }

    public func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        try c.encode(value)
    }

    public var description: String { value }

    /// Grouped for the lobby's large display: `48 21`.
    public var display: String {
        let mid = value.index(value.startIndex, offsetBy: 2)
        return "\(value[value.startIndex..<mid]) \(value[mid...])"
    }

    /// Avoids codes that read badly across a loud room (`0000`, `1111`, …).
    public static func generate(
        using generator: inout some RandomNumberGenerator
    ) -> RoomCode {
        while true {
            let n = Int.random(in: 1000...9999, using: &generator)
            let s = String(n)
            let unique = Set(s)
            if unique.count == 1 { continue }
            return RoomCode(s)!
        }
    }

    public static func generate() -> RoomCode {
        var g = SystemRandomNumberGenerator()
        return generate(using: &g)
    }
}
