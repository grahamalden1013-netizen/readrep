import XCTest
@testable import ExplainYourselfKit

final class DealerTests: XCTestCase {

    private func play(rounds: Int, players: [Player], each: Int = 10, seed: UInt64 = 9) -> [Round] {
        var dealer = RoundDealer(seed: seed)
        let pools = Cast.pools(for: players, each: each)
        var history: [Round] = []
        for index in 0..<rounds {
            guard let dealt = dealer.deal(pools: pools, history: history, index: index, mode: .truthOrCap)
            else { break }
            history.append(Round(index: index, mode: .truthOrCap,
                                 ownerID: dealt.ownerID, assetID: dealt.assetID))
        }
        return history
    }

    func testNoPhotoIsEverShownTwice() {
        let rounds = play(rounds: 20, players: Cast.six)
        XCTAssertEqual(Set(rounds.map(\.assetID)).count, rounds.count)
    }

    func testTheSamePersonIsNeverOnTheSpotTwiceInARow() {
        for seed in UInt64(1)...30 {
            let rounds = play(rounds: 20, players: Cast.six, seed: seed)
            for pair in zip(rounds, rounds.dropFirst()) {
                XCTAssertNotEqual(pair.0.ownerID, pair.1.ownerID, "seed \(seed)")
            }
        }
    }

    func testEveryoneIsOnTheSpotAtLeastOnceInTheFirstLap() {
        // Six players, six rounds: the dealer always takes from the least-seen
        // set, so the first lap covers everybody. Nobody sits through a whole
        // game watching other people get roasted.
        for seed in UInt64(1)...30 {
            let rounds = play(rounds: 6, players: Cast.six, seed: seed)
            XCTAssertEqual(Set(rounds.map(\.ownerID)).count, 6, "seed \(seed)")
        }
    }

    func testExposureIsSpreadEvenlyAcrossPlayers() {
        // The bound is two, not one, and that is deliberate. When the only
        // least-seen player is the person who just went, the dealer would
        // rather deal somebody slightly over-exposed than put the same person
        // up twice in a row — so a player can fall two behind for a round
        // before catching up. Three would be a real fairness bug.
        for seed in UInt64(1)...30 {
            let rounds = play(rounds: 10, players: Cast.six, seed: seed)
            var counts: [PlayerID: Int] = [:]
            for round in rounds { counts[round.ownerID, default: 0] += 1 }
            let values = Cast.six.map { counts[$0.id] ?? 0 }
            XCTAssertLessThanOrEqual((values.max() ?? 0) - (values.min() ?? 0), 2, "seed \(seed): \(values)")
            XCTAssertGreaterThanOrEqual(values.min() ?? 0, 1, "seed \(seed): somebody never came up")
        }
    }

    func testBackToBackIsAllowedOnlyWhenThereIsNoAlternative() {
        // Only one player has approved photos, so the dealer has to repeat
        // rather than deal nothing at all.
        var dealer = RoundDealer(seed: 3)
        let pools = [AssetPool(ownerID: Cast.jake, assetIDs: [AssetID("j1"), AssetID("j2")])]
        var history: [Round] = []
        for index in 0..<2 {
            let dealt = dealer.deal(pools: pools, history: history, index: index, mode: .explainYourself)
            XCTAssertNotNil(dealt)
            history.append(Round(index: index, mode: .explainYourself,
                                 ownerID: dealt!.ownerID, assetID: dealt!.assetID))
        }
        XCTAssertEqual(history.map(\.ownerID), [Cast.jake, Cast.jake])
    }

    func testDealerRunsOutRatherThanRepeating() {
        let rounds = play(rounds: 20, players: Cast.six, each: 2)
        XCTAssertEqual(rounds.count, 12)
        XCTAssertEqual(Set(rounds.map(\.assetID)).count, 12)
    }

    func testSameSeedReplaysTheSameGame() {
        let a = play(rounds: 10, players: Cast.six, seed: 1234)
        let b = play(rounds: 10, players: Cast.six, seed: 1234)
        XCTAssertEqual(a.map(\.assetID), b.map(\.assetID))
        XCTAssertEqual(a.map(\.ownerID), b.map(\.ownerID))
    }

    func testDifferentSeedsProduceDifferentGames() {
        let a = play(rounds: 10, players: Cast.six, seed: 1)
        let b = play(rounds: 10, players: Cast.six, seed: 2)
        XCTAssertNotEqual(a.map(\.assetID), b.map(\.assetID))
    }

    func testSecretInstructionsAreNotAllTheSame() {
        var dealer = RoundDealer(seed: 77)
        let instructions = (0..<200).map { _ in dealer.dealSecret().instruction }
        let lies = instructions.filter { $0 == .lie }.count
        XCTAssertGreaterThan(lies, 60, "a coin that always lands the same way is not a bluff")
        XCTAssertLessThan(lies, 140)
    }

    func testEveryDealtSecretCarriesAFreshNonce() {
        var dealer = RoundDealer(seed: 5)
        let nonces = (0..<100).map { _ in dealer.dealSecret().nonce }
        XCTAssertEqual(Set(nonces).count, 100)
    }

    func testMaxRoundsReflectsTheAvailableDecks() {
        XCTAssertEqual(RoundDealer.maxRounds(pools: Cast.pools(for: Cast.six, each: 3)), 18)
        XCTAssertEqual(RoundDealer.maxRounds(pools: []), 0)
    }
}

final class SHA256Tests: XCTestCase {
    func testKnownVectors() {
        XCTAssertEqual(
            SHA256.hexDigest(of: ""),
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        )
        XCTAssertEqual(
            SHA256.hexDigest(of: "abc"),
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        )
        XCTAssertEqual(
            SHA256.hexDigest(of: "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq"),
            "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1"
        )
    }

    func testMultiBlockInputCrossesThePaddingBoundaryCorrectly() {
        // 55, 56 and 64 bytes are where naive padding implementations break.
        for length in [54, 55, 56, 57, 63, 64, 65, 119, 120] {
            let digest = SHA256.hexDigest(of: String(repeating: "a", count: length))
            XCTAssertEqual(digest.count, 64, "length \(length)")
        }
        XCTAssertEqual(
            SHA256.hexDigest(of: String(repeating: "a", count: 1_000_000)).prefix(16),
            "cdc76e5c9914fb92"
        )
    }
}

final class SeededGeneratorTests: XCTestCase {
    func testSameSeedSameSequence() {
        var a = SeededGenerator(seed: 99)
        var b = SeededGenerator(seed: 99)
        for _ in 0..<100 { XCTAssertEqual(a.next(), b.next()) }
    }

    func testDistributionIsNotObviouslyBroken() {
        var generator = SeededGenerator(seed: 2024)
        var buckets = [Int](repeating: 0, count: 10)
        for _ in 0..<100_000 { buckets[Int.random(in: 0..<10, using: &generator)] += 1 }
        for count in buckets {
            XCTAssertGreaterThan(count, 9_000)
            XCTAssertLessThan(count, 11_000)
        }
    }
}
