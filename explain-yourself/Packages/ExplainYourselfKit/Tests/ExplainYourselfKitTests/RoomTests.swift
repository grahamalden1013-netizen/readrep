import XCTest
@testable import ExplainYourselfKit

final class RoomTests: XCTestCase {

    func testRoomCodeIsFourDigitsAndNeverAllSame() {
        var generator = SeededGenerator(seed: 7)
        for _ in 0..<500 {
            let code = RoomCode.generate(using: &generator)
            XCTAssertEqual(code.value.count, 4)
            XCTAssertTrue(code.value.allSatisfy(\.isNumber))
            XCTAssertGreaterThan(Set(code.value).count, 1, "0000 and 1111 read badly across a room")
        }
    }

    func testRoomCodeRejectsMalformedInput() {
        XCTAssertNil(RoomCode("123"))
        XCTAssertNil(RoomCode("12345"))
        XCTAssertNil(RoomCode("abcd"))
        XCTAssertEqual(RoomCode("48 21")?.value, "4821")
        XCTAssertEqual(RoomCode("4821")?.display, "48 21")
    }

    func testRoomIsFullAtTen() {
        let players = (0..<10).map { Cast.player(PlayerID("p\($0)")) }
        let room = makeRoom(players: players)
        XCTAssertTrue(room.isFull)
        XCTAssertFalse(makeRoom(players: Array(players.prefix(9))).isFull)
    }

    func testCannotStartBelowMinimumPlayers() {
        let room = makeRoom(players: [Cast.player(Cast.jake, host: true), Cast.player(Cast.sam)])
        XCTAssertFalse(room.canStart)
        XCTAssertEqual(room.startBlockedReason, "Need 1 more player.")
    }

    func testCannotStartWhileSomeoneIsStillPickingPhotos() {
        var players = Cast.six
        players[2].status = .selectingPhotos
        let room = makeRoom(players: players)
        XCTAssertFalse(room.canStart)
        XCTAssertEqual(room.startBlockedReason, "Waiting on 1 player.")
    }

    func testCannotStartWhenOnlyOnePlayerHasPhotos() {
        // Otherwise every single round outs the same person instantly.
        var players = Cast.six
        for index in players.indices where index > 0 { players[index].approvedAssetCount = 0 }
        let room = makeRoom(players: players)
        XCTAssertFalse(room.canStart)
        XCTAssertEqual(room.startBlockedReason, "At least 2 players need approved photos.")
    }

    func testDisconnectedPlayersDoNotBlockTheStart() {
        var players = Cast.six
        players[5].status = .disconnected
        let room = makeRoom(players: players)
        XCTAssertTrue(room.canStart)
        XCTAssertNil(room.startBlockedReason)
    }

    func testNicknameValidation() {
        XCTAssertEqual(try? NicknameValidator.validate("  Jake ").get(), "Jake")
        XCTAssertEqual(NicknameValidator.validate(""), .failure(.empty))
        XCTAssertEqual(NicknameValidator.validate("Bartholomewwww"), .failure(.tooLong))
        XCTAssertEqual(NicknameValidator.validate("jake", existing: ["Jake"]), .failure(.duplicate))
    }

    private func makeRoom(players: [Player]) -> GameRoom {
        GameRoom(
            id: RoomID("r"), code: RoomCode("4821")!, hostID: players[0].id, players: players
        )
    }
}
