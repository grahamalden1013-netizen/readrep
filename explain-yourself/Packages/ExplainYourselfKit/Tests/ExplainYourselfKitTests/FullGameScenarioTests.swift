import XCTest
@testable import ExplainYourselfKit

/// The scenario from the brief, run end to end as a test rather than described
/// in a document: Jake, Sam, Alex, Ryan, Maya and Emma play ten rounds of Truth
/// or Cap, somebody drops out and comes back, somebody pulls a photo mid-round,
/// and the game still finishes with awards and a working PLAY AGAIN.
final class FullGameScenarioTests: XCTestCase {

    func testTheWholeNightRunsWithoutTheGameGettingStuck() throws {
        var players = Cast.six
        var driver = GameDriver(mode: .truthOrCap, rounds: 10, players: players, seed: 20_240_517)

        // Everyone approved at least ten photos and is ready.
        XCTAssertTrue(players.allSatisfy { $0.approvedAssetCount >= 10 })
        XCTAssertEqual(driver.state.phase, .ready)

        driver.start()
        XCTAssertEqual(driver.state.phase, .roundIntro)

        var sawTruthInstruction = false
        var sawLieInstruction = false
        var someoneFooledTheGroup = false
        var someoneGuessedRight = false
        var didDisconnect = false
        var didReconnect = false
        var didRemovePhoto = false
        var removedRoundID: RoundID?
        var steps = 0

        while !driver.state.isFinished, steps < 400 {
            steps += 1
            let phase = driver.state.phase

            // A player drops out during round 3 and comes back in round 4.
            if driver.state.roundIndex == 2, !didDisconnect,
               let round = driver.round, round.ownerID != Cast.emma {
                let index = players.firstIndex { $0.id == Cast.emma }!
                players[index].status = .disconnected
                driver.context.players = players
                driver.send(.playersChanged(players))
                didDisconnect = true
                continue
            }
            if didDisconnect, !didReconnect, driver.state.roundIndex >= 3 {
                let index = players.firstIndex { $0.id == Cast.emma }!
                players[index].status = .ready
                driver.context.players = players
                driver.send(.playersChanged(players))
                didReconnect = true
                continue
            }

            // In round 6 the owner pulls their own photo mid-round.
            if driver.state.roundIndex == 5, !didRemovePhoto, phase == .explanationTimer,
               let round = driver.round {
                removedRoundID = round.id
                driver.send(.ownerRemovedPhoto(roundID: round.id, actor: round.ownerID))
                didRemovePhoto = true
                continue
            }

            if phase == .secretInstruction, let round = driver.round {
                let ownerView = RoundRedactor.redact(round, viewer: round.ownerID)
                switch ownerView.yourSecretInstruction {
                case .tellTheTruth: sawTruthInstruction = true
                case .lie:          sawLieInstruction = true
                case .none:         XCTFail("the owner was never handed their card")
                }
                // And nobody else can see it.
                for other in players where other.id != round.ownerID {
                    XCTAssertNil(RoundRedactor.redact(round, viewer: other.id).yourSecretInstruction)
                }
            }

            if phase == .voting, let round = driver.round {
                let instruction = try XCTUnwrap(round.secretInstruction)
                let voters = round.eligibleVoters(in: players)
                // Alternate between the group being fooled and the group
                // reading it right, so both outcomes actually occur.
                let groupIsFooled = round.index % 2 == 0
                let believed: VoteChoice = instruction == .tellTheTruth ? .truth : .cap
                let fooled: VoteChoice = instruction == .tellTheTruth ? .cap : .truth

                let correct: VoteChoice = instruction == .tellTheTruth ? .truth : .cap
                for (offset, voter) in voters.enumerated() {
                    // One dissenter every round, so there is always somebody
                    // right and somebody wrong.
                    let choice = offset == 0
                        ? (groupIsFooled ? believed : fooled)
                        : (groupIsFooled ? fooled : believed)
                    driver.send(.voteCast(Vote(roundID: round.id, voterID: voter, choice: choice)))
                    if choice == correct { someoneGuessedRight = true }
                }

                if instruction == .lie && groupIsFooled { someoneFooledTheGroup = true }
                continue
            }

            driver.send(.phaseElapsed)
        }

        // The game finished, and did so by playing out rather than by giving up.
        XCTAssertTrue(driver.state.isFinished, "game never finished after \(steps) steps")
        XCTAssertEqual(driver.state.endedReason, .completed)
        XCTAssertEqual(driver.state.completedRounds.count, 10)

        // Every beat the brief asked for actually happened.
        XCTAssertTrue(sawTruthInstruction, "no round ever said TELL THE TRUTH")
        XCTAssertTrue(sawLieInstruction, "no round ever said LIE")
        XCTAssertTrue(someoneFooledTheGroup)
        XCTAssertTrue(someoneGuessedRight)
        XCTAssertTrue(didDisconnect && didReconnect)
        XCTAssertTrue(didRemovePhoto)

        // The pulled photo left nothing behind.
        let removed = try XCTUnwrap(driver.state.completedRounds.first { $0.id == removedRoundID })
        XCTAssertEqual(removed.status, .removedByOwner)
        XCTAssertTrue(removed.votes.isEmpty)
        XCTAssertFalse(driver.state.scoredRounds.contains { $0.id == removed.id })

        // Photos are never reused, even across a removal and a reconnect.
        let assets = driver.state.completedRounds.map(\.assetID)
        XCTAssertEqual(Set(assets).count, assets.count)

        // Awards came out, deterministically.
        let engine = AwardEngine()
        let results = engine.results(state: driver.state, players: players)
        XCTAssertFalse(results.awards.isEmpty)
        XCTAssertEqual(results.leaderboard.count, 6)
        XCTAssertEqual(engine.results(state: driver.state, players: players).awards, results.awards)

        // The recap counts the removal but never says whose it was.
        XCTAssertEqual(results.stats.photosRemoved, 1)
        XCTAssertEqual(results.stats.roundsPlayed, 9)
        XCTAssertGreaterThan(results.stats.successfulLies, 0)

        // PLAY AGAIN: the same room, a fresh session, scores back to zero.
        let replay = GameSessionState(
            roomID: driver.state.roomID,
            settings: driver.state.settings,
            phase: .ready
        )
        XCTAssertTrue(replay.scores.isEmpty)
        XCTAssertEqual(replay.roundIndex, -1)
        XCTAssertNil(replay.currentRound)
    }

    /// Reconnecting means catching up to the authoritative snapshot, not
    /// replaying what was missed.
    func testReconnectingDeviceAdoptsTheAuthoritativeSnapshot() throws {
        var driver = GameDriver(mode: .truthOrCap)
        driver.start()
        driver.run(to: .voting)

        // Emma's phone still holds a snapshot from two phases ago.
        let stale = GameSessionView.project(
            state: GameSessionState(
                roomID: driver.state.roomID, settings: driver.state.settings,
                phase: .photoReveal, roundIndex: 0, revision: driver.state.revision - 2
            ),
            players: driver.context.players, hostID: Cast.jake, viewer: Cast.emma
        )
        let fresh = GameSessionView.project(
            state: driver.state, players: driver.context.players,
            hostID: Cast.jake, viewer: Cast.emma
        )

        XCTAssertGreaterThan(fresh.revision, stale.revision)
        XCTAssertEqual(fresh.phase, .voting)
        XCTAssertNil(fresh.round?.yourVote, "Emma has not voted yet, so she still gets to")
        XCTAssertEqual(fresh.pendingVoters.map(\.id).contains(Cast.emma), true)
    }

    /// A vote that arrives after the round moved on must not land in the next
    /// round. This is the shape of a real reconnection bug: the phone retries a
    /// queued request from thirty seconds ago.
    func testLateVoteFromABeforeADropDoesNotLeakIntoTheNextRound() {
        var driver = GameDriver(mode: .truthOrCap)
        driver.start()
        driver.run(to: .voting)
        let firstRound = driver.round!
        let voter = firstRound.eligibleVoters(in: driver.context.players)[0]

        driver.everyoneVotes(.truth)
        driver.run(to: .roundIntro, limit: 4)
        driver.run(to: .voting)
        XCTAssertNotEqual(driver.round?.id, firstRound.id)

        let late = driver.send(.voteCast(Vote(roundID: firstRound.id, voterID: voter, choice: .cap)))
        XCTAssertEqual(late.rejection, .wrongRound)
        XCTAssertEqual(driver.round?.votes.count, 0)
    }
}
