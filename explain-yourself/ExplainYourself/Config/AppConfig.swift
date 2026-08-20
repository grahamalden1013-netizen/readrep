import Foundation

/// Build-time configuration, read from the Info.plist keys that the `.xcconfig`
/// files populate.
///
/// The Supabase URL and anon key are in here on purpose: the anon key is a
/// public identifier, not a credential, and every RLS policy in
/// `supabase/migrations/0020_rls.sql` assumes an attacker has it. The service
/// role key is not here, is not in the repository, and must never be compiled
/// into a client — see `docs/SECURITY.md`.
enum AppConfig {
    enum Environment: String {
        case development
        case production
    }

    static let environment: Environment = {
        guard let raw = value(for: "EYEnvironment"),
              let parsed = Environment(rawValue: raw) else {
            return .development
        }
        return parsed
    }()

    static var isDevelopment: Bool { environment == .development }

    static let supabaseURL: URL? = value(for: "EYSupabaseURL").flatMap {
        // The xcconfig placeholder survives an unconfigured checkout, so treat
        // it as absent rather than crashing on first launch.
        $0.contains("YOUR-PROJECT-REF") ? nil : URL(string: $0)
    }

    static let supabaseAnonKey: String? = value(for: "EYSupabaseAnonKey").flatMap {
        $0.hasPrefix("REPLACE") || $0.isEmpty ? nil : $0
    }

    /// True when the app has somewhere real to talk to. When false the app
    /// still runs, entirely on-device, in demo mode — which is what makes it
    /// possible to check out this repository and see the game in a simulator
    /// without creating a backend first.
    static var hasBackend: Bool { supabaseURL != nil && supabaseAnonKey != nil }

    static let privacyPolicyURL = URL(string: value(for: "EYPrivacyPolicyURL") ?? "https://example.com/privacy")!

    static var appVersion: String { value(for: "CFBundleShortVersionString") ?? "0.0" }
    static var buildNumber: String { value(for: "CFBundleVersion") ?? "0" }
    static var displayVersion: String { "\(appVersion) (\(buildNumber))" }

    /// Development tooling is compiled out of release builds entirely, not
    /// merely hidden behind a flag.
    static var developerToolsAvailable: Bool {
        #if DEBUG
        return true
        #else
        return false
        #endif
    }

    private static func value(for key: String) -> String? {
        guard let raw = Bundle.main.object(forInfoDictionaryKey: key) as? String else { return nil }
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }
}

/// Numbers that shape how the game feels, in one place so they can be tuned
/// without hunting through views.
enum Tuning {
    /// The pause between the photo landing and the name landing. The single
    /// most important number in the product.
    static let ownerRevealDelay: TimeInterval = 1.6
    static let explanationSeconds = 15
    static let urgencyThreshold = 5

    /// Longest edge of an uploaded gameplay copy. A 48MP original is 12MB and
    /// looks identical to this on a phone held across a table.
    static let gameplayImageMaxEdge: CGFloat = 1600
    static let gameplayImageQuality: CGFloat = 0.82

    /// How much of the library to analyse in one pass. Scanning tens of
    /// thousands of assets buys almost nothing and costs a warm phone.
    static let maxAssetsToAnalyse = 900
    static let analysisBatchSize = 25
    static let candidateDeckSize = 40

    static let signedURLLifetime: TimeInterval = 300
    static let reconnectBackoff: [TimeInterval] = [0.5, 1, 2, 4, 8, 15]
}
