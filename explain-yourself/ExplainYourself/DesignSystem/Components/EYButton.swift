import SwiftUI

/// The app has three kinds of button and no more.
///
/// `primary` is the thing you came to this screen to do. `secondary` is the
/// alternative. `quiet` is everything else. Resisting a fourth is what keeps a
/// screen readable at arm's length across a table.
struct EYButton: View {
    enum Kind {
        case primary
        case secondary
        case quiet
        case destructive
    }

    let title: String
    var subtitle: String?
    var kind: Kind = .primary
    var icon: String?
    var isEnabled: Bool = true
    var isBusy: Bool = false
    let action: () -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @ScaledMetric(relativeTo: .headline) private var scale: CGFloat = 1

    var body: some View {
        Button(action: action) {
            HStack(spacing: EY.Space.snug) {
                if isBusy {
                    ProgressView().tint(foreground)
                } else if let icon {
                    Image(systemName: icon).font(.system(size: 17, weight: .bold))
                }

                VStack(spacing: 2) {
                    Text(title)
                        .font(EY.Typography.headline)
                        .tracking(0.6)
                    if let subtitle {
                        Text(subtitle)
                            .font(EY.Typography.caption)
                            .opacity(0.75)
                    }
                }
            }
            .foregroundStyle(foreground)
            .frame(maxWidth: .infinity)
            .frame(minHeight: minHeight * min(scale, 1.6))
            .background(background, in: RoundedRectangle(cornerRadius: EY.Radius.control, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: EY.Radius.control, style: .continuous)
                    .strokeBorder(border, lineWidth: 1.5)
            )
            .contentShape(Rectangle())
        }
        .buttonStyle(PressStyle(reduceMotion: reduceMotion))
        .disabled(!isEnabled || isBusy)
        .opacity(isEnabled ? 1 : 0.4)
        // The label already carries the words; the trait tells VoiceOver what
        // it is, and `isBusy` stops it being announced as tappable mid-flight.
        .accessibilityLabel(subtitle.map { "\(title). \($0)" } ?? title)
        .accessibilityAddTraits(.isButton)
    }

    private var minHeight: CGFloat {
        switch kind {
        case .primary, .destructive: return EY.Touch.primary
        case .secondary:             return EY.Touch.comfortable
        case .quiet:                 return EY.Touch.minimum
        }
    }

    private var foreground: Color {
        switch kind {
        case .primary:     return EY.Colour.background
        case .secondary:   return EY.Colour.ink
        case .quiet:       return EY.Colour.inkSecondary
        case .destructive: return EY.Colour.ink
        }
    }

    private var background: Color {
        switch kind {
        case .primary:     return EY.Colour.ink
        case .secondary:   return EY.Colour.surfaceRaised
        case .quiet:       return .clear
        case .destructive: return EY.Colour.accusation
        }
    }

    private var border: Color {
        switch kind {
        case .primary, .destructive: return .clear
        case .secondary:             return EY.Colour.hairline
        case .quiet:                 return .clear
        }
    }
}

/// A vote button: big, unmissable, and never distinguished by colour alone.
struct EYVoteButton: View {
    let title: String
    var tone: EY.VoteTone = .neutral
    var glyph: String?
    var isSelected: Bool = false
    var isLocked: Bool = false
    let action: () -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        Button(action: action) {
            VStack(spacing: EY.Space.tight) {
                if let glyph {
                    Text(glyph).font(.system(size: 34))
                }
                Text(title)
                    .font(EY.Typography.title(22))
                    .multilineTextAlignment(.center)
                    .minimumScaleFactor(0.6)
                    .lineLimit(2)
            }
            .foregroundStyle(isSelected ? EY.Colour.background : EY.Colour.ink)
            .frame(maxWidth: .infinity)
            .frame(minHeight: 108)
            .padding(EY.Space.base)
            .background(
                RoundedRectangle(cornerRadius: EY.Radius.card, style: .continuous)
                    .fill(isSelected ? EY.Colour.vote(tone) : EY.Colour.surface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: EY.Radius.card, style: .continuous)
                    .strokeBorder(
                        isSelected ? EY.Colour.vote(tone) : EY.Colour.hairline,
                        lineWidth: isSelected ? 3 : 1.5
                    )
            )
            // The checkmark is the point: selection must survive being read in
            // greyscale, in bad light, by someone not looking directly at it.
            .overlay(alignment: .topTrailing) {
                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundStyle(EY.Colour.background)
                        .padding(EY.Space.snug)
                }
            }
        }
        .buttonStyle(PressStyle(reduceMotion: reduceMotion))
        .disabled(isLocked)
        .accessibilityLabel(title)
        .accessibilityValue(isSelected ? "Selected" : "Not selected")
        .accessibilityHint(isLocked ? "Voting is closed" : "Locks your vote")
    }
}

private struct PressStyle: ButtonStyle {
    let reduceMotion: Bool

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed && !reduceMotion ? 0.965 : 1)
            .animation(EYMotion.tick(reduceMotion), value: configuration.isPressed)
    }
}
