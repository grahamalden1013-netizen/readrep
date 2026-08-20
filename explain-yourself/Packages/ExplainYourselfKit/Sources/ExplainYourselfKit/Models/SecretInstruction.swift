import Foundation

/// The instruction only the photo's owner sees in Truth or Cap.
public enum SecretInstruction: String, Codable, CaseIterable, Sendable {
    case tellTheTruth
    case lie

    public var headline: String {
        switch self {
        case .tellTheTruth: return "TELL THE TRUTH"
        case .lie:          return "LIE"
        }
    }

    public var detail: String {
        switch self {
        case .tellTheTruth: return "Explain what actually happened."
        case .lie:          return "Make up a believable story."
        }
    }

    /// What the group is told at the reveal, given the owner's name.
    public func revealLine(owner: String) -> String {
        switch self {
        case .tellTheTruth: return "\(owner.uppercased()) WAS TELLING THE TRUTH 💀"
        case .lie:          return "\(owner.uppercased()) LIED TO ALL OF YOU."
        }
    }
}

/// A cryptographic commitment to a secret instruction.
///
/// The problem: the instruction has to be *hidden* during the round but
/// *trustworthy* at the reveal. If the server simply announced the answer
/// afterwards, nothing would stop it — or a tampered client — from picking
/// whichever answer made the round more interesting after seeing the votes.
///
/// So at round start the server publishes only `digest = SHA256(nonce | value)`.
/// Everybody can see it and nobody can invert it. At the reveal the server
/// publishes the nonce and the value, and every device recomputes the digest.
/// If it does not match, the round is shown as unverified rather than trusted.
public struct SecretCommitment: Codable, Hashable, Sendable {
    public let digest: String

    public init(digest: String) { self.digest = digest }

    public init(instruction: SecretInstruction, nonce: String) {
        self.digest = SecretCommitment.digest(instruction: instruction, nonce: nonce)
    }

    public static func digest(instruction: SecretInstruction, nonce: String) -> String {
        SHA256.hexDigest(of: Array("\(nonce)|\(instruction.rawValue)".utf8))
    }

    public func verify(instruction: SecretInstruction, nonce: String) -> Bool {
        // Constant-time-ish compare. Not security critical here (the value is
        // public by now), but it costs nothing to not leak a prefix.
        let other = SecretCommitment.digest(instruction: instruction, nonce: nonce)
        guard other.utf8.count == digest.utf8.count else { return false }
        var diff: UInt8 = 0
        for (a, b) in zip(other.utf8, digest.utf8) { diff |= a ^ b }
        return diff == 0
    }

    public static func makeNonce(using generator: inout some RandomNumberGenerator) -> String {
        var bytes = [UInt8]()
        bytes.reserveCapacity(16)
        for _ in 0..<16 { bytes.append(UInt8.random(in: 0...255, using: &generator)) }
        return bytes.map { String(format: "%02x", $0) }.joined()
    }

    public static func makeNonce() -> String {
        var g = SystemRandomNumberGenerator()
        return makeNonce(using: &g)
    }
}

/// The pair published at reveal time so clients can check the commitment.
public struct SecretReveal: Codable, Hashable, Sendable {
    public let instruction: SecretInstruction
    public let nonce: String

    public init(instruction: SecretInstruction, nonce: String) {
        self.instruction = instruction
        self.nonce = nonce
    }

    public func matches(_ commitment: SecretCommitment) -> Bool {
        commitment.verify(instruction: instruction, nonce: nonce)
    }
}
