import Foundation
import Security
import ExplainYourselfKit

/// Who this device is, before anybody signs in to anything.
///
/// A party game should not ask for an email address. The first launch asks for
/// a name and nothing else; the device gets a random identifier and a random
/// secret, and that is a complete identity as far as the game is concerned.
/// Sign in with Apple, when it arrives, links to this same identifier rather
/// than replacing it, so nobody loses their exclusions by signing in.
@MainActor
final class IdentityService: ObservableObject {
    @Published private(set) var nickname: String?
    @Published private(set) var playerID: PlayerID?

    private let defaults: UserDefaults
    private let keychain: KeychainStore

    private enum Key {
        static let nickname = "ey.nickname"
        static let playerID = "ey.playerID"
        static let deviceSecret = "ey.deviceSecret"
        static let assetSalt = "ey.assetSalt"
        static let onboarded = "ey.onboardingCompleted"
    }

    init(defaults: UserDefaults = .standard, keychain: KeychainStore = KeychainStore()) {
        self.defaults = defaults
        self.keychain = keychain
        self.nickname = defaults.string(forKey: Key.nickname)
        self.playerID = defaults.string(forKey: Key.playerID).map(PlayerID.init)
    }

    var hasCompletedOnboarding: Bool {
        get { defaults.bool(forKey: Key.onboarded) }
        set { defaults.set(newValue, forKey: Key.onboarded) }
    }

    var isReadyToPlay: Bool { nickname?.isEmpty == false }

    func setNickname(_ raw: String) -> Result<String, NicknameValidator.Failure> {
        let result = NicknameValidator.validate(raw)
        if case .success(let name) = result {
            nickname = name
            defaults.set(name, forKey: Key.nickname)
        }
        return result
    }

    /// The device's own identifier. Minted once, then stable.
    func ensurePlayerID() -> PlayerID {
        if let playerID { return playerID }
        let minted = PlayerID(UUID().uuidString.lowercased())
        playerID = minted
        defaults.set(minted.raw, forKey: Key.playerID)
        return minted
    }

    /// A per-install secret, in the Keychain rather than UserDefaults because
    /// UserDefaults is a plist in a backup.
    func deviceSecret() -> String {
        if let existing = keychain.string(for: Key.deviceSecret) { return existing }
        let secret = Self.randomHex(32)
        keychain.set(secret, for: Key.deviceSecret)
        return secret
    }

    /// Salt for hashing PhotoKit local identifiers.
    ///
    /// A PhotoKit local identifier is a stable handle into somebody's private
    /// library, so it never leaves the device and never appears in a network
    /// call, a log line or an analytics event. What travels instead is
    /// `SHA256(salt | localIdentifier)`: stable enough to remember a NEVER USE
    /// across sessions, useless to anyone without this device's salt.
    func assetSalt() -> String {
        if let existing = keychain.string(for: Key.assetSalt) { return existing }
        let salt = Self.randomHex(16)
        keychain.set(salt, for: Key.assetSalt)
        return salt
    }

    func assetID(forLocalIdentifier localID: String) -> AssetID {
        AssetID(SHA256.hexDigest(of: "\(assetSalt())|\(localID)"))
    }

    func identity() -> PlayerIdentity {
        PlayerIdentity(
            id: ensurePlayerID(),
            nickname: nickname ?? "Player",
            deviceToken: deviceSecret()
        )
    }

    /// Used by "reset everything" in settings.
    func forgetEverything() {
        defaults.removeObject(forKey: Key.nickname)
        defaults.removeObject(forKey: Key.playerID)
        defaults.removeObject(forKey: Key.onboarded)
        keychain.delete(Key.deviceSecret)
        keychain.delete(Key.assetSalt)
        nickname = nil
        playerID = nil
    }

    private static func randomHex(_ bytes: Int) -> String {
        var buffer = [UInt8](repeating: 0, count: bytes)
        // SecRandomCopyBytes is the only correct source here; falling back to
        // `Int.random` would silently weaken the device secret.
        let status = SecRandomCopyBytes(kSecRandomDefault, bytes, &buffer)
        precondition(status == errSecSuccess, "the system random source failed")
        return buffer.map { String(format: "%02x", $0) }.joined()
    }
}

/// A very small Keychain wrapper. Items are `ThisDeviceOnly` so they do not
/// travel in an iCloud backup to a device that is not this one.
struct KeychainStore {
    private let service = "com.explainyourself.app"

    func string(for key: String) -> String? {
        var query = baseQuery(key)
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
              let data = item as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    @discardableResult
    func set(_ value: String, for key: String) -> Bool {
        guard let data = value.data(using: .utf8) else { return false }
        let query = baseQuery(key)
        SecItemDelete(query as CFDictionary)

        var insert = query
        insert[kSecValueData as String] = data
        insert[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        return SecItemAdd(insert as CFDictionary, nil) == errSecSuccess
    }

    func delete(_ key: String) {
        SecItemDelete(baseQuery(key) as CFDictionary)
    }

    private func baseQuery(_ key: String) -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]
    }
}
