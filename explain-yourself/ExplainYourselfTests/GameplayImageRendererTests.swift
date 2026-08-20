import XCTest
import UIKit
import ImageIO
import CoreLocation
@testable import ExplainYourself
import ExplainYourselfKit

/// The upload path's promise, checked rather than asserted in a comment.
final class GameplayImageRendererTests: XCTestCase {

    /// A JPEG carrying the things a real photo carries: GPS, a capture date,
    /// a lens model and a serial number.
    private func photoWithMetadata(
        width: Int = 3024,
        height: Int = 4032
    ) throws -> Data {
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        let base = UIGraphicsImageRenderer(
            size: CGSize(width: width, height: height), format: format
        ).image { context in
            UIColor.systemTeal.setFill()
            context.fill(CGRect(x: 0, y: 0, width: width, height: height))
        }

        let jpeg = try XCTUnwrap(base.jpegData(compressionQuality: 0.9))
        let source = try XCTUnwrap(CGImageSourceCreateWithData(jpeg as CFData, nil))

        let output = NSMutableData()
        let destination = try XCTUnwrap(
            CGImageDestinationCreateWithData(output, "public.jpeg" as CFString, 1, nil)
        )

        let metadata: [CFString: Any] = [
            kCGImagePropertyGPSDictionary: [
                kCGImagePropertyGPSLatitude: 51.5072,
                kCGImagePropertyGPSLatitudeRef: "N",
                kCGImagePropertyGPSLongitude: 0.1276,
                kCGImagePropertyGPSLongitudeRef: "W"
            ],
            kCGImagePropertyExifDictionary: [
                kCGImagePropertyExifDateTimeOriginal: "2019:07:04 02:14:11",
                kCGImagePropertyExifLensModel: "iPhone 15 Pro back camera",
                kCGImagePropertyExifBodySerialNumber: "F17ABCDEFGHI"
            ],
            kCGImagePropertyTIFFDictionary: [
                kCGImagePropertyTIFFMake: "Apple",
                kCGImagePropertyTIFFModel: "iPhone 15 Pro"
            ]
        ]

        CGImageDestinationAddImageFromSource(source, source, 0, metadata as CFDictionary)
        XCTAssertTrue(CGImageDestinationFinalize(destination))
        return output as Data
    }

    func testTheFixtureActuallyCarriesTheMetadataWeClaimToStrip() throws {
        // Otherwise the stripping test below would pass against an empty file
        // and prove nothing at all.
        let original = try photoWithMetadata()
        let properties = GameplayImageRenderer.inspectMetadata(original)
        XCTAssertNotNil(properties[kCGImagePropertyGPSDictionary as String],
                        "fixture has no GPS, so it cannot demonstrate GPS removal")
        XCTAssertFalse(GameplayImageRenderer.isStripped(original))
    }

    func testRenderedGameplayCopyCarriesNoLocationOrDeviceMetadata() throws {
        let original = try photoWithMetadata()
        let image = try XCTUnwrap(UIImage(data: original))

        let rendered = try GameplayImageRenderer.render(image)
        let properties = GameplayImageRenderer.inspectMetadata(rendered.data)

        XCTAssertNil(properties[kCGImagePropertyGPSDictionary as String],
                     "precise location must never leave the device")
        XCTAssertNil(properties[kCGImagePropertyTIFFDictionary as String])
        XCTAssertNil(properties[kCGImagePropertyMakerAppleDictionary as String])
        XCTAssertNil(properties[kCGImagePropertyExifAuxDictionary as String])

        if let exif = properties[kCGImagePropertyExifDictionary as String] as? [String: Any] {
            XCTAssertNil(exif[kCGImagePropertyExifDateTimeOriginal as String])
            XCTAssertNil(exif[kCGImagePropertyExifLensModel as String])
            XCTAssertNil(exif[kCGImagePropertyExifBodySerialNumber as String])
        }

        XCTAssertTrue(GameplayImageRenderer.isStripped(rendered.data))
    }

    func testGameplayCopyIsResizedAndSubstantiallySmaller() throws {
        let original = try photoWithMetadata()
        let image = try XCTUnwrap(UIImage(data: original))

        let rendered = try GameplayImageRenderer.render(image)

        XCTAssertLessThanOrEqual(
            max(rendered.pixelWidth, rendered.pixelHeight),
            Int(Tuning.gameplayImageMaxEdge)
        )
        XCTAssertLessThan(rendered.data.count, original.count / 2,
                          "a 48MP original has no business going over a phone connection")
        XCTAssertLessThan(rendered.data.count, 3_145_728, "must fit the bucket's size limit")
    }

    func testOrientationIsBakedIntoPixelsRatherThanLeftAsATag() throws {
        let original = try photoWithMetadata(width: 400, height: 300)
        let source = try XCTUnwrap(UIImage(data: original))
        // A photo taken sideways: same pixels, rotated by a tag.
        let rotated = UIImage(cgImage: try XCTUnwrap(source.cgImage), scale: 1, orientation: .right)

        let rendered = try GameplayImageRenderer.render(rotated)
        let properties = GameplayImageRenderer.inspectMetadata(rendered.data)

        // Portrait after rendering, because the rotation is in the pixels now.
        XCTAssertGreaterThan(rendered.pixelHeight, rendered.pixelWidth)
        if let orientation = properties[kCGImagePropertyOrientation as String] as? Int {
            XCTAssertEqual(orientation, 1, "there must be no tag left for a viewer to misread")
        }
    }

    func testAspectRatioSurvivesTheResize() throws {
        let original = try photoWithMetadata(width: 4000, height: 2250)
        let image = try XCTUnwrap(UIImage(data: original))
        let rendered = try GameplayImageRenderer.render(image)

        let before = 4000.0 / 2250.0
        let after = Double(rendered.pixelWidth) / Double(rendered.pixelHeight)
        XCTAssertEqual(before, after, accuracy: 0.01)
    }

    func testASmallImageIsNotUpscaled() throws {
        let original = try photoWithMetadata(width: 300, height: 400)
        let image = try XCTUnwrap(UIImage(data: original))
        let rendered = try GameplayImageRenderer.render(image)

        XCTAssertEqual(rendered.pixelWidth, 300)
        XCTAssertEqual(rendered.pixelHeight, 400)
    }
}
