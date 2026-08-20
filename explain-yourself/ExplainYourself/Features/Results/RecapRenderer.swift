import UIKit
import ExplainYourselfKit

/// The shareable card.
///
/// Text and statistics, never a gameplay photograph. The photos in a game were
/// approved by their owners for one evening in one room, and a share sheet is a
/// completely different audience. Turning "Jake approved this for five friends"
/// into "Jake is on someone's Instagram story" is exactly the betrayal this
/// product cannot afford, so there is no code path here that can embed one.
///
/// If photo sharing is ever added, it must be per-photo, opt-in, and asked of
/// the owner — not of whoever is holding the phone at the end.
enum RecapRenderer {
    static func render(
        results: GameResults,
        roomCode: String,
        size: CGSize = CGSize(width: 1080, height: 1350)
    ) -> UIImage {
        let renderer = UIGraphicsImageRenderer(size: size)

        return renderer.image { context in
            let cg = context.cgContext

            UIColor(red: 0.043, green: 0.043, blue: 0.051, alpha: 1).setFill()
            cg.fill(CGRect(origin: .zero, size: size))

            var y: CGFloat = 96
            let margin: CGFloat = 88
            let width = size.width - margin * 2

            y = draw("EXPLAIN", at: CGPoint(x: margin, y: y), width: width,
                     font: .systemFont(ofSize: 108, weight: .black), colour: .white)
            y = draw("YOURSELF", at: CGPoint(x: margin, y: y - 22), width: width,
                     font: .systemFont(ofSize: 108, weight: .black), colour: .white)

            y += 12
            y = draw("THE DAMAGE", at: CGPoint(x: margin, y: y), width: width,
                     font: .systemFont(ofSize: 34, weight: .heavy),
                     colour: UIColor(red: 1, green: 0.23, blue: 0.19, alpha: 1))

            y += 44

            for award in results.awards.prefix(6) {
                y = draw(
                    award.kind.title,
                    at: CGPoint(x: margin, y: y), width: width,
                    font: .systemFont(ofSize: 24, weight: .semibold),
                    colour: UIColor(white: 0.6, alpha: 1)
                )
                y = draw(
                    "\(award.winner.nickname) \(award.kind.emoji)",
                    at: CGPoint(x: margin, y: y + 2), width: width,
                    font: .systemFont(ofSize: 46, weight: .heavy),
                    colour: .white
                )
                y += 26
            }

            y = max(y, size.height - 280)
            for line in results.stats.lines {
                y = draw(line, at: CGPoint(x: margin, y: y), width: width,
                         font: .systemFont(ofSize: 28, weight: .medium),
                         colour: UIColor(white: 0.65, alpha: 1))
                y += 6
            }

            _ = draw(
                "Your camera roll will testify against you.",
                at: CGPoint(x: margin, y: size.height - 120), width: width,
                font: .systemFont(ofSize: 26, weight: .semibold),
                colour: UIColor(white: 0.42, alpha: 1)
            )
        }
    }

    /// Draws one line and returns the y coordinate after it.
    @discardableResult
    private static func draw(
        _ text: String,
        at origin: CGPoint,
        width: CGFloat,
        font: UIFont,
        colour: UIColor
    ) -> CGFloat {
        let attributes: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: colour]
        let bounding = (text as NSString).boundingRect(
            with: CGSize(width: width, height: .greatestFiniteMagnitude),
            options: [.usesLineFragmentOrigin],
            attributes: attributes,
            context: nil
        )
        (text as NSString).draw(
            with: CGRect(origin: origin, size: CGSize(width: width, height: bounding.height)),
            options: [.usesLineFragmentOrigin],
            attributes: attributes,
            context: nil
        )
        return origin.y + bounding.height
    }
}
