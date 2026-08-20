import Foundation

/// Categories of thing that must not end up on a television-sized reveal in
/// front of five friends.
public enum SensitiveCategory: String, Codable, Hashable, Sendable, CaseIterable {
    case explicit
    case credentials
    case financial
    case identityDocument
    case medical
    case privateConversation
    case machineReadableCode
    case documentLike

    /// Some categories are hard stops. Others only push a photo down the deck,
    /// because the signal is weak enough that blocking would eat harmless
    /// photos — a group shot in front of a whiteboard is "document-like" too.
    public var isHardBlock: Bool {
        switch self {
        case .explicit, .credentials, .financial, .identityDocument, .medical:
            return true
        case .privateConversation, .machineReadableCode, .documentLike:
            return false
        }
    }
}

public enum SafetyVerdict: Hashable, Sendable {
    case allowed
    /// Kept, but pushed far down the deck.
    case deprioritised(Set<SensitiveCategory>)
    /// Never shown in the approval deck at all.
    case blocked(Set<SensitiveCategory>)

    public var isBlocked: Bool { if case .blocked = self { return true }; return false }

    public var categories: Set<SensitiveCategory> {
        switch self {
        case .allowed: return []
        case .deprioritised(let c), .blocked(let c): return c
        }
    }

    /// Multiplier applied to the candidate score.
    public var scoreMultiplier: Double {
        switch self {
        case .allowed:        return 1.0
        case .deprioritised:  return 0.15
        case .blocked:        return 0.0
        }
    }
}

/// Inputs to the safety pass. Produced on-device from Vision text recognition,
/// barcode detection, and Apple's `SensitiveContentAnalysis` where the user has
/// it enabled.
///
/// Note what is *not* here: no recognised text is ever retained. The extractor
/// runs the matcher against the text and keeps only which categories fired.
/// Storing the text would mean storing the contents of people's screenshots.
public struct SafetySignals: Codable, Hashable, Sendable {
    /// From `SCSensitivityAnalyzer`. `nil` when the API is unavailable or the
    /// user has Sensitive Content Warning switched off — which is exactly why
    /// human approval can never be optional.
    public var sensitiveContentFlagged: Bool?
    public var matchedCategories: Set<SensitiveCategory>
    public var textDensity: Double
    public var recognisedLineCount: Int
    public var barcodeCount: Int
    public var isScreenshot: Bool
    public var faceCount: Int

    public init(
        sensitiveContentFlagged: Bool? = nil,
        matchedCategories: Set<SensitiveCategory> = [],
        textDensity: Double = 0,
        recognisedLineCount: Int = 0,
        barcodeCount: Int = 0,
        isScreenshot: Bool = false,
        faceCount: Int = 0
    ) {
        self.sensitiveContentFlagged = sensitiveContentFlagged
        self.matchedCategories = matchedCategories
        self.textDensity = textDensity
        self.recognisedLineCount = recognisedLineCount
        self.barcodeCount = barcodeCount
        self.isScreenshot = isScreenshot
        self.faceCount = faceCount
    }
}

public protocol PhotoSafetyEvaluating: Sendable {
    func evaluate(_ signals: SafetySignals) -> SafetyVerdict
}

/// The local safety pass.
///
/// This is a filter, not a guarantee, and the product never claims otherwise.
/// It exists to make the approval deck safe enough to flick through quickly in
/// company — the point being that a person should not have to see their own
/// bank statement on screen in order to reject it. The human KEEP is still the
/// only thing that lets a photo into a game.
public struct HeuristicSafetyEvaluator: PhotoSafetyEvaluating {
    public init() {}

    public func evaluate(_ signals: SafetySignals) -> SafetyVerdict {
        var blocking: Set<SensitiveCategory> = []
        var soft: Set<SensitiveCategory> = []

        if signals.sensitiveContentFlagged == true {
            blocking.insert(.explicit)
        }

        for category in signals.matchedCategories {
            if category.isHardBlock { blocking.insert(category) } else { soft.insert(category) }
        }

        // A QR or barcode can carry a login link or a payment request, and a
        // photo of one on a big screen is scannable by everyone in the room.
        if signals.barcodeCount > 0 { soft.insert(.machineReadableCode) }

        // A screenshot that is mostly text and has no faces in it is somebody's
        // conversation, notes app, or account page. Rarely funny, often private.
        if signals.isScreenshot, signals.textDensity > 0.22, signals.faceCount == 0 {
            soft.insert(.privateConversation)
        }

        // Wall-of-text of any provenance.
        if signals.recognisedLineCount >= 25, signals.faceCount == 0 {
            soft.insert(.documentLike)
        }

        if !blocking.isEmpty { return .blocked(blocking) }
        if !soft.isEmpty { return .deprioritised(soft) }
        return .allowed
    }
}

/// Matches recognised text against sensitive patterns, on-device, and discards
/// the text immediately afterwards.
///
/// Keyword matching is crude and everyone involved should know it: it is
/// English-biased, it will miss things, and it will occasionally flag a photo
/// of a receipt from a pizza place. Both failure modes are acceptable because
/// the human still decides. What is not acceptable is retaining the text, so
/// this type returns a `Set<SensitiveCategory>` and nothing else.
public enum SensitiveTextMatcher {
    private static let keywords: [SensitiveCategory: [String]] = [
        .credentials: [
            "password", "passcode", "one-time code", "one time code", "verification code",
            "2fa", "two-factor", "authenticator", "recovery key", "seed phrase",
            "api key", "secret key", "private key", "do not share this code",
            "your code is", "security code", "pin is"
        ],
        .financial: [
            "routing number", "account number", "sort code", "iban", "swift code",
            "card number", "cvv", "cvc", "expiry", "available balance",
            "statement period", "wire transfer", "invoice total", "amount due",
            "credit limit", "overdraft", "tax return", "payslip", "pay stub"
        ],
        .identityDocument: [
            "passport", "driver's licence", "drivers license", "driver's license",
            "national insurance", "social security", "ssn", "date of birth",
            "identity card", "residence permit", "visa number", "licence number"
        ],
        .medical: [
            "diagnosis", "prescription", "dosage", "mg twice daily", "patient id",
            "medical record", "test result", "lab result", "blood pressure",
            "referral letter", "nhs number", "insurance claim", "pharmacy"
        ]
    ]

    /// Card-shaped and code-shaped numbers, which keywords alone miss.
    private static let patterns: [(SensitiveCategory, String)] = [
        (.financial, #"\b(?:\d[ -]?){13,19}\b"#),          // card-like PAN
        (.credentials, #"\b\d{6}\b(?=[^\d]*(code|otp))"#), // 6-digit near "code"
        (.identityDocument, #"\b\d{3}-\d{2}-\d{4}\b"#)     // US SSN shape
    ]

    /// Returns only the categories that fired. The input string is not stored,
    /// logged, hashed, or returned.
    public static func categories(in recognisedText: String) -> Set<SensitiveCategory> {
        let haystack = recognisedText.lowercased()
        var found: Set<SensitiveCategory> = []

        for (category, words) in keywords {
            if words.contains(where: { haystack.contains($0) }) { found.insert(category) }
        }

        for (category, pattern) in patterns where !found.contains(category) {
            guard let regex = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive]) else {
                continue
            }
            let range = NSRange(haystack.startIndex..<haystack.endIndex, in: haystack)
            if regex.firstMatch(in: haystack, options: [], range: range) != nil {
                found.insert(category)
            }
        }

        return found
    }
}
