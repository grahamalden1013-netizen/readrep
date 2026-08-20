import SwiftUI
import CoreImage.CIFilterBuiltins
import ExplainYourselfKit

/// The room, before it starts.
///
/// Its whole job is to answer one question at a glance from across a sofa: who
/// are we still waiting for? Hence the status on every row and the single
/// blocked-reason line under the start button, rather than a disabled button
/// that never explains itself.
struct LobbyView: View {
    @EnvironmentObject private var environment: AppEnvironment
    @ObservedObject var coordinator: GameSessionCoordinator

    let onPrepared: () -> Void
    let onLeave: () -> Void

    @State private var showingQR = false

    private var room: GameRoom? { coordinator.room }

    var body: some View {
        EYScreen {
            header

            playerList

            Spacer()

            footer
        }
        .sheet(isPresented: $showingQR) {
            if let room { QRInviteView(code: room.code) }
        }
    }

    private var header: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: EY.Space.hair) {
                Text("GAME CODE")
                    .font(EY.Typography.caption)
                    .foregroundStyle(EY.Colour.inkSecondary)
                    .tracking(1.4)
                Text(room?.code.display ?? "– –")
                    .font(EY.Typography.mono(56))
                    .foregroundStyle(EY.Colour.ink)
            }
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("Game code \(room?.code.value.map(String.init).joined(separator: " ") ?? "")")

            Spacer()

            Button {
                showingQR = true
            } label: {
                Image(systemName: "qrcode")
                    .font(.system(size: 22, weight: .medium))
                    .foregroundStyle(EY.Colour.ink)
                    .frame(width: EY.Touch.comfortable, height: EY.Touch.comfortable)
                    .background(EY.Colour.surface, in: RoundedRectangle(cornerRadius: EY.Radius.control))
            }
            .accessibilityLabel("Show QR code to join")
        }
    }

    private var playerList: some View {
        VStack(spacing: 0) {
            ForEach(room?.players ?? []) { player in
                EYPlayerRow(
                    nickname: player.nickname,
                    status: player.status.display,
                    glyph: player.status.glyph,
                    isYou: player.id == coordinator.me,
                    isHost: player.isHost,
                    tint: tint(for: player.status),
                    onKick: canKick(player) ? { kick(player) } : nil
                )
                Divider().overlay(EY.Colour.hairline)
            }
        }
    }

    @ViewBuilder
    private var footer: some View {
        VStack(spacing: EY.Space.snug) {
            if let room, room.player(coordinator.me)?.isReady != true {
                EYButton(title: "PREPARE MY PHOTOS", action: onPrepared)
            }

            if coordinator.isHost {
                EYButton(
                    title: "START GAME",
                    subtitle: room?.settings.mode.title,
                    isEnabled: room?.canStart ?? false
                ) {
                    Task { await start() }
                }

                if let reason = room?.startBlockedReason {
                    Text(reason)
                        .font(EY.Typography.caption)
                        .foregroundStyle(EY.Colour.inkSecondary)
                        .accessibilityLabel("Can't start yet. \(reason)")
                }
            } else {
                Text("WAITING FOR THE HOST")
                    .font(EY.Typography.caption)
                    .foregroundStyle(EY.Colour.inkTertiary)
                    .tracking(1.2)
            }

            EYButton(title: "LEAVE", kind: .quiet) {
                Task { await coordinator.leave(); onLeave() }
            }
        }
    }

    private func tint(for status: PlayerStatus) -> Color {
        switch status {
        case .ready:           return EY.Colour.truth
        case .selectingPhotos: return EY.Colour.cap
        case .disconnected:    return EY.Colour.accusation
        case .joined:          return EY.Colour.inkSecondary
        }
    }

    private func canKick(_ player: Player) -> Bool {
        coordinator.isHost && player.id != coordinator.me
    }

    private func kick(_ player: Player) {
        guard let room else { return }
        Task {
            try? await environment.backend.kickPlayer(
                player.id, from: room.id, actor: coordinator.me
            )
        }
    }

    private func start() async {
        guard let room else { return }
        environment.analytics.track(.gameStarted(
            mode: room.settings.mode,
            playerCount: room.players.count,
            rounds: room.settings.roundCount
        ))
        _ = try? await environment.backend.startGame(room: room.id, actor: coordinator.me)
    }
}

/// A QR code, generated on device. Faster than reading four digits across a
/// loud room, and it works when someone is standing behind the sofa.
struct QRInviteView: View {
    let code: RoomCode
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        EYScreen(title: "SCAN TO JOIN") {
            Spacer()

            if let image = Self.qr(for: "explainyourself://join?code=\(code.value)") {
                Image(uiImage: image)
                    .interpolation(.none)
                    .resizable()
                    .scaledToFit()
                    .frame(maxWidth: 280)
                    .padding(EY.Space.loose)
                    .background(Color.white, in: RoundedRectangle(cornerRadius: EY.Radius.card))
                    .frame(maxWidth: .infinity)
                    .accessibilityLabel("QR code containing game code \(code.value)")
            }

            Text(code.display)
                .font(EY.Typography.mono(48))
                .foregroundStyle(EY.Colour.ink)
                .frame(maxWidth: .infinity)

            Spacer()

            EYButton(title: "DONE") { dismiss() }
        }
    }

    static func qr(for string: String) -> UIImage? {
        let filter = CIFilter.qrCodeGenerator()
        filter.message = Data(string.utf8)
        filter.correctionLevel = "M"

        guard let output = filter.outputImage else { return nil }
        let scaled = output.transformed(by: CGAffineTransform(scaleX: 12, y: 12))
        let context = CIContext()
        guard let cgImage = context.createCGImage(scaled, from: scaled.extent) else { return nil }
        return UIImage(cgImage: cgImage)
    }
}
