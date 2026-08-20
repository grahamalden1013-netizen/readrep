import SwiftUI
import ExplainYourselfKit

/// The photograph, filling the screen, with the controls that must always be
/// reachable while it is up.
///
/// Everything about this view is in service of one moment: the image lands, the
/// room reacts, and only then does a name appear. So the photo gets the whole
/// screen, the chrome is minimal and translucent, and the name overlay arrives
/// as a separate beat rather than as part of the same layout pass.
struct PhotoStage: View {
    let asset: AssetID
    let loader: GameImageLoader
    var isYours: Bool
    var onRemove: (() -> Void)?
    var onReport: (() -> Void)?
    var onUnavailable: (() -> Void)?

    @State private var image: UIImage?
    @State private var failed = false
    @State private var showingReport = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        ZStack {
            EY.Colour.background.ignoresSafeArea()

            if let image {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFit()
                    .clipShape(RoundedRectangle(cornerRadius: EY.Radius.photo, style: .continuous))
                    .padding(EY.Space.base)
                    .transition(.opacity.combined(with: .scale(scale: 0.97)))
            } else if failed {
                EYErrorView(
                    title: "PHOTO NO LONGER AVAILABLE",
                    message: "Skipping this one.",
                    primaryTitle: "CONTINUE",
                    primaryAction: { onUnavailable?() }
                )
            } else {
                ProgressView()
                    .tint(EY.Colour.inkSecondary)
                    .scaleEffect(1.4)
            }
        }
        .overlay(alignment: .topTrailing) { controls }
        .animation(EYMotion.reveal(reduceMotion), value: image != nil)
        .task(id: asset) { await load() }
        // The image itself is the content. Describing it would be both
        // impossible and beside the point, so VoiceOver is told what it is and
        // whose turn it is by the surrounding views instead.
        .accessibilityElement(children: .contain)
        .confirmationDialog("Report this photo?", isPresented: $showingReport, titleVisibility: .visible) {
            Button("Report and skip", role: .destructive) { onReport?() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("The round ends and the photo is deleted. Nobody is told who reported it.")
        }
    }

    /// The owner's escape hatch, and everyone else's.
    ///
    /// REMOVE PHOTO is deliberately one tap with no confirmation: somebody
    /// reaching for it is already uncomfortable, and a modal asking "are you
    /// sure?" is the worst possible response to that.
    @ViewBuilder
    private var controls: some View {
        HStack(spacing: EY.Space.tight) {
            if isYours, let onRemove {
                Button(action: onRemove) {
                    Label("REMOVE PHOTO", systemImage: "xmark.circle.fill")
                        .font(EY.Typography.caption)
                        .foregroundStyle(EY.Colour.ink)
                        .padding(.horizontal, EY.Space.snug)
                        .padding(.vertical, EY.Space.tight)
                        .background(.ultraThinMaterial, in: Capsule())
                }
                .accessibilityLabel("Remove this photo from the game")
                .accessibilityHint("Ends the round straight away. Nobody is told why.")
            } else if onReport != nil {
                Button {
                    showingReport = true
                } label: {
                    Image(systemName: "flag")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(EY.Colour.ink)
                        .frame(width: EY.Touch.minimum, height: EY.Touch.minimum)
                        .background(.ultraThinMaterial, in: Circle())
                }
                .accessibilityLabel("Report this photo")
            }
        }
        .padding(EY.Space.base)
    }

    private func load() async {
        image = nil
        failed = false
        let loaded = await loader.image(for: asset)
        if let loaded {
            image = loaded
        } else {
            failed = true
        }
    }
}

/// Fetches gameplay images and keeps them for the length of a round.
///
/// Signed URLs are short-lived by design, so this holds decoded images rather
/// than URLs: a photo that has already appeared must not vanish mid-round
/// because its signature expired while everyone was arguing about it.
@MainActor
final class GameImageLoader: ObservableObject {
    private let backend: GameAssetUploading?
    private let local: LocalGameBackend?
    private let room: RoomID
    private let player: PlayerID
    private var cache: [AssetID: UIImage] = [:]
    private var inFlight: [AssetID: Task<UIImage?, Never>] = [:]

    init(
        backend: GameAssetUploading?,
        local: LocalGameBackend? = nil,
        room: RoomID,
        player: PlayerID
    ) {
        self.backend = backend
        self.local = local
        self.room = room
        self.player = player
    }

    func image(for asset: AssetID) async -> UIImage? {
        if let cached = cache[asset] { return cached }
        if let existing = inFlight[asset] { return await existing.value }

        let task = Task<UIImage?, Never> { [backend, local, room, player] in
            if let local {
                if let data = await local.imageData(for: asset) {
                    return UIImage(data: data)
                }
                return DemoImageFactory.image(for: asset)
            }
            guard let backend else { return nil }
            guard let url = try? await backend.signedURL(for: asset, room: room, player: player),
                  let (data, _) = try? await URLSession.shared.data(from: url) else { return nil }
            return UIImage(data: data)
        }

        inFlight[asset] = task
        let result = await task.value
        inFlight.removeValue(forKey: asset)
        if let result { cache[asset] = result }
        return result
    }

    /// Dropped when a round retires, so a removed photo does not linger in
    /// memory after the server deleted its bytes.
    func forget(_ asset: AssetID) {
        cache.removeValue(forKey: asset)
        inFlight[asset]?.cancel()
        inFlight.removeValue(forKey: asset)
    }

    func forgetAll() {
        cache.removeAll()
        inFlight.values.forEach { $0.cancel() }
        inFlight.removeAll()
    }
}

/// Placeholder art for demo mode.
///
/// Deliberately synthetic — coloured gradients with a caption — so that nothing
/// in a development build can ever be mistaken for, or accidentally become,
/// somebody's actual photograph.
enum DemoImageFactory {
    static func image(for asset: AssetID) -> UIImage? {
        let seed = abs(asset.raw.hashValue)
        let size = CGSize(width: 900, height: 1200)
        let renderer = UIGraphicsImageRenderer(size: size)

        return renderer.image { context in
            let hue = Double(seed % 360) / 360
            let top = UIColor(hue: hue, saturation: 0.55, brightness: 0.75, alpha: 1)
            let bottom = UIColor(hue: (hue + 0.15).truncatingRemainder(dividingBy: 1),
                                 saturation: 0.7, brightness: 0.35, alpha: 1)

            let colours = [top.cgColor, bottom.cgColor] as CFArray
            if let space = CGColorSpace(name: CGColorSpace.sRGB),
               let gradient = CGGradient(colorsSpace: space, colors: colours, locations: [0, 1]) {
                context.cgContext.drawLinearGradient(
                    gradient,
                    start: .zero,
                    end: CGPoint(x: 0, y: size.height),
                    options: []
                )
            }

            let label = "DEMO PHOTO\n\(asset.raw.suffix(6))"
            let paragraph = NSMutableParagraphStyle()
            paragraph.alignment = .center

            let attributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 54, weight: .heavy),
                .foregroundColor: UIColor.white.withAlphaComponent(0.85),
                .paragraphStyle: paragraph
            ]
            let rect = CGRect(x: 0, y: size.height / 2 - 80, width: size.width, height: 200)
            label.draw(in: rect, withAttributes: attributes)
        }
    }
}
