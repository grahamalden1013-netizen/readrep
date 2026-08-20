import Foundation

/// A small, fast, deterministic PRNG (SplitMix64).
///
/// Every place the game makes a random choice — which photo, whose photo, truth
/// or lie — takes a generator as a parameter rather than reaching for
/// `SystemRandomNumberGenerator`. That is what makes "the deck never repeats a
/// player twice in a row" a thing a test can assert instead of a thing we hope.
public struct SeededGenerator: RandomNumberGenerator {
    private var state: UInt64

    public init(seed: UInt64) { self.state = seed }

    public mutating func next() -> UInt64 {
        state = state &+ 0x9E3779B97F4A7C15
        var z = state
        z = (z ^ (z >> 30)) &* 0xBF58476D1CE4E5B9
        z = (z ^ (z >> 27)) &* 0x94D049BB133111EB
        return z ^ (z >> 31)
    }
}

/// Injectable time. Needed so timer and reconnection tests do not sleep.
public protocol GameClock: Sendable {
    var now: Date { get }
}

public struct SystemGameClock: GameClock {
    public init() {}
    public var now: Date { Date() }
}

public final class FixedGameClock: GameClock, @unchecked Sendable {
    private let lock = NSLock()
    private var current: Date

    public init(_ start: Date = Date(timeIntervalSince1970: 1_700_000_000)) {
        self.current = start
    }

    public var now: Date {
        lock.lock(); defer { lock.unlock() }
        return current
    }

    public func advance(by interval: TimeInterval) {
        lock.lock(); defer { lock.unlock() }
        current = current.addingTimeInterval(interval)
    }
}
