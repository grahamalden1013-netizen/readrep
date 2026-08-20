import Foundation

/// Everything the game needs from a server, expressed without naming one.
///
/// Supabase is one conformance (`SupabaseGameBackend`), demo mode is another
/// (`LocalGameBackend`), and the tests use a third. Nothing above this line
/// knows what Postgres is, which is the only reason "we could replace Supabase
/// later" is a true statement rather than a hope.
///
/// Note that every mutating call takes the acting player and returns the new
/// authoritative state. Clients never compute state and push it; they send an
/// intent and are told what happened.
public protocol GameBackend: Sendable {
    // Rooms
    func createRoom(host: PlayerIdentity, settings: GameSettings) async throws -> GameRoom
    func joinRoom(code: RoomCode, player: PlayerIdentity) async throws -> GameRoom
    func leaveRoom(_ room: RoomID, player: PlayerID) async throws
    func kickPlayer(_ target: PlayerID, from room: RoomID, actor: PlayerID) async throws
    func updateSettings(_ settings: GameSettings, room: RoomID, actor: PlayerID) async throws -> GameRoom
    func setStatus(_ status: PlayerStatus, approvedCount: Int, room: RoomID, player: PlayerID) async throws
    func fetchRoom(_ room: RoomID) async throws -> GameRoom

    // Session
    func startGame(room: RoomID, actor: PlayerID) async throws -> GameSessionState
    func submitVote(_ choice: VoteChoice, round: RoundID, room: RoomID, player: PlayerID) async throws
    func submitAnswer(_ text: String, round: RoundID, room: RoomID, player: PlayerID) async throws
    func advance(room: RoomID, actor: PlayerID) async throws
    func skipRound(room: RoomID, actor: PlayerID) async throws
    func removePhoto(round: RoundID, room: RoomID, actor: PlayerID) async throws
    func endGame(room: RoomID, actor: PlayerID) async throws
    func reportPhoto(round: RoundID, room: RoomID, actor: PlayerID) async throws

    /// The snapshot a device rebuilds from after a drop. Already redacted for
    /// `player` by the server.
    func snapshot(room: RoomID, player: PlayerID) async throws -> GameSnapshot

    /// Long-lived stream of authoritative snapshots.
    func observe(room: RoomID, player: PlayerID) -> AsyncThrowingStream<GameSnapshot, Error>
}

/// A device-local identity. No email, no password, no account required to play.
public struct PlayerIdentity: Codable, Hashable, Sendable {
    public let id: PlayerID
    public var nickname: String
    /// Opaque per-install secret used to authenticate this device's actions.
    /// Stored in the Keychain, never in UserDefaults, never logged.
    public let deviceToken: String

    public init(id: PlayerID, nickname: String, deviceToken: String) {
        self.id = id
        self.nickname = nickname
        self.deviceToken = deviceToken
    }
}

/// One coherent picture of the game, already stripped of anything this device
/// is not allowed to know.
public struct GameSnapshot: Hashable, Sendable {
    public let room: GameRoom
    public let session: GameSessionState?
    public let view: GameSessionView?
    public let receivedAt: Date

    public init(room: GameRoom, session: GameSessionState?, view: GameSessionView?, receivedAt: Date = Date()) {
        self.room = room
        self.session = session
        self.view = view
        self.receivedAt = receivedAt
    }
}

/// Uploading a gameplay copy of an approved photo.
public protocol GameAssetUploading: Sendable {
    /// Called only after the owner tapped KEEP and only for assets a live
    /// session needs. The implementation is responsible for having already
    /// resized the image and stripped its metadata.
    func upload(_ payload: GameplayImagePayload, room: RoomID, player: PlayerID) async throws -> AssetID

    /// A short-lived signed URL. Never a public one.
    func signedURL(for asset: AssetID, room: RoomID, player: PlayerID) async throws -> URL

    /// Hard delete, used by REMOVE PHOTO. Best-effort and idempotent.
    func purge(asset: AssetID, room: RoomID, player: PlayerID) async throws
}

public struct GameplayImagePayload: Hashable, Sendable {
    public let localAssetID: AssetID
    public let jpegData: Data
    public let pixelWidth: Int
    public let pixelHeight: Int

    public init(localAssetID: AssetID, jpegData: Data, pixelWidth: Int, pixelHeight: Int) {
        self.localAssetID = localAssetID
        self.jpegData = jpegData
        self.pixelWidth = pixelWidth
        self.pixelHeight = pixelHeight
    }
}

public enum GameBackendError: Error, Hashable, Sendable {
    case roomNotFound
    case roomFull
    case roomAlreadyStarted
    case hostEndedGame
    case notAuthorised
    case nicknameTaken
    case connectionLost
    case assetUnavailable
    case uploadFailed
    case rejected(GameRejection)
    case server(String)

    /// Player-facing copy. A raw backend string never reaches a screen.
    public var title: String {
        switch self {
        case .roomNotFound:       return "GAME NOT FOUND"
        case .roomFull:           return "ROOM IS FULL"
        case .roomAlreadyStarted: return "GAME ALREADY STARTED"
        case .hostEndedGame:      return "HOST ENDED GAME"
        case .notAuthorised:      return "NOT ALLOWED"
        case .nicknameTaken:      return "NAME TAKEN"
        case .connectionLost:     return "CONNECTION LOST"
        case .assetUnavailable:   return "PHOTO NO LONGER AVAILABLE"
        case .uploadFailed:       return "PHOTO UPLOAD FAILED"
        case .rejected:           return "CAN'T DO THAT"
        case .server:             return "SOMETHING BROKE"
        }
    }

    public var message: String {
        switch self {
        case .roomNotFound:       return "Check the code and try again."
        case .roomFull:           return "This game already has \(GameRoom.maxPlayers) players."
        case .roomAlreadyStarted: return "Ask the host to start a new one."
        case .hostEndedGame:      return "That's it. That's the game."
        case .notAuthorised:      return "Only the host can do that."
        case .nicknameTaken:      return "Someone in there already goes by that."
        case .connectionLost:     return "Trying to get you back in…"
        case .assetUnavailable:   return "Skipping this one."
        case .uploadFailed:       return "We'll try that photo again."
        case .rejected(let r):    return r.message
        case .server:             return "Try that again in a second."
        }
    }
}
