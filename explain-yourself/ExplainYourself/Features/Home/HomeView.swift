import SwiftUI
import ExplainYourselfKit

/// Two buttons and a wordmark.
///
/// No feed, no streak, no profile, no daily anything. A party game is opened
/// when people are already in a room together, so the only useful thing this
/// screen can do is get out of the way.
struct HomeView: View {
    @EnvironmentObject private var environment: AppEnvironment
    @State private var showingHowToPlay = false
    @State private var showingSettings = false
    @State private var showingDevTools = false

    let onCreate: () -> Void
    let onJoin: () -> Void

    var body: some View {
        EYScreen {
            Spacer()

            EYWordmark(size: 52)

            Spacer()

            VStack(spacing: EY.Space.snug) {
                EYButton(title: "CREATE GAME", action: onCreate)
                EYButton(title: "JOIN GAME", kind: .secondary, action: onJoin)
                EYButton(title: "HOW TO PLAY", kind: .quiet) { showingHowToPlay = true }
            }

            HStack {
                Button {
                    showingSettings = true
                } label: {
                    Image(systemName: "gearshape")
                        .font(.system(size: 17))
                        .foregroundStyle(EY.Colour.inkTertiary)
                        .frame(width: EY.Touch.minimum, height: EY.Touch.minimum)
                }
                .accessibilityLabel("Settings")

                Spacer()

                if AppConfig.developerToolsAvailable {
                    Button("DEV") { showingDevTools = true }
                        .font(EY.Typography.caption)
                        .foregroundStyle(EY.Colour.inkTertiary)
                        .frame(minWidth: EY.Touch.minimum, minHeight: EY.Touch.minimum)
                }
            }
        }
        .sheet(isPresented: $showingHowToPlay) { HowToPlayView() }
        .sheet(isPresented: $showingSettings) { SettingsView() }
        .sheet(isPresented: $showingDevTools) { DevToolsView() }
        .task { environment.analytics.track(.appOpened) }
    }
}

struct HowToPlayView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        EYScreen(title: "HOW TO PLAY") {
            ScrollView {
                VStack(alignment: .leading, spacing: EY.Space.loose) {
                    step(
                        "1",
                        "We find the evidence",
                        "The app looks through the photos you allow, privately, on your phone, and picks out ones that might be worth explaining."
                    )
                    step(
                        "2",
                        "You veto anything private",
                        "Nothing enters the game unless you tap KEEP on it. NEVER USE means we never suggest it again."
                    )
                    step(
                        "3",
                        "Someone gets caught",
                        "A photo appears. Nobody knows whose it is for a second or two. Then a name drops, and that person has fifteen seconds to explain themselves out loud."
                    )
                    step(
                        "4",
                        "Everyone decides",
                        "The room votes on whether they buy it. In Truth or Cap, the person explaining was secretly told to lie — or not."
                    )

                    Text("If a photo of yours comes up and you'd rather it didn't, tap REMOVE PHOTO. It disappears from every screen straight away and nobody is told why.")
                        .font(EY.Typography.body)
                        .foregroundStyle(EY.Colour.inkSecondary)
                        .padding(.top, EY.Space.base)
                }
            }

            EYButton(title: "GOT IT") { dismiss() }
        }
    }

    private func step(_ number: String, _ title: String, _ body: String) -> some View {
        VStack(alignment: .leading, spacing: EY.Space.hair) {
            Text("\(number). \(title.uppercased())")
                .font(EY.Typography.headline)
                .foregroundStyle(EY.Colour.ink)
            Text(body)
                .font(EY.Typography.body)
                .foregroundStyle(EY.Colour.inkSecondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .accessibilityElement(children: .combine)
    }
}
