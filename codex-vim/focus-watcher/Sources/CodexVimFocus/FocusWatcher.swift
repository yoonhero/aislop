import AppKit
import ApplicationServices

private let focusVariable = "aislop_codex_vim_textarea"
private let rightVariable = "aislop_codex_vim_right_in_line"

private func attribute(_ element: AXUIElement, _ name: String) -> CFTypeRef? {
  var value: CFTypeRef?
  return AXUIElementCopyAttributeValue(element, name as CFString, &value) == .success
    ? value : nil
}

private func text(_ element: AXUIElement, _ name: String) -> String? {
  attribute(element, name) as? String
}

private func range(_ element: AXUIElement) -> CFRange? {
  guard
    let raw = attribute(element, kAXSelectedTextRangeAttribute),
    CFGetTypeID(raw) == AXValueGetTypeID()
  else { return nil }
  var result = CFRange()
  return AXValueGetValue(unsafeBitCast(raw, to: AXValue.self), .cfRange, &result)
    ? result : nil
}

final class FocusWatcher {
  private let karabiner: URL?
  private var last = (focus: false, right: false)
  private var timer: Timer?

  init(karabiner: URL?) {
    self.karabiner = karabiner
  }

  func start() {
    let timer = Timer(timeInterval: 0.05, repeats: true) { [weak self] _ in
      self?.refresh()
    }
    RunLoop.main.add(timer, forMode: .common)
    self.timer = timer
    refresh()
  }

  func stop() {
    timer?.invalidate()
    publish(false, false)
  }

  private func refresh() {
    guard
      AXIsProcessTrusted(),
      let app = NSWorkspace.shared.frontmostApplication,
      app.bundleIdentifier == "com.openai.codex",
      let raw = attribute(AXUIElementCreateSystemWide(), kAXFocusedUIElementAttribute),
      CFGetTypeID(raw) == AXUIElementGetTypeID()
    else { return publish(false, false) }

    let element = unsafeBitCast(raw, to: AXUIElement.self)
    var pid: pid_t = 0
    guard
      AXUIElementGetPid(element, &pid) == .success,
      pid == app.processIdentifier,
      text(element, kAXRoleAttribute) == (kAXTextAreaRole as String)
    else { return publish(false, false) }

    publish(true, canMoveRightWithinLine(element))
  }

  private func canMoveRightWithinLine(_ element: AXUIElement) -> Bool {
    guard let caret = range(element), caret.length == 0 else { return false }
    func line(_ index: Int) -> Int? {
      var raw: CFTypeRef?
      guard
        AXUIElementCopyParameterizedAttributeValue(
          element, "AXLineForIndex" as CFString, NSNumber(value: index), &raw
        ) == .success
      else { return nil }
      return (raw as? NSNumber)?.intValue
    }
    guard let current = line(caret.location) else { return false }
    return line(caret.location + 1) == current
  }

  private func publish(_ focus: Bool, _ right: Bool) {
    guard (focus, right) != last else { return }
    last = (focus, right)
    guard let karabiner else { return }
    let json = """
    {"\(focusVariable)":\(focus ? 1 : 0),"\(rightVariable)":\(right ? 1 : 0)}
    """
    let process = Process()
    process.executableURL = karabiner
    process.arguments = ["--set-variables", json]
    process.standardOutput = FileHandle.nullDevice
    process.standardError = FileHandle.nullDevice
    try? process.run()
  }
}
