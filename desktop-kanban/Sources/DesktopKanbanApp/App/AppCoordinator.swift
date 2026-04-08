import AppKit
import Combine
import Foundation

@MainActor
final class AppCoordinator: ObservableObject {
    static let shared = AppCoordinator()

    @Published private(set) var desktopSettings: DesktopSettings = .default
    @Published private(set) var lastSyncAt: Date?
    @Published private(set) var lastError: String?

    let store: BoardStateStore
    var openHistoryWindowHandler: (() -> Void)?

    private let bridge: FinderDesktopBridge
    private let monitor: DesktopChangeMonitor
    private let desktopURL = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Desktop", isDirectory: true)
    private let boardOriginDefaultsKey = "DesktopKanban.boardOrigin"

    private var overlayController: OverlayWindowController?
    private var hasStarted = false
    private var refreshWorkItem: DispatchWorkItem?
    private var boardMoveSyncWorkItem: DispatchWorkItem?
    private var pollTimer: Timer?
    private var screenObserver: NSObjectProtocol?
    private var storeCancellable: AnyCancellable?
    private var hasRelocatedObscuredDesktopItems = false
    private(set) var boardOrigin: CGPoint?

    private init() {
        let supportDirectory = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first?
            .appendingPathComponent("DesktopKanban", isDirectory: true) ?? FileManager.default.temporaryDirectory
        let storageURL = supportDirectory.appendingPathComponent("board-state.json")

        self.store = BoardStateStore(storageURL: storageURL)
        self.bridge = FinderDesktopBridge()
        self.monitor = DesktopChangeMonitor(fileURL: desktopURL.appendingPathComponent(".DS_Store"))
        self.boardOrigin = Self.loadBoardOrigin(defaultsKey: boardOriginDefaultsKey)

        self.storeCancellable = store.objectWillChange.sink { [weak self] _ in
            self?.objectWillChange.send()
        }
    }

    var bannerText: String? {
        if let lastError {
            return lastError
        }
        if !desktopSettings.allowsManualPlacement {
            return "Finder Desktop is sorted by \(desktopSettings.arrangement.label). Set Sort By to None to let the board move icons."
        }
        return nil
    }

    var managedItems: [ManagedDesktopItem] {
        store.items
    }

    var historyEvents: [HistoryEvent] {
        store.history
    }

    var boardReferenceHeight: CGFloat {
        overlayController?.panelSize.height ?? 180
    }

    var boardClassifier: ColumnClassifier {
        currentClassifier()
    }

    func persistBoardOrigin(_ newOrigin: CGPoint?) {
        boardOrigin = newOrigin
        Self.saveBoardOrigin(newOrigin, defaultsKey: boardOriginDefaultsKey)
    }

    func handleBoardOriginChange(from previousOrigin: CGPoint, to newOrigin: CGPoint) {
        let translation = CGSize(
            width: newOrigin.x - previousOrigin.x,
            height: newOrigin.y - previousOrigin.y
        )
        guard translation != .zero else {
            persistBoardOrigin(newOrigin)
            return
        }

        persistBoardOrigin(newOrigin)
        store.translateManagedItems(by: translation, persist: false)
        scheduleBoardMoveSync()
    }

    func start() {
        guard !hasStarted else {
            return
        }
        hasStarted = true

        NSApp.setActivationPolicy(.accessory)

        let overlayController = OverlayWindowController(coordinator: self)
        overlayController.show()
        self.overlayController = overlayController

        monitor.start { [weak self] in
            Task { @MainActor in
                self?.scheduleRefresh()
            }
        }

        pollTimer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.refreshFromFinder()
            }
        }

        screenObserver = NotificationCenter.default.addObserver(
            forName: NSApplication.didChangeScreenParametersNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor in
                self?.overlayController?.updateFrame()
                self?.scheduleRefresh(delay: 0.15)
            }
        }

        refreshFromFinder()
    }

    func stop() {
        monitor.stop()
        pollTimer?.invalidate()
        pollTimer = nil
        boardMoveSyncWorkItem?.cancel()
        boardMoveSyncWorkItem = nil
        if let screenObserver {
            NotificationCenter.default.removeObserver(screenObserver)
        }
    }

    func items(in column: BoardColumn) -> [ManagedDesktopItem] {
        store.orderedItems(in: column)
    }

    func importItems() {
        let panel = NSOpenPanel()
        panel.directoryURL = desktopURL
        panel.canChooseDirectories = true
        panel.canChooseFiles = true
        panel.allowsMultipleSelection = true
        panel.canCreateDirectories = false
        panel.message = "Select Desktop files or folders to place under board management."

        NSApp.activate(ignoringOtherApps: true)
        if panel.runModal() == .OK {
            importDroppedDesktopItems(panel.urls, into: .inbox)
        }
    }

    func moveItem(id: UUID, to column: BoardColumn, preferredPosition: DesktopPoint? = nil) {
        guard desktopSettings.allowsManualPlacement else {
            return
        }
        guard let reference = store.reference(for: id) else {
            return
        }

        let classifier = currentClassifier()
        let occupiedPositions = store.occupiedPositions(in: column, excluding: id)
        let targetPosition: DesktopPoint
        if let preferredPosition {
            targetPosition = classifier.nearestAnchor(
                for: column,
                near: preferredPosition,
                occupied: occupiedPositions
            )
        } else {
            targetPosition = classifier.nextAnchor(
                for: column,
                occupied: occupiedPositions
            )
        }
        store.assignItem(id, toColumn: column, position: targetPosition, source: .board)

        Task {
            do {
                try await bridge.moveItem(reference: reference, to: targetPosition)
                await MainActor.run {
                    self.lastError = nil
                    self.scheduleRefresh(delay: 0.12)
                }
            } catch {
                await MainActor.run {
                    self.lastError = error.localizedDescription
                    self.refreshFromFinder()
                }
            }
        }
    }

    func importDroppedDesktopItems(_ urls: [URL], into column: BoardColumn) {
        guard desktopSettings.allowsManualPlacement else {
            return
        }

        Task {
            var importedIDs: [UUID] = []
            do {
                importedIDs = try await MainActor.run {
                    try store.importDesktopItems(urls: urls)
                }

                let classifier = await MainActor.run { currentClassifier() }
                await MainActor.run {
                    for itemID in importedIDs {
                        let targetPosition = classifier.nextAnchor(
                            for: column,
                            occupied: store.occupiedPositions(in: column, excluding: itemID)
                        )
                        store.stageImportedItem(itemID, toColumn: column, position: targetPosition, source: .board)
                    }
                }

                let references = await MainActor.run {
                    store.trackedReferences().filter { importedIDs.contains($0.id) }
                }
                let snapshots = try await bridge.fetchManagedItemSnapshots(for: references)
                await MainActor.run {
                    store.seedImportedSnapshots(snapshots)
                }

                for reference in references {
                    guard let targetPosition = await MainActor.run(body: {
                        store.position(for: reference.id)
                    }) else {
                        continue
                    }

                    do {
                        try await bridge.moveItem(reference: reference, to: targetPosition)
                        await MainActor.run {
                            store.clearPendingPlacement(for: reference.id)
                        }
                    } catch {
                        await MainActor.run {
                            store.clearPendingPlacement(for: reference.id)
                            self.lastError = error.localizedDescription
                            self.refreshFromFinder()
                        }
                    }
                }

                await MainActor.run {
                    self.lastError = nil
                    self.scheduleRefresh(delay: 0.12)
                }
            } catch {
                await MainActor.run {
                    for itemID in importedIDs {
                        store.clearPendingPlacement(for: itemID)
                    }
                    self.lastError = error.localizedDescription
                    self.refreshFromFinder()
                }
            }
        }
    }

    func handleStickyDrop(id: UUID, desktopLocation: DesktopPoint) {
        let classifier = currentClassifier()

        guard classifier.isInsideBoardStrip(desktopLocation) else {
            releaseItem(id: id, completed: true)
            return
        }

        let column = classifier.column(for: desktopLocation)
        moveItem(id: id, to: column, preferredPosition: desktopLocation)
    }

    func openItem(_ id: UUID) {
        guard let reference = store.reference(for: id) else {
            return
        }
        NSWorkspace.shared.open(reference.url)
    }

    func refreshFromFinder() {
        Task {
            do {
                let settings = try await bridge.fetchDesktopSettings()
                let references = await MainActor.run { store.trackedReferences() }
                let snapshots = try await bridge.fetchManagedItemSnapshots(for: references)
                let classifier = await MainActor.run { currentClassifier() }
                await MainActor.run {
                    desktopSettings = settings
                    store.reconcileSnapshots(snapshots, using: classifier, source: .finder)
                    lastSyncAt = Date()
                    lastError = nil
                }
                if settings.allowsManualPlacement {
                    await relocateObscuredDesktopItemsIfNeeded()
                }
            } catch {
                await MainActor.run {
                    lastError = error.localizedDescription
                }
            }
        }
    }

    func openHistoryWindow() {
        openHistoryWindowHandler?()
    }

    func quit() {
        NSApp.terminate(nil)
    }

    private func currentClassifier() -> ColumnClassifier {
        overlayController?.boardClassifier ?? ColumnClassifier(screenSize: CGSize(width: 1440, height: 900), boardOrigin: boardOrigin)
    }

    private func releaseItem(id: UUID, completed: Bool) {
        guard let reference = store.reference(for: id) else {
            return
        }
        let classifier = currentClassifier()
        guard let restorePosition = store.restorePosition(for: id, using: classifier) else {
            return
        }

        Task {
            do {
                try await bridge.moveItem(reference: reference, to: restorePosition)
                await MainActor.run {
                    if completed {
                        store.completeAndUnmanageItem(id, restoredPosition: restorePosition, source: .board)
                    } else {
                        store.unmanageItem(id)
                    }
                    self.lastError = nil
                    self.scheduleRefresh(delay: 0.12)
                }
            } catch {
                await MainActor.run {
                    self.lastError = error.localizedDescription
                }
            }
        }
    }

    private func scheduleRefresh(delay: TimeInterval = 0.35) {
        refreshWorkItem?.cancel()
        let workItem = DispatchWorkItem { [weak self] in
            self?.refreshFromFinder()
        }
        refreshWorkItem = workItem
        DispatchQueue.main.asyncAfter(deadline: .now() + delay, execute: workItem)
    }

    private func scheduleBoardMoveSync(delay: TimeInterval = 0.16) {
        boardMoveSyncWorkItem?.cancel()
        let workItem = DispatchWorkItem { [weak self] in
            self?.syncManagedItemsAfterBoardMove()
        }
        boardMoveSyncWorkItem = workItem
        DispatchQueue.main.asyncAfter(deadline: .now() + delay, execute: workItem)
    }

    private func syncManagedItemsAfterBoardMove() {
        guard desktopSettings.allowsManualPlacement else {
            return
        }

        let references = store.trackedReferences()
        let targets = references.compactMap { reference in
            store.position(for: reference.id).map { (reference, $0) }
        }
        guard !targets.isEmpty else {
            return
        }

        Task {
            do {
                for (reference, targetPosition) in targets {
                    try await bridge.moveItem(reference: reference, to: targetPosition)
                }
                await MainActor.run {
                    self.store.clearPendingBoardSync()
                    self.lastError = nil
                    self.scheduleRefresh(delay: 0.12)
                }
            } catch {
                await MainActor.run {
                    self.store.clearPendingBoardSync()
                    self.lastError = error.localizedDescription
                    self.refreshFromFinder()
                }
            }
        }
    }

    private func relocateObscuredDesktopItemsIfNeeded() async {
        guard !hasRelocatedObscuredDesktopItems else {
            return
        }

        do {
            let trackedURLs = await MainActor.run {
                Set(store.trackedReferences().map { $0.url.standardizedFileURL })
            }
            let classifier = await MainActor.run { currentClassifier() }
            let desktopItems = try await bridge.fetchDesktopInventory()

            let candidates = desktopItems
                .filter { !trackedURLs.contains($0.resolvedURL.standardizedFileURL) }
                .filter { classifier.isInsideBoardStrip($0.position) }
                .sorted {
                    if $0.position.y == $1.position.y {
                        return $0.position.x < $1.position.x
                    }
                    return $0.position.y < $1.position.y
                }

            guard !candidates.isEmpty else {
                hasRelocatedObscuredDesktopItems = true
                return
            }

            var occupied = desktopItems
                .filter { item in
                    !candidates.contains(where: { $0.resolvedURL.standardizedFileURL == item.resolvedURL.standardizedFileURL })
                }
                .map(\.position)

            for item in candidates {
                let target = classifier.nextReleaseAnchor(occupied: occupied)
                try await bridge.moveItem(
                    reference: DesktopItemReference(
                        id: UUID(),
                        url: item.resolvedURL,
                        fallbackName: item.displayName
                    ),
                    to: target
                )
                occupied.append(target)
            }

            await MainActor.run {
                self.hasRelocatedObscuredDesktopItems = true
                self.scheduleRefresh(delay: 0.18)
            }
        } catch {
            await MainActor.run {
                self.hasRelocatedObscuredDesktopItems = false
                self.lastError = error.localizedDescription
            }
        }
    }

    private static func loadBoardOrigin(defaultsKey: String) -> CGPoint? {
        guard
            let value = UserDefaults.standard.dictionary(forKey: defaultsKey),
            let x = value["x"] as? Double,
            let y = value["y"] as? Double
        else {
            return nil
        }
        return CGPoint(x: x, y: y)
    }

    private static func saveBoardOrigin(_ origin: CGPoint?, defaultsKey: String) {
        guard let origin else {
            UserDefaults.standard.removeObject(forKey: defaultsKey)
            return
        }
        UserDefaults.standard.set([
            "x": origin.x,
            "y": origin.y,
        ], forKey: defaultsKey)
    }
}
