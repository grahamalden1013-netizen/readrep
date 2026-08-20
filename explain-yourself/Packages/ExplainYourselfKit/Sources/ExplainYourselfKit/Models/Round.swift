import Foundation

public enum RoundStatus: String, Codable, Sendable {
    case active
    /// The owner pulled their own photo. No reason is ever recorded or shown.
    case removedByOwner
    /// The host skipped, or the asset failed to load.
    case skipped
    case complete
}

/// One round, as the *server* knows it.
///
/// Clients never receive this type over the wire. They receive `RoundView`,
/// which is this run through `RoundRedactor` — the owner's name stripped in the
/// modes that conceal it, and the secret instruction stripped from everyone who
/// is not its owner.
///
/// Note the three explicit reveal flags. An earlier version derived visibility
/// from `phase >= .ownerReveal`, which is wrong: two of the four modes run their
/// phases in a different order, so "later phase" does not mean "further along".
/// In Who Has To Explain This, voting happens *before* the owner reveal, and an
/// ordinal comparison would have handed every device the answer it was being
/// asked to guess. Visibility is state, not an accident of enum ordering.
public struct Round: Identifiable, Codable, Hashable, Sendable {
    public let id: RoundID
    public let index: Int
    public let mode: GameMode
    public let ownerID: PlayerID
    public let assetID: AssetID

    /// Published from the very start of the round so it cannot be back-dated.
    public let commitment: SecretCommitment?
    /// The server holds this for the whole round; `RoundRedactor` decides who
    /// is allowed to see any part of it and when.
    public let secret: SecretReveal?

    public var votes: [Vote]
    public var answers: [PlayerAnswer]
    public var status: RoundStatus
    public var startedAt: Date

    /// Set when the game reaches this round's owner-reveal beat.
    public var ownerRevealed: Bool
    /// Set when the owner's private instruction card has been delivered.
    public var secretDelivered: Bool
    /// Set at the result sting. Gates tallies, answer authorship and the truth.
    public var resultsRevealed: Bool

    public init(
        id: RoundID = .random(),
        index: Int,
        mode: GameMode,
        ownerID: PlayerID,
        assetID: AssetID,
        commitment: SecretCommitment? = nil,
        secret: SecretReveal? = nil,
        votes: [Vote] = [],
        answers: [PlayerAnswer] = [],
        status: RoundStatus = .active,
        startedAt: Date = Date(),
        ownerRevealed: Bool = false,
        secretDelivered: Bool = false,
        resultsRevealed: Bool = false
    ) {
        self.id = id
        self.index = index
        self.mode = mode
        self.ownerID = ownerID
        self.assetID = assetID
        self.commitment = commitment
        self.secret = secret
        self.votes = votes
        self.answers = answers
        self.status = status
        self.startedAt = startedAt
        self.ownerRevealed = ownerRevealed
        self.secretDelivered = secretDelivered
        self.resultsRevealed = resultsRevealed
    }

    public var secretInstruction: SecretInstruction? { secret?.instruction }

    public func vote(by player: PlayerID) -> Vote? { votes.first { $0.voterID == player } }
    public func answer(by player: PlayerID) -> PlayerAnswer? { answers.first { $0.authorID == player } }

    /// Who is expected to act this round. The owner never votes on their own
    /// photo and never writes a fake explanation for it.
    public func eligibleVoters(in players: [Player]) -> [PlayerID] {
        players
            .filter { $0.status != .disconnected && $0.id != ownerID }
            .map(\.id)
    }

    public func eligibleAnswerers(in players: [Player]) -> [PlayerID] {
        guard mode.usesWrittenAnswers else { return [] }
        return eligibleVoters(in: players)
    }

    public func everyoneVoted(in players: [Player]) -> Bool {
        let expected = Set(eligibleVoters(in: players))
        guard !expected.isEmpty else { return true }
        return expected.isSubset(of: Set(votes.map(\.voterID)))
    }

    public func everyoneAnswered(in players: [Player]) -> Bool {
        let expected = Set(eligibleAnswerers(in: players))
        guard !expected.isEmpty else { return true }
        return expected.isSubset(of: Set(answers.map(\.authorID)))
    }
}

/// The redacted view of a round that a specific device is allowed to hold.
public struct RoundView: Identifiable, Codable, Hashable, Sendable {
    public let id: RoundID
    public let index: Int
    public let mode: GameMode
    public let assetID: AssetID
    /// `nil` while the mode is still concealing whose photo this is.
    public let ownerID: PlayerID?
    public let isYours: Bool
    public let commitment: SecretCommitment?
    /// Only ever non-nil on the owner's own device.
    public let yourSecretInstruction: SecretInstruction?
    /// Only ever non-nil once results are out — for everybody, at the same time.
    public let reveal: SecretReveal?
    public let answers: [AnonymousAnswer]
    /// Vote totals, and only once the round is decided.
    public let tally: VoteTally?
    public let yourVote: VoteChoice?
    public let votedPlayerIDs: [PlayerID]
    public let answeredPlayerIDs: [PlayerID]
    public let status: RoundStatus
    public let startedAt: Date

    public init(
        id: RoundID, index: Int, mode: GameMode, assetID: AssetID,
        ownerID: PlayerID?, isYours: Bool, commitment: SecretCommitment?,
        yourSecretInstruction: SecretInstruction?, reveal: SecretReveal?,
        answers: [AnonymousAnswer], tally: VoteTally?, yourVote: VoteChoice?,
        votedPlayerIDs: [PlayerID], answeredPlayerIDs: [PlayerID],
        status: RoundStatus, startedAt: Date
    ) {
        self.id = id; self.index = index; self.mode = mode; self.assetID = assetID
        self.ownerID = ownerID; self.isYours = isYours; self.commitment = commitment
        self.yourSecretInstruction = yourSecretInstruction; self.reveal = reveal
        self.answers = answers; self.tally = tally; self.yourVote = yourVote
        self.votedPlayerIDs = votedPlayerIDs; self.answeredPlayerIDs = answeredPlayerIDs
        self.status = status; self.startedAt = startedAt
    }

    /// True once this device may verify the commitment. If a reveal ever fails
    /// to match, the UI says so rather than quietly trusting it.
    public var commitmentVerified: Bool? {
        guard let commitment, let reveal else { return nil }
        return reveal.matches(commitment)
    }
}

/// An answer with its author stripped until the reveal.
public struct AnonymousAnswer: Identifiable, Codable, Hashable, Sendable {
    public let id: AnswerID
    public let text: String
    public let isYours: Bool
    public let authorID: PlayerID?

    public init(id: AnswerID, text: String, isYours: Bool, authorID: PlayerID?) {
        self.id = id; self.text = text; self.isYours = isYours; self.authorID = authorID
    }
}

/// The facts about a round that belong to exactly one device.
///
/// These never travel on the broadcast channel. Each device fetches its own
/// from a row-level-secured table and merges them into the shared public view.
public struct PrivateRoundFacts: Codable, Hashable, Sendable {
    public let roundID: RoundID
    public let isYours: Bool
    public let yourVote: VoteChoice?
    public let yourSecretInstruction: SecretInstruction?
    /// Which of the anonymous answers you wrote. The broadcast copy cannot say,
    /// because saying would deanonymise it for everyone else too.
    public let yourAnswerID: AnswerID?

    public init(
        roundID: RoundID,
        isYours: Bool,
        yourVote: VoteChoice? = nil,
        yourSecretInstruction: SecretInstruction? = nil,
        yourAnswerID: AnswerID? = nil
    ) {
        self.roundID = roundID
        self.isYours = isYours
        self.yourVote = yourVote
        self.yourSecretInstruction = yourSecretInstruction
        self.yourAnswerID = yourAnswerID
    }

    public static func none(_ roundID: RoundID) -> PrivateRoundFacts {
        PrivateRoundFacts(roundID: roundID, isYours: false)
    }
}

public enum RoundRedactor {
    /// The one copy of a round that every device receives.
    ///
    /// This is the shape that goes onto the realtime channel, so it must be
    /// safe for the *least* privileged reader in the room. It carries no secret
    /// instruction, no nonce, no owner while the mode is concealing one, no
    /// answer authorship before the reveal and no vote totals before the
    /// result. There is no per-viewer branching here at all — the broadcast
    /// cannot leak to Sam something it does not also send to Alex.
    ///
    /// Mirrored server-side by `public.publish_state()` in
    /// `supabase/migrations/0030_functions.sql`, which is the copy that
    /// actually protects anything. This one exists so demo mode behaves
    /// identically and so the rules have unit tests.
    public static func publicView(_ round: Round) -> RoundView {
        RoundView(
            id: round.id,
            index: round.index,
            mode: round.mode,
            assetID: round.assetID,
            ownerID: round.ownerRevealed ? round.ownerID : nil,
            isYours: false,
            commitment: round.commitment,
            yourSecretInstruction: nil,
            reveal: round.resultsRevealed ? round.secret : nil,
            answers: round.answers.map { answer in
                AnonymousAnswer(
                    id: answer.id,
                    text: answer.text,
                    isYours: false,
                    authorID: round.resultsRevealed ? answer.authorID : nil
                )
            },
            // No partial totals, ever. Seeing "3 CAP / 0 TRUTH" before you vote
            // does not make you a better detective, it makes you a follower.
            tally: round.resultsRevealed ? VoteTally(votes: round.votes, mode: round.mode) : nil,
            yourVote: nil,
            // *That* someone voted is public — it drives "WAITING ON 2".
            // *What* they voted is not, until everybody is in.
            votedPlayerIDs: round.votes.map(\.voterID).sorted(),
            answeredPlayerIDs: round.answers.map(\.authorID).sorted(),
            status: round.status,
            startedAt: round.startedAt
        )
    }

    /// The private half, computed server-side for one specific device.
    public static func privateFacts(_ round: Round, viewer: PlayerID) -> PrivateRoundFacts {
        let isOwner = round.ownerID == viewer
        let secret: SecretInstruction? = {
            guard isOwner, round.mode.usesSecretInstruction, round.secretDelivered else { return nil }
            return round.secret?.instruction
        }()
        return PrivateRoundFacts(
            roundID: round.id,
            isYours: isOwner,
            yourVote: round.vote(by: viewer)?.choice,
            yourSecretInstruction: secret,
            yourAnswerID: round.answer(by: viewer)?.id
        )
    }

    /// What one device ends up rendering: the shared view plus its own facts.
    public static func redact(_ round: Round, viewer: PlayerID) -> RoundView {
        publicView(round).merging(privateFacts(round, viewer: viewer), viewer: viewer)
    }
}

public extension RoundView {
    /// Fold this device's private facts into the broadcast copy.
    func merging(_ facts: PrivateRoundFacts, viewer: PlayerID) -> RoundView {
        guard facts.roundID == id else { return self }
        return RoundView(
            id: id,
            index: index,
            mode: mode,
            assetID: assetID,
            // The owner always recognises their own photo, so hiding it from
            // them would only look like a bug.
            ownerID: ownerID ?? (facts.isYours ? viewer : nil),
            isYours: facts.isYours,
            commitment: commitment,
            yourSecretInstruction: facts.yourSecretInstruction,
            reveal: reveal,
            answers: answers.map {
                AnonymousAnswer(
                    id: $0.id,
                    text: $0.text,
                    isYours: $0.id == facts.yourAnswerID || $0.authorID == viewer,
                    authorID: $0.authorID
                )
            },
            tally: tally,
            yourVote: facts.yourVote,
            votedPlayerIDs: votedPlayerIDs,
            answeredPlayerIDs: answeredPlayerIDs,
            status: status,
            startedAt: startedAt
        )
    }
}
