import Foundation
import ExplainYourselfKit

/// The real backend.
///
/// Every mutating call goes to a database function or the `session` Edge
/// Function, and every one of them re-derives the caller server-side. This type
/// contains no game rules at all — it cannot, because a client that could
/// decide the rules could decide to win.
actor SupabaseGameBackend: GameBackend, GameAssetUploading {
    private let client: SupabaseClient
    private let realtime: RealtimeChannel
    private let bucket = "gameplay-photos"

    /// Cached signed URLs. Re-signing the same photo for every device on every
    /// re-render would be both slow and pointless.
    private var signedURLs: [AssetID: (url: URL, expires: Date)] = [:]

    init(configuration: SupabaseClient.Configuration) {
        let client = SupabaseClient(configuration: configuration)
        self.client = client
        self.realtime = RealtimeChannel(
            url: SupabaseGameBackend.realtimeURL(for: configuration),
            apiKey: configuration.anonKey,
            tokenProvider: { try await client.currentToken() }
        )
    }

    private static func realtimeURL(for configuration: SupabaseClient.Configuration) -> URL {
        var components = URLComponents(url: configuration.url, resolvingAgainstBaseURL: false)!
        components.scheme = components.scheme == "http" ? "ws" : "wss"
        components.path = "/realtime/v1/websocket"
        components.queryItems = [
            URLQueryItem(name: "apikey", value: configuration.anonKey),
            URLQueryItem(name: "vsn", value: "1.0.0")
        ]
        return components.url!
    }

    // MARK: - Rooms

    func createRoom(host: PlayerIdentity, settings: GameSettings) async throws -> GameRoom {
        let rows: [RoomRow] = try await client.rpc("create_room", arguments: [
            "p_nickname": AnyEncodable(host.nickname),
            "p_settings": AnyEncodable(settings)
        ])
        guard let row = rows.first else { throw GameBackendError.server("empty create_room") }
        return try await hydrate(row)
    }

    func joinRoom(code: RoomCode, player: PlayerIdentity) async throws -> GameRoom {
        let rows: [RoomRow] = try await client.rpc("join_room", arguments: [
            "p_code": AnyEncodable(code.value),
            "p_nickname": AnyEncodable(player.nickname)
        ])
        guard let row = rows.first else { throw GameBackendError.roomNotFound }
        return try await hydrate(row)
    }

    func leaveRoom(_ room: RoomID, player: PlayerID) async throws {
        try await client.rpcVoid("leave_room", arguments: ["p_room": AnyEncodable(room.raw)])
    }

    func kickPlayer(_ target: PlayerID, from room: RoomID, actor: PlayerID) async throws {
        try await client.rpcVoid("kick_player", arguments: [
            "p_room": AnyEncodable(room.raw),
            "p_target": AnyEncodable(target.raw)
        ])
    }

    func updateSettings(_ settings: GameSettings, room: RoomID, actor: PlayerID) async throws -> GameRoom {
        let rows: [RoomRow] = try await client.rpc("update_room_settings", arguments: [
            "p_room": AnyEncodable(room.raw),
            "p_settings": AnyEncodable(settings)
        ])
        guard let row = rows.first else { throw GameBackendError.roomNotFound }
        return try await hydrate(row)
    }

    func setStatus(_ status: PlayerStatus, approvedCount: Int, room: RoomID, player: PlayerID) async throws {
        // A direct table write, which is safe precisely because the column
        // grant in `0020_rls.sql` only lets a player change these three fields
        // on their own row.
        try await client.patch(
            "game_players",
            filters: ["room_id": "eq.\(room.raw)", "user_id": "eq.\(player.raw)"],
            values: [
                "status": AnyEncodable(status.rawValue),
                "approved_asset_count": AnyEncodable(approvedCount),
                "last_seen_at": AnyEncodable(ISO8601DateFormatter.plain.string(from: Date()))
            ]
        )
    }

    func fetchRoom(_ room: RoomID) async throws -> GameRoom {
        let rows: [RoomRow] = try await client.select(
            "game_rooms",
            columns: "id,code,host_id,settings,lifecycle,created_at,updated_at",
            filters: ["id": "eq.\(room.raw)"]
        )
        guard let row = rows.first else { throw GameBackendError.roomNotFound }
        return try await hydrate(row)
    }

    // MARK: - Session

    func startGame(room: RoomID, actor: PlayerID) async throws -> GameSessionState {
        let response: SessionResponse = try await client.invoke("session", body: [
            "action": AnyEncodable("start"), "roomId": AnyEncodable(room.raw)
        ])
        return response.state
    }

    func submitVote(_ choice: VoteChoice, round: RoundID, room: RoomID, player: PlayerID) async throws {
        let _: SessionResponse = try await client.invoke("session", body: [
            "action": AnyEncodable("vote"),
            "roomId": AnyEncodable(room.raw),
            "roundId": AnyEncodable(round.raw),
            "choice": AnyEncodable(choice)
        ])
    }

    func submitAnswer(_ text: String, round: RoundID, room: RoomID, player: PlayerID) async throws {
        let _: SessionResponse = try await client.invoke("session", body: [
            "action": AnyEncodable("answer"),
            "roomId": AnyEncodable(room.raw),
            "roundId": AnyEncodable(round.raw),
            "body": AnyEncodable(PlayerAnswer.sanitize(text))
        ])
    }

    func advance(room: RoomID, actor: PlayerID) async throws {
        let _: SessionResponse = try await client.invoke("session", body: [
            "action": AnyEncodable("advance"), "roomId": AnyEncodable(room.raw)
        ])
    }

    /// Any device may report an elapsed deadline. The server ignores it unless
    /// the deadline really has passed, so six phones noticing at once produce
    /// one transition rather than six.
    func reportDeadlineElapsed(room: RoomID) async throws {
        let _: SessionResponse = try await client.invoke("session", body: [
            "action": AnyEncodable("tick"), "roomId": AnyEncodable(room.raw)
        ])
    }

    func skipRound(room: RoomID, actor: PlayerID) async throws {
        let _: SessionResponse = try await client.invoke("session", body: [
            "action": AnyEncodable("skip"), "roomId": AnyEncodable(room.raw)
        ])
    }

    func removePhoto(round: RoundID, room: RoomID, actor: PlayerID) async throws {
        let _: SessionResponse = try await client.invoke("session", body: [
            "action": AnyEncodable("removePhoto"),
            "roomId": AnyEncodable(room.raw),
            "roundId": AnyEncodable(round.raw)
        ])
        signedURLs.removeAll()
    }

    func reportPhoto(round: RoundID, room: RoomID, actor: PlayerID) async throws {
        let _: SessionResponse = try await client.invoke("session", body: [
            "action": AnyEncodable("report"),
            "roomId": AnyEncodable(room.raw),
            "roundId": AnyEncodable(round.raw)
        ])
    }

    func endGame(room: RoomID, actor: PlayerID) async throws {
        let _: SessionResponse = try await client.invoke("session", body: [
            "action": AnyEncodable("end"), "roomId": AnyEncodable(room.raw)
        ])
    }

    // MARK: - Snapshots

    func snapshot(room: RoomID, player: PlayerID) async throws -> GameSnapshot {
        let gameRoom = try await fetchRoom(room)

        let sessions: [SessionRow] = try await client.select(
            "game_sessions",
            columns: "room_id,public_state,revision,phase,round_index",
            filters: ["room_id": "eq.\(room.raw)"]
        )
        guard let session = sessions.first else {
            return GameSnapshot(room: gameRoom, session: nil, view: nil)
        }

        let view = try await buildView(
            publicState: session.publicState, room: gameRoom, viewer: player
        )
        return GameSnapshot(room: gameRoom, session: nil, view: view)
    }

    /// Long-lived stream of snapshots.
    ///
    /// Every realtime event triggers a fresh snapshot fetch rather than being
    /// applied as a delta. That costs one small request per transition and buys
    /// something worth much more: there is exactly one code path that produces
    /// the state a device renders, so a dropped or reordered event cannot leave
    /// a phone showing a game that never happened.
    nonisolated func observe(room: RoomID, player: PlayerID) -> AsyncThrowingStream<GameSnapshot, Error> {
        AsyncThrowingStream { continuation in
            let task = Task {
                do {
                    let initial = try await self.snapshot(room: room, player: player)
                    continuation.yield(initial)
                } catch {
                    continuation.finish(throwing: error)
                    return
                }

                let events = await self.realtime.events(forRoom: room)
                for await event in events {
                    if Task.isCancelled { break }

                    // A disconnect is not an error: the channel is already
                    // backing off and will re-emit `.connected` when it
                    // recovers. Finishing the stream here would tear down a
                    // session that is about to come back on its own, which is
                    // exactly the lift-and-tunnel case this has to survive.
                    if case .disconnected = event { continue }

                    let latest = try? await self.snapshot(room: room, player: player)
                    if let latest {
                        continuation.yield(latest)
                    }
                }
                continuation.finish()
            }
            continuation.onTermination = { _ in
                task.cancel()
                Task { await self.realtime.stop() }
            }
        }
    }

    // MARK: - Assets

    func upload(_ payload: GameplayImagePayload, room: RoomID, player: PlayerID) async throws -> AssetID {
        let assetID = AssetID(UUID().uuidString.lowercased())
        let path = "rooms/\(room.raw)/\(player.raw)/\(assetID.raw).jpg"

        // Bytes first, row second. If the row write fails the object is an
        // orphan the cleanup job removes; if the row existed first and the
        // upload failed, a round could deal a photo that does not exist.
        try await client.upload(bucket: bucket, path: path, data: payload.jpegData)

        do {
            try await client.insert("approved_game_assets", values: [
                "id": AnyEncodable(assetID.raw),
                "room_id": AnyEncodable(room.raw),
                "owner_id": AnyEncodable(player.raw),
                "storage_path": AnyEncodable(path),
                "width": AnyEncodable(payload.pixelWidth),
                "height": AnyEncodable(payload.pixelHeight),
                "byte_size": AnyEncodable(payload.jpegData.count)
            ])
        } catch {
            // Do not leave bytes behind for a photo the game will never know
            // about.
            try? await client.delete(bucket: bucket, paths: [path])
            throw GameBackendError.uploadFailed
        }

        return assetID
    }

    func signedURL(for asset: AssetID, room: RoomID, player: PlayerID) async throws -> URL {
        if let cached = signedURLs[asset], cached.expires > Date().addingTimeInterval(30) {
            return cached.url
        }

        let rows: [AssetRow] = try await client.select(
            "approved_game_assets",
            columns: "id,storage_path",
            filters: ["id": "eq.\(asset.raw)"]
        )
        guard let row = rows.first else { throw GameBackendError.assetUnavailable }

        let url = try await client.signedURL(
            bucket: bucket, path: row.storagePath, expiresIn: Int(Tuning.signedURLLifetime)
        )
        signedURLs[asset] = (url, Date().addingTimeInterval(Tuning.signedURLLifetime))
        return url
    }

    func purge(asset: AssetID, room: RoomID, player: PlayerID) async throws {
        signedURLs.removeValue(forKey: asset)
        let rows: [AssetRow] = try await client.select(
            "approved_game_assets", columns: "id,storage_path",
            filters: ["id": "eq.\(asset.raw)"]
        )
        guard let row = rows.first else { return }
        try await client.delete(bucket: bucket, paths: [row.storagePath])
    }

    // MARK: - Wire types

    private func hydrate(_ row: RoomRow) async throws -> GameRoom {
        let players: [PlayerRow] = try await client.select(
            "game_players",
            columns: "user_id,nickname,is_host,status,approved_asset_count,joined_at,last_seen_at",
            filters: ["room_id": "eq.\(row.id)", "kicked": "eq.false"],
            order: "joined_at"
        )

        guard let code = RoomCode(row.code) else { throw GameBackendError.server("bad room code") }

        return GameRoom(
            id: RoomID(row.id),
            code: code,
            hostID: PlayerID(row.hostID),
            settings: row.settings,
            players: players.map(\.player),
            lifecycle: RoomLifecycle(rawValue: row.lifecycle) ?? .lobby,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt
        )
    }

    /// Merge the broadcast state with the private facts that belong to this
    /// device alone. The secret instruction is fetched separately, from a table
    /// whose RLS policy allows exactly one reader.
    private func buildView(
        publicState: PublicSessionState,
        room: GameRoom,
        viewer: PlayerID
    ) async throws -> GameSessionView {
        var round = publicState.currentRound

        if let current = round {
            var facts = PrivateRoundFacts(roundID: current.id, isYours: current.ownerID == viewer)

            let secrets: [SecretRow] = (try? await client.select(
                "round_secrets",
                columns: "round_id,instruction,nonce",
                filters: ["round_id": "eq.\(current.id.raw)"]
            )) ?? []

            let votes: [VoteRow] = (try? await client.select(
                "round_votes",
                columns: "round_id,voter_id,choice",
                filters: ["round_id": "eq.\(current.id.raw)"]
            )) ?? []

            let answers: [AnswerRow] = (try? await client.select(
                "player_answers",
                columns: "id,round_id,author_id",
                filters: ["round_id": "eq.\(current.id.raw)"]
            )) ?? []

            // RLS means these queries return this device's own rows or nothing
            // at all. There is no filtering to do here, which is the point:
            // the app cannot fail to filter something the server never sent.
            facts = PrivateRoundFacts(
                roundID: current.id,
                isYours: current.ownerID == viewer || secrets.first != nil,
                yourVote: votes.first?.choice,
                yourSecretInstruction: secrets.first?.instruction,
                yourAnswerID: answers.first.map { AnswerID($0.id) }
            )
            round = current.merging(facts, viewer: viewer)
        }

        return GameSessionView(
            roomID: room.id,
            settings: publicState.settings,
            phase: publicState.phase,
            roundNumber: max(1, publicState.roundIndex + 1),
            totalRounds: publicState.settings.roundCount,
            round: round,
            players: room.players,
            scores: publicState.scores,
            phaseDeadline: publicState.phaseDeadline,
            viewer: viewer,
            isHost: room.hostID == viewer,
            revision: publicState.revision
        )
    }
}

// MARK: - Rows

private struct RoomRow: Decodable {
    let id: String
    let code: String
    let hostID: String
    let settings: GameSettings
    let lifecycle: String
    let createdAt: Date
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id, code, settings, lifecycle
        case hostID = "host_id"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

private struct PlayerRow: Decodable {
    let userID: String
    let nickname: String
    let isHost: Bool
    let status: String
    let approvedAssetCount: Int
    let joinedAt: Date
    let lastSeenAt: Date

    enum CodingKeys: String, CodingKey {
        case nickname, status
        case userID = "user_id"
        case isHost = "is_host"
        case approvedAssetCount = "approved_asset_count"
        case joinedAt = "joined_at"
        case lastSeenAt = "last_seen_at"
    }

    var player: Player {
        Player(
            id: PlayerID(userID),
            nickname: nickname,
            isHost: isHost,
            status: PlayerStatus(rawValue: status) ?? .joined,
            approvedAssetCount: approvedAssetCount,
            joinedAt: joinedAt,
            lastSeenAt: lastSeenAt
        )
    }
}

private struct SessionRow: Decodable {
    let publicState: PublicSessionState

    enum CodingKeys: String, CodingKey {
        case publicState = "public_state"
    }
}

private struct SessionResponse: Decodable {
    let state: GameSessionState
}

private struct AssetRow: Decodable {
    let id: String
    let storagePath: String

    enum CodingKeys: String, CodingKey {
        case id
        case storagePath = "storage_path"
    }
}

private struct SecretRow: Decodable {
    let instruction: SecretInstruction
    let nonce: String
}

private struct VoteRow: Decodable {
    let choice: VoteChoice
}

private struct AnswerRow: Decodable {
    let id: String
}

/// The broadcast payload, exactly as the server writes it.
struct PublicSessionState: Decodable {
    let settings: GameSettings
    let phase: GamePhase
    let roundIndex: Int
    let currentRound: RoundView?
    let scores: [PlayerID: Int]
    let revision: Int
    let phaseDeadline: Date?

    enum CodingKeys: String, CodingKey {
        case settings, phase, roundIndex, currentRound, scores, revision, phaseDeadline
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        settings = try container.decode(GameSettings.self, forKey: .settings)
        phase = try container.decode(GamePhase.self, forKey: .phase)
        roundIndex = try container.decode(Int.self, forKey: .roundIndex)
        currentRound = try container.decodeIfPresent(RoundView.self, forKey: .currentRound)
        let raw = try container.decodeIfPresent([String: Int].self, forKey: .scores) ?? [:]
        scores = Dictionary(uniqueKeysWithValues: raw.map { (PlayerID($0.key), $0.value) })
        revision = try container.decode(Int.self, forKey: .revision)
        phaseDeadline = try container.decodeIfPresent(Date.self, forKey: .phaseDeadline)
    }
}
