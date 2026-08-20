import UIKit
import ExplainYourselfKit

/// Haptics, mapped from game cues rather than called ad hoc from views.
///
/// Centralised for two reasons: the reveal's rhythm is a designed thing and
/// wants to live in one file, and the whole lot has to be switchable off for
/// people who find it unpleasant.
@MainActor
final class HapticsService {
    static let shared = HapticsService()

    var isEnabled: Bool {
        get { !UserDefaults.standard.bool(forKey: "ey.hapticsDisabled") }
        set { UserDefaults.standard.set(!newValue, forKey: "ey.hapticsDisabled") }
    }

    private let light = UIImpactFeedbackGenerator(style: .light)
    private let medium = UIImpactFeedbackGenerator(style: .medium)
    private let heavy = UIImpactFeedbackGenerator(style: .heavy)
    private let rigid = UIImpactFeedbackGenerator(style: .rigid)
    private let notice = UINotificationFeedbackGenerator()
    private let selection = UISelectionFeedbackGenerator()

    private init() {}

    /// Call before a beat you know is coming. Warming the generator is the
    /// difference between a crisp tap and one that arrives late.
    func prepare(_ cue: GameCue) {
        guard isEnabled else { return }
        switch cue {
        case .nameDrop, .resultSting: heavy.prepare()
        case .revealHit:              medium.prepare()
        default:                      light.prepare()
        }
    }

    func play(_ cue: GameCue) {
        guard isEnabled else { return }
        switch cue {
        case .countdownTick:   light.impactOccurred(intensity: 0.7)
        case .revealHit:       medium.impactOccurred()
        case .nameDrop:        heavy.impactOccurred(intensity: 1.0)
        case .secretCard:      rigid.impactOccurred(intensity: 0.8)
        case .timerWarning:    rigid.impactOccurred(intensity: 0.9)
        case .timeUp:          notice.notificationOccurred(.warning)
        case .voteLock:        selection.selectionChanged()
        case .resultSting:     notice.notificationOccurred(.success)
        // Deliberately soft. Somebody just pulled their own photo, possibly
        // because they were uncomfortable; the phone should not celebrate.
        case .roundRemoved:    light.impactOccurred(intensity: 0.4)
        case .gameOver:        notice.notificationOccurred(.success)
        }
    }
}
