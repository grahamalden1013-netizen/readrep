import Photos
import UIKit
import ExplainYourselfKit

/// Finds the deck.
///
/// The whole "WE FOUND SOME 💀" experience is this class: fetch what the OS
/// allows, analyse it on device, throw out anything sensitive, rank what is
/// left for the chosen intensity, then pick a *varied* subset rather than the
/// top twenty — which would be twenty photos of the same night.
///
/// Nothing here uploads, and nothing here decides anything final. It produces
/// suggestions; a human produces the deck.
@MainActor
final class CandidatePipeline: ObservableObject {
    @Published private(set) var progress: Double = 0
    @Published private(set) var isRunning = false
    @Published private(set) var candidates: [AssetID] = []
    /// Kept so the approval deck can show the photo and the game can find it
    /// again. Never leaves the device.
    @Published private(set) var localIdentifiers: [AssetID: String] = [:]

    private let library: PhotoLibraryService
    private let exclusions: PhotoExclusionStore
    private let extractor: PhotoSignalExtractor
    private let scorer: PhotoCandidateScoring
    private let safety: PhotoSafetyEvaluating
    private let selector: DiversitySelector
    private let analytics: AnalyticsService

    private var signals: [AssetID: PhotoSignals] = [:]
    private var scores: [AssetID: CandidateScore] = [:]
    private var task: Task<Void, Never>?

    init(
        library: PhotoLibraryService,
        exclusions: PhotoExclusionStore,
        assetID: @escaping @Sendable (String) -> AssetID,
        scorer: PhotoCandidateScoring = HeuristicCandidateScorer(),
        safety: PhotoSafetyEvaluating = HeuristicSafetyEvaluator(),
        selector: DiversitySelector = DiversitySelector(),
        analytics: AnalyticsService = NoopAnalyticsService()
    ) {
        self.library = library
        self.exclusions = exclusions
        self.extractor = PhotoSignalExtractor(assetID: assetID)
        self.scorer = scorer
        self.safety = safety
        self.selector = selector
        self.analytics = analytics
    }

    func cancel() {
        task?.cancel()
        task = nil
        isRunning = false
    }

    /// Run the scan. Cancellable, resumable, and it never blocks the UI: the
    /// approval deck shows the first candidates while the rest are still coming.
    func run(intensity: Intensity, deckSize: Int = Tuning.candidateDeckSize) {
        task?.cancel()
        isRunning = true
        progress = 0

        task = Task { [weak self] in
            guard let self else { return }
            let assets = self.library.fetchCandidateAssets()
            guard !assets.isEmpty else {
                self.isRunning = false
                return
            }

            self.analytics.track(.candidateReviewStarted(candidateCount: assets.count))

            var analysed: [PhotoSignals] = []
            var safetyByID: [AssetID: SafetyVerdict] = [:]

            // Batched, with a yield between batches, so scrolling stays smooth
            // while several hundred photos go through Vision.
            for batchStart in stride(from: 0, to: assets.count, by: Tuning.analysisBatchSize) {
                if Task.isCancelled { break }

                let batch = Array(assets[batchStart..<min(batchStart + Tuning.analysisBatchSize, assets.count)])
                for asset in batch {
                    if Task.isCancelled { break }
                    guard let image = await self.library.image(for: asset, maxEdge: 720),
                          let analysis = await self.extractor.analyse(asset: asset, image: image)
                    else { continue }

                    let verdict = self.safety.evaluate(analysis.safety)

                    // A blocked photo stops here. It is not scored, not stored,
                    // not shown in the deck, and its analysis is dropped.
                    guard !verdict.isBlocked else { continue }
                    // And an excluded one never comes back.
                    guard !self.exclusions.contains(analysis.signals.assetID) else { continue }

                    analysed.append(analysis.signals)
                    safetyByID[analysis.signals.assetID] = verdict
                    self.signals[analysis.signals.assetID] = analysis.signals
                    self.localIdentifiers[analysis.signals.assetID] = asset.localIdentifier
                }

                self.progress = Double(min(batchStart + Tuning.analysisBatchSize, assets.count))
                    / Double(assets.count)

                // Rank what we have so far so the deck can start immediately.
                self.rebuild(
                    analysed: analysed, safety: safetyByID,
                    intensity: intensity, deckSize: deckSize
                )
                await Task.yield()
            }

            self.rebuild(analysed: analysed, safety: safetyByID, intensity: intensity, deckSize: deckSize)
            self.progress = 1
            self.isRunning = false
        }
    }

    private func rebuild(
        analysed: [PhotoSignals],
        safety: [AssetID: SafetyVerdict],
        intensity: Intensity,
        deckSize: Int
    ) {
        guard !analysed.isEmpty else { return }
        let now = Date()
        let profile = LibraryProfile.build(from: analysed, now: now)

        var ranked: [CandidateScore] = []
        ranked.reserveCapacity(analysed.count)
        for signal in analysed {
            let verdict = safety[signal.assetID] ?? .allowed
            let score = scorer.score(
                signal, safety: verdict, profile: profile, intensity: intensity, now: now
            )
            ranked.append(score)
            scores[signal.assetID] = score
        }

        let chosen = selector.select(scores: ranked, signals: signals, limit: deckSize)
        candidates = chosen.map(\.assetID)
    }

    func localIdentifier(for id: AssetID) -> String? { localIdentifiers[id] }
    func signals(for id: AssetID) -> PhotoSignals? { signals[id] }
    func score(for id: AssetID) -> CandidateScore? { scores[id] }

    /// Everything found so far that is not blocked, for the CHOOSE MANUALLY
    /// escape hatch on the WE NEED MORE EVIDENCE screen.
    var allEligible: [AssetID] {
        scores.values.filter(\.isEligible).sorted { $0.total > $1.total }.map(\.assetID)
    }
}
