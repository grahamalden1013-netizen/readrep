import SwiftUI

/// The look: bold, high contrast, photo-first.
///
/// Two rules the whole design system serves. First, the photograph is the
/// interface — chrome exists to get out of its way, so surfaces are near-black
/// and text is either very large or very quiet, with nothing in between
/// competing for attention. Second, nothing is communicated by colour alone;
/// every state that has a colour also has a word or a glyph, because a party
/// game gets played in bad light by people who are not looking closely.
enum EY {

    // MARK: - Colour

    enum Colour {
        /// Not pure black: an OLED photo sitting on #000 gets a hard edge that
        /// reads as a bug.
        static let background = Color(hex: 0x0B0B0D)
        static let surface = Color(hex: 0x16161A)
        static let surfaceRaised = Color(hex: 0x212127)

        static let ink = Color.white
        static let inkSecondary = Color(hex: 0x9A9AA6)
        static let inkTertiary = Color(hex: 0x5C5C68)

        /// The one loud colour. Used for the moment of accusation and nothing
        /// else, so it never stops meaning anything.
        static let accusation = Color(hex: 0xFF3B30)
        static let truth = Color(hex: 0x30D158)
        static let cap = Color(hex: 0xFFD60A)
        static let hairline = Color.white.opacity(0.10)

        static func vote(_ choice: VoteTone) -> Color {
            switch choice {
            case .affirm: return truth
            case .deny:   return cap
            case .neutral: return ink
            }
        }
    }

    enum VoteTone { case affirm, deny, neutral }

    // MARK: - Type

    enum Typography {
        /// The wordmark and the drop. Condensed, heavy, all caps.
        static func display(_ size: CGFloat = 56) -> Font {
            .system(size: size, weight: .black, design: .default).width(.compressed)
        }
        static func title(_ size: CGFloat = 30) -> Font {
            .system(size: size, weight: .heavy).width(.condensed)
        }
        static let headline = Font.system(size: 19, weight: .bold)
        static let body = Font.system(size: 16, weight: .medium)
        static let caption = Font.system(size: 13, weight: .semibold)
        /// Room codes and timers: tabular so digits do not jitter as they count.
        static func mono(_ size: CGFloat) -> Font {
            .system(size: size, weight: .black, design: .monospaced)
        }
    }

    enum Space {
        static let hair: CGFloat = 4
        static let tight: CGFloat = 8
        static let snug: CGFloat = 12
        static let base: CGFloat = 16
        static let loose: CGFloat = 24
        static let wide: CGFloat = 32
        static let huge: CGFloat = 48
    }

    enum Radius {
        static let control: CGFloat = 14
        static let card: CGFloat = 20
        static let photo: CGFloat = 24
    }

    /// Apple's minimum is 44pt. A party game gets tapped fast, in the dark, by
    /// someone laughing, so the primary controls are considerably bigger.
    enum Touch {
        static let minimum: CGFloat = 44
        static let comfortable: CGFloat = 56
        static let primary: CGFloat = 68
    }
}

extension Color {
    init(hex: UInt32) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: 1
        )
    }
}

// MARK: - Motion

/// Every animation in the app comes from here.
///
/// `reduceMotion` is honoured by returning `nil`, which SwiftUI treats as "no
/// animation" — so a reduced-motion device gets the same *state* changes with
/// none of the movement, rather than a separate and inevitably rotting code
/// path. The dramatic beats survive as cuts, which still land.
enum EYMotion {
    static func reveal(_ reduceMotion: Bool) -> Animation? {
        reduceMotion ? nil : .spring(response: 0.42, dampingFraction: 0.74)
    }

    static func drop(_ reduceMotion: Bool) -> Animation? {
        reduceMotion ? nil : .spring(response: 0.30, dampingFraction: 0.62)
    }

    static func gentle(_ reduceMotion: Bool) -> Animation? {
        reduceMotion ? nil : .easeInOut(duration: 0.25)
    }

    static func tick(_ reduceMotion: Bool) -> Animation? {
        reduceMotion ? nil : .easeOut(duration: 0.18)
    }
}
