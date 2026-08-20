import Foundation

/// Optional flavour text.
///
/// Everything behind this protocol is decoration. The game is fully playable —
/// and ships that way by default — with `OfflineAIService`, which picks from
/// hand-written lines. Nothing here is ever on the critical path of a round,
/// nothing here ever sees a photo, and the app is not marketed as AI-powered.
public protocol AIService: Sendable {
    /// A silly question to put under a photo. Never about the person.
    func interrogationQuestion(context: FlavourContext) async -> String
    /// The prompt shown in No Context.
    func noContextPrompt(context: FlavourContext) async -> String
    /// Playful wording for one end-game award.
    func awardBlurb(kind: AwardKind, winnerName: String, detail: String) async -> String
}

/// Deliberately tiny. No photo, no pixels, no filename, no caption, no
/// location, no metadata — a remote provider could not identify a person or a
/// place from this if it wanted to.
public struct FlavourContext: Hashable, Sendable {
    public let mode: GameMode
    public let intensity: Intensity
    public let roundNumber: Int
    public let totalRounds: Int

    public init(mode: GameMode, intensity: Intensity, roundNumber: Int, totalRounds: Int) {
        self.mode = mode; self.intensity = intensity
        self.roundNumber = roundNumber; self.totalRounds = totalRounds
    }
}

/// The default. No network, no provider, no key.
public struct OfflineAIService: AIService {
    private let lines: FlavourLines

    public init(lines: FlavourLines = .standard) { self.lines = lines }

    public func interrogationQuestion(context: FlavourContext) async -> String {
        lines.questions.randomElement() ?? "Explain."
    }

    public func noContextPrompt(context: FlavourContext) async -> String {
        lines.noContextPrompts.randomElement() ?? "WHAT DO YOU THINK HAPPENED HERE?"
    }

    public func awardBlurb(kind: AwardKind, winnerName: String, detail: String) async -> String {
        detail
    }
}

/// The hand-written copy. Kept as data so it can be reviewed in one place, and
/// so the safety rules below are checkable rather than a matter of taste.
///
/// Rules these lines follow, and that any AI provider must also follow:
/// never about a person's body, sexuality, religion, health, ethnicity,
/// politics or legality; never an accusation; never a real name; always aimed
/// at the photo, not at the human holding the phone.
public struct FlavourLines: Hashable, Sendable {
    public let questions: [String]
    public let noContextPrompts: [String]
    public let introTaunts: [String]

    public static let standard = FlavourLines(
        questions: [
            "Who took this?",
            "What happened five minutes later?",
            "Why are you dressed like that?",
            "Were you aware this picture existed?",
            "Whose idea was this?",
            "Why is there a traffic cone?",
            "What's happening just outside the frame?",
            "Why was this worth keeping?",
            "What time is it here, exactly?",
            "Who is this for?",
            "What were you about to say?",
            "Why did nobody stop this?",
            "What are you holding?",
            "Where were you going after this?",
            "Why is the lighting like that?"
        ],
        noContextPrompts: [
            "WHAT DO YOU THINK HAPPENED HERE?",
            "EXPLAIN THIS WITHOUT KNOWING ANYTHING.",
            "MAKE SOMETHING UP. QUICKLY.",
            "WHAT'S THE STORY?"
        ],
        introTaunts: [
            "SOMEONE HERE HAS SOME EXPLAINING TO DO.",
            "SOMEBODY'S ABOUT TO HAVE A ROUGH MINUTE.",
            "THE CAMERA ROLL HAS SPOKEN.",
            "EVIDENCE INCOMING.",
            "ONE OF YOU KNOWS WHAT THIS IS."
        ]
    )

    public init(questions: [String], noContextPrompts: [String], introTaunts: [String]) {
        self.questions = questions
        self.noContextPrompts = noContextPrompts
        self.introTaunts = introTaunts
    }
}

/// The rules any remote provider is held to, kept next to the copy they govern
/// so they cannot drift apart. Enforced in the Edge Function's system prompt
/// *and* re-checked on the response, because a system prompt is guidance and a
/// filter is a control.
public enum AISafetyPolicy {
    public static let systemPrompt = """
    You write one short line of flavour text for a party game where friends \
    explain photos from their own camera rolls.

    You never see a photo. You are given only the game mode and the round number.

    Hard rules:
    - Never guess or comment on anyone's appearance, body, sexuality, religion, \
      health, ethnicity, politics, immigration status, or legal history.
    - Never accuse anyone of a crime or of anything they would have to deny.
    - Never write anything sexual.
    - Never use a real person's name.
    - Aim every joke at the photograph, never at the person holding the phone.
    - One sentence. Under 60 characters. No emoji. No hashtags.
    """

    /// Cheap post-filter. If a response trips this, the offline line is used
    /// instead and nothing reaches a screen.
    private static let banned = [
        "gay", "straight", "muslim", "christian", "jewish", "hindu",
        "fat", "ugly", "skinny", "anorexic", "sexy", "nude", "naked",
        "arrested", "criminal", "illegal", "drunk driving", "overdose",
        "pregnant", "cancer", "depressed", "suicidal", "immigrant", "deport",
        "racist", "vote", "republican", "democrat"
    ]

    public static func isAcceptable(_ line: String) -> Bool {
        let trimmed = line.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, trimmed.count <= 90 else { return false }
        let lowered = trimmed.lowercased()
        // Word-boundary check, so "Vote" in "Voted" is fine but a bare political
        // reference is not.
        for word in banned {
            if lowered.range(of: "\\b\(NSRegularExpression.escapedPattern(for: word))\\b",
                             options: [.regularExpression]) != nil {
                return false
            }
        }
        return true
    }
}
