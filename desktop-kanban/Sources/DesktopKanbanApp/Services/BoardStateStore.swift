import Foundation

enum BoardStateError: LocalizedError {
    case unsupportedItem(URL)
    case noDesktopItemsSelected

    var errorDescription: String? {
        switch self {
        case .unsupportedItem(let url):
            return "\(url.lastPathComponent) is not a top-level Desktop item."
        case .noDesktopItemsSelected:
            return "Select one or more Desktop files or folders to manage."
        }
    }
}

@MainActor
final class BoardStateStore: ObservableObject {
    @Published private(set) var items: [ManagedDesktopItem] = []
    @Published private(set) var history: [HistoryEvent] = []

    let storageURL: URL
    let desktopDirectory: URL

    private struct PersistedState: Codable {
        var items: [ManagedDesktopItem]
        var history: [HistoryEvent]
    }

    init(storageURL: URL, desktopDirectory: URL = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Desktop", isDirectory: true)) {
        self.storageURL = storageURL
        self.desktopDirectory = desktopDirectory.standardizedFileURL
        load()
    }

    @discardableResult
    func importDesktopItems(urls: [URL]) throws -> [UUID] {
        let normalizedDesktop = desktopDirectory.standardizedFileURL
        let normalizedURLs = urls.map(\.standardizedFileURL)
        guard !normalizedURLs.isEmpty else {
            throw BoardStateError.noDesktopItemsSelected
        }

        var importedIDs: [UUID] = []
        var importedAny = false
        for url in normalizedURLs {
            guard url.deletingLastPathComponent() == normalizedDesktop else {
                throw BoardStateError.unsupportedItem(url)
            }

            if let existing = items.first(where: { $0.resolvedURL.standardizedFileURL == url }) {
                importedIDs.append(existing.id)
                continue
            }

            let bookmark = try url.bookmarkData(
                options: .minimalBookmark,
                includingResourceValuesForKeys: nil,
                relativeTo: nil
            )
            let itemID = UUID()
            items.append(
                ManagedDesktopItem(
                    id: itemID,
                    bookmarkData: bookmark,
                    resolvedURL: url,
                    displayName: url.lastPathComponent,
                    originalDesktopPosition: nil,
                    lastKnownPosition: .zero,
                    column: .inbox,
                    completedAt: nil,
                    pendingPlacementAt: nil,
                    pendingBoardSyncAt: nil,
                    isMissing: false
                )
            )
            importedIDs.append(itemID)
            importedAny = true
        }

        if importedAny {
            objectWillChange.send()
            save()
        }
        return importedIDs
    }

    func trackedReferences() -> [DesktopItemReference] {
        var didChange = false
        var references: [DesktopItemReference] = []

        for index in items.indices {
            var staleBookmark = false
            let fallbackURL = items[index].resolvedURL.standardizedFileURL
            let resolvedURL: URL

            if let refreshedURL = try? URL(
                resolvingBookmarkData: items[index].bookmarkData,
                options: [.withoutUI, .withoutMounting],
                relativeTo: nil,
                bookmarkDataIsStale: &staleBookmark
            ).standardizedFileURL {
                resolvedURL = refreshedURL
                if staleBookmark, let refreshedBookmark = try? refreshedURL.bookmarkData(
                    options: .minimalBookmark,
                    includingResourceValuesForKeys: nil,
                    relativeTo: nil
                ) {
                    items[index].bookmarkData = refreshedBookmark
                    didChange = true
                }
            } else {
                resolvedURL = fallbackURL
            }

            if items[index].resolvedURL.standardizedFileURL != resolvedURL {
                items[index].resolvedURL = resolvedURL
                items[index].displayName = resolvedURL.lastPathComponent
                didChange = true
            }

            references.append(
                DesktopItemReference(
                    id: items[index].id,
                    url: resolvedURL,
                    fallbackName: items[index].displayName
                )
            )
        }

        if didChange {
            objectWillChange.send()
            save()
        }

        return references
    }

    func reference(for id: UUID) -> DesktopItemReference? {
        trackedReferences().first(where: { $0.id == id })
    }

    func orderedItems(in column: BoardColumn) -> [ManagedDesktopItem] {
        items
            .filter { $0.column == column }
            .sorted { lhs, rhs in
                switch (lhs.isMissing, rhs.isMissing) {
                case (false, true):
                    return true
                case (true, false):
                    return false
                default:
                    if lhs.lastKnownPosition.y == rhs.lastKnownPosition.y {
                        return lhs.displayName.localizedCaseInsensitiveCompare(rhs.displayName) == .orderedAscending
                    }
                    return lhs.lastKnownPosition.y < rhs.lastKnownPosition.y
                }
            }
    }

    func occupiedPositions(in column: BoardColumn, excluding excludedID: UUID? = nil) -> [DesktopPoint] {
        items
            .filter { $0.column == column && !$0.isMissing && $0.id != excludedID }
            .map(\.lastKnownPosition)
    }

    func position(for id: UUID) -> DesktopPoint? {
        items.first(where: { $0.id == id })?.lastKnownPosition
    }

    func allOccupiedPositions(excluding excludedID: UUID? = nil) -> [DesktopPoint] {
        items
            .filter { !$0.isMissing && $0.id != excludedID }
            .map(\.lastKnownPosition)
    }

    func seedImportedSnapshots(_ snapshots: [DesktopItemSnapshot]) {
        var didChange = false
        let snapshotsByID = Dictionary(uniqueKeysWithValues: snapshots.map { ($0.id, $0) })

        for index in items.indices {
            guard let snapshot = snapshotsByID[items[index].id] else {
                continue
            }
            if let resolvedURL = snapshot.resolvedURL?.standardizedFileURL, items[index].resolvedURL.standardizedFileURL != resolvedURL {
                items[index].resolvedURL = resolvedURL
                items[index].displayName = resolvedURL.lastPathComponent
                didChange = true
            }
            if let position = snapshot.position {
                if items[index].originalDesktopPosition == nil {
                    items[index].originalDesktopPosition = position
                    didChange = true
                }
                if items[index].pendingPlacementAt == nil, items[index].lastKnownPosition != position {
                    items[index].lastKnownPosition = position
                    didChange = true
                }
            }
        }

        if didChange {
            objectWillChange.send()
            save()
        }
    }

    func reconcileSnapshots(_ snapshots: [DesktopItemSnapshot], using classifier: ColumnClassifier, source: TransitionSource = .finder) {
        var didChange = false
        let snapshotsByID = Dictionary(uniqueKeysWithValues: snapshots.map { ($0.id, $0) })
        var idsToUnmanage: [UUID] = []

        for index in items.indices {
            guard let snapshot = snapshotsByID[items[index].id] else {
                if !items[index].isMissing {
                    items[index].isMissing = true
                    didChange = true
                }
                continue
            }

            if let resolvedURL = snapshot.resolvedURL?.standardizedFileURL, items[index].resolvedURL.standardizedFileURL != resolvedURL {
                items[index].resolvedURL = resolvedURL
                didChange = true
            }

            if items[index].displayName != snapshot.displayName {
                items[index].displayName = snapshot.displayName
                didChange = true
            }

            let isPendingPlacement = items[index].pendingPlacementAt != nil
            let isPendingBoardSync = items[index].pendingBoardSyncAt != nil
            let isPendingMovement = isPendingPlacement || isPendingBoardSync

            if snapshot.isMissing || snapshot.position == nil {
                if isPendingMovement {
                    continue
                }
                if !items[index].isMissing {
                    items[index].isMissing = true
                    didChange = true
                }
                continue
            }

            let position = snapshot.position ?? .zero
            if !classifier.isInsideBoardStrip(position) {
                if items[index].originalDesktopPosition == nil {
                    items[index].originalDesktopPosition = position
                    didChange = true
                }
                if isPendingMovement {
                    continue
                }
                idsToUnmanage.append(items[index].id)
                continue
            }

            let nextColumn = classifier.column(for: position)
            let previousColumn = items[index].column
            let wasMissing = items[index].isMissing

            if items[index].lastKnownPosition != position {
                items[index].lastKnownPosition = position
                didChange = true
            }
            if wasMissing {
                items[index].isMissing = false
                didChange = true
            }
            if isPendingPlacement {
                items[index].pendingPlacementAt = nil
                didChange = true
            }
            if isPendingBoardSync {
                items[index].pendingBoardSyncAt = nil
                didChange = true
            }
            if previousColumn != nextColumn {
                items[index].column = nextColumn
                let completionDate = markCompletedIfNeeded(at: index, destination: nextColumn)
                recordTransition(
                    itemID: items[index].id,
                    itemName: items[index].displayName,
                    from: previousColumn,
                    to: nextColumn,
                    source: source,
                    position: position,
                    completedAt: completionDate
                )
                didChange = true
            }
        }

        if !idsToUnmanage.isEmpty {
            items.removeAll { idsToUnmanage.contains($0.id) }
            didChange = true
        }

        if didChange {
            objectWillChange.send()
            save()
        }
    }

    func assignItem(_ id: UUID, toColumn column: BoardColumn, position: DesktopPoint, source: TransitionSource = .board) {
        guard let index = items.firstIndex(where: { $0.id == id }) else {
            return
        }

        let previousColumn = items[index].column
        let completionDate = markCompletedIfNeeded(at: index, destination: column)
        if previousColumn != column {
            items[index].column = column
            recordTransition(
                itemID: items[index].id,
                itemName: items[index].displayName,
                from: previousColumn,
                to: column,
                source: source,
                position: position,
                completedAt: completionDate
            )
        }

        items[index].lastKnownPosition = position
        items[index].isMissing = false
        items[index].pendingPlacementAt = nil
        items[index].pendingBoardSyncAt = nil
        objectWillChange.send()
        save()
    }

    func stageImportedItem(_ id: UUID, toColumn column: BoardColumn, position: DesktopPoint, source: TransitionSource = .board) {
        guard let index = items.firstIndex(where: { $0.id == id }) else {
            return
        }

        let previousColumn = items[index].column
        if previousColumn != column {
            items[index].column = column
            recordTransition(
                itemID: items[index].id,
                itemName: items[index].displayName,
                from: previousColumn,
                to: column,
                source: source,
                position: position,
                completedAt: nil
            )
        }

        items[index].lastKnownPosition = position
        items[index].isMissing = false
        items[index].pendingPlacementAt = Date()
        items[index].pendingBoardSyncAt = nil
        objectWillChange.send()
        save()
    }

    func clearPendingPlacement(for id: UUID) {
        guard let index = items.firstIndex(where: { $0.id == id }) else {
            return
        }
        guard items[index].pendingPlacementAt != nil else {
            return
        }
        items[index].pendingPlacementAt = nil
        objectWillChange.send()
        save()
    }

    func translateManagedItems(by translation: CGSize, persist: Bool) {
        guard translation != .zero else {
            return
        }

        var didChange = false
        for index in items.indices where !items[index].isMissing {
            items[index].lastKnownPosition = DesktopPoint(
                x: items[index].lastKnownPosition.x + translation.width,
                y: items[index].lastKnownPosition.y + translation.height
            )
            items[index].pendingBoardSyncAt = Date()
            didChange = true
        }

        guard didChange else {
            return
        }

        objectWillChange.send()
        if persist {
            save()
        }
    }

    func persistState() {
        save()
    }

    func clearPendingBoardSync() {
        var didChange = false
        for index in items.indices where items[index].pendingBoardSyncAt != nil {
            items[index].pendingBoardSyncAt = nil
            didChange = true
        }

        guard didChange else {
            return
        }

        objectWillChange.send()
        save()
    }

    func restorePosition(for id: UUID, using classifier: ColumnClassifier) -> DesktopPoint? {
        guard let item = items.first(where: { $0.id == id }) else {
            return nil
        }
        let occupied = allOccupiedPositions(excluding: id)
        if let original = item.originalDesktopPosition, !classifier.isInsideBoardStrip(original) {
            let blocked = occupied.contains { $0.distance(to: original) < 18 }
            if !blocked {
                return original
            }
        }
        return classifier.nextReleaseAnchor(occupied: occupied)
    }

    func unmanageItem(_ id: UUID) {
        let originalCount = items.count
        items.removeAll { $0.id == id }
        guard items.count != originalCount else {
            return
        }
        objectWillChange.send()
        save()
    }

    func completeAndUnmanageItem(_ id: UUID, restoredPosition: DesktopPoint, source: TransitionSource = .board) {
        guard let index = items.firstIndex(where: { $0.id == id }) else {
            return
        }

        let completionDate = items[index].completedAt ?? Date()
        items[index].completedAt = completionDate
        recordTransition(
            itemID: items[index].id,
            itemName: items[index].displayName,
            from: items[index].column,
            to: .done,
            source: source,
            position: restoredPosition,
            completedAt: completionDate
        )
        items.remove(at: index)
        objectWillChange.send()
        save()
    }

    func recordTransition(
        itemID: UUID,
        itemName: String,
        from: BoardColumn,
        to: BoardColumn,
        source: TransitionSource,
        position: DesktopPoint,
        completedAt: Date?
    ) {
        objectWillChange.send()
        history.insert(
            HistoryEvent(
                id: UUID(),
                timestamp: Date(),
                itemID: itemID,
                itemName: itemName,
                fromColumn: from,
                toColumn: to,
                source: source,
                position: position,
                completedAt: completedAt
            ),
            at: 0
        )
        history = Array(history.prefix(400))
    }

    private func markCompletedIfNeeded(at index: Int, destination: BoardColumn) -> Date? {
        guard destination == .done, items[index].completedAt == nil else {
            return nil
        }
        let timestamp = Date()
        items[index].completedAt = timestamp
        return timestamp
    }

    private func load() {
        guard let data = try? Data(contentsOf: storageURL) else {
            items = []
            history = []
            return
        }

        do {
            let state = try JSONDecoder().decode(PersistedState.self, from: data)
            items = state.items
            history = state.history
        } catch {
            items = []
            history = []
        }
    }

    private func save() {
        let state = PersistedState(items: items, history: history)
        do {
            let directory = storageURL.deletingLastPathComponent()
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            let data = try JSONEncoder().encode(state)
            try data.write(to: storageURL, options: [.atomic])
        } catch {
            assertionFailure("Failed to persist board state: \(error)")
        }
    }
}
