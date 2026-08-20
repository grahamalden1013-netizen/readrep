import XCTest
@testable import ExplainYourselfKit

final class CandidateScoringTests: XCTestCase {
    private let scorer = HeuristicCandidateScorer()
    private let now = Date(timeIntervalSince1970: 1_700_000_000)

    private func signals(
        _ id: String,
        daysAgo: Double = 400,
        faces: Int = 1,
        selfie: Bool = false,
        screenshot: Bool = false,
        blur: Double = 0,
        favourite: Bool = false,
        text: Double = 0,
        hash: UInt64 = 0,
        faceFraction: Double = 0.1
    ) -> PhotoSignals {
        PhotoSignals(
            assetID: AssetID(id),
            creationDate: now.addingTimeInterval(-daysAgo * 86_400),
            pixelWidth: 3024, pixelHeight: 4032,
            isScreenshot: screenshot, isSelfie: selfie,
            isFavorite: favourite,
            faceCount: faces, largestFaceFraction: faceFraction,
            blur: blur, textDensity: text, perceptualHash: hash
        )
    }

    private func score(_ s: PhotoSignals, _ intensity: Intensity, safety: SafetyVerdict = .allowed) -> Double {
        scorer.score(s, safety: safety, profile: .empty, intensity: intensity, now: now).total
    }

    func testOlderPhotosOutrankRecentOnes() {
        let ancient = score(signals("old", daysAgo: 1500), .dangerous)
        let yesterday = score(signals("new", daysAgo: 1), .dangerous)
        XCTAssertGreaterThan(ancient, yesterday)
    }

    func testChillAvoidsBlurWhileChaosSeeksIt() {
        let sharp = signals("sharp", blur: 0)
        let smeared = signals("smeared", blur: 0.9)
        XCTAssertGreaterThan(score(sharp, .chill), score(smeared, .chill))
        XCTAssertGreaterThan(score(smeared, .chaos), score(sharp, .chaos))
    }

    func testChillPrefersGroupsOverSelfies() {
        let group = signals("group", faces: 5, faceFraction: 0.05)
        let selfie = signals("selfie", faces: 1, selfie: true, faceFraction: 0.35)
        XCTAssertGreaterThan(score(group, .chill), score(selfie, .chill))
    }

    func testCuratedPhotosAreDeprioritisedOutsideChill() {
        let favourite = signals("fav", favourite: true)
        let ordinary = signals("plain")
        XCTAssertLessThan(score(favourite, .dangerous), score(ordinary, .dangerous),
                          "a photo you already chose to show people is the opposite of evidence")
    }

    func testWallsOfTextAreAlwaysPenalised() {
        for intensity in Intensity.allCases {
            XCTAssertLessThan(
                score(signals("wall", text: 0.6), intensity),
                score(signals("clean", text: 0), intensity),
                "\(intensity)"
            )
        }
    }

    func testBlockedPhotosScoreZeroAndAreIneligible() {
        let result = scorer.score(
            signals("bank"), safety: .blocked([.financial]),
            profile: .empty, intensity: .chaos, now: now
        )
        XCTAssertEqual(result.total, 0)
        XCTAssertFalse(result.isEligible)
    }

    func testDeprioritisedPhotosSurviveButSinkToTheBottom() {
        let flagged = scorer.score(signals("qr"), safety: .deprioritised([.machineReadableCode]),
                                   profile: .empty, intensity: .dangerous, now: now)
        let clean = scorer.score(signals("clean"), safety: .allowed,
                                 profile: .empty, intensity: .dangerous, now: now)
        XCTAssertTrue(flagged.isEligible)
        XCTAssertLessThan(flagged.total, clean.total / 3)
    }

    func testScoresStayInRange() {
        for intensity in Intensity.allCases {
            for s in [signals("a"), signals("b", daysAgo: 4000, faces: 8, blur: 1, text: 1),
                      signals("c", daysAgo: 0, faces: 0)] {
                let value = score(s, intensity)
                XCTAssertGreaterThanOrEqual(value, 0)
                XCTAssertLessThanOrEqual(value, 1)
            }
        }
    }

    func testNoveltyIsRelativeToTheOwnersOwnLibrary() {
        // A roll that is almost entirely selfies: one more selfie is not news.
        let selfieHeavy = LibraryProfile.build(
            from: (0..<100).map { signals("s\($0)", faces: 1, selfie: true, faceFraction: 0.4) },
            now: now
        )
        let selfie = signals("another", faces: 1, selfie: true, faceFraction: 0.4)
        let landscape = signals("rare", faces: 0)

        let selfieScore = scorer.score(selfie, safety: .allowed, profile: selfieHeavy,
                                       intensity: .chaos, now: now)
        let landscapeScore = scorer.score(landscape, safety: .allowed, profile: selfieHeavy,
                                          intensity: .chaos, now: now)
        XCTAssertGreaterThan(
            landscapeScore.breakdown[.novelty] ?? 0,
            selfieScore.breakdown[.novelty] ?? 0
        )
    }
}

final class DiversityTests: XCTestCase {
    private let now = Date(timeIntervalSince1970: 1_700_000_000)
    private let selector = DiversitySelector()

    private func burst(_ prefix: String, count: Int, hash: UInt64) -> [PhotoSignals] {
        (0..<count).map { index in
            PhotoSignals(
                assetID: AssetID("\(prefix)-\(index)"),
                creationDate: now.addingTimeInterval(-Double(index) * 60),
                pixelWidth: 3024, pixelHeight: 4032,
                isSelfie: true, faceCount: 1, largestFaceFraction: 0.4,
                perceptualHash: hash
            )
        }
    }

    func testNearDuplicatesAreNotAllStuffedIntoTheDeck() {
        // The failure this prevents: forty photos from one party, and a review
        // screen that is the same night over and over.
        var all = burst("party", count: 30, hash: 0xF0F0_F0F0_F0F0_F0F0)
        all += (0..<6).map { index in
            PhotoSignals(
                assetID: AssetID("varied-\(index)"),
                creationDate: now.addingTimeInterval(-Double(index + 1) * 400 * 86_400),
                pixelWidth: 4032, pixelHeight: 3024,
                isScreenshot: index % 2 == 0,
                faceCount: index,
                perceptualHash: UInt64(index) &* 0x1234_5678_9ABC_DEF1
            )
        }

        let lookup = Dictionary(uniqueKeysWithValues: all.map { ($0.assetID, $0) })
        let scores = all.map {
            CandidateScore(assetID: $0.assetID, total: 0.8, breakdown: [:], safety: .allowed)
        }

        let picked = selector.select(scores: scores, signals: lookup, limit: 12)
        let fromBurst = picked.filter { $0.assetID.raw.hasPrefix("party") }
        XCTAssertEqual(fromBurst.count, 1, "one burst should contribute one photo, not \(fromBurst.count)")
        XCTAssertEqual(picked.count, 7, "a shorter varied deck beats a full repetitive one")
    }

    func testSelectionSpreadsAcrossKindsAndYears() {
        var signals: [PhotoSignals] = []
        for year in 0..<5 {
            for kind in 0..<4 {
                signals.append(PhotoSignals(
                    assetID: AssetID("y\(year)-k\(kind)"),
                    creationDate: now.addingTimeInterval(-Double(year) * 365 * 86_400),
                    pixelWidth: 3024, pixelHeight: 4032,
                    isScreenshot: kind == 0,
                    faceCount: kind,
                    largestFaceFraction: kind == 1 ? 0.4 : 0.05,
                    perceptualHash: UInt64(year * 10 + kind) &* 0x9E37_79B9_7F4A_7C15
                ))
            }
        }
        let lookup = Dictionary(uniqueKeysWithValues: signals.map { ($0.assetID, $0) })
        // Deliberately rank one year highest so pure ranking would take only it.
        let scores = signals.map { signal in
            CandidateScore(
                assetID: signal.assetID,
                total: signal.assetID.raw.hasPrefix("y0") ? 0.95 : 0.5,
                breakdown: [:], safety: .allowed
            )
        }

        let picked = selector.select(scores: scores, signals: lookup, limit: 8)
        let spread = DiversitySelector.spread(of: picked.map(\.assetID), signals: lookup)
        XCTAssertGreaterThanOrEqual(spread.years.count, 3, "deck came from too few years")
        XCTAssertGreaterThanOrEqual(spread.kinds.count, 3, "deck came from too few kinds")
    }

    func testBlockedCandidatesNeverReachTheDeck() {
        let signal = PhotoSignals(assetID: AssetID("x"), creationDate: now,
                                  pixelWidth: 100, pixelHeight: 100)
        let picked = selector.select(
            scores: [CandidateScore(assetID: signal.assetID, total: 0.99,
                                    breakdown: [:], safety: .blocked([.explicit]))],
            signals: [signal.assetID: signal],
            limit: 5
        )
        XCTAssertTrue(picked.isEmpty)
    }

    func testSelectionNeverExceedsTheLimitOrRepeats() {
        let signals = (0..<50).map {
            PhotoSignals(assetID: AssetID("a\($0)"), creationDate: now,
                         pixelWidth: 10, pixelHeight: 10, perceptualHash: UInt64($0) &* 7919)
        }
        let lookup = Dictionary(uniqueKeysWithValues: signals.map { ($0.assetID, $0) })
        let scores = signals.map {
            CandidateScore(assetID: $0.assetID, total: Double.random(in: 0.1...0.9),
                           breakdown: [:], safety: .allowed)
        }
        let picked = selector.select(scores: scores, signals: lookup, limit: 15)
        XCTAssertEqual(picked.count, 15)
        XCTAssertEqual(Set(picked.map(\.assetID)).count, 15)
    }
}

final class SafetyTests: XCTestCase {
    private let evaluator = HeuristicSafetyEvaluator()

    func testSensitiveContentIsBlockedOutright() {
        let verdict = evaluator.evaluate(SafetySignals(sensitiveContentFlagged: true))
        XCTAssertTrue(verdict.isBlocked)
        XCTAssertTrue(verdict.categories.contains(.explicit))
        XCTAssertEqual(verdict.scoreMultiplier, 0)
    }

    func testHardCategoriesBlockAndSoftCategoriesOnlySink() {
        XCTAssertTrue(evaluator.evaluate(SafetySignals(matchedCategories: [.financial])).isBlocked)
        XCTAssertTrue(evaluator.evaluate(SafetySignals(matchedCategories: [.medical])).isBlocked)
        XCTAssertTrue(evaluator.evaluate(SafetySignals(matchedCategories: [.credentials])).isBlocked)
        XCTAssertTrue(evaluator.evaluate(SafetySignals(matchedCategories: [.identityDocument])).isBlocked)

        let qr = evaluator.evaluate(SafetySignals(barcodeCount: 1))
        XCTAssertFalse(qr.isBlocked)
        XCTAssertTrue(qr.categories.contains(.machineReadableCode))
    }

    func testTextHeavyScreenshotsWithNoFacesAreTreatedAsPrivate() {
        let verdict = evaluator.evaluate(
            SafetySignals(textDensity: 0.4, isScreenshot: true, faceCount: 0)
        )
        XCTAssertTrue(verdict.categories.contains(.privateConversation))
    }

    func testAScreenshotWithFriendsInItIsStillFairGame() {
        let verdict = evaluator.evaluate(
            SafetySignals(textDensity: 0.4, isScreenshot: true, faceCount: 3)
        )
        XCTAssertFalse(verdict.categories.contains(.privateConversation))
    }

    func testTextMatcherFindsTheObviousThings() {
        XCTAssertTrue(SensitiveTextMatcher.categories(in: "Your verification code is 493021")
            .contains(.credentials))
        XCTAssertTrue(SensitiveTextMatcher.categories(in: "Routing number 021000021")
            .contains(.financial))
        XCTAssertTrue(SensitiveTextMatcher.categories(in: "4111 1111 1111 1111")
            .contains(.financial))
        XCTAssertTrue(SensitiveTextMatcher.categories(in: "Prescription: 20mg twice daily")
            .contains(.medical))
        XCTAssertTrue(SensitiveTextMatcher.categories(in: "PASSPORT No. 123456789")
            .contains(.identityDocument))
    }

    func testTextMatcherLeavesOrdinaryPhotosAlone() {
        for text in ["happy birthday", "gate B14 boarding 19:40", "2 for 1 tacos", ""] {
            XCTAssertTrue(SensitiveTextMatcher.categories(in: text).isEmpty, text)
        }
    }

    func testMatcherReturnsCategoriesAndNothingElse() {
        // The signature is the control: there is no way for recognised text to
        // leave this call site, because nothing here returns a String.
        let result: Set<SensitiveCategory> = SensitiveTextMatcher.categories(in: "password: hunter2")
        XCTAssertEqual(result, [.credentials])
    }
}

final class ApprovalDeckTests: XCTestCase {
    private var deck: ApprovalDeck {
        ApprovalDeck(candidates: (0..<5).map { AssetID("a\($0)") })
    }

    func testKeepNopeAndNeverUseRouteToTheRightPlaces() {
        var d = deck
        d.decide(.keep); d.decide(.nope); d.decide(.neverUse)
        XCTAssertEqual(d.approved, [AssetID("a0")])
        XCTAssertEqual(d.rejected, [AssetID("a1")])
        XCTAssertEqual(d.excluded, [AssetID("a2")])
        XCTAssertEqual(d.pending.count, 2)
    }

    func testUndoRestoresTheExactLastDecision() {
        var d = deck
        d.decide(.keep)
        d.decide(.nope)
        let undone = d.undo()
        XCTAssertEqual(undone?.decision, .nope)
        XCTAssertEqual(undone?.asset, AssetID("a1"))
        XCTAssertEqual(d.current, AssetID("a1"))
        XCTAssertEqual(d.rejected, [])
        XCTAssertEqual(d.approved, [AssetID("a0")])
    }

    func testUndoOnAnUntouchedDeckIsHarmless() {
        var d = deck
        XCTAssertNil(d.undo())
        XCTAssertFalse(d.canUndo)
        XCTAssertEqual(d.pending.count, 5)
    }

    func testAppendingNeverReintroducesSomethingAlreadyDecided() {
        var d = deck
        d.decide(.neverUse)
        d.append([AssetID("a0"), AssetID("a9")])
        XCTAssertFalse(d.pending.contains(AssetID("a0")))
        XCTAssertTrue(d.pending.contains(AssetID("a9")))
    }

    func testEnoughEvidenceThreshold() {
        var d = ApprovalDeck(candidates: (0..<20).map { AssetID("a\($0)") })
        for _ in 0..<4 { d.decide(.keep) }
        XCTAssertFalse(d.hasEnough)
        d.decide(.keep)
        XCTAssertTrue(d.hasEnough)
        XCTAssertFalse(d.hitIdealTarget)
        for _ in 0..<5 { d.decide(.keep) }
        XCTAssertTrue(d.hitIdealTarget)
        XCTAssertNil(d.hint)
    }
}
