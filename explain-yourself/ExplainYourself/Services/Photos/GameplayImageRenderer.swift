import UIKit
import ImageIO
import UniformTypeIdentifiers
import ExplainYourselfKit

/// Produces the only version of a photo that is ever allowed to leave the
/// device, and strips it while it does.
///
/// Two jobs, both non-negotiable:
///
///   1. Resize. A modern iPhone photo is 48 megapixels and about 12 MB. On a
///      phone held up across a table it is indistinguishable from a 1600px
///      JPEG at ~400 KB, and uploading the original would make the first round
///      wait on a slow connection for nothing.
///
///   2. Strip. Re-encoding through `CGImageDestination` with an explicitly
///      constructed property dictionary means the output carries exactly the
///      properties written here and no others. GPS, timestamps, camera serial
///      numbers, the original filename and every Apple maker note are gone —
///      not blanked, absent. Orientation is preserved by baking the rotation
///      into the pixels rather than by keeping the EXIF tag that describes it.
enum GameplayImageRenderer {

    struct Output {
        let data: Data
        let pixelWidth: Int
        let pixelHeight: Int
    }

    enum Failure: Error {
        case couldNotRender
        case couldNotEncode
    }

    static func render(
        _ image: UIImage,
        maxEdge: CGFloat = Tuning.gameplayImageMaxEdge,
        quality: CGFloat = Tuning.gameplayImageQuality
    ) throws -> Output {
        let flattened = try redraw(image, maxEdge: maxEdge)
        guard let cgImage = flattened.cgImage else { throw Failure.couldNotRender }

        let output = NSMutableData()
        guard let destination = CGImageDestinationCreateWithData(
            output, UTType.jpeg.identifier as CFString, 1, nil
        ) else {
            throw Failure.couldNotEncode
        }

        // An allow-list, not a deny-list. Anything not named here simply is not
        // in the file — which is a much stronger guarantee than trying to
        // enumerate every metadata block worth removing.
        let properties: [CFString: Any] = [
            kCGImageDestinationLossyCompressionQuality: quality,
            // Always 1 (`up`): the rotation is already in the pixels, so there
            // is no orientation tag for a viewer to misread.
            kCGImagePropertyOrientation: CGImagePropertyOrientation.up.rawValue
        ]

        CGImageDestinationAddImage(destination, cgImage, properties as CFDictionary)
        guard CGImageDestinationFinalize(destination) else { throw Failure.couldNotEncode }

        return Output(
            data: output as Data,
            pixelWidth: cgImage.width,
            pixelHeight: cgImage.height
        )
    }

    /// Draws into a fresh bitmap. This is what actually discards the metadata:
    /// the result is pixels with no history attached.
    private static func redraw(_ image: UIImage, maxEdge: CGFloat) throws -> UIImage {
        let size = image.size
        guard size.width > 0, size.height > 0 else { throw Failure.couldNotRender }

        let scale = min(1, maxEdge / max(size.width, size.height))
        let target = CGSize(
            width: (size.width * scale).rounded(.down),
            height: (size.height * scale).rounded(.down)
        )

        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        format.opaque = true
        format.preferredRange = .standard

        let renderer = UIGraphicsImageRenderer(size: target, format: format)
        return renderer.image { _ in
            // `draw(in:)` on a UIImage applies its `imageOrientation`, so a
            // photo taken sideways comes out the right way up with nothing left
            // to interpret.
            image.draw(in: CGRect(origin: .zero, size: target))
        }
    }

    /// Reads back what a rendered file actually contains. Used by the test that
    /// asserts nothing survived, so the guarantee is checked rather than
    /// asserted in a comment.
    static func inspectMetadata(_ data: Data) -> [String: Any] {
        guard let source = CGImageSourceCreateWithData(data as CFData, nil),
              let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil)
                  as? [String: Any] else { return [:] }
        return properties
    }

    /// True when a rendered file carries none of the things that identify a
    /// person, a place or a device.
    static func isStripped(_ data: Data) -> Bool {
        let properties = inspectMetadata(data)
        let forbidden = [
            kCGImagePropertyGPSDictionary,
            kCGImagePropertyExifAuxDictionary,
            kCGImagePropertyMakerAppleDictionary,
            kCGImagePropertyIPTCDictionary,
            kCGImagePropertyTIFFDictionary
        ].map { $0 as String }

        if forbidden.contains(where: { properties[$0] != nil }) { return false }

        // A bare `{Exif}` with only the dimensions the encoder writes back is
        // acceptable; anything describing when or with what is not.
        if let exif = properties[kCGImagePropertyExifDictionary as String] as? [String: Any] {
            let leaky = [
                kCGImagePropertyExifDateTimeOriginal,
                kCGImagePropertyExifDateTimeDigitized,
                kCGImagePropertyExifLensModel,
                kCGImagePropertyExifBodySerialNumber,
                kCGImagePropertyExifSubsecTimeOriginal
            ].map { $0 as String }
            if leaky.contains(where: { exif[$0] != nil }) { return false }
        }
        return true
    }
}
