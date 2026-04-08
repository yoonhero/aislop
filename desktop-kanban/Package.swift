// swift-tools-version: 6.2

import Foundation
import PackageDescription

let packageDirectory = URL(fileURLWithPath: #filePath).deletingLastPathComponent().path

let package = Package(
    name: "desktop-kanban",
    platforms: [
        .macOS(.v14),
    ],
    products: [
        .executable(
            name: "DesktopKanban",
            targets: ["DesktopKanbanApp"]
        ),
    ],
    targets: [
        .executableTarget(
            name: "DesktopKanbanApp",
            path: "Sources/DesktopKanbanApp",
            linkerSettings: [
                .unsafeFlags([
                    "-Xlinker",
                    "-sectcreate",
                    "-Xlinker",
                    "__TEXT",
                    "-Xlinker",
                    "__info_plist",
                    "-Xlinker",
                    "\(packageDirectory)/Supporting/Info.plist",
                ]),
            ]
        ),
        .testTarget(
            name: "DesktopKanbanAppTests",
            dependencies: ["DesktopKanbanApp"],
            path: "Tests/DesktopKanbanAppTests"
        ),
    ]
)
