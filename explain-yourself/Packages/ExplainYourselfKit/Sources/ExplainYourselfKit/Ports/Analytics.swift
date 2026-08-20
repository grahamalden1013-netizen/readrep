import Foundation

/// Product analytics with a hard wall around it.
///
/// The event list is closed — `AnalyticsEvent` is an enum, not a string — and
/// every event's properties are built here, in one file, from a fixed set of
/// primitives. There is no `track(_ name: String, properties: [String: Any])`
/// anywhere in the app, because that signature is how photo captions end up in
/// a third-party dashboard.
///
/// Never sent, by construction: pixels, thumbnails, filenames, PhotoKit local
/// identifiers, recognised text, captions, coordinates, timestamps of individual
/// photos, nicknames, room codes.
public enum AnalyticsEvent: Sendable {
    case appOpened
    case onboardingCompleted
    case gameCreated(mode: GameMode, rounds: Int, intensity: Intensity)
    case gameJoined(playerCount: Int)
    case photoPermissionStarted
    case photoPermissionGranted(scope: PhotoAccessScope)
    case candidateReviewStarted(candidateCount: Int)
    case candidateKept
    case candidateRejected
    case candidateNeverUse
    case candidateReviewFinished(approved: Int, reviewed: Int)
    case playerReady(approvedCount: Int)
    case gameStarted(mode: GameMode, playerCount: Int, rounds: Int)
    case roundStarted(index: Int, mode: GameMode)
    case voteSubmitted(mode: GameMode)
    case answerSubmitted
    case photoRemoved
    case roundSkipped
    case reconnected(afterSeconds: Int)
    case gameCompleted(mode: GameMode, rounds: Int, playerCount: Int)
    case playAgain
    case recapShared(includedPhotos: Bool)
    case errorShown(code: String)

    public var name: String {
        switch self {
        case .appOpened:                return "app_opened"
        case .onboardingCompleted:      return "onboarding_completed"
        case .gameCreated:              return "game_created"
        case .gameJoined:               return "game_joined"
        case .photoPermissionStarted:   return "photo_permission_started"
        case .photoPermissionGranted:   return "photo_permission_granted"
        case .candidateReviewStarted:   return "candidate_review_started"
        case .candidateKept:            return "candidate_kept"
        case .candidateRejected:        return "candidate_rejected"
        case .candidateNeverUse:        return "candidate_never_use"
        case .candidateReviewFinished:  return "candidate_review_finished"
        case .playerReady:              return "player_ready"
        case .gameStarted:              return "game_started"
        case .roundStarted:             return "round_started"
        case .voteSubmitted:            return "vote_submitted"
        case .answerSubmitted:          return "answer_submitted"
        case .photoRemoved:             return "photo_removed"
        case .roundSkipped:             return "round_skipped"
        case .reconnected:              return "reconnected"
        case .gameCompleted:            return "game_completed"
        case .playAgain:                return "play_again"
        case .recapShared:              return "recap_shared"
        case .errorShown:               return "error_shown"
        }
    }

    /// Only `Int`, `Bool` and closed-enum raw values can get in here. There is
    /// no `String` case that carries user content.
    public var properties: [String: AnalyticsValue] {
        switch self {
        case .gameCreated(let mode, let rounds, let intensity):
            return ["mode": .string(mode.rawValue), "rounds": .int(rounds),
                    "intensity": .string(intensity.rawValue)]
        case .gameJoined(let count):
            return ["player_count": .int(count)]
        case .photoPermissionGranted(let scope):
            return ["scope": .string(scope.rawValue)]
        case .candidateReviewStarted(let count):
            // Bucketed. An exact library-derived count is a fingerprint.
            return ["candidate_bucket": .string(Self.bucket(count))]
        case .candidateReviewFinished(let approved, let reviewed):
            return ["approved_bucket": .string(Self.bucket(approved)),
                    "reviewed_bucket": .string(Self.bucket(reviewed))]
        case .playerReady(let approved):
            return ["approved_bucket": .string(Self.bucket(approved))]
        case .gameStarted(let mode, let players, let rounds):
            return ["mode": .string(mode.rawValue), "player_count": .int(players),
                    "rounds": .int(rounds)]
        case .roundStarted(let index, let mode):
            return ["round_index": .int(index), "mode": .string(mode.rawValue)]
        case .voteSubmitted(let mode):
            return ["mode": .string(mode.rawValue)]
        case .reconnected(let seconds):
            return ["after_seconds": .int(min(seconds, 300))]
        case .gameCompleted(let mode, let rounds, let players):
            return ["mode": .string(mode.rawValue), "rounds": .int(rounds),
                    "player_count": .int(players)]
        case .recapShared(let photos):
            return ["included_photos": .bool(photos)]
        case .errorShown(let code):
            return ["code": .string(code)]
        default:
            return [:]
        }
    }

    private static func bucket(_ value: Int) -> String {
        switch value {
        case ..<1:    return "0"
        case 1..<5:   return "1-4"
        case 5..<10:  return "5-9"
        case 10..<20: return "10-19"
        case 20..<50: return "20-49"
        default:      return "50+"
        }
    }
}

public enum AnalyticsValue: Hashable, Sendable {
    case int(Int)
    case bool(Bool)
    /// Only ever a closed-enum raw value or a bucket label from this file.
    case string(String)
}

public enum PhotoAccessScope: String, Codable, Hashable, Sendable, CaseIterable {
    case denied
    case limited
    case full
}

public protocol AnalyticsService: Sendable {
    func track(_ event: AnalyticsEvent)
}

/// The default in every build until a provider is wired up. Does nothing, which
/// is a perfectly good analytics implementation for a v1.
public struct NoopAnalyticsService: AnalyticsService {
    public init() {}
    public func track(_ event: AnalyticsEvent) {}
}
