import XCTest
@testable import ExplainYourself
import ExplainYourselfKit

/// The rule the entire product rests on: nothing is uploaded that its owner did
/// not explicitly keep.
final class ApprovalGateTests: XCTestCase {

    /// Records every upload it is asked to perform, so a test can assert on
    /// what did *not* happen.
    private actor RecordingUploader: GameAssetUploading {
        private(set) var uploaded: [AssetID] = []

        func upload(_ payload: GameplayImagePayload, room: RoomID, player: PlayerID) async throws -> AssetID {
            uploaded.append(payload.localAssetID)
            return AssetID("remote-\(payload.localAssetID.raw)")
        }

        func signedURL(for asset: AssetID, room: RoomID, player: PlayerID) async throws -> URL {
            URL(string: "https://example.invalid/\(asset.raw)")!
        }

        func purge(asset: AssetID, room: RoomID, player: PlayerID) async throws {}

        func record() -> [AssetID] { uploaded }
    }

    @MainActor
    func testOnlyKeptPhotosAreEverOfferedForUpload() async {
        var deck = ApprovalDeck(candidates: (0..<6).map { AssetID("a\($0)") })

        deck.decide(.keep)      // a0
        deck.decide(.nope)      // a1
        deck.decide(.neverUse)  // a2
        deck.decide(.keep)      // a3
        deck.decide(.nope)      // a4

        // The upload path reads `deck.approved` and has no parameter for
        // anything else — so this list is the complete set of things that can
        // reach a server.
        XCTAssertEqual(deck.approved, [AssetID("a0"), AssetID("a3")])
        XCTAssertFalse(deck.approved.contains(AssetID("a1")), "a rejected photo must never be uploaded")
        XCTAssertFalse(deck.approved.contains(AssetID("a2")), "a NEVER USE photo must never be uploaded")
        XCTAssertFalse(deck.approved.contains(AssetID("a5")), "an unreviewed photo must never be uploaded")
    }

    @MainActor
    func testNeverUseIsPersistedImmediatelyAndFiltersFutureDecks() {
        let store = PhotoExclusionStore(filename: "test-exclusions-\(UUID().uuidString).json")
        defer { store.resetAll() }

        let doomed = AssetID("never-this-one")
        store.exclude(doomed)

        XCTAssertTrue(store.contains(doomed))
        let filtered = store.filter([AssetID("fine"), doomed, AssetID("also-fine")])
        XCTAssertEqual(filtered, [AssetID("fine"), AssetID("also-fine")])
    }

    @MainActor
    func testUndoingNeverUseAlsoDropsTheExclusion() {
        // Otherwise the undo is a lie: the card comes back on screen but the
        // photo is silently gone from every future deck.
        let store = PhotoExclusionStore(filename: "test-exclusions-\(UUID().uuidString).json")
        defer { store.resetAll() }

        let asset = AssetID("oops")
        store.exclude(asset)
        XCTAssertTrue(store.contains(asset))

        store.remove(asset)
        XCTAssertFalse(store.contains(asset))
        XCTAssertEqual(store.filter([asset]), [asset])
    }

    @MainActor
    func testResettingExclusionsClearsEverything() {
        let store = PhotoExclusionStore(filename: "test-exclusions-\(UUID().uuidString).json")
        defer { store.resetAll() }

        for index in 0..<5 { store.exclude(AssetID("x\(index)")) }
        XCTAssertEqual(store.count, 5)
        store.resetAll()
        XCTAssertEqual(store.count, 0)
    }

    func testAssetIdentifiersAreSaltedHashesRatherThanPhotoKitIdentifiers() {
        // A PhotoKit local identifier is a stable handle into somebody's
        // private library. Nothing that leaves this device may be one.
        let localID = "B84E8479-475C-4727-A4A4-B77AA9980897/L0/001"
        let salt = "0123456789abcdef"
        let hashed = SHA256.hexDigest(of: "\(salt)|\(localID)")

        XCTAssertEqual(hashed.count, 64)
        XCTAssertFalse(hashed.contains("B84E8479"))
        XCTAssertFalse(hashed.contains("/L0/"))

        // Same photo, same device: stable, so exclusions keep working.
        XCTAssertEqual(hashed, SHA256.hexDigest(of: "\(salt)|\(localID)"))
        // Same photo, different device: unlinkable.
        XCTAssertNotEqual(hashed, SHA256.hexDigest(of: "fedcba9876543210|\(localID)"))
    }
}
