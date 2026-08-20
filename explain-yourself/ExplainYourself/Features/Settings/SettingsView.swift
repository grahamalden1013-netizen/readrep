import SwiftUI
import ExplainYourselfKit

struct SettingsView: View {
    @EnvironmentObject private var environment: AppEnvironment
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL

    @State private var soundOn = SoundService.shared.isEnabled
    @State private var hapticsOn = HapticsService.shared.isEnabled
    @State private var showingResetConfirmation = false

    var body: some View {
        EYScreen(title: "SETTINGS") {
            ScrollView {
                VStack(alignment: .leading, spacing: EY.Space.loose) {
                    toggle("SOUND EFFECTS", isOn: $soundOn) { SoundService.shared.isEnabled = $0 }
                    toggle("HAPTICS", isOn: $hapticsOn) { HapticsService.shared.isEnabled = $0 }

                    VStack(alignment: .leading, spacing: EY.Space.tight) {
                        Text("BLOCKED PHOTOS")
                            .font(EY.Typography.caption)
                            .foregroundStyle(EY.Colour.inkSecondary)
                            .tracking(1.4)
                        Text("\(environment.exclusions.count) photos are set to NEVER USE. They're remembered on this device only.")
                            .font(EY.Typography.body)
                            .foregroundStyle(EY.Colour.inkSecondary)
                            .fixedSize(horizontal: false, vertical: true)
                        // Somebody who excluded half their library in a hurry
                        // needs a way back that is not "delete the app".
                        EYButton(title: "RESET BLOCKED PHOTOS", kind: .secondary) {
                            showingResetConfirmation = true
                        }
                    }

                    VStack(alignment: .leading, spacing: EY.Space.tight) {
                        Text("PRIVACY")
                            .font(EY.Typography.caption)
                            .foregroundStyle(EY.Colour.inkSecondary)
                            .tracking(1.4)
                        Text("Photos are analysed on this phone. Only photos you tap KEEP are uploaded, location data is stripped first, and game copies are deleted when the game ends.")
                            .font(EY.Typography.body)
                            .foregroundStyle(EY.Colour.inkSecondary)
                            .fixedSize(horizontal: false, vertical: true)
                        EYButton(title: "PRIVACY POLICY", kind: .quiet) {
                            openURL(AppConfig.privacyPolicyURL)
                        }
                    }

                    Text("Version \(AppConfig.displayVersion) · \(AppConfig.environment.rawValue)")
                        .font(EY.Typography.caption)
                        .foregroundStyle(EY.Colour.inkTertiary)
                }
            }

            EYButton(title: "DONE") { dismiss() }
        }
        .confirmationDialog(
            "Reset blocked photos?",
            isPresented: $showingResetConfirmation,
            titleVisibility: .visible
        ) {
            Button("Reset", role: .destructive) { environment.exclusions.resetAll() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Photos you marked NEVER USE can be suggested again.")
        }
    }

    private func toggle(
        _ title: String,
        isOn: Binding<Bool>,
        onChange: @escaping (Bool) -> Void
    ) -> some View {
        Toggle(isOn: isOn) {
            Text(title)
                .font(EY.Typography.headline)
                .foregroundStyle(EY.Colour.ink)
        }
        .tint(EY.Colour.truth)
        .frame(minHeight: EY.Touch.comfortable)
        .onChange(of: isOn.wrappedValue) { _, value in onChange(value) }
    }
}
