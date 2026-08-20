import SwiftUI
import ExplainYourselfKit

/// The sting.
///
/// Everything is revealed at once and nothing before it: the tally, the truth,
/// and who wrote what. Up to this instant no device in the room held any of it,
/// so this is genuinely new information to everyone including the host.
struct ResultRevealView<Stage: View>: View {
    @ObservedObject var coordinator: GameSessionCoordinator
    let stage: Stage

    @State private var revealed = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var round: RoundView? { coordinator.round }

    var body: some View {
        ZStack {
            stage.overlay(Color.black.opacity(0.6))

            VStack(spacing: EY.Space.loose) {
                Spacer()

                if let round, revealed {
                    headline(for: round)
                        .transition(.scale(scale: 1.15).combined(with: .opacity))

                    if let tally = round.tally {
                        TallyBars(tally: tally, round: round, view: coordinator.view)
                    }

                    if round.commitmentVerified == false {
                        // Should be impossible. If it ever happens, say so
                        // rather than quietly presenting a result nobody can
                        // check.
                        EYTag(
                            text: "UNVERIFIED",
                            glyph: "exclamationmark.triangle.fill",
                            tint: EY.Colour.accusation
                        )
                    }
                }

                Spacer()

                if coordinator.isHost {
                    EYButton(title: "NEXT ROUND") {
                        Task { await coordinator.hostAdvance() }
                    }
                } else {
                    Text("WAITING FOR THE HOST")
                        .font(EY.Typography.caption)
                        .foregroundStyle(EY.Colour.inkTertiary)
                        .tracking(1.2)
                }
            }
            .padding(EY.Space.loose)
        }
        .task {
            try? await Task.sleep(for: .milliseconds(400))
            withAnimation(EYMotion.drop(reduceMotion)) { revealed = true }
        }
    }

    @ViewBuilder
    private func headline(for round: RoundView) -> some View {
        let owner = coordinator.ownerName

        switch round.mode {
        case .truthOrCap:
            if let instruction = round.reveal?.instruction {
                Text(instruction.revealLine(owner: owner))
                    .font(EY.Typography.title(30))
                    .foregroundStyle(instruction == .lie ? EY.Colour.cap : EY.Colour.truth)
                    .multilineTextAlignment(.center)
                    .accessibilityAddTraits(.isHeader)
            }

        case .explainYourself:
            if let tally = round.tally {
                let bought = tally.count(.fairEnough)
                let didnt = tally.count(.absoluteCap)
                Text(bought >= didnt ? "THEY BOUGHT IT" : "NOBODY BOUGHT THAT")
                    .font(EY.Typography.title(30))
                    .foregroundStyle(bought >= didnt ? EY.Colour.truth : EY.Colour.cap)
                    .multilineTextAlignment(.center)
            }

        case .whoHasToExplainThis:
            Text("\(owner).")
                .font(EY.Typography.display(60))
                .foregroundStyle(EY.Colour.ink)
                .minimumScaleFactor(0.5)
                .lineLimit(1)

        case .noContext:
            VStack(spacing: EY.Space.tight) {
                if let winner = winningAnswer(round) {
                    Text("\u{201C}\(winner.text)\u{201D}")
                        .font(EY.Typography.title(24))
                        .foregroundStyle(EY.Colour.ink)
                        .multilineTextAlignment(.center)
                    if let author = winner.authorID, let view = coordinator.view {
                        Text("— \(view.nickname(author))")
                            .font(EY.Typography.body)
                            .foregroundStyle(EY.Colour.inkSecondary)
                    }
                }
                Text("IT WAS \(owner)'S PHOTO")
                    .font(EY.Typography.headline)
                    .foregroundStyle(EY.Colour.accusation)
                    .padding(.top, EY.Space.tight)
            }
        }
    }

    private func winningAnswer(_ round: RoundView) -> AnonymousAnswer? {
        guard case .answer(let id)? = round.tally?.winner else { return nil }
        return round.answers.first { $0.id == id }
    }
}

/// Vote totals as bars. Numbers as well as length, because a bar chart that
/// only encodes by size is unreadable at a glance across a table.
struct TallyBars: View {
    let tally: VoteTally
    let round: RoundView
    let view: GameSessionView?

    var body: some View {
        VStack(spacing: EY.Space.tight) {
            ForEach(tally.counts) { entry in
                HStack(spacing: EY.Space.snug) {
                    Text(label(for: entry.choice))
                        .font(EY.Typography.caption)
                        .foregroundStyle(EY.Colour.inkSecondary)
                        .frame(width: 110, alignment: .leading)
                        .lineLimit(1)

                    GeometryReader { geometry in
                        RoundedRectangle(cornerRadius: 6)
                            .fill(EY.Colour.ink)
                            .frame(
                                width: max(
                                    4,
                                    geometry.size.width
                                        * CGFloat(entry.count)
                                        / CGFloat(max(1, tally.totalVotes))
                                )
                            )
                    }
                    .frame(height: 14)

                    Text("\(entry.count)")
                        .font(EY.Typography.caption)
                        .foregroundStyle(EY.Colour.ink)
                        .monospacedDigit()
                        .frame(width: 24, alignment: .trailing)
                }
                .accessibilityElement(children: .ignore)
                .accessibilityLabel("\(label(for: entry.choice)): \(entry.count) votes")
            }
        }
        .padding(.horizontal, EY.Space.base)
    }

    private func label(for choice: VoteChoice) -> String {
        switch choice {
        case .fairEnough:      return "FAIR ENOUGH"
        case .absoluteCap:     return "ABSOLUTE CAP"
        case .truth:           return "TRUTH"
        case .cap:             return "CAP"
        case .player(let id):  return view?.nickname(id).uppercased() ?? "PLAYER"
        case .answer(let id):  return round.answers.first { $0.id == id }?.text ?? "ANSWER"
        }
    }
}

/// THE DAMAGE.
struct GameCompleteView: View {
    @ObservedObject var coordinator: GameSessionCoordinator
    let onExit: () -> Void

    @State private var isSharing = false
    @State private var recap: UIImage?

    private var results: GameResults? { coordinator.results }

    var body: some View {
        EYScreen {
            ScrollView {
                VStack(alignment: .leading, spacing: EY.Space.loose) {
                    Text("THE DAMAGE")
                        .font(EY.Typography.display(52))
                        .foregroundStyle(EY.Colour.ink)
                        .accessibilityAddTraits(.isHeader)

                    if let results {
                        VStack(alignment: .leading, spacing: EY.Space.base) {
                            ForEach(results.awards) { award in
                                HStack(alignment: .firstTextBaseline, spacing: EY.Space.snug) {
                                    Text(award.kind.emoji)
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(award.kind.title)
                                            .font(EY.Typography.caption)
                                            .foregroundStyle(EY.Colour.inkSecondary)
                                            .tracking(1.2)
                                        Text(award.winner.nickname)
                                            .font(EY.Typography.title(26))
                                            .foregroundStyle(EY.Colour.ink)
                                        Text(award.detail)
                                            .font(EY.Typography.caption)
                                            .foregroundStyle(EY.Colour.inkTertiary)
                                    }
                                }
                                .accessibilityElement(children: .combine)
                            }
                        }

                        Divider().overlay(EY.Colour.hairline)

                        VStack(alignment: .leading, spacing: EY.Space.hair) {
                            ForEach(results.stats.lines, id: \.self) { line in
                                Text(line)
                                    .font(EY.Typography.body)
                                    .foregroundStyle(EY.Colour.inkSecondary)
                            }
                        }

                        if !results.leaderboard.isEmpty {
                            VStack(alignment: .leading, spacing: EY.Space.tight) {
                                ForEach(results.leaderboard) { row in
                                    HStack {
                                        Text(row.player.nickname)
                                            .font(EY.Typography.headline)
                                            .foregroundStyle(EY.Colour.ink)
                                        Spacer()
                                        Text("\(row.score)")
                                            .font(EY.Typography.mono(20))
                                            .foregroundStyle(EY.Colour.inkSecondary)
                                    }
                                    .accessibilityElement(children: .combine)
                                    .accessibilityLabel("\(row.player.nickname), \(row.score) points")
                                }
                            }
                        }
                    } else {
                        Text("That's the game.")
                            .font(EY.Typography.headline)
                            .foregroundStyle(EY.Colour.inkSecondary)
                    }
                }
            }

            VStack(spacing: EY.Space.snug) {
                // The most important button on the screen, and the only primary
                // one. Play-again rate is the metric this whole app is for.
                EYButton(title: "PLAY AGAIN") {
                    Task { await coordinator.leave() }
                    onExit()
                }
                EYButton(title: "SHARE RESULTS", kind: .secondary) {
                    buildRecap()
                }
                EYButton(title: "HOME", kind: .quiet) {
                    Task { await coordinator.leave() }
                    onExit()
                }
            }
        }
        .sheet(isPresented: $isSharing) {
            if let recap {
                ShareSheet(items: [recap])
            }
        }
    }

    private func buildRecap() {
        guard let results, let view = coordinator.view else { return }
        // Text and statistics only. A gameplay photo never goes into a shared
        // image, whatever it would do for the screenshot: those photos belong
        // to the people who reluctantly approved them for one evening, not to
        // whoever happens to be holding the phone at the end.
        recap = RecapRenderer.render(results: results, roomCode: view.roomID.raw)
        isSharing = recap != nil
    }
}

struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ controller: UIActivityViewController, context: Context) {}
}
