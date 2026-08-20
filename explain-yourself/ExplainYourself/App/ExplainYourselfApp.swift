import SwiftUI
import ExplainYourselfKit

@main
struct ExplainYourselfApp: App {
    @StateObject private var environment = AppEnvironment()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(environment)
                .preferredColorScheme(.dark)
                .tint(EY.Colour.ink)
                .onOpenURL { url in
                    // explainyourself://join?code=4821 — from the lobby's QR.
                    RootRouter.shared.handle(url)
                }
        }
        .onChange(of: scenePhase) { _, phase in
            // Backgrounding is a routine part of a party game: someone answers
            // a message mid-round. The realtime channel notices the socket drop
            // on its own and reconnects with a fresh snapshot, so there is
            // nothing to tear down here — only sound to stop.
            if phase == .background {
                Task { @MainActor in SoundService.shared.stopAll() }
            }
        }
    }
}

/// Deep links, kept out of the view tree.
@MainActor
final class RootRouter: ObservableObject {
    static let shared = RootRouter()
    @Published var pendingJoinCode: RoomCode?

    private init() {}

    func handle(_ url: URL) {
        guard url.scheme == "explainyourself", url.host == "join",
              let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
              let raw = components.queryItems?.first(where: { $0.name == "code" })?.value,
              let code = RoomCode(raw) else { return }
        pendingJoinCode = code
    }

    func consume() -> RoomCode? {
        defer { pendingJoinCode = nil }
        return pendingJoinCode
    }
}
