import Foundation

public enum ScoreFactor: String, Codable, Hashable, Sendable, CaseIterable {
    case faces
    case crowd
    case selfie
    case screenshot
    case blur
    case exposure
    case age
    case oddFraming
    case novelty
    case nightTime
    case textPenalty
    case curatedPenalty
    case videoPenalty
}

public struct CandidateScore: Hashable, Sendable, Identifiable {
    public let assetID: AssetID
    public let total: Double
    public let breakdown: [ScoreFactor: Double]
    public let safety: SafetyVerdict

    public var id: AssetID { assetID }
    public var isEligible: Bool { !safety.isBlocked && total > 0 }

    public init(
        assetID: AssetID,
        total: Double,
        breakdown: [ScoreFactor: Double],
        safety: SafetyVerdict
    ) {
        self.assetID = assetID
        self.total = total
        self.breakdown = breakdown
        self.safety = safety
    }

    /// Development-mode explainer. Never shown to players — knowing *why* the
    /// app thinks your photo is funny ruins it.
    public var debugDescription: String {
        let parts = breakdown
            .filter { abs($0.value) > 0.001 }
            .sorted { abs($0.value) > abs($1.value) }
            .map { "\($0.key.rawValue) \(String(format: "%+.2f", $0.value))" }
        return "\(String(format: "%.2f", total)) [\(parts.joined(separator: ", "))]"
    }
}

public protocol PhotoCandidateScoring: Sendable {
    func score(
        _ signals: PhotoSignals,
        safety: SafetyVerdict,
        profile: LibraryProfile,
        intensity: Intensity,
        now: Date
    ) -> CandidateScore
}

/// Per-intensity weights. This is the entire difference between CHILL and CHAOS
/// — no separate code paths, just a different opinion about what is worth
/// showing.
public struct ScoringWeights: Hashable, Sendable {
    public var faces: Double
    public var crowd: Double
    public var selfie: Double
    public var screenshot: Double
    public var blur: Double
    public var exposure: Double
    public var age: Double
    public var oddFraming: Double
    public var novelty: Double
    public var nightTime: Double
    public var textPenalty: Double
    public var curatedPenalty: Double
    public var videoPenalty: Double

    public static func weights(for intensity: Intensity) -> ScoringWeights {
        switch intensity {
        case .chill:
            // Group memories and warm old photos. Nothing that makes anyone
            // wince: blur, bad exposure and odd framing are actively avoided.
            return ScoringWeights(
                faces: 1.0, crowd: 1.4, selfie: 0.5, screenshot: -0.4,
                blur: -0.5, exposure: -0.3, age: 1.1, oddFraming: -0.2,
                novelty: 0.4, nightTime: 0.1, textPenalty: -1.2,
                curatedPenalty: 0.0, videoPenalty: -0.4
            )
        case .dangerous:
            // The default. Awkward, forgotten, mildly cursed.
            return ScoringWeights(
                faces: 0.9, crowd: 0.8, selfie: 1.0, screenshot: 0.5,
                blur: 0.7, exposure: 0.5, age: 1.3, oddFraming: 0.9,
                novelty: 1.0, nightTime: 0.6, textPenalty: -0.8,
                curatedPenalty: -0.6, videoPenalty: -0.2
            )
        case .chaos:
            // Maximum strangeness. Rewards exactly the photos a camera roll
            // has no explanation for.
            return ScoringWeights(
                faces: 0.4, crowd: 0.5, selfie: 0.8, screenshot: 0.8,
                blur: 1.3, exposure: 1.1, age: 1.0, oddFraming: 1.6,
                novelty: 1.6, nightTime: 0.9, textPenalty: -0.5,
                curatedPenalty: -1.0, videoPenalty: 0.0
            )
        }
    }

    public init(
        faces: Double, crowd: Double, selfie: Double, screenshot: Double,
        blur: Double, exposure: Double, age: Double, oddFraming: Double,
        novelty: Double, nightTime: Double, textPenalty: Double,
        curatedPenalty: Double, videoPenalty: Double
    ) {
        self.faces = faces; self.crowd = crowd; self.selfie = selfie
        self.screenshot = screenshot; self.blur = blur; self.exposure = exposure
        self.age = age; self.oddFraming = oddFraming; self.novelty = novelty
        self.nightTime = nightTime; self.textPenalty = textPenalty
        self.curatedPenalty = curatedPenalty; self.videoPenalty = videoPenalty
    }
}

/// The heuristic ranker.
///
/// It does not know what is embarrassing, and the product never pretends it
/// does. What it can do is find photos with the *shape* of a story: a face too
/// close to the lens, four people at an angle nobody would frame on purpose,
/// something from six years ago that the owner has not thought about since.
/// Then a human decides.
///
/// Every factor is normalised to roughly 0...1 before weighting, so the weights
/// above are directly comparable and a new signal cannot accidentally dominate.
/// Swapping this for a Core ML model later means conforming to
/// `PhotoCandidateScoring` and changing one line in `AppEnvironment`.
public struct HeuristicCandidateScorer: PhotoCandidateScoring {
    public init() {}

    public func score(
        _ signals: PhotoSignals,
        safety: SafetyVerdict,
        profile: LibraryProfile,
        intensity: Intensity,
        now: Date
    ) -> CandidateScore {
        let w = ScoringWeights.weights(for: intensity)
        var breakdown: [ScoreFactor: Double] = [:]

        // Faces: something to react to. Saturates at 1 — a face is a face.
        breakdown[.faces] = w.faces * (signals.faceCount > 0 ? 1 : 0)

        // Crowds: more people means more people who remember it differently.
        let crowd = min(1, Double(max(0, signals.faceCount - 1)) / 4.0)
        breakdown[.crowd] = w.crowd * crowd

        // Selfie, weighted by how much of the frame the face eats.
        let selfieness = signals.isSelfie
            ? max(0.6, min(1, signals.largestFaceFraction / 0.3))
            : min(1, signals.largestFaceFraction / 0.35)
        breakdown[.selfie] = w.selfie * selfieness

        breakdown[.screenshot] = w.screenshot * (signals.isScreenshot ? 1 : 0)
        breakdown[.blur] = w.blur * clamp(signals.blur)
        breakdown[.exposure] = w.exposure * clamp(signals.exposureExtremity)

        // Age, on a log curve. A photo from last week is worth nothing; the gap
        // between four and five years ago barely matters.
        let ageDays = signals.ageInDays(now: now)
        let age = ageDays <= 30 ? 0 : min(1, log10(ageDays / 30) / log10(60))
        breakdown[.age] = w.age * age

        // Odd framing: faces shoved into a corner, or an aspect ratio that
        // means somebody cropped this in a hurry.
        let aspectOddity = min(1, abs(log2(signals.aspectRatio)) / 1.5)
        breakdown[.oddFraming] = w.oddFraming * max(clamp(signals.faceOffCentre), aspectOddity * 0.7)

        // Not like your other photos.
        breakdown[.novelty] = w.novelty * profile.rarity(of: signals.kind)

        // Between 11pm and 4am, decisions get worse and photos get better.
        if let hour = signals.hour() {
            let late = (hour >= 23 || hour <= 4) ? 1.0 : 0.0
            breakdown[.nightTime] = w.nightTime * late
        }

        // Walls of text are somebody's notes app, not a story.
        breakdown[.textPenalty] = w.textPenalty * clamp(signals.textDensity / 0.4)

        // A favourited, edited photo is one the owner already chose to be seen.
        // That is the opposite of what this game is looking for.
        let curated = (signals.isFavorite ? 0.6 : 0) + (signals.isEdited ? 0.4 : 0)
            + (signals.isInSharedAlbum ? 0.4 : 0)
        breakdown[.curatedPenalty] = w.curatedPenalty * min(1, curated)

        breakdown[.videoPenalty] = w.videoPenalty * (signals.isVideo ? 1 : 0)

        let raw = breakdown.values.reduce(0, +)
        // Squash to 0...1 so scores are comparable across intensities and can be
        // shown as a bar in development mode.
        let normalised = 1 / (1 + exp(-raw / 2.0))

        return CandidateScore(
            assetID: signals.assetID,
            total: normalised * safety.scoreMultiplier,
            breakdown: breakdown,
            safety: safety
        )
    }

    private func clamp(_ value: Double) -> Double { max(0, min(1, value)) }
}
