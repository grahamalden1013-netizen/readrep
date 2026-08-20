import Foundation

public enum VoteChoice: Hashable, Sendable {
    /// Explain Yourself
    case fairEnough
    case absoluteCap
    /// Truth or Cap
    case truth
    case cap
    /// Who Has To Explain This — a guess at the owner
    case player(PlayerID)
    /// No Context — a vote for someone's written answer
    case answer(AnswerID)

    public var label: String {
        switch self {
        case .fairEnough:  return "FAIR ENOUGH"
        case .absoluteCap: return "ABSOLUTE CAP"
        case .truth:       return "TRUTH"
        case .cap:         return "CAP"
        case .player:      return "PLAYER"
        case .answer:      return "ANSWER"
        }
    }

    /// The set of buttons a given mode should draw.
    public static func options(
        for mode: GameMode,
        players: [Player] = [],
        answers: [PlayerAnswer] = []
    ) -> [VoteChoice] {
        switch mode {
        case .explainYourself:     return [.fairEnough, .absoluteCap]
        case .truthOrCap:          return [.truth, .cap]
        case .whoHasToExplainThis: return players.map { .player($0.id) }
        case .noContext:           return answers.map { .answer($0.id) }
        }
    }
}

// Hand-written coding: the synthesised representation for enums with associated
// values is awkward to query from SQL. `{"kind":"player","value":"…"}` is not.
extension VoteChoice: Codable {
    private enum CodingKeys: String, CodingKey { case kind, value }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        let kind = try c.decode(String.self, forKey: .kind)
        switch kind {
        case "fair_enough":  self = .fairEnough
        case "absolute_cap": self = .absoluteCap
        case "truth":        self = .truth
        case "cap":          self = .cap
        case "player":       self = .player(PlayerID(try c.decode(String.self, forKey: .value)))
        case "answer":       self = .answer(AnswerID(try c.decode(String.self, forKey: .value)))
        default:
            throw DecodingError.dataCorrupted(
                .init(codingPath: decoder.codingPath, debugDescription: "Unknown vote kind \(kind)")
            )
        }
    }

    public func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case .fairEnough:      try c.encode("fair_enough", forKey: .kind)
        case .absoluteCap:     try c.encode("absolute_cap", forKey: .kind)
        case .truth:           try c.encode("truth", forKey: .kind)
        case .cap:             try c.encode("cap", forKey: .kind)
        case .player(let id):  try c.encode("player", forKey: .kind); try c.encode(id.raw, forKey: .value)
        case .answer(let id):  try c.encode("answer", forKey: .kind); try c.encode(id.raw, forKey: .value)
        }
    }
}

public struct Vote: Codable, Hashable, Identifiable, Sendable {
    public let roundID: RoundID
    public let voterID: PlayerID
    public let choice: VoteChoice
    public let castAt: Date

    public var id: String { "\(roundID.raw):\(voterID.raw)" }

    public init(roundID: RoundID, voterID: PlayerID, choice: VoteChoice, castAt: Date = Date()) {
        self.roundID = roundID
        self.voterID = voterID
        self.choice = choice
        self.castAt = castAt
    }
}

public struct PlayerAnswer: Codable, Hashable, Identifiable, Sendable {
    public static let maxLength = 120

    public let id: AnswerID
    public let roundID: RoundID
    public let authorID: PlayerID
    public let text: String
    public let submittedAt: Date

    public init(
        id: AnswerID = .random(),
        roundID: RoundID,
        authorID: PlayerID,
        text: String,
        submittedAt: Date = Date()
    ) {
        self.id = id
        self.roundID = roundID
        self.authorID = authorID
        self.text = PlayerAnswer.sanitize(text)
        self.submittedAt = submittedAt
    }

    /// Collapse whitespace and hard-clip. Keeps No Context reading fast on a
    /// phone held up across a table.
    public static func sanitize(_ raw: String) -> String {
        let collapsed = raw
            .components(separatedBy: .whitespacesAndNewlines)
            .filter { !$0.isEmpty }
            .joined(separator: " ")
        return String(collapsed.prefix(maxLength))
    }

    public static func isValid(_ raw: String) -> Bool { !sanitize(raw).isEmpty }
}
