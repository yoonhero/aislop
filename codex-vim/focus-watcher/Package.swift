// swift-tools-version: 5.9
import PackageDescription

let package = Package(
  name: "CodexVimFocus",
  platforms: [.macOS(.v13)],
  targets: [.executableTarget(name: "CodexVimFocus")],
  swiftLanguageVersions: [.v5]
)
