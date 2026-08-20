import Foundation

public enum GameMode: String, Codable, CaseIterable, Sendable, Identifiable {
    case explainYourself
    case truthOrCap
    case noContext
    case whoHasToExplainThis

    public var id: String { rawValue }

    public var title: String {
        switch self {
        case .explainYourself:      return "EXPLAIN YOURSELF"
        case .truthOrCap:           return "TRUTH OR CAP"
        case .noContext:            return "NO CONTEXT"
        case .whoHasToExplainThis:  return "WHO HAS TO EXPLAIN THIS?"
        }
    }

    public var blurb: String {
        switch self {
        case .explainYourself:
            return "A photo appears. Then a name. Good luck."
        case .truthOrCap:
            return "The owner is secretly told to lie. Or not."
        case .noContext:
            return "Everyone invents what happened. Funniest wins."
        case .whoHasToExplainThis:
            return "Guess whose camera roll this crawled out of."
        }
    }

    /// Whether the owner's identity is hidden until after the group has acted.
    public var hidesOwnerUntilVote: Bool {
        switch self {
        case .noContext, .whoHasToExplainThis: return true
        case .explainYourself, .truthOrCap:    return false
        }
    }

    /// Only Truth or Cap hands the owner a secret instruction.
    public var usesSecretInstruction: Bool { self == .truthOrCap }

    /// Only No Context asks players to type something.
    public var usesWrittenAnswers: Bool { self == .noContext }

    /// The owner does not vote in modes where they trivially know the answer.
    public var ownerVotes: Bool { false }

    public var explanationSeconds: Int {
        switch self {
        case .noContext: return 20   // the real story, told after the reveal
        default:         return 15
        }
    }
}

public enum Intensity: String, Codable, CaseIterable, Sendable, Identifiable {
    case chill
    case dangerous
    case chaos

    public var id: String { rawValue }

    public var title: String { rawValue.uppercased() }

    public var blurb: String {
        switch self {
        case .chill:     return "Harmless, funny, safe for the group chat."
        case .dangerous: return "Awkward, forgotten, slightly cursed."
        case .chaos:     return "The strangest things you approved."
        }
    }
}

public enum EndReason: String, Codable, Sendable {
    case completed
    case hostEnded
    case abandoned
    case notEnoughPlayers
}
