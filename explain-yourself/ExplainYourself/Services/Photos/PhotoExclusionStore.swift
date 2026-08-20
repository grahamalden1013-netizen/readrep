import Foundation
import ExplainYourselfKit

/// NEVER USE, remembered.
///
/// Stored as salted hashes of PhotoKit local identifiers, on device, in a file
/// rather than UserDefaults so it can grow without bloating the app's plist.
/// The identifiers themselves are never written anywhere, so this file is
/// useless to anybody who obtains it: it can confirm that a photo you already
/// have the identifier and the salt for was excluded, and nothing else.
@MainActor
final class PhotoExclusionStore: ObservableObject {
    @Published private(set) var excluded: Set<AssetID> = []

    private let url: URL

    init(filename: String = "photo-exclusions.json") {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        try? FileManager.default.createDirectory(at: base, withIntermediateDirectories: true)
        self.url = base.appendingPathComponent(filename)
        load()
    }

    var count: Int { excluded.count }

    func contains(_ id: AssetID) -> Bool { excluded.contains(id) }

    func exclude(_ id: AssetID) {
        excluded.insert(id)
        save()
    }

    /// Undoing a NEVER USE has to drop the exclusion too, or the photo silently
    /// never comes back and the undo was a lie.
    func remove(_ id: AssetID) {
        excluded.remove(id)
        save()
    }

    /// Offered in Settings. Somebody who excluded half their library in a hurry
    /// needs a way back that is not "delete the app".
    func resetAll() {
        excluded = []
        save()
    }

    func filter(_ candidates: [AssetID]) -> [AssetID] {
        candidates.filter { !excluded.contains($0) }
    }

    private func load() {
        guard let data = try? Data(contentsOf: url),
              let ids = try? JSONDecoder().decode([String].self, from: data) else { return }
        excluded = Set(ids.map(AssetID.init))
    }

    private func save() {
        let ids = excluded.map(\.raw).sorted()
        guard let data = try? JSONEncoder().encode(ids) else { return }
        // `.completeFileProtection`: unreadable while the phone is locked.
        try? data.write(to: url, options: [.atomic, .completeFileProtection])
    }
}
