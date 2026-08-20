import Foundation

/// Everything the on-device analysis learned about one photo.
///
/// This struct is the boundary between "Apple frameworks" and "our rules".
/// PhotoKit and Vision produce it; the scorer consumes it. Nothing downstream
/// ever touches a `PHAsset`, which is what lets the whole ranking system be
/// tested with plain structs and no photo library.
///
/// It contains no pixels, no captions, no location, and no PhotoKit local
/// identifier. `assetID` is a salted hash of the local identifier: stable for
/// this install so exclusions work, useless to anyone else.
public struct PhotoSignals: Codable, Hashable, Sendable {
    public let assetID: AssetID
    public let creationDate: Date?
    public let pixelWidth: Int
    public let pixelHeight: Int

    // Provenance
    public var isScreenshot: Bool
    public var isSelfie: Bool
    public var isVideo: Bool
    public var isLivePhoto: Bool
    public var isFavorite: Bool
    public var isEdited: Bool
    public var isInSharedAlbum: Bool

    // What Vision found
    public var faceCount: Int
    /// Area of the largest face as a fraction of the frame. Big face + few
    /// pixels of anything else is the shape of a photo taken at arm's length
    /// at 2am.
    public var largestFaceFraction: Double
    /// 0 = faces dead centre, 1 = faces jammed into a corner.
    public var faceOffCentre: Double
    /// 0 = sharp, 1 = smeared.
    public var blur: Double
    /// 0 = well exposed, 1 = blown out or nearly black.
    public var exposureExtremity: Double
    /// Fraction of the frame covered by recognised text.
    public var textDensity: Double
    public var barcodeCount: Int
    /// Coarse perceptual hash. Used only for near-duplicate suppression.
    public var perceptualHash: UInt64

    public init(
        assetID: AssetID,
        creationDate: Date?,
        pixelWidth: Int,
        pixelHeight: Int,
        isScreenshot: Bool = false,
        isSelfie: Bool = false,
        isVideo: Bool = false,
        isLivePhoto: Bool = false,
        isFavorite: Bool = false,
        isEdited: Bool = false,
        isInSharedAlbum: Bool = false,
        faceCount: Int = 0,
        largestFaceFraction: Double = 0,
        faceOffCentre: Double = 0,
        blur: Double = 0,
        exposureExtremity: Double = 0,
        textDensity: Double = 0,
        barcodeCount: Int = 0,
        perceptualHash: UInt64 = 0
    ) {
        self.assetID = assetID
        self.creationDate = creationDate
        self.pixelWidth = pixelWidth
        self.pixelHeight = pixelHeight
        self.isScreenshot = isScreenshot
        self.isSelfie = isSelfie
        self.isVideo = isVideo
        self.isLivePhoto = isLivePhoto
        self.isFavorite = isFavorite
        self.isEdited = isEdited
        self.isInSharedAlbum = isInSharedAlbum
        self.faceCount = faceCount
        self.largestFaceFraction = largestFaceFraction
        self.faceOffCentre = faceOffCentre
        self.blur = blur
        self.exposureExtremity = exposureExtremity
        self.textDensity = textDensity
        self.barcodeCount = barcodeCount
        self.perceptualHash = perceptualHash
    }

    public var aspectRatio: Double {
        guard pixelHeight > 0 else { return 1 }
        return Double(pixelWidth) / Double(pixelHeight)
    }

    public var isPortrait: Bool { pixelHeight >= pixelWidth }

    public func ageInDays(now: Date) -> Double {
        guard let creationDate else { return 0 }
        return max(0, now.timeIntervalSince(creationDate) / 86_400)
    }

    public func year(calendar: Calendar = .current) -> Int? {
        creationDate.map { calendar.component(.year, from: $0) }
    }

    public func hour(calendar: Calendar = .current) -> Int? {
        creationDate.map { calendar.component(.hour, from: $0) }
    }

    /// A coarse bucket used both for diversity and for the "not like your usual
    /// photos" signal.
    public enum Kind: String, Codable, Hashable, Sendable, CaseIterable {
        case selfie, group, portrait, screenshot, scene, video
    }

    public var kind: Kind {
        if isVideo { return .video }
        if isScreenshot { return .screenshot }
        if faceCount >= 3 { return .group }
        if isSelfie || (faceCount >= 1 && largestFaceFraction > 0.18) { return .selfie }
        if faceCount >= 1 { return .portrait }
        return .scene
    }
}

/// What this person's camera roll normally looks like.
///
/// "Game-worthy" is relative. A photographer's roll is 90% landscapes, so a
/// blurry selfie is an event; a teenager's roll is 90% selfies, so a landscape
/// is. Scoring against the owner's own baseline is what stops the app handing
/// everyone the same fifteen near-identical front-camera shots.
public struct LibraryProfile: Codable, Hashable, Sendable {
    public let sampleCount: Int
    public let kindShare: [PhotoSignals.Kind: Double]
    public let medianAgeDays: Double
    public let oldestAgeDays: Double

    public init(
        sampleCount: Int,
        kindShare: [PhotoSignals.Kind: Double],
        medianAgeDays: Double,
        oldestAgeDays: Double
    ) {
        self.sampleCount = sampleCount
        self.kindShare = kindShare
        self.medianAgeDays = medianAgeDays
        self.oldestAgeDays = oldestAgeDays
    }

    public static let empty = LibraryProfile(
        sampleCount: 0, kindShare: [:], medianAgeDays: 0, oldestAgeDays: 0
    )

    public static func build(from signals: [PhotoSignals], now: Date) -> LibraryProfile {
        guard !signals.isEmpty else { return .empty }

        var counts: [PhotoSignals.Kind: Int] = [:]
        for signal in signals { counts[signal.kind, default: 0] += 1 }
        let total = Double(signals.count)
        let share = counts.mapValues { Double($0) / total }

        let ages = signals.map { $0.ageInDays(now: now) }.sorted()
        let median = ages.isEmpty ? 0 : ages[ages.count / 2]

        return LibraryProfile(
            sampleCount: signals.count,
            kindShare: share,
            medianAgeDays: median,
            oldestAgeDays: ages.last ?? 0
        )
    }

    /// 0 for "you take these constantly", 1 for "you have never taken one of
    /// these before".
    public func rarity(of kind: PhotoSignals.Kind) -> Double {
        guard sampleCount >= 20 else { return 0.5 }  // not enough to judge
        let share = kindShare[kind] ?? 0
        return max(0, min(1, 1 - (share / 0.35)))
    }
}
