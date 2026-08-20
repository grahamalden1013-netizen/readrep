import SwiftUI

/// The explanation clock.
///
/// Large, central, and unmissable, because the person it is counting down for
/// is talking to a room rather than looking at a screen. At five seconds it
/// changes colour, changes weight, adds a ring, and fires a haptic — four
/// independent signals, so it still reads if you cannot see colour, cannot see
/// the screen, or have reduce-motion on.
struct EYTimerView: View {
    let deadline: Date
    let total: TimeInterval
    var onExpire: (() -> Void)?

    @State private var remaining: TimeInterval = 0
    @State private var hasWarned = false
    @State private var hasExpired = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private let tick = Timer.publish(every: 0.1, on: .main, in: .common).autoconnect()

    var body: some View {
        ZStack {
            Circle()
                .stroke(EY.Colour.hairline, lineWidth: 8)

            Circle()
                .trim(from: 0, to: max(0, min(1, remaining / max(total, 0.001))))
                .stroke(tint, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .animation(EYMotion.tick(reduceMotion), value: remaining)

            if isExpired {
                Text("TIME 💀")
                    .font(EY.Typography.title(30))
                    .foregroundStyle(EY.Colour.accusation)
            } else {
                Text("\(Int(remaining.rounded(.up)))")
                    .font(EY.Typography.mono(56))
                    .foregroundStyle(tint)
                    .contentTransition(.numericText(countsDown: true))
                    .monospacedDigit()
            }
        }
        .frame(width: 168, height: 168)
        .onReceive(tick) { _ in update() }
        .onAppear { update() }
        // A live-counting timer read aloud every tenth of a second would make
        // VoiceOver unusable. One static label, updated only at the beats that
        // matter.
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(isExpired ? "Time up" : "\(Int(remaining.rounded(.up))) seconds left")
        .accessibilityAddTraits(.updatesFrequently)
    }

    private var isExpired: Bool { remaining <= 0 }
    private var isUrgent: Bool { remaining <= Double(Tuning.urgencyThreshold) && remaining > 0 }

    private var tint: Color {
        if isExpired { return EY.Colour.accusation }
        return isUrgent ? EY.Colour.accusation : EY.Colour.ink
    }

    private func update() {
        remaining = max(0, deadline.timeIntervalSinceNow)

        if isUrgent, !hasWarned {
            hasWarned = true
            HapticsService.shared.play(.timerWarning)
        }
        if isExpired, !hasExpired {
            hasExpired = true
            HapticsService.shared.play(.timeUp)
            onExpire?()
        }
    }
}

/// The 3 · 2 · 1 before a photo lands.
struct EYCountdownView: View {
    let deadline: Date
    let taunt: String

    @State private var remaining: Int = 3
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private let tick = Timer.publish(every: 0.1, on: .main, in: .common).autoconnect()

    var body: some View {
        VStack(spacing: EY.Space.huge) {
            Text(taunt)
                .font(EY.Typography.title(26))
                .foregroundStyle(EY.Colour.ink)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)

            Text("\(max(1, remaining))")
                .font(EY.Typography.mono(120))
                .foregroundStyle(EY.Colour.ink)
                .contentTransition(.numericText(countsDown: true))
                .id(remaining)
                .transition(.scale.combined(with: .opacity))
                .animation(EYMotion.drop(reduceMotion), value: remaining)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(EY.Space.wide)
        .onReceive(tick) { _ in
            let next = max(1, Int(deadline.timeIntervalSinceNow.rounded(.up)))
            if next != remaining {
                remaining = next
                HapticsService.shared.play(.countdownTick)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(taunt) Starting in \(remaining)")
    }
}
