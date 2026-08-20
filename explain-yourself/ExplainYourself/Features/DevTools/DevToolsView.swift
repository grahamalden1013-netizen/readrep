import SwiftUI
import ExplainYourselfKit

/// Development mode.
///
/// This exists because the alternative is untestable: verifying a six-player
/// party game otherwise means six phones, six people and several hundred real
/// photographs in the same room, which nobody can arrange while fixing a
/// layout bug.
///
/// Compiled out of release builds entirely — `AppConfig.developerToolsAvailable`
/// is `#if DEBUG`, and the entry point on the home screen is gated on it. The
/// fake data is synthetic gradients rather than photographs, so a development
/// build can never accidentally hold or upload somebody's real picture.
struct DevToolsView: View {
    @EnvironmentObject private var environment: AppEnvironment
    @Environment(\.dismiss) private var dismiss

    @State private var log: [String] = []

    var body: some View {
        EYScreen(title: "DEV TOOLS", subtitle: "Debug builds only.") {
            ScrollView {
                VStack(alignment: .leading, spacing: EY.Space.loose) {
                    status

                    group("ROOM") {
                        action("Add 5 demo players") {
                            await local?.addDemoPlayers()
                            note("Added Sam, Alex, Ryan, Maya, Emma with 12 fake photos each")
                        }
                        action("Mark everyone ready") {
                            await local?.markEveryoneReady()
                            note("All players READY")
                        }
                    }

                    group("TRUTH OR CAP") {
                        action("Force TELL THE TRUTH") {
                            await local?.setOverrides(.init(forcedInstruction: .tellTheTruth))
                            note("Next rounds will always say TELL THE TRUTH")
                        }
                        action("Force LIE") {
                            await local?.setOverrides(.init(forcedInstruction: .lie))
                            note("Next rounds will always say LIE")
                        }
                        action("Back to random") {
                            await local?.setOverrides(.init())
                            note("Instruction is a coin flip again")
                        }
                    }

                    group("CONNECTION") {
                        action("Simulate disconnect (Emma)") {
                            await local?.simulateDisconnect(PlayerID("demo-emma"))
                            note("Emma is DISCONNECTED")
                        }
                        action("Simulate reconnect (Emma)") {
                            await local?.simulateReconnect(PlayerID("demo-emma"))
                            note("Emma is back")
                        }
                    }

                    group("CANDIDATES") {
                        Text("\(environment.pipeline.candidates.count) candidates, \(environment.exclusions.count) excluded")
                            .font(EY.Typography.caption)
                            .foregroundStyle(EY.Colour.inkSecondary)
                        ForEach(environment.pipeline.candidates.prefix(8), id: \.self) { asset in
                            if let score = environment.pipeline.score(for: asset) {
                                Text(score.debugDescription)
                                    .font(.system(size: 11, design: .monospaced))
                                    .foregroundStyle(EY.Colour.inkTertiary)
                                    .lineLimit(2)
                            }
                        }
                    }

                    if !log.isEmpty {
                        group("LOG") {
                            ForEach(log.reversed(), id: \.self) { line in
                                Text(line)
                                    .font(.system(size: 11, design: .monospaced))
                                    .foregroundStyle(EY.Colour.inkSecondary)
                            }
                        }
                    }
                }
            }

            EYButton(title: "CLOSE") { dismiss() }
        }
    }

    private var local: LocalGameBackend? { environment.localBackend }

    private var status: some View {
        VStack(alignment: .leading, spacing: EY.Space.hair) {
            row("Backend", environment.isDemoMode ? "LOCAL (demo)" : "Supabase")
            row("Environment", AppConfig.environment.rawValue)
            row("Version", AppConfig.displayVersion)
            row("Photo access", "\(environment.photoLibrary.scope.rawValue)")
            if environment.isDemoMode {
                Text("No network calls are made in demo mode.")
                    .font(EY.Typography.caption)
                    .foregroundStyle(EY.Colour.inkTertiary)
            }
        }
    }

    private func row(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label)
                .font(EY.Typography.caption)
                .foregroundStyle(EY.Colour.inkTertiary)
            Spacer()
            Text(value)
                .font(EY.Typography.caption)
                .foregroundStyle(EY.Colour.ink)
        }
    }

    private func group<Content: View>(
        _ title: String,
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: EY.Space.tight) {
            Text(title)
                .font(EY.Typography.caption)
                .foregroundStyle(EY.Colour.inkSecondary)
                .tracking(1.4)
            content()
        }
    }

    private func action(_ title: String, _ work: @escaping () async -> Void) -> some View {
        EYButton(title: title, kind: .secondary) {
            Task { await work() }
        }
    }

    private func note(_ text: String) {
        log.append(text)
        if log.count > 20 { log.removeFirst() }
    }
}
