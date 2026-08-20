import XCTest
@testable import ExplainYourselfKit

final class StateMachineTests: XCTestCase {

    // MARK: - Host authority

    func testOnlyHostCanStart() {
        var driver = GameDriver()
        let rejected = driver.send(.hostStartedGame(actor: Cast.sam))
        XCTAssertEqual(rejected.rejection, .notHost)
        XCTAssertEqual(driver.state.phase, .ready, "a rejected action must not move the game")
        XCTAssertEqual(rejected.state.revision, 0, "a rejected action must not bump the revision")

        driver.start()
        XCTAssertEqual(driver.state.phase, .roundIntro)
    }

    func testOnlyHostCanSkipAdvanceOrEnd() {
        var driver = GameDriver()
        driver.start()
        XCTAssertEqual(driver.send(.hostAdvanced(actor: Cast.sam)).rejection, .notHost)
        XCTAssertEqual(driver.send(.hostSkippedRound(actor: Cast.sam)).rejection, .notHost)
        XCTAssertEqual(driver.send(.hostEndedGame(actor: Cast.sam)).rejection, .notHost)
    }

    func testCannotStartWithoutEnoughPlayers() {
        var driver = GameDriver(players: [Cast.player(Cast.jake, host: true), Cast.player(Cast.sam)])
        XCTAssertEqual(driver.send(.hostStartedGame(actor: Cast.jake)).rejection, .notEnoughPlayers)
    }

    func testCannotStartWithNoApprovedPhotos() {
        var driver = GameDriver()
        driver.context = GameContext(players: Cast.six, hostID: Cast.jake, pools: [])
        XCTAssertEqual(driver.send(.hostStartedGame(actor: Cast.jake)).rejection, .notEnoughAssets)
    }

    // MARK: - Phase order

    func testTruthOrCapPhaseOrder() {
        var driver = GameDriver(mode: .truthOrCap)
        driver.start()
        var seen: [GamePhase] = [driver.state.phase]
        for _ in 0..<5 { driver.send(.phaseElapsed); seen.append(driver.state.phase) }
        XCTAssertEqual(seen, [
            .roundIntro, .photoReveal, .ownerReveal, .secretInstruction, .explanationTimer, .voting
        ])
    }

    func testWhoHasToExplainThisVotesBeforeRevealingTheOwner() {
        var driver = GameDriver(mode: .whoHasToExplainThis)
        driver.start()
        driver.send(.phaseElapsed)   // photoReveal
        driver.send(.phaseElapsed)   // voting
        XCTAssertEqual(driver.state.phase, .voting)
        XCTAssertFalse(driver.round!.ownerRevealed, "you cannot be asked to guess the answer you were given")
    }

    func testNoContextCollectsAnswersBeforeVoting() {
        var driver = GameDriver(mode: .noContext)
        driver.start()
        driver.send(.phaseElapsed)
        XCTAssertEqual(driver.state.phase, .answering)
    }

    func testEveryModeEndsItsRoundSequenceAtRoundComplete() {
        for mode in GameMode.allCases {
            XCTAssertEqual(GamePhase.sequence(for: mode).last, .roundComplete, "\(mode)")
            XCTAssertEqual(GamePhase.sequence(for: mode).first, .roundIntro, "\(mode)")
        }
    }

    // MARK: - Voting

    func testOwnerCannotVoteOnTheirOwnPhoto() {
        var driver = GameDriver()
        driver.start()
        driver.run(to: .voting)
        let round = driver.round!
        let rejection = driver.send(
            .voteCast(Vote(roundID: round.id, voterID: round.ownerID, choice: .truth))
        )
        XCTAssertEqual(rejection.rejection, .notEligibleToVote)
    }

    func testPlayerCannotVoteTwice() {
        var driver = GameDriver()
        driver.start()
        driver.run(to: .voting)
        let round = driver.round!
        let voter = round.eligibleVoters(in: driver.context.players)[0]

        XCTAssertNil(driver.send(.voteCast(Vote(roundID: round.id, voterID: voter, choice: .truth))).rejection)
        let second = driver.send(.voteCast(Vote(roundID: round.id, voterID: voter, choice: .cap)))
        XCTAssertEqual(second.rejection, .alreadyVoted)
        XCTAssertEqual(driver.round?.votes.count, 1)
    }

    func testVotingBeforeVotingPhaseIsRejected() {
        var driver = GameDriver()
        driver.start()
        let round = driver.round!
        let rejection = driver.send(
            .voteCast(Vote(roundID: round.id, voterID: Cast.sam, choice: .truth))
        )
        XCTAssertEqual(rejection.rejection, .wrongPhase)
    }

    func testVoteForAStaleRoundIsRejected() {
        var driver = GameDriver()
        driver.start()
        driver.run(to: .voting)
        let rejection = driver.send(
            .voteCast(Vote(roundID: RoundID("stale"), voterID: Cast.sam, choice: .truth))
        )
        XCTAssertEqual(rejection.rejection, .wrongRound)
    }

    func testRoundAdvancesAsSoonAsEveryoneHasVoted() {
        var driver = GameDriver()
        driver.start()
        driver.run(to: .voting)
        driver.everyoneVotes(.truth)
        XCTAssertEqual(driver.state.phase, .resultReveal, "nobody should wait out the clock once all five are in")
    }

    // MARK: - Answers

    func testAnswerLimitsAndDuplicates() {
        var driver = GameDriver(mode: .noContext)
        driver.start()
        driver.run(to: .answering)
        let round = driver.round!
        let author = round.eligibleAnswerers(in: driver.context.players)[0]

        let long = String(repeating: "a", count: 300)
        driver.send(.answerSubmitted(PlayerAnswer(roundID: round.id, authorID: author, text: long)))
        XCTAssertEqual(driver.round?.answers.first?.text.count, PlayerAnswer.maxLength)

        let second = driver.send(
            .answerSubmitted(PlayerAnswer(roundID: round.id, authorID: author, text: "again"))
        )
        XCTAssertEqual(second.rejection, .alreadyAnswered)
    }

    func testEmptyAnswerIsRejected() {
        var driver = GameDriver(mode: .noContext)
        driver.start()
        driver.run(to: .answering)
        let round = driver.round!
        let author = round.eligibleAnswerers(in: driver.context.players)[0]
        let rejection = driver.send(
            .answerSubmitted(PlayerAnswer(roundID: round.id, authorID: author, text: "   "))
        )
        XCTAssertEqual(rejection.rejection, .emptyAnswer)
    }

    // MARK: - Removal and skipping

    func testOwnerCanRemoveTheirPhotoMidRoundAndTheRoundVanishes() {
        var driver = GameDriver()
        driver.start()
        driver.run(to: .voting)
        let live = driver.round!
        driver.send(.voteCast(Vote(roundID: live.id, voterID: Cast.sam, choice: .cap)))

        let transition = driver.send(.ownerRemovedPhoto(roundID: live.id, actor: live.ownerID))
        XCTAssertNil(transition.rejection)

        let archived = driver.state.completedRounds.first { $0.id == live.id }
        XCTAssertEqual(archived?.status, .removedByOwner)
        XCTAssertEqual(archived?.votes.count, 0, "votes on a pulled photo must not persist")
        XCTAssertEqual(driver.state.phase, .roundIntro, "the game continues straight into the next round")
        XCTAssertNotEqual(driver.round?.id, live.id)
        XCTAssertTrue(driver.effects.contains(.cue(.roundRemoved)))
    }

    func testOnlyTheOwnerCanRemoveThePhoto() {
        var driver = GameDriver()
        driver.start()
        let round = driver.round!
        let notOwner = Cast.six.map(\.id).first { $0 != round.ownerID }!
        XCTAssertEqual(
            driver.send(.ownerRemovedPhoto(roundID: round.id, actor: notOwner)).rejection,
            .notOwner
        )
    }

    func testRemovedRoundScoresNothing() {
        var driver = GameDriver()
        driver.start()
        driver.run(to: .voting)
        let round = driver.round!
        driver.send(.voteCast(Vote(roundID: round.id, voterID: Cast.sam, choice: .truth)))
        driver.send(.ownerRemovedPhoto(roundID: round.id, actor: round.ownerID))
        XCTAssertTrue(driver.state.scores.isEmpty)
    }

    func testUnavailableAssetSkipsCleanly() {
        var driver = GameDriver()
        driver.start()
        let round = driver.round!
        driver.send(.assetUnavailable(roundID: round.id))
        XCTAssertEqual(driver.state.completedRounds.first?.status, .skipped)
        XCTAssertEqual(driver.state.phase, .roundIntro)
    }

    func testOwnerDisconnectingSkipsTheirRound() {
        var driver = GameDriver()
        driver.start()
        let round = driver.round!
        var players = driver.context.players
        let index = players.firstIndex { $0.id == round.ownerID }!
        players[index].status = .disconnected

        driver.send(.playersChanged(players))
        XCTAssertEqual(driver.state.completedRounds.first?.status, .skipped)
        XCTAssertNotEqual(driver.round?.id, round.id)
    }

    // MARK: - Ending

    func testGameEndsAfterTheConfiguredNumberOfRounds() {
        var driver = GameDriver(mode: .explainYourself, rounds: 5)
        driver.start()
        var steps = 0
        while !driver.state.isFinished, steps < 200 {
            if driver.state.phase == .voting {
                driver.everyoneVotes(.fairEnough)
            } else {
                driver.send(.phaseElapsed)
            }
            steps += 1
        }
        XCTAssertTrue(driver.state.isFinished)
        XCTAssertEqual(driver.state.endedReason, .completed)
        XCTAssertEqual(driver.state.completedRounds.count, 5)
    }

    func testGameEndsGracefullyWhenTheDecksRunOut() {
        // Three players, two photos each: a ten round game only has six rounds
        // in it. That is a finished game, not an error screen.
        let players = [Cast.player(Cast.jake, host: true), Cast.player(Cast.sam), Cast.player(Cast.alex)]
        var driver = GameDriver(mode: .explainYourself, rounds: 10, players: players)
        driver.context = GameContext(
            players: players, hostID: Cast.jake, pools: Cast.pools(for: players, each: 2)
        )
        driver.start()
        var steps = 0
        while !driver.state.isFinished, steps < 200 {
            if driver.state.phase == .voting { driver.everyoneVotes(.fairEnough) }
            else { driver.send(.phaseElapsed) }
            steps += 1
        }
        XCTAssertEqual(driver.state.completedRounds.count, 6)
        XCTAssertEqual(driver.state.endedReason, .completed)
    }

    func testHostEndingGameArchivesTheLiveRound() {
        var driver = GameDriver()
        driver.start()
        driver.send(.hostEndedGame(actor: Cast.jake))
        XCTAssertEqual(driver.state.phase, .gameComplete)
        XCTAssertEqual(driver.state.endedReason, .hostEnded)
        XCTAssertEqual(driver.state.completedRounds.first?.status, .skipped)
        XCTAssertNil(driver.state.currentRound)
    }

    func testFinishedGameRejectsFurtherActions() {
        var driver = GameDriver()
        driver.start()
        driver.send(.hostEndedGame(actor: Cast.jake))
        XCTAssertEqual(driver.send(.phaseElapsed).rejection, .gameAlreadyFinished)
        XCTAssertEqual(driver.send(.hostAdvanced(actor: Cast.jake)).rejection, .gameAlreadyFinished)
    }

    // MARK: - Revision

    func testRevisionIncreasesStrictlyOnEveryAcceptedChange() {
        var driver = GameDriver()
        var last = driver.state.revision
        driver.start()
        XCTAssertGreaterThan(driver.state.revision, last)
        last = driver.state.revision
        for _ in 0..<4 {
            driver.send(.phaseElapsed)
            XCTAssertGreaterThan(driver.state.revision, last)
            last = driver.state.revision
        }
    }

    func testPhaseDeadlineIsSetForTimedPhasesAndClearedOtherwise() {
        var driver = GameDriver()
        driver.start()
        XCTAssertNotNil(driver.state.phaseDeadline, "roundIntro runs on a clock")
        driver.run(to: .voting)
        driver.everyoneVotes(.truth)
        XCTAssertEqual(driver.state.phase, .resultReveal)
        XCTAssertNil(driver.state.phaseDeadline, "the result holds until the host moves on")
    }
}
