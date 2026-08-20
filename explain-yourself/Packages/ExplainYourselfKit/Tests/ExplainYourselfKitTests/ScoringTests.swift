import XCTest
@testable import ExplainYourselfKit

final class ScoringTests: XCTestCase {
    private let engine = ScoreEngine()

    private func round(
        mode: GameMode,
        instruction: SecretInstruction? = nil,
        owner: PlayerID = Cast.jake,
        votes: [(PlayerID, VoteChoice)] = [],
        answers: [PlayerAnswer] = [],
        status: RoundStatus = .complete
    ) -> Round {
        let id = RoundID("r1")
        return Round(
            id: id,
            index: 0,
            mode: mode,
            ownerID: owner,
            assetID: AssetID("a1"),
            commitment: instruction.map { SecretCommitment(instruction: $0, nonce: "n") },
            secret: instruction.map { SecretReveal(instruction: $0, nonce: "n") },
            votes: votes.map { Vote(roundID: id, voterID: $0.0, choice: $0.1) },
            answers: answers,
            status: status
        )
    }

    func testTruthOrCapAwardsOnePointPerCorrectRead() {
        let r = round(mode: .truthOrCap, instruction: .lie, votes: [
            (Cast.sam, .cap), (Cast.alex, .cap), (Cast.ryan, .truth),
            (Cast.maya, .truth), (Cast.emma, .truth)
        ])
        let points = engine.points(for: r, players: Cast.six)
        XCTAssertEqual(points[Cast.sam], 1)
        XCTAssertEqual(points[Cast.alex], 1)
        XCTAssertNil(points[Cast.ryan])
    }

    func testTruthOrCapAwardsTheLiarForTakingTheMajority() {
        let r = round(mode: .truthOrCap, instruction: .lie, votes: [
            (Cast.sam, .truth), (Cast.alex, .truth), (Cast.ryan, .truth),
            (Cast.maya, .cap), (Cast.emma, .cap)
        ])
        let points = engine.points(for: r, players: Cast.six)
        XCTAssertEqual(points[Cast.jake], 1, "3 of 5 bought it")
        XCTAssertEqual(points[Cast.maya], 1)
        XCTAssertEqual(points[Cast.emma], 1)
    }

    func testTruthTellerIsNotRewardedForBeingBelieved() {
        // Being believed while telling the truth is not a bluff, so no point.
        let r = round(mode: .truthOrCap, instruction: .tellTheTruth, votes: [
            (Cast.sam, .truth), (Cast.alex, .truth), (Cast.ryan, .truth)
        ])
        let points = engine.points(for: r, players: Cast.six)
        XCTAssertNil(points[Cast.jake])
        XCTAssertEqual(points[Cast.sam], 1)
    }

    func testExactlyHalfIsNotAMajority() {
        let r = round(mode: .truthOrCap, instruction: .lie, votes: [
            (Cast.sam, .truth), (Cast.alex, .truth), (Cast.ryan, .cap), (Cast.maya, .cap)
        ])
        XCTAssertNil(engine.points(for: r, players: Cast.six)[Cast.jake])
    }

    func testNoContextAwardsTheFunniestAnswerAndNobodyOnATie() {
        let winner = PlayerAnswer(id: AnswerID("a"), roundID: RoundID("r1"), authorID: Cast.sam, text: "cone")
        let other = PlayerAnswer(id: AnswerID("b"), roundID: RoundID("r1"), authorID: Cast.alex, text: "car")

        let clear = round(mode: .noContext, votes: [
            (Cast.ryan, .answer(winner.id)), (Cast.maya, .answer(winner.id)),
            (Cast.emma, .answer(other.id))
        ], answers: [winner, other])
        XCTAssertEqual(engine.points(for: clear, players: Cast.six)[Cast.sam], 1)

        let tied = round(mode: .noContext, votes: [
            (Cast.ryan, .answer(winner.id)), (Cast.maya, .answer(other.id))
        ], answers: [winner, other])
        XCTAssertTrue(engine.points(for: tied, players: Cast.six).isEmpty)
    }

    func testWhoHasToExplainThisAwardsCorrectGuesses() {
        let r = round(mode: .whoHasToExplainThis, owner: Cast.maya, votes: [
            (Cast.sam, .player(Cast.maya)), (Cast.alex, .player(Cast.maya)),
            (Cast.ryan, .player(Cast.jake))
        ])
        let points = engine.points(for: r, players: Cast.six)
        XCTAssertEqual(points[Cast.sam], 1)
        XCTAssertEqual(points[Cast.alex], 1)
        XCTAssertNil(points[Cast.ryan])
    }

    func testExplainYourselfKeepsScoreOutOfIt() {
        let r = round(mode: .explainYourself, votes: [(Cast.sam, .absoluteCap)])
        XCTAssertTrue(engine.points(for: r, players: Cast.six).isEmpty)
    }

    func testRetiredRoundsNeverScore() {
        for status in [RoundStatus.removedByOwner, .skipped, .active] {
            let r = round(mode: .truthOrCap, instruction: .lie,
                          votes: [(Cast.sam, .cap)], status: status)
            XCTAssertEqual(engine.apply(round: r, to: [:], players: Cast.six), [:], "\(status)")
        }
    }

    func testPointsAreNeverAwardedToSomeoneWhoLeft() {
        let r = round(mode: .truthOrCap, instruction: .lie, votes: [(PlayerID("ghost"), .cap)])
        XCTAssertTrue(engine.points(for: r, players: Cast.six).isEmpty)
    }

    func testLeaderboardIsStableAcrossDevices() {
        let scores: [PlayerID: Int] = [Cast.jake: 3, Cast.sam: 3, Cast.alex: 1]
        // Run it repeatedly: dictionary iteration order changes between runs, so
        // an unstable sort would show up here rather than as an argument at a party.
        let expected = ScoreEngine.leaderboard(scores: scores, players: Cast.six).map(\.player.id)
        for _ in 0..<50 {
            XCTAssertEqual(ScoreEngine.leaderboard(scores: scores, players: Cast.six).map(\.player.id), expected)
        }
        XCTAssertEqual(expected.prefix(2).map(\.raw), [Cast.jake.raw, Cast.sam.raw], "3-3 tie breaks on nickname")
    }
}

final class TallyTests: XCTestCase {
    private func tally(_ pairs: [(PlayerID, VoteChoice)], mode: GameMode = .truthOrCap) -> VoteTally {
        VoteTally(
            votes: pairs.map { Vote(roundID: RoundID("r"), voterID: $0.0, choice: $0.1) },
            mode: mode
        )
    }

    func testCountsAndMajority() {
        let t = tally([(Cast.sam, .cap), (Cast.alex, .cap), (Cast.ryan, .truth)])
        XCTAssertEqual(t.totalVotes, 3)
        XCTAssertEqual(t.count(.cap), 2)
        XCTAssertTrue(t.isMajority(.cap))
        XCTAssertFalse(t.isMajority(.truth))
        XCTAssertEqual(t.winner, .cap)
    }

    func testTieHasNoWinner() {
        let t = tally([(Cast.sam, .cap), (Cast.alex, .truth)])
        XCTAssertNil(t.winner)
        XCTAssertTrue(t.isTie)
    }

    func testEmptyTallyIsSafe() {
        let t = tally([])
        XCTAssertNil(t.winner)
        XCTAssertFalse(t.isTie)
        XCTAssertFalse(t.isMajority(.cap))
    }

    func testTallyOrderingIsDeterministic() {
        let pairs: [(PlayerID, VoteChoice)] = [
            (Cast.sam, .cap), (Cast.alex, .truth), (Cast.ryan, .cap), (Cast.maya, .truth)
        ]
        let first = tally(pairs).counts.map(\.choice)
        for _ in 0..<50 { XCTAssertEqual(tally(pairs).counts.map(\.choice), first) }
    }
}

final class AwardTests: XCTestCase {
    private let awards = AwardEngine()

    private func truthOrCapRound(
        index: Int, owner: PlayerID, instruction: SecretInstruction,
        votes: [(PlayerID, VoteChoice)]
    ) -> Round {
        let id = RoundID("r\(index)")
        return Round(
            id: id, index: index, mode: .truthOrCap, ownerID: owner,
            assetID: AssetID("a\(index)"),
            commitment: SecretCommitment(instruction: instruction, nonce: "n\(index)"),
            secret: SecretReveal(instruction: instruction, nonce: "n\(index)"),
            votes: votes.map { Vote(roundID: id, voterID: $0.0, choice: $0.1) },
            status: .complete
        )
    }

    func testAwardsAreDeterministic() {
        let rounds = [
            truthOrCapRound(index: 0, owner: Cast.sam, instruction: .lie,
                            votes: [(Cast.jake, .truth), (Cast.alex, .truth), (Cast.maya, .cap)]),
            truthOrCapRound(index: 1, owner: Cast.sam, instruction: .lie,
                            votes: [(Cast.jake, .truth), (Cast.alex, .truth), (Cast.maya, .truth)]),
            truthOrCapRound(index: 2, owner: Cast.jake, instruction: .tellTheTruth,
                            votes: [(Cast.sam, .truth), (Cast.maya, .truth), (Cast.alex, .cap)])
        ]
        let first = awards.awards(rounds: rounds, players: Cast.six)
        for _ in 0..<50 {
            XCTAssertEqual(awards.awards(rounds: rounds, players: Cast.six), first)
        }
        XCTAssertEqual(first.first { $0.kind == .bestLiar }?.winner.id, Cast.sam)
        XCTAssertEqual(first.first { $0.kind == .mostExposed }?.winner.id, Cast.sam)
    }

    func testNoAwardsFromAnEmptyGame() {
        XCTAssertTrue(awards.awards(rounds: [], players: Cast.six).isEmpty)
    }

    func testAwardsAreNeverGivenForZero() {
        let round = truthOrCapRound(index: 0, owner: Cast.sam, instruction: .tellTheTruth,
                                    votes: [(Cast.jake, .truth)])
        let produced = awards.awards(rounds: [round], players: Cast.six)
        XCTAssertNil(produced.first { $0.kind == .bestLiar }, "nobody lied, so nobody is the best liar")
    }

    func testRemovedPhotosAreCountedButNeverAttributed() {
        var state = Cast.session()
        state.completedRounds = [
            Round(index: 0, mode: .truthOrCap, ownerID: Cast.emma,
                  assetID: AssetID("a"), status: .removedByOwner)
        ]
        let stats = awards.stats(state: state)
        XCTAssertEqual(stats.photosRemoved, 1)
        XCTAssertEqual(stats.roundsPlayed, 0, "a pulled photo is not a round anyone played")
        XCTAssertFalse(stats.lines.joined().contains("Emma"))
    }
}
