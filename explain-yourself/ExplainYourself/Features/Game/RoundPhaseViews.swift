import SwiftUI
import ExplainYourselfKit

// ─────────────────────────────────────────────────────────────────────────────
// The beats.
//
// The whole product is four seconds long and lives in this file:
//
//     the photo lands  →  the room reacts  →  JAKE.  →  EXPLAIN YOURSELF.
//
// Each of those is a separate view with its own timing, rather than one screen
// that fades between states, because the pauses between them are the joke.
// ─────────────────────────────────────────────────────────────────────────────

/// The drop.
///
/// The name arrives first, alone, and only then the demand. Splitting them by
/// six hundred milliseconds is the difference between a label and a moment: the
/// gap is long enough for everyone to look at one person, and short enough that
/// it still feels like an accusation rather than a loading screen.
struct OwnerRevealView<Stage: View>: View {
    let name: String
    let isYou: Bool
    let stage: Stage

    @State private var showName = false
    @State private var showDemand = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        ZStack {
            stage
                .blur(radius: showName && !reduceMotion ? 12 : 0)
                .overlay(Color.black.opacity(showName ? 0.55 : 0))

            VStack(spacing: EY.Space.tight) {
                if showName {
                    Text(isYou ? "YOU." : "\(name).")
                        .font(EY.Typography.display(72))
                        .foregroundStyle(EY.Colour.ink)
                        .minimumScaleFactor(0.5)
                        .lineLimit(1)
                        .transition(.scale(scale: 1.25).combined(with: .opacity))
                }
                if showDemand {
                    Text("EXPLAIN YOURSELF.")
                        .font(EY.Typography.title(30))
                        .foregroundStyle(EY.Colour.accusation)
                        .transition(.opacity)
                }
            }
            .padding(EY.Space.loose)
            .multilineTextAlignment(.center)
        }
        .task {
            // These two sleeps are the most load-bearing numbers in the app.
            try? await Task.sleep(for: .milliseconds(250))
            withAnimation(EYMotion.drop(reduceMotion)) { showName = true }
            HapticsService.shared.play(.nameDrop)

            try? await Task.sleep(for: .milliseconds(600))
            withAnimation(EYMotion.gentle(reduceMotion)) { showDemand = true }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(isYou ? "It's you. Explain yourself." : "\(name). Explain yourself.")
    }
}

/// The private card, in Truth or Cap.
///
/// It fills the screen and it is deliberately ugly to hold up: the owner has to
/// read it and then put the phone face down, and anything subtle here gets
/// glanced at by the person sitting next to them.
struct SecretInstructionView<Stage: View>: View {
    let instruction: SecretInstruction?
    let stage: Stage

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        ZStack {
            if let instruction {
                (instruction == .lie ? EY.Colour.cap : EY.Colour.truth)
                    .ignoresSafeArea()

                VStack(spacing: EY.Space.base) {
                    Text("ONLY YOU CAN SEE THIS")
                        .font(EY.Typography.caption)
                        .foregroundStyle(EY.Colour.background.opacity(0.7))
                        .tracking(1.4)

                    Text(instruction.headline)
                        .font(EY.Typography.display(60))
                        .foregroundStyle(EY.Colour.background)
                        .minimumScaleFactor(0.5)
                        .lineLimit(2)
                        .multilineTextAlignment(.center)

                    Text(instruction.detail)
                        .font(EY.Typography.headline)
                        .foregroundStyle(EY.Colour.background.opacity(0.8))
                        .multilineTextAlignment(.center)
                }
                .padding(EY.Space.wide)
                .transition(.scale(scale: 0.9).combined(with: .opacity))
                .accessibilityElement(children: .combine)
                .accessibilityLabel("Only you can see this. \(instruction.headline). \(instruction.detail)")
            } else {
                // Everyone else waits, and is told nothing at all — not even
                // that a card exists for them to be curious about.
                stage.overlay(Color.black.opacity(0.4))
                VStack(spacing: EY.Space.snug) {
                    Text("SEALED")
                        .font(EY.Typography.title(24))
                        .foregroundStyle(EY.Colour.inkSecondary)
                    Text("They've been given their instructions.")
                        .font(EY.Typography.body)
                        .foregroundStyle(EY.Colour.inkTertiary)
                }
                .accessibilityElement(children: .combine)
            }
        }
        .animation(EYMotion.reveal(reduceMotion), value: instruction)
    }
}

/// Fifteen seconds, out loud, in the room.
///
/// There is no text field here on purpose. The phone's job during this phase is
/// to count and then get out of the way; the explanation is a person talking to
/// their friends, and typing it would kill the thing the game is for.
struct ExplanationView<Stage: View>: View {
    @ObservedObject var coordinator: GameSessionCoordinator
    let stage: Stage

    @State private var question: String = ""

    var body: some View {
        ZStack {
            stage.overlay(Color.black.opacity(0.35))

            VStack(spacing: EY.Space.loose) {
                Spacer()

                Text(coordinator.isMyPhoto ? "YOU'RE UP" : "\(coordinator.ownerName) IS EXPLAINING")
                    .font(EY.Typography.title(22))
                    .foregroundStyle(EY.Colour.ink)
                    .multilineTextAlignment(.center)

                if let deadline = coordinator.view?.phaseDeadline {
                    EYTimerView(
                        deadline: deadline,
                        total: TimeInterval(coordinator.round?.mode.explanationSeconds ?? 15)
                    )
                }

                if !question.isEmpty {
                    Text(question)
                        .font(EY.Typography.headline)
                        .foregroundStyle(EY.Colour.inkSecondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, EY.Space.wide)
                }

                Spacer()
            }
        }
        .task {
            // Flavour only, and never blocking: if the line is slow or the
            // provider is off, the round is completely unaffected.
            question = FlavourLines.standard.questions.randomElement() ?? ""
        }
    }
}

/// No Context: everybody invents what happened.
struct AnsweringView<Stage: View>: View {
    @ObservedObject var coordinator: GameSessionCoordinator
    let stage: Stage

    @FocusState private var focused: Bool

    private var alreadySent: Bool {
        coordinator.round?.answers.contains { $0.isYours } ?? false
    }

    var body: some View {
        ZStack {
            stage.overlay(Color.black.opacity(0.5))

            VStack(spacing: EY.Space.base) {
                Spacer()

                Text("WHAT DO YOU THINK HAPPENED HERE?")
                    .font(EY.Typography.title(24))
                    .foregroundStyle(EY.Colour.ink)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, EY.Space.loose)

                if coordinator.isMyPhoto {
                    Text("It's your photo. Sit this one out and enjoy it.")
                        .font(EY.Typography.body)
                        .foregroundStyle(EY.Colour.inkSecondary)
                        .multilineTextAlignment(.center)
                } else if alreadySent {
                    Text("SENT")
                        .font(EY.Typography.title(28))
                        .foregroundStyle(EY.Colour.truth)
                    if let waiting = coordinator.waitingCopy {
                        Text(waiting)
                            .font(EY.Typography.caption)
                            .foregroundStyle(EY.Colour.inkSecondary)
                    }
                } else {
                    TextField("", text: $coordinator.pendingAnswer, axis: .vertical)
                        .font(EY.Typography.headline)
                        .foregroundStyle(EY.Colour.ink)
                        .tint(EY.Colour.ink)
                        .focused($focused)
                        .lineLimit(2...3)
                        .padding(EY.Space.base)
                        .background(
                            RoundedRectangle(cornerRadius: EY.Radius.control, style: .continuous)
                                .fill(EY.Colour.surface)
                        )
                        .overlay(alignment: .topLeading) {
                            if coordinator.pendingAnswer.isEmpty {
                                Text("Make something up…")
                                    .font(EY.Typography.headline)
                                    .foregroundStyle(EY.Colour.inkTertiary)
                                    .padding(EY.Space.base)
                                    .allowsHitTesting(false)
                            }
                        }
                        .onChange(of: coordinator.pendingAnswer) { _, value in
                            // Hard clip at the model's own limit, so the UI
                            // cannot accept something the server will truncate.
                            if value.count > PlayerAnswer.maxLength {
                                coordinator.pendingAnswer = String(value.prefix(PlayerAnswer.maxLength))
                            }
                        }
                        .accessibilityLabel("Your fake explanation")

                    HStack {
                        Text("\(PlayerAnswer.maxLength - coordinator.pendingAnswer.count)")
                            .font(EY.Typography.caption)
                            .foregroundStyle(EY.Colour.inkTertiary)
                            .monospacedDigit()
                        Spacer()
                    }

                    EYButton(
                        title: "SEND",
                        isEnabled: PlayerAnswer.isValid(coordinator.pendingAnswer),
                        isBusy: coordinator.isSubmitting
                    ) {
                        focused = false
                        Task { await coordinator.submitAnswer() }
                    }
                }

                Spacer()
            }
            .padding(EY.Space.loose)
        }
    }
}

/// Voting. Two big targets, or a list of names, or a list of answers.
struct VotingView<Stage: View>: View {
    @ObservedObject var coordinator: GameSessionCoordinator
    let stage: Stage

    private var options: [VoteChoice] {
        guard let round = coordinator.round, let view = coordinator.view else { return [] }
        return VoteChoice.options(
            for: round.mode,
            players: view.players.filter { $0.id != round.ownerID && $0.status != .disconnected },
            answers: []
        )
    }

    var body: some View {
        ZStack {
            stage.overlay(Color.black.opacity(0.55))

            VStack(spacing: EY.Space.base) {
                Spacer()

                if coordinator.isMyPhoto {
                    Text("THEY'RE DECIDING")
                        .font(EY.Typography.title(26))
                        .foregroundStyle(EY.Colour.ink)
                    Text("You don't get a vote on your own photo.")
                        .font(EY.Typography.body)
                        .foregroundStyle(EY.Colour.inkSecondary)
                } else if let round = coordinator.round {
                    if round.mode == .noContext {
                        answerVotes(round)
                    } else if round.mode == .whoHasToExplainThis {
                        playerVotes
                    } else {
                        binaryVotes(round)
                    }
                }

                // Never a partial total. Only how many people are still out.
                if let waiting = coordinator.waitingCopy {
                    Text(waiting)
                        .font(EY.Typography.caption)
                        .foregroundStyle(EY.Colour.inkSecondary)
                        .tracking(1.2)
                        .padding(.top, EY.Space.tight)
                }

                Spacer()
            }
            .padding(EY.Space.loose)
        }
    }

    private func binaryVotes(_ round: RoundView) -> some View {
        HStack(spacing: EY.Space.snug) {
            ForEach(Array(options.enumerated()), id: \.offset) { _, choice in
                EYVoteButton(
                    title: label(for: choice, mode: round.mode),
                    tone: tone(for: choice),
                    glyph: glyph(for: choice),
                    isSelected: coordinator.round?.yourVote == choice,
                    isLocked: coordinator.round?.yourVote != nil
                ) {
                    Task { await coordinator.vote(choice) }
                }
            }
        }
    }

    private var playerVotes: some View {
        VStack(spacing: EY.Space.tight) {
            Text("WHOSE CAMERA ROLL IS THIS?")
                .font(EY.Typography.title(22))
                .foregroundStyle(EY.Colour.ink)
                .padding(.bottom, EY.Space.tight)

            ForEach(Array(options.enumerated()), id: \.offset) { _, choice in
                if case .player(let id) = choice, let view = coordinator.view {
                    EYVoteButton(
                        title: view.nickname(id).uppercased(),
                        isSelected: coordinator.round?.yourVote == choice,
                        isLocked: coordinator.round?.yourVote != nil
                    ) {
                        Task { await coordinator.vote(choice) }
                    }
                }
            }
        }
    }

    private func answerVotes(_ round: RoundView) -> some View {
        VStack(spacing: EY.Space.tight) {
            Text("PICK THE BEST ONE")
                .font(EY.Typography.title(22))
                .foregroundStyle(EY.Colour.ink)

            ForEach(round.answers) { answer in
                let choice = VoteChoice.answer(answer.id)
                EYVoteButton(
                    title: answer.text,
                    isSelected: coordinator.round?.yourVote == choice,
                    // You cannot vote for your own invention.
                    isLocked: coordinator.round?.yourVote != nil || answer.isYours
                ) {
                    Task { await coordinator.vote(choice) }
                }
                .opacity(answer.isYours ? 0.45 : 1)
            }
        }
    }

    private func label(for choice: VoteChoice, mode: GameMode) -> String {
        switch choice {
        case .fairEnough:  return "FAIR ENOUGH"
        case .absoluteCap: return "ABSOLUTE CAP"
        case .truth:       return "TRUTH"
        case .cap:         return "CAP"
        default:           return choice.label
        }
    }

    private func tone(for choice: VoteChoice) -> EY.VoteTone {
        switch choice {
        case .fairEnough, .truth: return .affirm
        case .absoluteCap, .cap:  return .deny
        default:                  return .neutral
        }
    }

    private func glyph(for choice: VoteChoice) -> String? {
        switch choice {
        case .fairEnough:  return "😭"
        case .absoluteCap: return "🧢"
        case .truth:       return "🫡"
        case .cap:         return "🧢"
        default:           return nil
        }
    }
}
