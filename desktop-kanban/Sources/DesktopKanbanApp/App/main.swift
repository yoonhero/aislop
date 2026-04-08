import AppKit
import SwiftUI

@MainActor
final class DesktopKanbanApplicationDelegate: NSObject, NSApplicationDelegate, NSMenuDelegate, NSWindowDelegate {
    private let coordinator = AppCoordinator.shared
    private var statusItem: NSStatusItem?
    private var historyWindow: NSWindow?

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.accessory)
        coordinator.openHistoryWindowHandler = { [weak self] in
            self?.showHistoryWindow()
        }
        coordinator.start()
        installStatusItem()
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        false
    }

    func menuNeedsUpdate(_ menu: NSMenu) {
        rebuildMenu(menu)
    }

    @objc private func importItems(_ sender: Any?) {
        coordinator.importItems()
        updateStatusButton()
    }

    @objc private func refreshFromFinder(_ sender: Any?) {
        coordinator.refreshFromFinder()
    }

    @objc private func openHistory(_ sender: Any?) {
        showHistoryWindow()
    }

    @objc private func quit(_ sender: Any?) {
        coordinator.quit()
    }

    func windowWillClose(_ notification: Notification) {
        if let window = notification.object as? NSWindow, window == historyWindow {
            historyWindow = nil
        }
    }

    private func installStatusItem() {
        let item = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        item.button?.imagePosition = .imageLeading
        item.menu = NSMenu()
        item.menu?.delegate = self
        statusItem = item
        updateStatusButton()
        if let menu = item.menu {
            rebuildMenu(menu)
        }
    }

    private func updateStatusButton() {
        let button = statusItem?.button
        button?.title = "Kanban"
        button?.image = NSImage(
            systemSymbolName: "square.grid.2x2",
            accessibilityDescription: "Desktop Kanban"
        )
    }

    private func rebuildMenu(_ menu: NSMenu) {
        menu.removeAllItems()

        let header = NSMenuItem(title: "Desktop Kanban", action: nil, keyEquivalent: "")
        header.isEnabled = false
        menu.addItem(header)

        let summary = NSMenuItem(title: summaryText(), action: nil, keyEquivalent: "")
        summary.isEnabled = false
        menu.addItem(summary)
        menu.addItem(.separator())

        let importItem = NSMenuItem(title: "Import Desktop Items…", action: #selector(importItems(_:)), keyEquivalent: "")
        importItem.target = self
        menu.addItem(importItem)

        let refresh = NSMenuItem(title: "Refresh From Finder", action: #selector(refreshFromFinder(_:)), keyEquivalent: "r")
        refresh.target = self
        menu.addItem(refresh)

        let history = NSMenuItem(title: "Open History", action: #selector(openHistory(_:)), keyEquivalent: "")
        history.target = self
        menu.addItem(history)

        if let banner = coordinator.bannerText {
            menu.addItem(.separator())
            let warning = NSMenuItem(title: banner, action: nil, keyEquivalent: "")
            warning.isEnabled = false
            menu.addItem(warning)
        }

        menu.addItem(.separator())
        let quit = NSMenuItem(title: "Quit", action: #selector(quit(_:)), keyEquivalent: "q")
        quit.target = self
        menu.addItem(quit)
    }

    private func summaryText() -> String {
        let counts = BoardColumn.boardLanes
            .map { "\($0.title.prefix(1)):\(coordinator.items(in: $0).count)" }
            .joined(separator: "  ")
        return coordinator.lastSyncAt.map { "\(counts)  •  \($0.formatted(date: .omitted, time: .shortened))" } ?? counts
    }

    private func showHistoryWindow() {
        if let historyWindow {
            historyWindow.makeKeyAndOrderFront(nil)
            NSApp.activate(ignoringOtherApps: true)
            return
        }

        let controller = NSHostingController(
            rootView: SettingsView()
                .environmentObject(coordinator)
        )
        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 860, height: 560),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.center()
        window.title = "Desktop Kanban"
        window.isReleasedWhenClosed = false
        window.delegate = self
        window.contentViewController = controller
        historyWindow = window

        NSApp.activate(ignoringOtherApps: true)
        window.makeKeyAndOrderFront(nil)
    }
}

let app = NSApplication.shared
let delegate = DesktopKanbanApplicationDelegate()
app.delegate = delegate
app.run()
