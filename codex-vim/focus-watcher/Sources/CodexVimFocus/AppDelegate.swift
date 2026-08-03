import AppKit

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate, NSMenuDelegate {
  private let manager = SetupManager()
  private lazy var watcher = FocusWatcher(karabiner: manager.karabinerCLI)
  private let status = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
  private let menu = NSMenu()
  private var refreshTimer: Timer?

  func applicationDidFinishLaunching(_ notification: Notification) {
    status.button?.toolTip = "Codex Vim Focus"
    menu.delegate = self
    status.menu = menu
    manager.onChange = { [weak self] in self?.render() }
    watcher.start()
    manager.reconcile()
    render()

    let timer = Timer(timeInterval: 1, repeats: true) { [weak self] _ in
      Task { @MainActor in self?.render() }
    }
    RunLoop.main.add(timer, forMode: .common)
    refreshTimer = timer
  }

  func applicationWillTerminate(_ notification: Notification) {
    watcher.stop()
  }

  func menuWillOpen(_ menu: NSMenu) {
    render()
  }

  private func render() {
    let state = manager.state
    status.button?.title = switch state {
    case .ready: "VIM"
    case .settling: "VIM …"
    case .busy: "VIM …"
    case .failed, .needsSetup, .stale, .waitingForQuit: "VIM !"
    }

    menu.removeAllItems()
    let summary = NSMenuItem(title: state.title, action: nil, keyEquivalent: "")
    summary.isEnabled = false
    menu.addItem(summary)
    menu.addItem(detail(
      "Accessibility", manager.accessibilityGranted ? "Granted" : "Required"
    ))
    menu.addItem(detail(
      "Karabiner", manager.rulesInstalled ? "Installed" : "Not installed"
    ))
    menu.addItem(detail(
      "Codex Vim",
      manager.targetCurrent
        ? "Current · build \(manager.sourceVersion ?? "?")"
        : manager.targetInstalled ? "Update required" : "Not installed"
    ))
    menu.addItem(.separator())

    let setup = item("Setup Everything", #selector(setupEverything))
    setup.isEnabled = !manager.isBusy
    menu.addItem(setup)
    let install = item(
      manager.targetInstalled ? "Rebuild Codex Vim" : "Build Codex Vim",
      #selector(installCodex)
    )
    install.isEnabled = !manager.isBusy && manager.sourceVersion != nil
    menu.addItem(install)
    menu.addItem(item(
      manager.rulesInstalled ? "Refresh Karabiner Rules" : "Install Karabiner Rules",
      #selector(installRules)
    ))

    let access = item("Accessibility Settings…", #selector(openAccessibility))
    menu.addItem(access)
    let request = item("Request Accessibility Access…", #selector(requestAccessibility))
    request.isEnabled = !manager.accessibilityGranted
    menu.addItem(request)
    let open = item("Open Codex Vim", #selector(openCodex))
    open.isEnabled = manager.targetInstalled
    menu.addItem(open)
    menu.addItem(.separator())

    let auto = item("Rebuild after Codex updates", #selector(toggleAutoUpdate))
    auto.state = manager.autoUpdate ? .on : .off
    menu.addItem(auto)
    let login = item("Start at Login", #selector(toggleLaunchAtLogin))
    login.state = manager.launchAtLogin ? .on : .off
    menu.addItem(login)
    menu.addItem(item("Open Logs", #selector(openLogs)))

    let remove = NSMenuItem(title: "Remove", action: nil, keyEquivalent: "")
    let removeMenu = NSMenu()
    removeMenu.addItem(item("Remove Codex Vim…", #selector(removeCodex)))
    removeMenu.addItem(item("Remove Karabiner Rules…", #selector(removeRules)))
    remove.submenu = removeMenu
    menu.addItem(remove)
    menu.addItem(.separator())
    menu.addItem(item("Quit Codex Vim Focus", #selector(quit)))
  }

  private func detail(_ name: String, _ value: String) -> NSMenuItem {
    let item = NSMenuItem(title: "\(name) · \(value)", action: nil, keyEquivalent: "")
    item.isEnabled = false
    item.indentationLevel = 1
    return item
  }

  private func item(_ title: String, _ action: Selector) -> NSMenuItem {
    let item = NSMenuItem(title: title, action: action, keyEquivalent: "")
    item.target = self
    return item
  }

  @objc private func setupEverything() { manager.setupEverything() }
  @objc private func installCodex() { manager.installCodex() }
  @objc private func installRules() {
    do { try manager.installRules() }
    catch { show(error) }
  }
  @objc private func openAccessibility() { manager.openAccessibility() }
  @objc private func requestAccessibility() { manager.requestAccessibility() }
  @objc private func openCodex() { manager.openCodex() }
  @objc private func toggleAutoUpdate() {
    manager.autoUpdate.toggle()
    manager.reconcile()
  }
  @objc private func toggleLaunchAtLogin() {
    do { try manager.setLaunchAtLogin(!manager.launchAtLogin) }
    catch { show(error) }
  }
  @objc private func openLogs() {
    NSWorkspace.shared.open(manager.log.deletingLastPathComponent())
  }
  @objc private func removeCodex() {
    guard confirm("Move Codex Vim to the Trash?") else { return }
    manager.removeCodex()
  }
  @objc private func removeRules() {
    guard confirm("Remove Codex Vim rules from Karabiner?") else { return }
    do { try manager.removeRules() }
    catch { show(error) }
  }
  @objc private func quit() { NSApp.terminate(nil) }

  private func confirm(_ message: String) -> Bool {
    let alert = NSAlert()
    alert.messageText = message
    alert.addButton(withTitle: "Remove")
    alert.addButton(withTitle: "Cancel")
    NSApp.activate(ignoringOtherApps: true)
    return alert.runModal() == .alertFirstButtonReturn
  }

  private func show(_ error: Error) {
    let alert = NSAlert(error: error)
    NSApp.activate(ignoringOtherApps: true)
    alert.runModal()
  }
}
