import Photos
import UIKit
import ExplainYourselfKit

/// Owns the one rule the whole product rests on.
///
/// A photo becomes eligible for a game when, and only when, its owner tapped
/// KEEP on it. This class is the only path from "the app noticed a photo" to
/// "the photo has bytes on a server", and it refuses to upload anything that is
/// not in `approved`.
///
/// Rejected and NEVER USE photos are not uploaded, not thumbnailed remotely,
/// not queued, and not logged. There is no code path here that could.
@MainActor
final class PhotoApprovalService: ObservableObject {
    @Published private(set) var deck: ApprovalDeck
    @Published private(set) var isUploading = false
    @Published private(set) var uploadedCount = 0
    @Published private(set) var lastError: GameBackendError?

    private let library: PhotoLibraryService
    private let exclusions: PhotoExclusionStore
    private let pipeline: CandidatePipeline
    private let uploader: GameAssetUploading
    private let analytics: AnalyticsService

    /// Maps this device's approved photos to the ids the game deals from.
    private(set) var uploadedAssets: [AssetID: AssetID] = [:]

    init(
        library: PhotoLibraryService,
        exclusions: PhotoExclusionStore,
        pipeline: CandidatePipeline,
        uploader: GameAssetUploading,
        analytics: AnalyticsService = NoopAnalyticsService()
    ) {
        self.library = library
        self.exclusions = exclusions
        self.pipeline = pipeline
        self.uploader = uploader
        self.analytics = analytics
        self.deck = ApprovalDeck(candidates: [])
    }

    func loadDeck(_ candidates: [AssetID]) {
        if deck.totalCount == 0 {
            deck = ApprovalDeck(candidates: exclusions.filter(candidates))
        } else {
            var updated = deck
            updated.append(exclusions.filter(candidates))
            deck = updated
        }
    }

    func decide(_ decision: ApprovalDecision) {
        var updated = deck
        guard let asset = updated.decide(decision) else { return }
        deck = updated

        switch decision {
        case .keep:
            analytics.track(.candidateKept)
        case .nope:
            analytics.track(.candidateRejected)
        case .neverUse:
            // Persisted immediately, not on DONE: somebody who taps NEVER USE
            // and then closes the app has made a decision, and it should stick.
            exclusions.exclude(asset)
            analytics.track(.candidateNeverUse)
        }
    }

    func undo() {
        var updated = deck
        guard let undone = updated.undo() else { return }
        deck = updated
        if undone.decision == .neverUse {
            exclusions.remove(undone.asset)
        }
    }

    func thumbnail(for asset: AssetID, size: CGSize) async -> UIImage? {
        guard let localID = pipeline.localIdentifier(for: asset),
              let phAsset = library.asset(withLocalIdentifier: localID) else { return nil }
        return await library.thumbnail(for: phAsset, size: size)
    }

    /// Uploads the approved deck, and nothing else.
    ///
    /// The `deck.approved` read at the top is the gate. There is deliberately
    /// no parameter here for "which photos" — a caller cannot ask this method
    /// to upload something the owner did not keep.
    func uploadApproved(room: RoomID, player: PlayerID) async {
        let approved = deck.approved
        guard !approved.isEmpty else { return }

        isUploading = true
        uploadedCount = 0
        defer { isUploading = false }

        for asset in approved {
            if uploadedAssets[asset] != nil {
                uploadedCount += 1
                continue
            }
            guard let localID = pipeline.localIdentifier(for: asset),
                  let phAsset = library.asset(withLocalIdentifier: localID) else {
                // The photo was deleted between approval and upload. Skip it
                // quietly; the deck simply has one fewer card.
                continue
            }

            guard let image = await library.image(for: phAsset, maxEdge: Tuning.gameplayImageMaxEdge) else {
                continue
            }

            do {
                // Resized and stripped here, on device, before a byte moves.
                let rendered = try GameplayImageRenderer.render(image)
                let payload = GameplayImagePayload(
                    localAssetID: asset,
                    jpegData: rendered.data,
                    pixelWidth: rendered.pixelWidth,
                    pixelHeight: rendered.pixelHeight
                )
                let remoteID = try await uploader.upload(payload, room: room, player: player)
                uploadedAssets[asset] = remoteID
                uploadedCount += 1
            } catch {
                lastError = (error as? GameBackendError) ?? .uploadFailed
            }
        }
    }

    /// REMOVE PHOTO, from the owner's side: forget it locally as well as
    /// server-side, so it cannot be dealt again later in the same game.
    func forget(remoteAsset: AssetID) {
        if let local = uploadedAssets.first(where: { $0.value == remoteAsset })?.key {
            uploadedAssets.removeValue(forKey: local)
        }
    }

    var approvedCount: Int { deck.approved.count }
    var hasEnoughEvidence: Bool { deck.hasEnough }
}
