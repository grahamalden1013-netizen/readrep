// swift-tools-version: 5.9
import PackageDescription

/// `ExplainYourselfKit` holds every rule the game has: the state machine, the
/// candidate ranking heuristics, tallying, scoring and awards.
///
/// It deliberately imports nothing but Foundation. No SwiftUI, no PhotoKit, no
/// Vision. That is what makes `swift test` runnable on any machine — including
/// CI without a simulator — and what keeps the game rules inspectable.
let package = Package(
    name: "ExplainYourselfKit",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "ExplainYourselfKit", targets: ["ExplainYourselfKit"])
    ],
    targets: [
        .target(name: "ExplainYourselfKit"),
        .testTarget(name: "ExplainYourselfKitTests", dependencies: ["ExplainYourselfKit"])
    ]
)
