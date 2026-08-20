import Photos
import UIKit
import ExplainYourselfKit

/// Everything that touches PhotoKit.
///
/// The rules this type exists to keep, none of which are negotiable:
///
///   • Limited access is a first-class outcome, not a degraded one. If somebody
///     picks eleven photos, the game works with eleven photos.
///   • The library is never scanned in the background and never scanned twice
///     for the same session.
///   • A `PHAsset.localIdentifier` never leaves this file's callers as itself.
///     It is hashed with a device-local salt on the way out.
///   • No photo is ever read for upload unless a human tapped KEEP on it.
@MainActor
final class PhotoLibraryService: NSObject, ObservableObject {
    @Published private(set) var authorization: PHAuthorizationStatus
    @Published private(set) var isScanning = false
    @Published private(set) var scanProgress: Double = 0

    private let imageManager = PHCachingImageManager()
    private var registeredForChanges = false

    /// Fires when the user changes what the app can see while it is running —
    /// which iOS allows at any moment, and which the approval deck has to
    /// handle rather than ignore.
    var onLibraryChanged: (() -> Void)?

    override init() {
        self.authorization = PHPhotoLibrary.authorizationStatus(for: .readWrite)
        super.init()
    }

    deinit {
        if registeredForChanges {
            PHPhotoLibrary.shared().unregisterChangeObserver(self)
        }
    }

    var scope: PhotoAccessScope {
        switch authorization {
        case .authorized:  return .full
        case .limited:     return .limited
        default:           return .denied
        }
    }

    var canRead: Bool { authorization == .authorized || authorization == .limited }

    func requestAccess() async -> PHAuthorizationStatus {
        let status = await PHPhotoLibrary.requestAuthorization(for: .readWrite)
        authorization = status
        if status == .authorized || status == .limited { observeChanges() }
        return status
    }

    /// Opens the system sheet for choosing which photos the app may see. Only
    /// meaningful under limited access, and the only way to widen a limited
    /// selection without sending someone to Settings.
    func presentLimitedPicker(from controller: UIViewController) {
        PHPhotoLibrary.shared().presentLimitedLibraryPicker(from: controller)
    }

    private func observeChanges() {
        guard !registeredForChanges else { return }
        registeredForChanges = true
        PHPhotoLibrary.shared().register(self)
    }

    // MARK: - Fetching

    /// The assets this app is currently allowed to see, newest first, capped.
    ///
    /// The cap matters: a 60,000 photo library would take minutes to analyse
    /// and leave the phone warm, for a deck of twenty. Sampling the most recent
    /// few hundred plus a spread of older ones finds the same jokes far faster.
    func fetchCandidateAssets(limit: Int = Tuning.maxAssetsToAnalyse) -> [PHAsset] {
        guard canRead else { return [] }

        let options = PHFetchOptions()
        options.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: false)]
        options.predicate = NSPredicate(
            format: "mediaType == %d", PHAssetMediaType.image.rawValue
        )
        options.includeHiddenAssets = false
        // Never surface something the owner already deleted once.
        options.includeAssetSourceTypes = [.typeUserLibrary, .typeCloudShared]

        let result = PHAsset.fetchAssets(with: options)
        guard result.count > 0 else { return [] }

        var assets: [PHAsset] = []
        assets.reserveCapacity(min(limit, result.count))

        if result.count <= limit {
            result.enumerateObjects { asset, _, _ in assets.append(asset) }
            return assets
        }

        // Half from the recent past, half spread across the whole library, so
        // "that photo from 2019" is reachable without reading 60,000 rows.
        let recentCount = limit / 2
        for index in 0..<recentCount {
            assets.append(result.object(at: index))
        }
        let remaining = limit - recentCount
        let stride = max(1, (result.count - recentCount) / remaining)
        var index = recentCount
        while index < result.count, assets.count < limit {
            assets.append(result.object(at: index))
            index += stride
        }
        return assets
    }

    func asset(withLocalIdentifier id: String) -> PHAsset? {
        PHAsset.fetchAssets(withLocalIdentifiers: [id], options: nil).firstObject
    }

    // MARK: - Images

    /// A small image for the approval deck. Never leaves the device.
    func thumbnail(for asset: PHAsset, size: CGSize) async -> UIImage? {
        await withCheckedContinuation { continuation in
            let options = PHImageRequestOptions()
            options.deliveryMode = .highQualityFormat
            options.resizeMode = .fast
            options.isNetworkAccessAllowed = true
            options.isSynchronous = false

            var resumed = false
            imageManager.requestImage(
                for: asset, targetSize: size, contentMode: .aspectFill, options: options
            ) { image, info in
                // PhotoKit can call this twice: once with a degraded placeholder
                // and once with the real thing. Resuming twice would trap.
                let degraded = (info?[PHImageResultIsDegradedKey] as? Bool) ?? false
                guard !degraded, !resumed else { return }
                resumed = true
                continuation.resume(returning: image)
            }
        }
    }

    /// Full-ish resolution, for analysis and for producing a gameplay copy.
    func image(for asset: PHAsset, maxEdge: CGFloat) async -> UIImage? {
        await withCheckedContinuation { continuation in
            let options = PHImageRequestOptions()
            options.deliveryMode = .highQualityFormat
            options.resizeMode = .exact
            options.isNetworkAccessAllowed = true
            options.version = .current

            let scale = maxEdge / CGFloat(max(asset.pixelWidth, asset.pixelHeight))
            let target = CGSize(
                width: CGFloat(asset.pixelWidth) * min(1, scale),
                height: CGFloat(asset.pixelHeight) * min(1, scale)
            )

            var resumed = false
            imageManager.requestImage(
                for: asset, targetSize: target, contentMode: .aspectFit, options: options
            ) { image, info in
                let degraded = (info?[PHImageResultIsDegradedKey] as? Bool) ?? false
                guard !degraded, !resumed else { return }
                resumed = true
                continuation.resume(returning: image)
            }
        }
    }

    func startCaching(_ assets: [PHAsset], size: CGSize) {
        imageManager.startCachingImages(
            for: assets, targetSize: size, contentMode: .aspectFill, options: nil
        )
    }

    func stopCachingAll() {
        imageManager.stopCachingImagesForAllAssets()
    }

    func beginScan() { isScanning = true; scanProgress = 0 }
    func updateScan(_ progress: Double) { scanProgress = min(1, max(0, progress)) }
    func endScan() { isScanning = false; scanProgress = 1 }
}

extension PhotoLibraryService: PHPhotoLibraryChangeObserver {
    nonisolated func photoLibraryDidChange(_ changeInstance: PHChange) {
        Task { @MainActor in
            self.authorization = PHPhotoLibrary.authorizationStatus(for: .readWrite)
            self.onLibraryChanged?()
        }
    }
}
