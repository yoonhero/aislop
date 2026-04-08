import AppKit
import SwiftUI

private final class DesktopOverlayPanel: NSPanel {
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { true }
}

@MainActor
final class OverlayWindowController: NSObject, NSWindowDelegate {
    private let coordinator: AppCoordinator
    private let panel: DesktopOverlayPanel
    private var desktopFrame: CGRect
    private var classifier: ColumnClassifier
    private var isApplyingFrame = false

    init(coordinator: AppCoordinator) {
        self.coordinator = coordinator

        let screenFrame = NSScreen.main?.frame ?? CGRect(x: 0, y: 0, width: 1440, height: 900)
        self.desktopFrame = screenFrame
        self.classifier = ColumnClassifier(screenSize: screenFrame.size, boardOrigin: coordinator.boardOrigin)
        let panel = DesktopOverlayPanel(
            contentRect: Self.panelFrame(for: screenFrame, classifier: self.classifier),
            styleMask: [.borderless, .nonactivatingPanel],
            backing: .buffered,
            defer: false
        )
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.hasShadow = false
        panel.hidesOnDeactivate = false
        panel.collectionBehavior = [.stationary, .ignoresCycle, .fullScreenAuxiliary]
        panel.level = NSWindow.Level(rawValue: Int(CGWindowLevelForKey(.desktopIconWindow)) + 1)
        panel.ignoresMouseEvents = false
        panel.isMovable = false
        panel.contentView = NSHostingView(
            rootView: BoardOverlayView()
                .environmentObject(coordinator)
        )

        self.panel = panel
        super.init()
        panel.delegate = self
    }

    var screenSize: CGSize {
        desktopFrame.size
    }

    var panelSize: CGSize {
        panel.frame.size
    }

    var boardClassifier: ColumnClassifier {
        classifier
    }

    func show() {
        updateFrame()
        panel.orderFrontRegardless()
    }

    func updateFrame() {
        guard let frame = NSScreen.main?.frame else {
            return
        }
        desktopFrame = frame
        applyClassifier(ColumnClassifier(screenSize: frame.size, boardOrigin: coordinator.boardOrigin), screenFrame: frame)
    }

    func setBoardOrigin(_ origin: CGPoint?) {
        applyClassifier(ColumnClassifier(screenSize: desktopFrame.size, boardOrigin: origin), screenFrame: desktopFrame)
    }

    func windowDidMove(_ notification: Notification) {
        guard !isApplyingFrame else {
            return
        }

        let previousOrigin = classifier.boardFrame.origin
        let rawOrigin = CGPoint(
            x: panel.frame.minX - desktopFrame.minX,
            y: desktopFrame.maxY - panel.frame.maxY
        )
        let updatedClassifier = ColumnClassifier(screenSize: desktopFrame.size, boardOrigin: rawOrigin)
        classifier = updatedClassifier
        let clampedOrigin = updatedClassifier.boardFrame.origin
        coordinator.handleBoardOriginChange(from: previousOrigin, to: clampedOrigin)

        if rawOrigin != clampedOrigin {
            applyClassifier(updatedClassifier, screenFrame: desktopFrame)
        }
    }

    private static func panelFrame(for screenFrame: CGRect, classifier: ColumnClassifier) -> CGRect {
        let boardFrame = classifier.boardFrame
        return CGRect(
            x: screenFrame.minX + boardFrame.minX,
            y: screenFrame.maxY - boardFrame.maxY,
            width: boardFrame.width,
            height: boardFrame.height
        )
    }

    private func applyClassifier(_ nextClassifier: ColumnClassifier, screenFrame: CGRect) {
        classifier = nextClassifier
        coordinator.persistBoardOrigin(nextClassifier.boardFrame.origin)
        isApplyingFrame = true
        panel.setFrame(Self.panelFrame(for: screenFrame, classifier: nextClassifier), display: true)
        isApplyingFrame = false
        panel.orderFrontRegardless()
    }
}
