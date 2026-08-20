import SwiftUI
import ExplainYourselfKit

/// Three choices, all with a sensible default, all changeable in one tap.
///
/// Time-to-first-round is the thing this screen is optimised for, so nothing
/// here blocks: the defaults are a real game, and a host who taps straight
/// through gets ten rounds of Explain Yourself at DANGEROUS.
struct CreateGameView: View {
    @EnvironmentObject private var environment: AppEnvironment
    @State private var settings = GameSettings.default
    @State private var isCreating = false
    @State private var error: GameBackendError?

    let onCreated: (GameRoom) -> Void
    let onCancel: () -> Void

    var body: some View {
        EYScreen(title: "NEW GAME") {
            ScrollView {
                VStack(alignment: .leading, spacing: EY.Space.loose) {
                    section("MODE") {
                        ForEach(GameMode.allCases) { mode in
                            optionRow(
                                title: mode.title,
                                detail: mode.blurb,
                                isSelected: settings.mode == mode
                            ) {
                                settings.mode = mode
                            }
                        }
                    }

                    section("ROUNDS") {
                        HStack(spacing: EY.Space.tight) {
                            ForEach(GameSettings.allowedRoundCounts, id: \.self) { count in
                                chip("\(count)", isSelected: settings.roundCount == count) {
                                    settings.roundCount = count
                                }
                            }
                        }
                    }

                    section("INTENSITY") {
                        ForEach(Intensity.allCases) { intensity in
                            optionRow(
                                title: intensity.title,
                                detail: intensity.blurb,
                                isSelected: settings.intensity == intensity
                            ) {
                                settings.intensity = intensity
                            }
                        }
                        Text("Intensity changes which photos we suggest. It never changes the rule that you have to approve them.")
                            .font(EY.Typography.caption)
                            .foregroundStyle(EY.Colour.inkTertiary)
                            .fixedSize(horizontal: false, vertical: true)
                            .padding(.top, EY.Space.hair)
                    }
                }
            }

            VStack(spacing: EY.Space.snug) {
                if let error {
                    Text(error.message)
                        .font(EY.Typography.caption)
                        .foregroundStyle(EY.Colour.accusation)
                }
                EYButton(title: "CREATE GAME", isBusy: isCreating) { create() }
                EYButton(title: "BACK", kind: .quiet, action: onCancel)
            }
        }
    }

    private func section<Content: View>(
        _ title: String,
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: EY.Space.tight) {
            Text(title)
                .font(EY.Typography.caption)
                .foregroundStyle(EY.Colour.inkSecondary)
                .tracking(1.4)
                .accessibilityAddTraits(.isHeader)
            content()
        }
    }

    private func optionRow(
        title: String,
        detail: String,
        isSelected: Bool,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(alignment: .top, spacing: EY.Space.snug) {
                Image(systemName: isSelected ? "largecircle.fill.circle" : "circle")
                    .font(.system(size: 20))
                    .foregroundStyle(isSelected ? EY.Colour.ink : EY.Colour.inkTertiary)

                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(EY.Typography.headline)
                        .foregroundStyle(EY.Colour.ink)
                    Text(detail)
                        .font(EY.Typography.caption)
                        .foregroundStyle(EY.Colour.inkSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                        .multilineTextAlignment(.leading)
                }
                Spacer(minLength: 0)
            }
            .padding(.vertical, EY.Space.tight)
            .frame(minHeight: EY.Touch.comfortable)
            .contentShape(Rectangle())
        }
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(isSelected ? [.isButton, .isSelected] : .isButton)
    }

    private func chip(_ text: String, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(text)
                .font(EY.Typography.headline)
                .foregroundStyle(isSelected ? EY.Colour.background : EY.Colour.ink)
                .frame(minWidth: EY.Touch.comfortable, minHeight: EY.Touch.comfortable)
                .background(
                    RoundedRectangle(cornerRadius: EY.Radius.control, style: .continuous)
                        .fill(isSelected ? EY.Colour.ink : EY.Colour.surface)
                )
        }
        .accessibilityLabel("\(text) rounds")
        .accessibilityAddTraits(isSelected ? [.isButton, .isSelected] : .isButton)
    }

    private func create() {
        isCreating = true
        error = nil
        Task {
            do {
                let room = try await environment.backend.createRoom(
                    host: environment.identity.identity(), settings: settings
                )
                environment.analytics.track(.gameCreated(
                    mode: settings.mode,
                    rounds: settings.roundCount,
                    intensity: settings.intensity
                ))
                isCreating = false
                onCreated(room)
            } catch let backendError as GameBackendError {
                error = backendError
                isCreating = false
            } catch {
                self.error = .server("unknown")
                isCreating = false
            }
        }
    }
}

/// Four digits, typed once.
struct JoinGameView: View {
    @EnvironmentObject private var environment: AppEnvironment
    @State private var code = ""
    @State private var isJoining = false
    @State private var error: GameBackendError?
    @FocusState private var focused: Bool

    let onJoined: (GameRoom) -> Void
    let onCancel: () -> Void

    var body: some View {
        EYScreen(title: "JOIN GAME", subtitle: "Ask the host for the code.") {
            Spacer()

            TextField("", text: $code)
                .font(EY.Typography.mono(56))
                .foregroundStyle(EY.Colour.ink)
                .tint(EY.Colour.ink)
                .keyboardType(.numberPad)
                .multilineTextAlignment(.center)
                .focused($focused)
                .frame(maxWidth: .infinity)
                .padding(.vertical, EY.Space.loose)
                .background(EY.Colour.surface, in: RoundedRectangle(cornerRadius: EY.Radius.card))
                .overlay(alignment: .center) {
                    if code.isEmpty {
                        Text("0000")
                            .font(EY.Typography.mono(56))
                            .foregroundStyle(EY.Colour.inkTertiary)
                            .allowsHitTesting(false)
                    }
                }
                .onChange(of: code) { _, value in
                    code = String(value.filter(\.isNumber).prefix(4))
                    // Four digits is unambiguous, so submit without making
                    // anyone hunt for a button.
                    if code.count == 4 { join() }
                }
                .accessibilityLabel("Four digit game code")

            if let error {
                VStack(spacing: EY.Space.hair) {
                    Text(error.title)
                        .font(EY.Typography.headline)
                        .foregroundStyle(EY.Colour.accusation)
                    Text(error.message)
                        .font(EY.Typography.caption)
                        .foregroundStyle(EY.Colour.inkSecondary)
                }
                .accessibilityElement(children: .combine)
            }

            Spacer()

            VStack(spacing: EY.Space.snug) {
                EYButton(title: "JOIN", isEnabled: code.count == 4, isBusy: isJoining) { join() }
                EYButton(title: "BACK", kind: .quiet, action: onCancel)
            }
        }
        .onAppear { focused = true }
    }

    private func join() {
        guard let roomCode = RoomCode(code), !isJoining else { return }
        isJoining = true
        error = nil
        focused = false

        Task {
            do {
                let room = try await environment.backend.joinRoom(
                    code: roomCode, player: environment.identity.identity()
                )
                environment.analytics.track(.gameJoined(playerCount: room.players.count))
                isJoining = false
                onJoined(room)
            } catch let backendError as GameBackendError {
                error = backendError
                environment.analytics.track(.errorShown(code: backendError.title))
                isJoining = false
                code = ""
            } catch {
                self.error = .connectionLost
                isJoining = false
            }
        }
    }
}

/// The only thing asked before playing.
struct NicknameView: View {
    @EnvironmentObject private var environment: AppEnvironment
    @State private var name = ""
    @State private var failure: NicknameValidator.Failure?
    @FocusState private var focused: Bool

    let onDone: () -> Void

    var body: some View {
        EYScreen(title: "WHAT SHOULD WE CALL YOU?") {
            Spacer()

            TextField("", text: $name)
                .font(EY.Typography.title(36))
                .foregroundStyle(EY.Colour.ink)
                .tint(EY.Colour.ink)
                .textInputAutocapitalization(.words)
                .autocorrectionDisabled()
                .submitLabel(.done)
                .focused($focused)
                .padding(EY.Space.base)
                .background(EY.Colour.surface, in: RoundedRectangle(cornerRadius: EY.Radius.card))
                .overlay(alignment: .leading) {
                    if name.isEmpty {
                        Text("Jake")
                            .font(EY.Typography.title(36))
                            .foregroundStyle(EY.Colour.inkTertiary)
                            .padding(EY.Space.base)
                            .allowsHitTesting(false)
                    }
                }
                .onSubmit(save)
                .accessibilityLabel("Your name")

            if let failure {
                Text(message(for: failure))
                    .font(EY.Typography.caption)
                    .foregroundStyle(EY.Colour.accusation)
            }

            Text("This is only shown to people in your game. No account, no email.")
                .font(EY.Typography.caption)
                .foregroundStyle(EY.Colour.inkTertiary)

            Spacer()

            EYButton(
                title: "CONTINUE",
                isEnabled: !NicknameValidator.normalize(name).isEmpty
            ) {
                save()
            }
        }
        .onAppear {
            name = environment.identity.nickname ?? ""
            focused = true
        }
    }

    private func save() {
        switch environment.identity.setNickname(name) {
        case .success:
            failure = nil
            onDone()
        case .failure(let reason):
            failure = reason
        }
    }

    private func message(for failure: NicknameValidator.Failure) -> String {
        switch failure {
        case .empty:     return "Pick something."
        case .tooLong:   return "\(NicknameValidator.maxLength) characters, tops."
        case .duplicate: return "Someone in there already goes by that."
        }
    }
}
