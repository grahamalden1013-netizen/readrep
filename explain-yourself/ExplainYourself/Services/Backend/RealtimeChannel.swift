import Foundation
import ExplainYourselfKit

/// A hand-rolled Supabase Realtime client, just big enough for this game.
///
/// It speaks the Phoenix channel protocol over `URLSessionWebSocketTask`:
/// join a topic, heartbeat every 25 seconds, receive Postgres change events.
/// That is all this app needs, and it is roughly two hundred lines, which is
/// cheaper than a dependency.
///
/// The reconnection behaviour matters more than the protocol does. Phones lose
/// their connection constantly — a lift, a tunnel, someone opening Instagram
/// mid-round — and the difference between a good party game and a frustrating
/// one is whether coming back takes zero taps. So: exponential backoff, and on
/// every successful reconnect a full snapshot fetch rather than a replay,
/// because the authoritative state is always the one on the server.
actor RealtimeChannel {
    enum Event: Sendable {
        case connected
        case disconnected
        case change(table: String, payload: Data)
    }

    private let url: URL
    private let apiKey: String
    private let tokenProvider: @Sendable () async throws -> String

    private var task: URLSessionWebSocketTask?
    private var session: URLSession
    private var reference = 0
    private var heartbeat: Task<Void, Never>?
    private var pump: Task<Void, Never>?
    private var attempt = 0
    private var topic: String?
    private var isStopping = false

    private var continuation: AsyncStream<Event>.Continuation?

    init(
        url: URL,
        apiKey: String,
        tokenProvider: @escaping @Sendable () async throws -> String,
        session: URLSession = .shared
    ) {
        self.url = url
        self.apiKey = apiKey
        self.tokenProvider = tokenProvider
        self.session = session
    }

    func events(forRoom roomID: RoomID) -> AsyncStream<Event> {
        let topic = "realtime:room:\(roomID.raw)"
        self.topic = topic
        self.isStopping = false

        return AsyncStream { continuation in
            self.continuation = continuation
            continuation.onTermination = { _ in
                Task { await self.stop() }
            }
            Task { await self.connect(topic: topic, roomID: roomID) }
        }
    }

    func stop() {
        isStopping = true
        heartbeat?.cancel(); heartbeat = nil
        pump?.cancel(); pump = nil
        task?.cancel(with: .goingAway, reason: nil)
        task = nil
        continuation?.finish()
        continuation = nil
    }

    // MARK: - Connection

    private func connect(topic: String, roomID: RoomID) async {
        guard !isStopping else { return }

        do {
            let token = try await tokenProvider()
            var request = URLRequest(url: url)
            request.setValue(apiKey, forHTTPHeaderField: "apikey")

            let socket = session.webSocketTask(with: request)
            socket.resume()
            task = socket

            try await send(payload: [
                "topic": topic,
                "event": "phx_join",
                "ref": nextReference(),
                "payload": [
                    "config": [
                        "postgres_changes": [
                            ["event": "*", "schema": "public", "table": "game_sessions",
                             "filter": "room_id=eq.\(roomID.raw)"],
                            ["event": "*", "schema": "public", "table": "game_players",
                             "filter": "room_id=eq.\(roomID.raw)"]
                        ]
                    ],
                    "access_token": token
                ]
            ])

            attempt = 0
            continuation?.yield(.connected)
            startHeartbeat(topic: topic)
            startPump(topic: topic, roomID: roomID)
        } catch {
            await scheduleReconnect(topic: topic, roomID: roomID)
        }
    }

    private func startPump(topic: String, roomID: RoomID) {
        pump?.cancel()
        pump = Task { [weak self] in
            guard let self else { return }
            while true {
                let running = await self.isRunning
                guard running, !Task.isCancelled else { return }
                do {
                    guard let message = try await self.receive() else { return }
                    await self.handle(message)
                } catch {
                    // Any receive failure is a dropped connection. There is no
                    // recoverable error here worth distinguishing: reconnect.
                    await self.dropped(topic: topic, roomID: roomID)
                    return
                }
            }
        }
    }

    private var isRunning: Bool { task != nil && !isStopping }

    private func receive() async throws -> URLSessionWebSocketTask.Message? {
        guard let task else { return nil }
        return try await task.receive()
    }

    private func handle(_ message: URLSessionWebSocketTask.Message) {
        let data: Data
        switch message {
        case .string(let text): data = Data(text.utf8)
        case .data(let raw): data = raw
        @unknown default: return
        }

        guard let root = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let event = root["event"] as? String else { return }

        guard event == "postgres_changes",
              let payload = root["payload"] as? [String: Any],
              let inner = payload["data"] as? [String: Any],
              let table = inner["table"] as? String,
              let record = inner["record"] as? [String: Any],
              let encoded = try? JSONSerialization.data(withJSONObject: record) else { return }

        continuation?.yield(.change(table: table, payload: encoded))
    }

    private func startHeartbeat(topic: String) {
        heartbeat?.cancel()
        heartbeat = Task { [weak self] in
            while true {
                try? await Task.sleep(for: .seconds(25))
                guard let self, !Task.isCancelled else { return }
                let running = await self.isRunning
                guard running else { return }
                let reference = await self.nextReference()
                try? await self.send(payload: [
                    "topic": "phoenix",
                    "event": "heartbeat",
                    "ref": reference,
                    "payload": [:]
                ])
            }
        }
    }

    private func dropped(topic: String, roomID: RoomID) async {
        guard !isStopping else { return }
        continuation?.yield(.disconnected)
        task = nil
        heartbeat?.cancel(); heartbeat = nil
        await scheduleReconnect(topic: topic, roomID: roomID)
    }

    private func scheduleReconnect(topic: String, roomID: RoomID) async {
        guard !isStopping else { return }
        let delays = Tuning.reconnectBackoff
        let delay = delays[min(attempt, delays.count - 1)]
        attempt += 1
        try? await Task.sleep(for: .seconds(delay))
        await connect(topic: topic, roomID: roomID)
    }

    private func send(payload: [String: Any]) async throws {
        guard let task,
              let data = try? JSONSerialization.data(withJSONObject: payload),
              let text = String(data: data, encoding: .utf8) else {
            throw GameBackendError.connectionLost
        }
        try await task.send(.string(text))
    }

    private func nextReference() -> String {
        reference += 1
        return String(reference)
    }
}
