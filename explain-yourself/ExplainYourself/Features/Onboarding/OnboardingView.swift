import SwiftUI
import ExplainYourselfKit

/// Three screens, then play. No account, no tour, no permission ask yet — the
/// photo permission is asked at the moment it is needed, when the answer
/// actually means something.
struct OnboardingView: View {
    @EnvironmentObject private var environment: AppEnvironment
    @State private var page = 0
    let onFinished: () -> Void

    private struct Page {
        let headline: String
        let body: String
    }

    private let pages = [
        Page(
            headline: "Your camera roll is evidence.",
            body: "We privately find game-worthy photos from the photos you allow."
        ),
        Page(
            headline: "You stay in control.",
            body: "Nothing enters the game unless you approve it."
        ),
        Page(
            headline: "Then defend yourself.",
            body: "Your friends see the evidence. You explain. They decide whether you're telling the truth."
        )
    ]

    var body: some View {
        EYScreen {
            HStack(spacing: EY.Space.hair) {
                ForEach(pages.indices, id: \.self) { index in
                    Capsule()
                        .fill(index <= page ? EY.Colour.ink : EY.Colour.hairline)
                        .frame(height: 3)
                }
            }
            .accessibilityHidden(true)

            Spacer()

            VStack(alignment: .leading, spacing: EY.Space.base) {
                Text(pages[page].headline)
                    .font(EY.Typography.display(44))
                    .foregroundStyle(EY.Colour.ink)
                    .fixedSize(horizontal: false, vertical: true)
                Text(pages[page].body)
                    .font(EY.Typography.headline)
                    .foregroundStyle(EY.Colour.inkSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .id(page)
            .transition(.opacity)
            .accessibilityElement(children: .combine)
            .accessibilityAddTraits(.isHeader)

            Spacer()

            EYButton(title: page == pages.count - 1 ? "LET'S PLAY" : "NEXT") {
                if page == pages.count - 1 {
                    environment.identity.hasCompletedOnboarding = true
                    environment.analytics.track(.onboardingCompleted)
                    onFinished()
                } else {
                    withAnimation { page += 1 }
                }
            }
        }
    }
}
