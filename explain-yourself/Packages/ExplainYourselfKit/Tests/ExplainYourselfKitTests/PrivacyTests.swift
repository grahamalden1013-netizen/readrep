import XCTest
@testable import ExplainYourselfKit

/// These are the tests that matter most. Everything else in this package is a
/// party game; this file is the promise the product makes to the person whose
/// camera roll is on the table.
final class PrivacyTests: XCTestCase {

    // MARK: - The secret instruction

    func testSecretInstructionIsNeverVisibleToAnyoneButTheOwner() {
        var driver = GameDriver(mode: .truthOrCap)
        driver.start()
        driver.run(to: .explanationTimer)
        let round = driver.round!
        XCTAssertNotNil(round.secretInstruction, "the server knows it")

        for player in Cast.six where player.id != round.ownerID {
            let view = RoundRedactor.redact(round, viewer: player.id)
            XCTAssertNil(view.yourSecretInstruction, "\(player.nickname) must not see it")
            XCTAssertNil(view.reveal, "\(player.nickname) must not see the nonce either")
        }
    }

    func testHostHasNoSpecialAccessToTheSecretInstruction() {
        var driver = GameDriver(mode: .truthOrCap)
        driver.start()
        driver.run(to: .explanationTimer)
        let round = driver.round!
        guard round.ownerID != Cast.jake else { return }  // Jake is the host

        let hostView = RoundRedactor.redact(round, viewer: Cast.jake)
        XCTAssertNil(hostView.yourSecretInstruction)
        XCTAssertNil(hostView.reveal)
    }

    func testOwnerSeesTheirInstructionOnlyAfterItIsDelivered() {
        var driver = GameDriver(mode: .truthOrCap)
        driver.start()
        // roundIntro: the card has not been dealt to the screen yet.
        var round = driver.round!
        XCTAssertNil(RoundRedactor.redact(round, viewer: round.ownerID).yourSecretInstruction)

        driver.run(to: .secretInstruction)
        round = driver.round!
        XCTAssertNotNil(RoundRedactor.redact(round, viewer: round.ownerID).yourSecretInstruction)
    }

    func testCommitmentIsPublishedBeforeTheAnswerAndVerifiesAfterwards() {
        var driver = GameDriver(mode: .truthOrCap)
        driver.start()
        let early = RoundRedactor.redact(driver.round!, viewer: Cast.sam)
        XCTAssertNotNil(early.commitment, "everyone can see the sealed envelope from round start")
        XCTAssertNil(early.reveal)

        driver.run(to: .voting)
        driver.everyoneVotes(.truth)
        let revealed = RoundRedactor.redact(driver.state.completedRounds.last ?? driver.round!, viewer: Cast.sam)
        XCTAssertEqual(revealed.commitmentVerified, true, "the answer must match the envelope")
    }

    func testTamperedRevealFailsVerification() {
        let real = SecretReveal(instruction: .lie, nonce: "abc123")
        let commitment = SecretCommitment(instruction: .lie, nonce: "abc123")
        XCTAssertTrue(real.matches(commitment))

        let swapped = SecretReveal(instruction: .tellTheTruth, nonce: "abc123")
        XCTAssertFalse(swapped.matches(commitment), "a server cannot change its mind after the votes are in")
    }

    func testCommitmentsDifferPerRoundEvenForTheSameInstruction() {
        let a = SecretCommitment(instruction: .lie, nonce: SecretCommitment.makeNonce())
        let b = SecretCommitment(instruction: .lie, nonce: SecretCommitment.makeNonce())
        XCTAssertNotEqual(a.digest, b.digest, "otherwise the digest itself leaks the answer")
    }

    // MARK: - Owner concealment

    func testHiddenOwnerModesConcealTheOwnerFromEveryoneElseDuringVoting() {
        for mode in [GameMode.noContext, .whoHasToExplainThis] {
            var driver = GameDriver(mode: mode)
            driver.start()
            driver.run(to: .voting)
            let round = driver.round!

            for player in Cast.six where player.id != round.ownerID {
                let view = RoundRedactor.redact(round, viewer: player.id)
                XCTAssertNil(view.ownerID, "\(mode) leaked the owner to \(player.nickname)")
                XCTAssertFalse(view.isYours)
            }
            let ownerView = RoundRedactor.redact(round, viewer: round.ownerID)
            XCTAssertTrue(ownerView.isYours, "the owner obviously recognises their own photo")
        }
    }

    func testExplainYourselfRevealsTheOwnerAtTheOwnerRevealBeat() {
        var driver = GameDriver(mode: .explainYourself)
        driver.start()
        XCTAssertNil(RoundRedactor.redact(driver.round!, viewer: Cast.sam).ownerID)
        driver.run(to: .ownerReveal)
        XCTAssertNotNil(RoundRedactor.redact(driver.round!, viewer: Cast.sam).ownerID)
    }

    // MARK: - Votes and answers

    func testNoPartialVoteTotalsBeforeEveryoneHasVoted() {
        var driver = GameDriver()
        driver.start()
        driver.run(to: .voting)
        let round = driver.round!
        let voters = round.eligibleVoters(in: driver.context.players)

        driver.send(.voteCast(Vote(roundID: round.id, voterID: voters[0], choice: .cap)))
        driver.send(.voteCast(Vote(roundID: round.id, voterID: voters[1], choice: .cap)))

        let midVote = RoundRedactor.redact(driver.round!, viewer: voters[2])
        XCTAssertNil(midVote.tally, "seeing 2 CAP before you vote makes you a follower, not a detective")
        XCTAssertEqual(midVote.votedPlayerIDs.count, 2, "but that they voted is fine — it drives WAITING ON 3")
        XCTAssertNil(midVote.yourVote)
    }

    func testAnswerAuthorsAreAnonymousUntilTheReveal() {
        var driver = GameDriver(mode: .noContext)
        driver.start()
        driver.run(to: .answering)
        let round = driver.round!
        for author in round.eligibleAnswerers(in: driver.context.players) {
            driver.send(.answerSubmitted(
                PlayerAnswer(roundID: round.id, authorID: author, text: "it was a tuesday")
            ))
        }

        let duringVote = RoundRedactor.redact(driver.round!, viewer: Cast.emma)
        XCTAssertEqual(duringVote.phaseSafeAuthorCount, 0, "no answer may carry its author yet")
        XCTAssertTrue(duringVote.answers.contains { $0.isYours }, "you can still spot your own")
    }

    // MARK: - Analytics

    func testAnalyticsNeverCarriesRawLibraryCounts() {
        let event = AnalyticsEvent.candidateReviewStarted(candidateCount: 4_137)
        XCTAssertEqual(event.properties["candidate_bucket"], .string("50+"))
        XCTAssertNil(event.properties["candidate_count"], "an exact library size is a fingerprint")
    }

    func testAnalyticsEventsCarryNoFreeformStrings() {
        let events: [AnalyticsEvent] = [
            .appOpened,
            .gameCreated(mode: .truthOrCap, rounds: 10, intensity: .chaos),
            .gameJoined(playerCount: 6),
            .photoPermissionGranted(scope: .limited),
            .candidateKept,
            .playerReady(approvedCount: 12),
            .roundStarted(index: 3, mode: .noContext),
            .photoRemoved,
            .gameCompleted(mode: .truthOrCap, rounds: 10, playerCount: 6),
            .recapShared(includedPhotos: false)
        ]
        let allowedStrings = Set(
            GameMode.allCases.map(\.rawValue)
                + Intensity.allCases.map(\.rawValue)
                + PhotoAccessScope.allCases.map(\.rawValue)
                + ["0", "1-4", "5-9", "10-19", "20-49", "50+"]
        )
        for event in events {
            for (key, value) in event.properties {
                if case .string(let raw) = value {
                    XCTAssertTrue(
                        allowedStrings.contains(raw),
                        "\(event.name).\(key) sent an open string: \(raw)"
                    )
                }
            }
        }
    }

    // MARK: - Flavour text safety

    func testAISafetyFilterRejectsTheThingsItMust() {
        for line in [
            "Why does he look so gay in this",
            "Were you arrested right after this",
            "This is why you're single, fatty",
            String(repeating: "x", count: 200)
        ] {
            XCTAssertFalse(AISafetyPolicy.isAcceptable(line), "should have blocked: \(line)")
        }
    }

    func testAISafetyFilterAllowsTheHouseStyle() {
        for line in FlavourLines.standard.questions {
            XCTAssertTrue(AISafetyPolicy.isAcceptable(line), "own copy failed its own filter: \(line)")
        }
    }
}

private extension RoundView {
    /// How many answers are carrying an author. Should be zero until results.
    var phaseSafeAuthorCount: Int { answers.filter { $0.authorID != nil }.count }
}
