import SwiftUI
import UIKit
import ExplainYourselfKit

/// Composition root.
///
/// Every service is built here, once, and handed down. Nothing constructs its
/// own dependencies, which is what makes it possible to run the entire app
/// against `LocalGameBackend` by changing one branch — and what stops a view
/// from quietly reaching for the network.
@MainActor
final class AppEnvironment: ObservableObject {
    let identity: IdentityService
    let photoLibrary: PhotoLibraryService
    let exclusions: PhotoExclusionStore
    let analytics: AnalyticsService
    let ai: AIService

    let backend: GameBackend
    let uploader: GameAssetUploading
    /// Non-nil only in demo mode, where images come from memory rather than a
    /// signed URL.
    let localBackend: LocalGameBackend?

    private(set) var pipeline: CandidatePipeline!
    private(set) var approvals: PhotoApprovalService!

    /// True when the app is running entirely on device, with no server.
    let isDemoMode: Bool

    init(forceDemo: Bool = false) {
        let identity = IdentityService()
        let library = PhotoLibraryService()
        let exclusions = PhotoExclusionStore()

        self.identity = identity
        self.photoLibrary = library
        self.exclusions = exclusions
        self.analytics = NoopAnalyticsService()
        self.ai = OfflineAIService()

        // No backend configured is not an error. It means demo mode, which is
        // what lets somebody clone this repository and see the game running in
        // a simulator without creating a Supabase project first.
        let useLocal = forceDemo || !AppConfig.hasBackend
        self.isDemoMode = useLocal

        if useLocal {
            let local = LocalGameBackend(host: identity.identity())
            self.backend = local
            self.uploader = local
            self.localBackend = local
        } else {
            let supabase = SupabaseGameBackend(
                configuration: .init(
                    url: AppConfig.supabaseURL!,
                    anonKey: AppConfig.supabaseAnonKey!
                )
            )
            self.backend = supabase
            self.uploader = supabase
            self.localBackend = nil
        }

        let pipeline = CandidatePipeline(
            library: library,
            exclusions: exclusions,
            assetID: { [weak identity] localID in
                // Hashed with a device-local salt. A PhotoKit local identifier
                // is a handle into somebody's private library and never leaves
                // this process as itself.
                identity?.assetID(forLocalIdentifier: localID) ?? AssetID(localID)
            },
            analytics: self.analytics
        )
        self.pipeline = pipeline

        self.approvals = PhotoApprovalService(
            library: library,
            exclusions: exclusions,
            pipeline: pipeline,
            uploader: self.uploader,
            analytics: self.analytics
        )
    }

    func makeCoordinator() -> GameSessionCoordinator {
        GameSessionCoordinator(
            backend: backend,
            identity: identity.identity(),
            approvals: approvals,
            analytics: analytics
        )
    }

    func makeImageLoader(room: RoomID) -> GameImageLoader {
        GameImageLoader(
            backend: uploader,
            local: localBackend,
            room: room,
            player: identity.ensurePlayerID()
        )
    }

    /// Opens the system sheet for widening a limited photo selection. Needs a
    /// view controller, which is the one place the app has to reach into UIKit.
    func presentLimitedPicker() {
        guard let scene = UIApplication.shared.connectedScenes
                .compactMap({ $0 as? UIWindowScene })
                .first(where: { $0.activationState == .foregroundActive }),
              let root = scene.keyWindow?.rootViewController else { return }

        var presenter = root
        while let presented = presenter.presentedViewController {
            presenter = presented
        }
        photoLibrary.presentLimitedPicker(from: presenter)
    }
}
