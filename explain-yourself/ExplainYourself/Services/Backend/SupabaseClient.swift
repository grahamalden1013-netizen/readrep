import Foundation
import ExplainYourselfKit

/// A very small Supabase client, written by hand.
///
/// The app has zero third-party Swift packages. That is a deliberate trade: the
/// official SDK would save perhaps three hundred lines here, at the cost of
/// pulling a dependency tree into a build that handles people's photographs.
/// What this needs from Supabase is PostgREST, RPC, anonymous auth, storage
/// upload and a websocket — all of which are plain HTTP and all of which are
/// below.
actor SupabaseClient {
    struct Configuration: Sendable {
        let url: URL
        let anonKey: String
    }

    private let configuration: Configuration
    private let session: URLSession
    private var accessToken: String?
    private var refreshToken: String?
    private var expiry: Date?

    private let encoder: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }()

    private let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let raw = try decoder.singleValueContainer().decode(String.self)
            // Postgres timestamps come back with a variable number of
            // fractional digits, which the plain .iso8601 strategy rejects.
            if let date = ISO8601DateFormatter.withFractionalSeconds.date(from: raw) { return date }
            if let date = ISO8601DateFormatter.plain.date(from: raw) { return date }
            throw DecodingError.dataCorruptedError(
                in: try decoder.singleValueContainer(),
                debugDescription: "Unrecognised timestamp \(raw)"
            )
        }
        return decoder
    }()

    init(configuration: Configuration, session: URLSession = .shared) {
        self.configuration = configuration
        self.session = session
    }

    // MARK: - Auth

    /// Anonymous sign-in. This is the whole account system for v1: the player
    /// types a nickname, and the device quietly gets a real, RLS-enforceable
    /// identity without anyone registering anything.
    @discardableResult
    func signInAnonymously() async throws -> String {
        if let token = accessToken, let expiry, expiry > Date().addingTimeInterval(60) {
            return token
        }
        if refreshToken != nil, (try? await refreshSession()) != nil, let token = accessToken {
            return token
        }

        var request = URLRequest(url: authURL("signup"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(configuration.anonKey, forHTTPHeaderField: "apikey")
        request.httpBody = Data("{}".utf8)

        let (data, response) = try await session.data(for: request)
        try check(response, data: data)

        let payload = try decoder.decode(AuthResponse.self, from: data)
        apply(payload)
        guard let token = accessToken else { throw GameBackendError.notAuthorised }
        return token
    }

    private func refreshSession() async throws {
        guard let refreshToken else { throw GameBackendError.notAuthorised }
        var request = URLRequest(url: authURL("token", query: "grant_type=refresh_token"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(configuration.anonKey, forHTTPHeaderField: "apikey")
        request.httpBody = try JSONSerialization.data(withJSONObject: ["refresh_token": refreshToken])

        let (data, response) = try await session.data(for: request)
        try check(response, data: data)
        apply(try decoder.decode(AuthResponse.self, from: data))
    }

    private func apply(_ payload: AuthResponse) {
        accessToken = payload.accessToken
        refreshToken = payload.refreshToken
        expiry = Date().addingTimeInterval(TimeInterval(payload.expiresIn))
    }

    func currentToken() async throws -> String {
        try await signInAnonymously()
    }

    // MARK: - PostgREST

    func select<T: Decodable>(
        _ table: String,
        columns: String = "*",
        filters: [String: String] = [:],
        order: String? = nil,
        as type: T.Type = T.self
    ) async throws -> T {
        var items = [URLQueryItem(name: "select", value: columns)]
        items += filters.map { URLQueryItem(name: $0.key, value: $0.value) }
        if let order { items.append(URLQueryItem(name: "order", value: order)) }

        var components = URLComponents(
            url: configuration.url.appendingPathComponent("rest/v1/\(table)"),
            resolvingAgainstBaseURL: false
        )!
        components.queryItems = items

        var request = URLRequest(url: components.url!)
        request.httpMethod = "GET"
        try await authorise(&request)

        let (data, response) = try await session.data(for: request)
        try check(response, data: data)
        return try decoder.decode(T.self, from: data)
    }

    @discardableResult
    func rpc<T: Decodable>(
        _ function: String,
        arguments: [String: AnyEncodable] = [:],
        as type: T.Type = T.self
    ) async throws -> T {
        var request = URLRequest(url: configuration.url.appendingPathComponent("rest/v1/rpc/\(function)"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        try await authorise(&request)
        request.httpBody = try encoder.encode(arguments)

        let (data, response) = try await session.data(for: request)
        try check(response, data: data)
        return try decoder.decode(T.self, from: data)
    }

    func rpcVoid(_ function: String, arguments: [String: AnyEncodable] = [:]) async throws {
        var request = URLRequest(url: configuration.url.appendingPathComponent("rest/v1/rpc/\(function)"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("return=minimal", forHTTPHeaderField: "Prefer")
        try await authorise(&request)
        request.httpBody = try encoder.encode(arguments)

        let (data, response) = try await session.data(for: request)
        try check(response, data: data)
    }

    func insert(_ table: String, values: [String: AnyEncodable]) async throws {
        var request = URLRequest(url: configuration.url.appendingPathComponent("rest/v1/\(table)"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("return=minimal", forHTTPHeaderField: "Prefer")
        try await authorise(&request)
        request.httpBody = try encoder.encode(values)

        let (data, response) = try await session.data(for: request)
        try check(response, data: data)
    }

    func patch(_ table: String, filters: [String: String], values: [String: AnyEncodable]) async throws {
        var components = URLComponents(
            url: configuration.url.appendingPathComponent("rest/v1/\(table)"),
            resolvingAgainstBaseURL: false
        )!
        components.queryItems = filters.map { URLQueryItem(name: $0.key, value: $0.value) }

        var request = URLRequest(url: components.url!)
        request.httpMethod = "PATCH"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("return=minimal", forHTTPHeaderField: "Prefer")
        try await authorise(&request)
        request.httpBody = try encoder.encode(values)

        let (data, response) = try await session.data(for: request)
        try check(response, data: data)
    }

    // MARK: - Edge functions

    func invoke<Response: Decodable>(
        _ function: String,
        body: [String: AnyEncodable],
        as type: Response.Type = Response.self
    ) async throws -> Response {
        var request = URLRequest(url: configuration.url.appendingPathComponent("functions/v1/\(function)"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        try await authorise(&request)
        request.httpBody = try encoder.encode(body)

        let (data, response) = try await session.data(for: request)
        try check(response, data: data)
        return try decoder.decode(Response.self, from: data)
    }

    // MARK: - Storage

    func upload(
        bucket: String,
        path: String,
        data: Data,
        contentType: String = "image/jpeg"
    ) async throws {
        var request = URLRequest(
            url: configuration.url.appendingPathComponent("storage/v1/object/\(bucket)/\(path)")
        )
        request.httpMethod = "POST"
        request.setValue(contentType, forHTTPHeaderField: "Content-Type")
        // Never overwrite. A gameplay copy is written once; allowing a second
        // write would let somebody swap the photo after the room reacted to it.
        request.setValue("false", forHTTPHeaderField: "x-upsert")
        try await authorise(&request)
        request.httpBody = data

        let (body, response) = try await session.data(for: request)
        try check(response, data: body)
    }

    /// A short-lived signed URL. There is no public-URL method on this client
    /// on purpose: the bucket is private and there is nothing to link to.
    func signedURL(bucket: String, path: String, expiresIn: Int) async throws -> URL {
        var request = URLRequest(
            url: configuration.url.appendingPathComponent("storage/v1/object/sign/\(bucket)/\(path)")
        )
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        try await authorise(&request)
        request.httpBody = try JSONSerialization.data(withJSONObject: ["expiresIn": expiresIn])

        let (data, response) = try await session.data(for: request)
        try check(response, data: data)

        struct SignedResponse: Decodable { let signedURL: String }
        let signed = try decoder.decode(SignedResponse.self, from: data)
        guard let url = URL(string: signed.signedURL, relativeTo: configuration.url.appendingPathComponent("storage/v1")) else {
            throw GameBackendError.assetUnavailable
        }
        return url.absoluteURL
    }

    func delete(bucket: String, paths: [String]) async throws {
        var request = URLRequest(url: configuration.url.appendingPathComponent("storage/v1/object/\(bucket)"))
        request.httpMethod = "DELETE"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        try await authorise(&request)
        request.httpBody = try JSONSerialization.data(withJSONObject: ["prefixes": paths])

        let (data, response) = try await session.data(for: request)
        try check(response, data: data)
    }

    // MARK: - Realtime

    func realtimeURL() -> URL {
        var components = URLComponents(url: configuration.url, resolvingAgainstBaseURL: false)!
        components.scheme = components.scheme == "http" ? "ws" : "wss"
        components.path = "/realtime/v1/websocket"
        components.queryItems = [
            URLQueryItem(name: "apikey", value: configuration.anonKey),
            URLQueryItem(name: "vsn", value: "1.0.0")
        ]
        return components.url!
    }

    var anonKey: String { configuration.anonKey }

    // MARK: - Plumbing

    private func authURL(_ path: String, query: String? = nil) -> URL {
        var components = URLComponents(
            url: configuration.url.appendingPathComponent("auth/v1/\(path)"),
            resolvingAgainstBaseURL: false
        )!
        components.query = query
        return components.url!
    }

    private func authorise(_ request: inout URLRequest) async throws {
        let token = try await signInAnonymously()
        request.setValue(configuration.anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }

    /// Turns transport failures into the app's own vocabulary. A raw response
    /// body never reaches a screen — at most it reaches the console in a debug
    /// build.
    private func check(_ response: URLResponse, data: Data) throws {
        guard let http = response as? HTTPURLResponse else { throw GameBackendError.connectionLost }
        guard !(200..<300).contains(http.statusCode) else { return }

        let body = String(data: data, encoding: .utf8) ?? ""
        #if DEBUG
        print("[supabase] \(http.statusCode): \(body)")
        #endif

        // The database raises these; `docs/SECURITY.md` lists them.
        if body.contains("EY404") { throw GameBackendError.roomNotFound }
        if body.contains("EY413") { throw GameBackendError.roomFull }
        if body.contains("EY409N") { throw GameBackendError.nicknameTaken }
        if body.contains("EY409") { throw GameBackendError.roomAlreadyStarted }
        if body.contains("EY410") { throw GameBackendError.roomNotFound }
        if body.contains("EY403") { throw GameBackendError.notAuthorised }

        switch http.statusCode {
        case 401, 403: throw GameBackendError.notAuthorised
        case 404:      throw GameBackendError.roomNotFound
        case 408, 502, 503, 504: throw GameBackendError.connectionLost
        default:       throw GameBackendError.server("HTTP \(http.statusCode)")
        }
    }

    private struct AuthResponse: Decodable {
        let accessToken: String
        let refreshToken: String?
        let expiresIn: Int

        enum CodingKeys: String, CodingKey {
            case accessToken = "access_token"
            case refreshToken = "refresh_token"
            case expiresIn = "expires_in"
        }
    }
}

/// A type-erased `Encodable`, so request bodies can be built as dictionaries
/// without giving up type safety at the edges.
struct AnyEncodable: Encodable {
    private let write: (Encoder) throws -> Void

    init<T: Encodable>(_ value: T) {
        write = { encoder in try value.encode(to: encoder) }
    }

    func encode(to encoder: Encoder) throws { try write(encoder) }
}

extension ISO8601DateFormatter {
    static let withFractionalSeconds: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    static let plain: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter
    }()
}
