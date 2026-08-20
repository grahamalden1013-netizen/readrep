import Foundation

/// Every screen the game can be on, for every device, at any moment.
///
/// The ordering is meaningful: `>=` is used to gate what a device is allowed to
/// know (see `RoundRedactor`). Do not reorder these cases without re-reading
/// every comparison against them.
public enum GamePhase: String, Codable, CaseIterable, Sendable, Comparable {
    /// Lobby, before anyone is ready.
    case waiting
    /// At least one player is still working through their approval deck.
    case preparingPhotos
    /// Everybody is ready; the host has the START button.
    case ready

    /// "SOMEONE HERE HAS SOME EXPLAINING TO DO." — 3, 2, 1.
    case roundIntro
    /// The photo is on screen and nobody knows whose it is yet.
    case photoReveal
    /// "JAKE." — the drop.
    case ownerReveal
    /// Truth or Cap only: the owner's private instruction card.
    case secretInstruction
    /// The 15 second defence, spoken out loud in the room.
    case explanationTimer
    /// No Context only: everyone types a fake explanation.
    case answering
    /// Everybody votes. No partial totals are shown.
    case voting
    /// The sting.
    case resultReveal
    /// Scores updated; host can hold here while the room is still laughing.
    case roundComplete

    case gameComplete

    private var ordinal: Int {
        switch self {
        case .waiting:           return 0
        case .preparingPhotos:   return 1
        case .ready:             return 2
        case .roundIntro:        return 3
        case .photoReveal:       return 4
        case .ownerReveal:       return 5
        case .secretInstruction: return 6
        case .explanationTimer:  return 7
        case .answering:         return 8
        case .voting:            return 9
        case .resultReveal:      return 10
        case .roundComplete:     return 11
        case .gameComplete:      return 12
        }
    }

    public static func < (lhs: GamePhase, rhs: GamePhase) -> Bool {
        lhs.ordinal < rhs.ordinal
    }

    public var isLobby: Bool { self <= .ready }
    public var isInRound: Bool { self >= .roundIntro && self <= .roundComplete }

    /// The order the phases actually run in, per mode.
    ///
    /// This is data, not control flow, which is why `GameStateMachine.advance`
    /// is four lines instead of a switch that grows a case every time a mode is
    /// added. Note that two modes are *not* in enum order: Who Has To Explain
    /// This votes before it reveals the owner, and No Context saves the owner's
    /// real story for after the winning fake one.
    public static func sequence(for mode: GameMode) -> [GamePhase] {
        switch mode {
        case .explainYourself:
            return [.roundIntro, .photoReveal, .ownerReveal, .explanationTimer,
                    .voting, .resultReveal, .roundComplete]
        case .truthOrCap:
            return [.roundIntro, .photoReveal, .ownerReveal, .secretInstruction,
                    .explanationTimer, .voting, .resultReveal, .roundComplete]
        case .noContext:
            return [.roundIntro, .photoReveal, .answering, .voting,
                    .resultReveal, .explanationTimer, .roundComplete]
        case .whoHasToExplainThis:
            return [.roundIntro, .photoReveal, .voting, .ownerReveal,
                    .explanationTimer, .resultReveal, .roundComplete]
        }
    }

    /// How long the coordinator waits before auto-advancing, or `nil` when the
    /// phase ends on human input instead of a clock.
    ///
    /// The pacing here is the product. The 1.6s gap between the photo landing
    /// and the name landing is the single most important number in the app:
    /// long enough for the room to react to the photo, short enough that the
    /// reveal still feels like a drop.
    public func duration(for mode: GameMode) -> TimeInterval? {
        switch self {
        case .roundIntro:        return 3.2      // countdown 3-2-1
        case .photoReveal:       return 1.6      // the pause before the name
        case .ownerReveal:       return 2.0      // "JAKE." … "EXPLAIN YOURSELF."
        case .secretInstruction: return 3.5      // owner reads their card
        case .explanationTimer:  return TimeInterval(mode.explanationSeconds)
        case .answering:         return 45       // generous; ends early when all in
        case .voting:            return 30       // generous; ends early when all in
        case .resultReveal:      return nil      // host holds it. Let them laugh.
        case .roundComplete:     return nil
        default:                 return nil
        }
    }

    /// The phase can end early once everybody has done their bit.
    public var endsWhenEveryoneHasActed: Bool {
        self == .voting || self == .answering
    }
}
