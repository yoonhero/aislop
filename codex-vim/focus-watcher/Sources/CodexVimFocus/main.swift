import AppKit
import Darwin

MainActor.assumeIsolated {
  if CommandLine.arguments.contains("--diagnose") {
    let data = try! JSONSerialization.data(
      withJSONObject: SetupManager().diagnostics,
      options: [.prettyPrinted, .sortedKeys]
    )
    FileHandle.standardOutput.write(data)
    FileHandle.standardOutput.write(Data("\n".utf8))
    exit(EXIT_SUCCESS)
  }

  let app = NSApplication.shared
  let delegate = AppDelegate()
  app.setActivationPolicy(.accessory)
  app.delegate = delegate
  app.run()
}
