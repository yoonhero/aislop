import AppKit
import ApplicationServices

enum SetupState: Equatable {
  case ready, needsSetup, stale, waitingForQuit, busy(String), failed(String)

  var title: String {
    switch self {
    case .ready: "Ready"
    case .needsSetup: "Setup required"
    case .stale: "Codex update detected"
    case .waitingForQuit: "Update ready · quit Codex Vim"
    case .busy(let task): task
    case .failed(let message): "Failed · \(message)"
    }
  }
}

@MainActor
final class SetupManager {
  static let patchVersion = "5"
  static let ruleDescription = "[aislop] Codex composer Vim mode"

  let source = URL(fileURLWithPath: "/Applications/ChatGPT.app")
  let target = FileManager.default.homeDirectoryForCurrentUser
    .appendingPathComponent("Applications/Codex Vim.app")
  let karabinerConfig = FileManager.default.homeDirectoryForCurrentUser
    .appendingPathComponent(".config/karabiner/karabiner.json")
  let log = FileManager.default.homeDirectoryForCurrentUser
    .appendingPathComponent("Library/Logs/CodexVimFocus.log")

  var onChange: (() -> Void)?
  private(set) var operation: SetupState?
  private var timer: Timer?
  var isBusy: Bool {
    if case .busy = operation { true } else { false }
  }

  var resources: URL { Bundle.main.resourceURL! }
  var karabinerCLI: URL? {
    ["/opt/homebrew/bin/karabiner_cli", "/usr/local/bin/karabiner_cli"]
      .map(URL.init(fileURLWithPath:))
      .first { FileManager.default.isExecutableFile(atPath: $0.path) }
  }
  var accessibilityGranted: Bool { AXIsProcessTrusted() }
  var sourceVersion: String? { plist(source, "CFBundleVersion") }
  var targetSourceVersion: String? { plist(target, "AislopCodexVimSourceBundleVersion") }
  var targetPatchVersion: String? { plist(target, "AislopCodexVimPatchVersion") }
  var targetInstalled: Bool { FileManager.default.fileExists(atPath: target.path) }
  var targetCurrent: Bool {
    targetInstalled
      && sourceVersion == targetSourceVersion
      && targetPatchVersion == Self.patchVersion
  }
  var autoUpdate: Bool {
    get { UserDefaults.standard.object(forKey: "autoUpdate") as? Bool ?? true }
    set { UserDefaults.standard.set(newValue, forKey: "autoUpdate") }
  }
  var launchAtLogin: Bool {
    FileManager.default.fileExists(atPath: agentURL.path)
  }
  var rulesInstalled: Bool {
    guard
      let data = try? Data(contentsOf: karabinerConfig),
      let root = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
      let profiles = root["profiles"] as? [[String: Any]]
    else { return false }
    return profiles.contains { profile in
      guard
        profile["selected"] as? Bool == true,
        let complex = profile["complex_modifications"] as? [String: Any],
        let rules = complex["rules"] as? [[String: Any]]
      else { return false }
      return rules.contains { $0["description"] as? String == Self.ruleDescription }
    }
  }
  var codexVimRunning: Bool {
    NSWorkspace.shared.runningApplications.contains {
      $0.bundleURL?.standardizedFileURL == target.standardizedFileURL
    }
  }
  var state: SetupState {
    if let operation { return operation }
    guard sourceVersion != nil, karabinerCLI != nil else { return .needsSetup }
    guard rulesInstalled, targetInstalled, accessibilityGranted else { return .needsSetup }
    guard targetCurrent else { return codexVimRunning ? .waitingForQuit : .stale }
    return .ready
  }
  var diagnostics: [String: Any] {
    func value(_ string: String?) -> Any { string ?? NSNull() }
    return [
      "accessibilityGranted": accessibilityGranted,
      "autoUpdate": autoUpdate,
      "codexVimRunning": codexVimRunning,
      "karabinerCLI": value(karabinerCLI?.path),
      "launchAtLogin": launchAtLogin,
      "patchVersion": Self.patchVersion,
      "rulesInstalled": rulesInstalled,
      "sourceVersion": value(sourceVersion),
      "state": state.title,
      "targetCurrent": targetCurrent,
      "targetInstalled": targetInstalled,
      "targetPatchVersion": value(targetPatchVersion),
      "targetSourceVersion": value(targetSourceVersion),
    ]
  }

  init() {
    let timer = Timer(timeInterval: 10, repeats: true) { [weak self] _ in
      Task { @MainActor in self?.reconcile() }
    }
    RunLoop.main.add(timer, forMode: .common)
    self.timer = timer
    NSWorkspace.shared.notificationCenter.addObserver(
      forName: NSWorkspace.didTerminateApplicationNotification,
      object: nil,
      queue: .main
    ) { [weak self] _ in Task { @MainActor in self?.reconcile() } }
  }

  func reconcile() {
    onChange?()
    guard
      operation == nil,
      autoUpdate,
      targetInstalled,
      !targetCurrent,
      !codexVimRunning
    else { return }
    installCodex()
  }

  func setupEverything() {
    operation = nil
    promptAccessibility()
    do {
      try installRules()
      try setLaunchAtLogin(true)
      installCodex()
    } catch {
      fail(error)
    }
  }

  func installCodex() {
    guard !isBusy else { return }
    operation = .busy("Building Codex Vim…")
    onChange?()
    let script = resources.appendingPathComponent("install-codex-vim.sh")
    run(script, [source.path, target.path]) { [weak self] result in
      guard let self else { return }
      switch result {
      case .success:
        self.operation = nil
        self.writeLog("Codex Vim installed from build \(self.sourceVersion ?? "?")")
      case .failure(let error): self.fail(error)
      }
      self.onChange?()
    }
  }

  func installRules() throws {
    operation = nil
    guard karabinerCLI != nil else {
      throw Failure("Karabiner-Elements is not installed")
    }
    let ruleURL = resources.appendingPathComponent("karabiner-codex-vim.json")
    let ruleRoot = try json(ruleURL)
    guard
      let pack = ruleRoot["rules"] as? [[String: Any]],
      let rule = pack.first
    else { throw Failure("Bundled Karabiner rule is invalid") }

    var root = try json(karabinerConfig)
    guard var profiles = root["profiles"] as? [[String: Any]] else {
      throw Failure("Karabiner profiles are missing")
    }
    var selected = false
    for index in profiles.indices where profiles[index]["selected"] as? Bool == true {
      selected = true
      var complex = profiles[index]["complex_modifications"] as? [String: Any] ?? [:]
      var rules = complex["rules"] as? [[String: Any]] ?? []
      rules.removeAll { $0["description"] as? String == Self.ruleDescription }
      rules.append(rule)
      complex["rules"] = rules
      profiles[index]["complex_modifications"] = complex
    }
    guard selected else { throw Failure("No selected Karabiner profile") }
    root["profiles"] = profiles
    try backup(karabinerConfig)
    try write(root, karabinerConfig)
    resetVariables()
    writeMode("insert")
    writeLog("Karabiner rules installed")
    onChange?()
  }

  func removeRules() throws {
    operation = nil
    var root = try json(karabinerConfig)
    guard var profiles = root["profiles"] as? [[String: Any]] else { return }
    for index in profiles.indices {
      guard var complex = profiles[index]["complex_modifications"] as? [String: Any] else {
        continue
      }
      var rules = complex["rules"] as? [[String: Any]] ?? []
      rules.removeAll { $0["description"] as? String == Self.ruleDescription }
      complex["rules"] = rules
      profiles[index]["complex_modifications"] = complex
    }
    root["profiles"] = profiles
    try backup(karabinerConfig)
    try write(root, karabinerConfig)
    resetVariables()
    onChange?()
  }

  func removeCodex() {
    guard targetInstalled else { return }
    do {
      try FileManager.default.trashItem(at: target, resultingItemURL: nil)
      writeLog("Codex Vim moved to Trash")
      onChange?()
    } catch { fail(error) }
  }

  func setLaunchAtLogin(_ enabled: Bool) throws {
    let fm = FileManager.default
    if enabled {
      try fm.createDirectory(
        at: agentURL.deletingLastPathComponent(),
        withIntermediateDirectories: true
      )
      let plist: [String: Any] = [
        "Label": "com.aislop.codex-vim-focus",
        "ProgramArguments": [Bundle.main.executableURL!.path],
        "RunAtLoad": true,
        "ProcessType": "Interactive",
        "StandardOutPath": log.deletingLastPathComponent()
          .appendingPathComponent("CodexVimFocus.stdout.log").path,
        "StandardErrorPath": log.deletingLastPathComponent()
          .appendingPathComponent("CodexVimFocus.stderr.log").path,
      ]
      let data = try PropertyListSerialization.data(
        fromPropertyList: plist, format: .xml, options: 0
      )
      try data.write(to: agentURL, options: .atomic)
    } else if fm.fileExists(atPath: agentURL.path) {
      try fm.removeItem(at: agentURL)
    }
    onChange?()
  }

  func promptAccessibility() {
    let options = ["AXTrustedCheckOptionPrompt": true] as CFDictionary
    _ = AXIsProcessTrustedWithOptions(options)
  }

  func openAccessibility() {
    NSWorkspace.shared.open(
      URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")!
    )
  }

  func openCodex() {
    NSWorkspace.shared.openApplication(
      at: target,
      configuration: NSWorkspace.OpenConfiguration()
    )
  }

  private var agentURL: URL {
    FileManager.default.homeDirectoryForCurrentUser
      .appendingPathComponent("Library/LaunchAgents/com.aislop.codex-vim-focus.plist")
  }

  private func plist(_ app: URL, _ key: String) -> String? {
    guard
      let data = try? Data(contentsOf: app.appendingPathComponent("Contents/Info.plist")),
      let info = try? PropertyListSerialization.propertyList(
        from: data, options: [], format: nil
      ) as? [String: Any],
      let value = info[key]
    else { return nil }
    return String(describing: value)
  }

  private func json(_ url: URL) throws -> [String: Any] {
    guard
      let value = try JSONSerialization.jsonObject(with: Data(contentsOf: url))
        as? [String: Any]
    else { throw Failure("Invalid JSON: \(url.lastPathComponent)") }
    return value
  }

  private func write(_ value: [String: Any], _ url: URL) throws {
    let data = try JSONSerialization.data(
      withJSONObject: value, options: [.prettyPrinted, .sortedKeys]
    )
    try data.write(to: url, options: .atomic)
    try FileManager.default.setAttributes(
      [.posixPermissions: 0o600], ofItemAtPath: url.path
    )
  }

  private func backup(_ url: URL) throws {
    try FileManager.default.copyItem(
      at: url,
      to: url.deletingLastPathComponent()
        .appendingPathComponent(
          "\(url.lastPathComponent).before-codex-vim.\(UUID().uuidString)"
        )
    )
  }

  private func resetVariables() {
    guard let karabinerCLI else { return }
    let process = Process()
    process.executableURL = karabinerCLI
    process.arguments = [
      "--set-variables",
      #"{"aislop_codex_vim_mode":0,"aislop_codex_vim_visual":0,"aislop_codex_vim_operator":"","aislop_codex_vim_prefix":"","aislop_codex_vim_textarea":0,"aislop_codex_vim_right_in_line":0,"aislop_codex_vim_shift":0}"#,
    ]
    try? process.run()
  }

  private func writeMode(_ mode: String) {
    try? Data("\(mode)\n".utf8).write(
      to: URL(fileURLWithPath: "/tmp/aislop-codex-vim-mode"), options: .atomic
    )
  }

  private func run(
    _ executable: URL,
    _ arguments: [String],
    completion: @escaping (Result<Void, Error>) -> Void
  ) {
    DispatchQueue.global(qos: .userInitiated).async {
      let process = Process()
      let pipe = Pipe()
      process.executableURL = executable
      process.arguments = arguments
      process.standardOutput = pipe
      process.standardError = pipe
      do {
        try process.run()
        process.waitUntilExit()
        let output = String(
          data: pipe.fileHandleForReading.readDataToEndOfFile(),
          encoding: .utf8
        ) ?? ""
        guard process.terminationStatus == 0 else {
          throw Failure(output.trimmingCharacters(in: .whitespacesAndNewlines))
        }
        DispatchQueue.main.async { completion(.success(())) }
      } catch {
        DispatchQueue.main.async { completion(.failure(error)) }
      }
    }
  }

  private func fail(_ error: Error) {
    operation = .failed(error.localizedDescription)
    writeLog("failure: \(error.localizedDescription)")
    onChange?()
  }

  private func writeLog(_ message: String) {
    let line = "\(ISO8601DateFormatter().string(from: Date())) \(message)\n"
    try? FileManager.default.createDirectory(
      at: log.deletingLastPathComponent(), withIntermediateDirectories: true
    )
    if !FileManager.default.fileExists(atPath: log.path) {
      FileManager.default.createFile(atPath: log.path, contents: nil)
    }
    guard let handle = try? FileHandle(forWritingTo: log) else { return }
    defer { try? handle.close() }
    _ = try? handle.seekToEnd()
    try? handle.write(contentsOf: Data(line.utf8))
  }
}

struct Failure: LocalizedError {
  let message: String
  init(_ message: String) { self.message = message }
  var errorDescription: String? { message.isEmpty ? "Unknown error" : message }
}
