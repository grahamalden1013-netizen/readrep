import Foundation

/// A tiny wrapper so a `PlayerID` can never be passed where a `RoomID` belongs.
/// The compiler catches the class of bug that is otherwise impossible to see in
/// a diff: two `String` arguments swapped at a call site.
public protocol OpaqueIdentifier:
    Hashable, Codable, Sendable, CustomStringConvertible, Comparable
{
    var raw: String { get }
    init(_ raw: String)
}

public extension OpaqueIdentifier {
    var description: String { raw }

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        self.init(try container.decode(String.self))
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encode(raw)
    }

    static func < (lhs: Self, rhs: Self) -> Bool { lhs.raw < rhs.raw }

    /// Deterministic-looking but random identifier, used when the client mints
    /// an id optimistically before the server confirms it.
    static func random() -> Self { Self(UUID().uuidString.lowercased()) }
}

public struct PlayerID: OpaqueIdentifier {
    public let raw: String
    public init(_ raw: String) { self.raw = raw }
}

public struct RoomID: OpaqueIdentifier {
    public let raw: String
    public init(_ raw: String) { self.raw = raw }
}

public struct RoundID: OpaqueIdentifier {
    public let raw: String
    public init(_ raw: String) { self.raw = raw }
}

/// Identifies an asset *within the game*. This is deliberately NOT the PhotoKit
/// `localIdentifier`: local identifiers never leave the device, because they are
/// stable handles into a person's private library.
public struct AssetID: OpaqueIdentifier {
    public let raw: String
    public init(_ raw: String) { self.raw = raw }
}

public struct AnswerID: OpaqueIdentifier {
    public let raw: String
    public init(_ raw: String) { self.raw = raw }
}
