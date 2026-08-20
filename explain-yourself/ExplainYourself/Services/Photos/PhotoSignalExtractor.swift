import Photos
import Vision
import UIKit
import CoreImage
import ExplainYourselfKit

#if canImport(SensitiveContentAnalysis)
import SensitiveContentAnalysis
#endif

/// Turns a `PHAsset` into the plain structs the ranking system understands.
///
/// This is the only place that runs Vision, and it is deliberately narrow about
/// what it asks for. It detects *that* a face exists — a rectangle, a count, a
/// size — and never who the face belongs to. `VNDetectFaceRectanglesRequest`
/// gives geometry; there is no face *recognition* anywhere in this app, no face
/// print is computed, stored or compared, and nothing here is capable of
/// telling two people apart.
///
/// Recognised text is treated as radioactive: it is run through the sensitive
/// matcher and then dropped on the floor in the same function. It is never
/// returned, stored, logged or attached to an analytics event.
actor PhotoSignalExtractor {
    private let assetID: @Sendable (String) -> AssetID
    private let ciContext = CIContext(options: [.useSoftwareRenderer: false])

    init(assetID: @escaping @Sendable (String) -> AssetID) {
        self.assetID = assetID
    }

    struct Analysis: Sendable {
        let signals: PhotoSignals
        let safety: SafetySignals
    }

    /// Analyse one asset. `image` is a downscaled copy — Vision does not need
    /// 48 megapixels to find a face, and asking for them would make a long scan
    /// unbearable.
    func analyse(asset: PHAsset, image: UIImage) async -> Analysis? {
        guard let cgImage = image.cgImage else { return nil }

        let id = assetID(asset.localIdentifier)
        let isScreenshot = asset.mediaSubtypes.contains(.photoScreenshot)

        async let faces = detectFaces(in: cgImage)
        async let text = recogniseText(in: cgImage)
        async let barcodes = countBarcodes(in: cgImage)
        async let sensitive = checkSensitiveContent(cgImage: cgImage)

        let (faceResult, textResult, barcodeCount, sensitiveFlag) =
            await (faces, text, barcodes, sensitive)

        let blur = blurriness(of: cgImage)
        let exposure = exposureExtremity(of: cgImage)

        var signals = PhotoSignals(
            assetID: id,
            creationDate: asset.creationDate,
            pixelWidth: asset.pixelWidth,
            pixelHeight: asset.pixelHeight,
            isScreenshot: isScreenshot,
            isSelfie: isSelfie(asset: asset, faces: faceResult),
            isVideo: asset.mediaType == .video,
            isLivePhoto: asset.mediaSubtypes.contains(.photoLive),
            isFavorite: asset.isFavorite,
            isEdited: asset.hasAdjustments,
            isInSharedAlbum: asset.sourceType.contains(.typeCloudShared),
            faceCount: faceResult.count,
            largestFaceFraction: faceResult.largestFraction,
            faceOffCentre: faceResult.offCentre,
            blur: blur,
            exposureExtremity: exposure,
            textDensity: textResult.density,
            barcodeCount: barcodeCount,
            perceptualHash: perceptualHash(of: cgImage)
        )

        // Screenshots report their on-screen size, which makes every one of
        // them look like a portrait photo. Use the real pixels.
        if isScreenshot {
            signals.isScreenshot = true
        }

        let safety = SafetySignals(
            sensitiveContentFlagged: sensitiveFlag,
            // Categories only. The text itself is already gone.
            matchedCategories: textResult.categories,
            textDensity: textResult.density,
            recognisedLineCount: textResult.lineCount,
            barcodeCount: barcodeCount,
            isScreenshot: isScreenshot,
            faceCount: faceResult.count
        )

        return Analysis(signals: signals, safety: safety)
    }

    // MARK: - Vision

    private struct FaceResult: Sendable {
        var count = 0
        var largestFraction: Double = 0
        var offCentre: Double = 0
    }

    private func detectFaces(in image: CGImage) async -> FaceResult {
        // Rectangles only. Not `VNDetectFaceLandmarksRequest`, not
        // `VNGenerateFaceprintRequest`: the game needs to know a face is there,
        // never whose it is.
        let request = VNDetectFaceRectanglesRequest()
        let handler = VNImageRequestHandler(cgImage: image, options: [:])
        do {
            try handler.perform([request])
        } catch {
            return FaceResult()
        }

        let faces = request.results ?? []
        guard !faces.isEmpty else { return FaceResult() }

        var result = FaceResult(count: faces.count)
        for face in faces {
            let box = face.boundingBox   // normalised, origin bottom-left
            result.largestFraction = max(result.largestFraction, Double(box.width * box.height))
            let centreX = Double(box.midX)
            let centreY = Double(box.midY)
            // 0 at dead centre, 1 in a corner.
            let distance = min(1, (abs(centreX - 0.5) + abs(centreY - 0.5)) / 0.9)
            result.offCentre = max(result.offCentre, distance)
        }
        return result
    }

    private struct TextResult: Sendable {
        var density: Double = 0
        var lineCount: Int = 0
        var categories: Set<SensitiveCategory> = []
    }

    private func recogniseText(in image: CGImage) async -> TextResult {
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .fast
        request.usesLanguageCorrection = false

        let handler = VNImageRequestHandler(cgImage: image, options: [:])
        do {
            try handler.perform([request])
        } catch {
            return TextResult()
        }

        let observations = request.results ?? []
        guard !observations.isEmpty else { return TextResult() }

        var covered = 0.0
        var joined = ""
        joined.reserveCapacity(512)
        for observation in observations {
            covered += Double(observation.boundingBox.width * observation.boundingBox.height)
            if let candidate = observation.topCandidates(1).first {
                joined += candidate.string + "\n"
            }
        }

        // The matcher returns a set of categories and nothing else. `joined`
        // goes out of scope here and is never written anywhere.
        let categories = SensitiveTextMatcher.categories(in: joined)

        return TextResult(
            density: min(1, covered),
            lineCount: observations.count,
            categories: categories
        )
    }

    private func countBarcodes(in image: CGImage) async -> Int {
        let request = VNDetectBarcodesRequest()
        request.symbologies = [.qr, .aztec, .dataMatrix, .pdf417]
        let handler = VNImageRequestHandler(cgImage: image, options: [:])
        try? handler.perform([request])
        return request.results?.count ?? 0
    }

    /// Apple's own on-device nudity classifier.
    ///
    /// Returns `nil` — meaning "we do not know" — when the framework is
    /// unavailable or the person has Sensitive Content Warning switched off.
    /// The safety evaluator treats unknown as unknown rather than as safe, and
    /// the human approval step exists precisely because this can be absent.
    private func checkSensitiveContent(cgImage: CGImage) async -> Bool? {
        #if canImport(SensitiveContentAnalysis)
        let analyzer = SCSensitivityAnalyzer()
        guard analyzer.analysisPolicy != .disabled else { return nil }
        do {
            let response = try await analyzer.analyzeImage(cgImage)
            return response.isSensitive
        } catch {
            return nil
        }
        #else
        return nil
        #endif
    }

    // MARK: - Cheap image statistics

    /// Variance of the Laplacian, the standard quick sharpness estimate,
    /// computed on a small greyscale sample rather than the full image.
    private func blurriness(of image: CGImage) -> Double {
        guard let samples = greyscaleSamples(of: image, side: 48) else { return 0 }
        let side = 48
        var sum = 0.0
        var sumSquares = 0.0
        var count = 0.0

        for y in 1..<(side - 1) {
            for x in 1..<(side - 1) {
                let index = y * side + x
                let laplacian =
                    4 * Double(samples[index])
                    - Double(samples[index - 1])
                    - Double(samples[index + 1])
                    - Double(samples[index - side])
                    - Double(samples[index + side])
                sum += laplacian
                sumSquares += laplacian * laplacian
                count += 1
            }
        }
        guard count > 0 else { return 0 }
        let mean = sum / count
        let variance = max(0, sumSquares / count - mean * mean)
        // ~500 is a comfortably sharp phone photo; below ~40 is visibly smeared.
        return max(0, min(1, 1 - (variance / 500)))
    }

    private func exposureExtremity(of image: CGImage) -> Double {
        guard let samples = greyscaleSamples(of: image, side: 48) else { return 0 }
        let total = Double(samples.count)
        let dark = Double(samples.filter { $0 < 18 }.count) / total
        let blown = Double(samples.filter { $0 > 242 }.count) / total
        return min(1, max(dark, blown) * 2.2)
    }

    /// 64-bit average hash. Used only to spot two shots of the same instant.
    private func perceptualHash(of image: CGImage) -> UInt64 {
        guard let samples = greyscaleSamples(of: image, side: 8) else { return 0 }
        let mean = samples.reduce(0.0) { $0 + Double($1) } / Double(samples.count)
        var hash: UInt64 = 0
        for (index, value) in samples.enumerated() where index < 64 {
            if Double(value) > mean { hash |= (1 << UInt64(index)) }
        }
        return hash
    }

    private func greyscaleSamples(of image: CGImage, side: Int) -> [UInt8]? {
        var buffer = [UInt8](repeating: 0, count: side * side)
        guard let space = CGColorSpace(name: CGColorSpace.linearGray),
              let context = CGContext(
                data: &buffer, width: side, height: side, bitsPerComponent: 8,
                bytesPerRow: side, space: space,
                bitmapInfo: CGImageAlphaInfo.none.rawValue
              ) else { return nil }
        context.interpolationQuality = .low
        context.draw(image, in: CGRect(x: 0, y: 0, width: side, height: side))
        return buffer
    }

    /// Front-camera photos do not advertise themselves, so this is a best
    /// guess: one large face filling a portrait frame is a selfie often enough
    /// for a ranking signal, and being wrong costs nothing worse than a photo
    /// scoring slightly differently.
    private func isSelfie(asset: PHAsset, faces: FaceResult) -> Bool {
        guard faces.count >= 1, faces.count <= 3 else { return false }
        let portrait = asset.pixelHeight >= asset.pixelWidth
        return portrait && faces.largestFraction > 0.10
    }
}
