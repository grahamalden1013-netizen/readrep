import SwiftUI

/// Standard page chrome: the dark ground, safe insets, and an optional quiet
/// header. Screens that show a photograph pass `chromeless` so nothing frames
/// the image.
struct EYScreen<Content: View>: View {
    var title: String?
    var subtitle: String?
    var chromeless: Bool = false
    @ViewBuilder var content: () -> Content

    var body: some View {
        ZStack {
            EY.Colour.background.ignoresSafeArea()

            VStack(alignment: .leading, spacing: EY.Space.loose) {
                if let title, !chromeless {
                    VStack(alignment: .leading, spacing: EY.Space.hair) {
                        Text(title)
                            .font(EY.Typography.title(32))
                            .foregroundStyle(EY.Colour.ink)
                        if let subtitle {
                            Text(subtitle)
                                .font(EY.Typography.body)
                                .foregroundStyle(EY.Colour.inkSecondary)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                    .accessibilityElement(children: .combine)
                    .accessibilityAddTraits(.isHeader)
                }

                content()
            }
            .padding(chromeless ? 0 : EY.Space.loose)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        }
        .preferredColorScheme(.dark)
    }
}

/// The wordmark.
struct EYWordmark: View {
    var size: CGFloat = 46
    var showsTagline: Bool = true

    var body: some View {
        VStack(alignment: .leading, spacing: EY.Space.tight) {
            VStack(alignment: .leading, spacing: -size * 0.16) {
                Text("EXPLAIN")
                Text("YOURSELF")
            }
            .font(EY.Typography.display(size))
            .foregroundStyle(EY.Colour.ink)
            .tracking(-0.5)

            if showsTagline {
                Text("Your camera roll will testify against you.")
                    .font(EY.Typography.caption)
                    .foregroundStyle(EY.Colour.inkSecondary)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(
            showsTagline
                ? "Explain Yourself. Your camera roll will testify against you."
                : "Explain Yourself"
        )
        .accessibilityAddTraits(.isHeader)
    }
}

/// A small status pill. Always carries a glyph as well as a colour.
struct EYTag: View {
    let text: String
    var glyph: String?
    var tint: Color = EY.Colour.inkSecondary

    var body: some View {
        HStack(spacing: EY.Space.hair) {
            if let glyph {
                Image(systemName: glyph).font(.system(size: 11, weight: .bold))
            }
            Text(text)
                .font(EY.Typography.caption)
                .tracking(0.8)
        }
        .foregroundStyle(tint)
        .padding(.horizontal, EY.Space.snug)
        .padding(.vertical, 6)
        .background(tint.opacity(0.14), in: Capsule())
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(text)
    }
}

/// A row in the lobby.
struct EYPlayerRow: View {
    let nickname: String
    let status: String
    let glyph: String
    var isYou: Bool = false
    var isHost: Bool = false
    var tint: Color = EY.Colour.inkSecondary
    var onKick: (() -> Void)?

    var body: some View {
        HStack(spacing: EY.Space.snug) {
            Image(systemName: glyph)
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(tint)
                .frame(width: 24)

            Text(nickname)
                .font(EY.Typography.headline)
                .foregroundStyle(EY.Colour.ink)

            if isHost { EYTag(text: "HOST", glyph: "crown.fill") }
            if isYou { EYTag(text: "YOU") }

            Spacer(minLength: EY.Space.tight)

            Text(status)
                .font(EY.Typography.caption)
                .foregroundStyle(tint)

            if let onKick {
                Button(action: onKick) {
                    Image(systemName: "minus.circle")
                        .font(.system(size: 18))
                        .foregroundStyle(EY.Colour.inkTertiary)
                        .frame(width: EY.Touch.minimum, height: EY.Touch.minimum)
                }
                .accessibilityLabel("Remove \(nickname) from the game")
            }
        }
        .padding(.vertical, EY.Space.tight)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(nickname)\(isHost ? ", host" : "")\(isYou ? ", you" : ""). \(status)")
    }
}

/// Full-screen failure states. The app never shows a raw backend error; every
/// one of these is copy somebody wrote on purpose.
struct EYErrorView: View {
    let title: String
    let message: String
    var primaryTitle: String?
    var primaryAction: (() -> Void)?
    var secondaryTitle: String?
    var secondaryAction: (() -> Void)?

    var body: some View {
        EYScreen {
            Spacer()
            VStack(alignment: .leading, spacing: EY.Space.snug) {
                Text(title)
                    .font(EY.Typography.title(30))
                    .foregroundStyle(EY.Colour.ink)
                Text(message)
                    .font(EY.Typography.body)
                    .foregroundStyle(EY.Colour.inkSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .accessibilityElement(children: .combine)

            Spacer()

            VStack(spacing: EY.Space.snug) {
                if let primaryTitle, let primaryAction {
                    EYButton(title: primaryTitle, action: primaryAction)
                }
                if let secondaryTitle, let secondaryAction {
                    EYButton(title: secondaryTitle, kind: .quiet, action: secondaryAction)
                }
            }
        }
    }
}
