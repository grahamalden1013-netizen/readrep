import AVFoundation
import ExplainYourselfKit

/// Optional sound. Off is a first-class state, not a degraded one.
///
/// The audio session is `.ambient`, which means the game never interrupts
/// whatever music is already playing in the room. A party game that stops the
/// speaker gets muted within one round.
@MainActor
final class SoundService {
    static let shared = SoundService()

    var isEnabled: Bool {
        get { !UserDefaults.standard.bool(forKey: "ey.soundDisabled") }
        set {
            UserDefaults.standard.set(!newValue, forKey: "ey.soundDisabled")
            if newValue { activate() }
        }
    }

    private var players: [GameCue: AVAudioPlayer] = [:]
    private var didActivate = false

    private init() {}

    private static let files: [GameCue: String] = [
        .countdownTick: "tick",
        .revealHit: "reveal",
        .nameDrop: "drop",
        .timerWarning: "warning",
        .timeUp: "timeup",
        .voteLock: "lock",
        .resultSting: "sting",
        .gameOver: "gameover"
    ]

    func activate() {
        guard isEnabled, !didActivate else { return }
        didActivate = true
        do {
            // `.ambient` + `mixWithOthers`: we are a guest on this device's
            // speaker, not the main event.
            try AVAudioSession.sharedInstance().setCategory(
                .ambient, mode: .default, options: [.mixWithOthers]
            )
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            // Sound is decoration. If the session will not start, the game is
            // completely unaffected.
            didActivate = false
        }
    }

    func play(_ cue: GameCue) {
        guard isEnabled else { return }
        activate()

        guard let name = Self.files[cue] else { return }
        if let cached = players[cue] {
            cached.currentTime = 0
            cached.play()
            return
        }
        guard let url = Bundle.main.url(forResource: name, withExtension: "caf")
                ?? Bundle.main.url(forResource: name, withExtension: "m4a"),
              let player = try? AVAudioPlayer(contentsOf: url) else {
            // Shipping without an audio file is fine and silent, not a crash.
            return
        }
        player.volume = cue == .nameDrop ? 0.9 : 0.6
        player.prepareToPlay()
        players[cue] = player
        player.play()
    }

    func stopAll() {
        players.values.forEach { $0.stop() }
    }
}
