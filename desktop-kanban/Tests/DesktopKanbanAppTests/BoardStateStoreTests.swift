import XCTest
import Combine
@testable import DesktopKanbanApp

@MainActor
final class BoardStateStoreTests: XCTestCase {
    func testImportRejectsItemsOutsideDesktopRoot() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        let desktop = root.appendingPathComponent("Desktop", isDirectory: true)
        try FileManager.default.createDirectory(at: desktop, withIntermediateDirectories: true)
        let externalFile = root.appendingPathComponent("Elsewhere.txt")
        try Data("hello".utf8).write(to: externalFile)

        let storageURL = root.appendingPathComponent("state.json")
        let store = BoardStateStore(storageURL: storageURL, desktopDirectory: desktop)

        XCTAssertThrowsError(try store.importDesktopItems(urls: [externalFile]))
    }

    func testBookmarkResolutionTracksCurrentURL() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        let desktop = root.appendingPathComponent("Desktop", isDirectory: true)
        try FileManager.default.createDirectory(at: desktop, withIntermediateDirectories: true)
        let fileURL = desktop.appendingPathComponent("Sample.txt")
        try Data("hello".utf8).write(to: fileURL)

        let storageURL = root.appendingPathComponent("state.json")
        let store = BoardStateStore(storageURL: storageURL, desktopDirectory: desktop)
        try store.importDesktopItems(urls: [fileURL])

        let references = store.trackedReferences()

        XCTAssertEqual(references.count, 1)
        XCTAssertEqual(references[0].url.standardizedFileURL, fileURL.standardizedFileURL)
    }

    func testCompleteAndUnmanageRecordsDoneTransition() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        let desktop = root.appendingPathComponent("Desktop", isDirectory: true)
        try FileManager.default.createDirectory(at: desktop, withIntermediateDirectories: true)
        let fileURL = desktop.appendingPathComponent("Task.txt")
        try Data("hello".utf8).write(to: fileURL)

        let storageURL = root.appendingPathComponent("state.json")
        let store = BoardStateStore(storageURL: storageURL, desktopDirectory: desktop)
        try store.importDesktopItems(urls: [fileURL])

        let itemID = try XCTUnwrap(store.items.first?.id)
        let classifier = ColumnClassifier(screenSize: .init(width: 1440, height: 900))
        let workingPoint = classifier.nextAnchor(for: .doing, occupied: [])
        let restoredPoint = classifier.nextReleaseAnchor(occupied: [])

        store.assignItem(itemID, toColumn: .doing, position: workingPoint, source: .board)
        store.completeAndUnmanageItem(itemID, restoredPosition: restoredPoint, source: .board)

        XCTAssertEqual(store.history.count, 2)
        XCTAssertEqual(store.history.first?.toColumn, .done)
        XCTAssertTrue(store.items.isEmpty)
    }

    func testSeedImportedSnapshotsStoresOriginalDesktopPosition() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        let desktop = root.appendingPathComponent("Desktop", isDirectory: true)
        try FileManager.default.createDirectory(at: desktop, withIntermediateDirectories: true)
        let fileURL = desktop.appendingPathComponent("Task.txt")
        try Data("hello".utf8).write(to: fileURL)

        let storageURL = root.appendingPathComponent("state.json")
        let store = BoardStateStore(storageURL: storageURL, desktopDirectory: desktop)
        let ids = try store.importDesktopItems(urls: [fileURL])
        let snapshot = DesktopItemSnapshot(
            id: try XCTUnwrap(ids.first),
            resolvedURL: fileURL,
            displayName: "Task.txt",
            position: DesktopPoint(x: 444, y: 388),
            isMissing: false
        )

        store.seedImportedSnapshots([snapshot])

        XCTAssertEqual(store.items.first?.originalDesktopPosition, DesktopPoint(x: 444, y: 388))
        XCTAssertEqual(store.items.first?.lastKnownPosition, DesktopPoint(x: 444, y: 388))
    }

    func testSeedImportedSnapshotsPreservesStagedBoardPosition() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        let desktop = root.appendingPathComponent("Desktop", isDirectory: true)
        try FileManager.default.createDirectory(at: desktop, withIntermediateDirectories: true)
        let fileURL = desktop.appendingPathComponent("Task.txt")
        try Data("hello".utf8).write(to: fileURL)

        let storageURL = root.appendingPathComponent("state.json")
        let store = BoardStateStore(storageURL: storageURL, desktopDirectory: desktop)
        let ids = try store.importDesktopItems(urls: [fileURL])
        let itemID = try XCTUnwrap(ids.first)
        let classifier = ColumnClassifier(screenSize: .init(width: 1440, height: 900))
        let stagedPosition = classifier.nextAnchor(for: .next, occupied: [])

        store.stageImportedItem(itemID, toColumn: .next, position: stagedPosition)
        store.seedImportedSnapshots([
            DesktopItemSnapshot(
                id: itemID,
                resolvedURL: fileURL,
                displayName: "Task.txt",
                position: DesktopPoint(x: 444, y: 388),
                isMissing: false
            ),
        ])

        XCTAssertEqual(store.items.first?.originalDesktopPosition, DesktopPoint(x: 444, y: 388))
        XCTAssertEqual(store.items.first?.lastKnownPosition, stagedPosition)
        XCTAssertNotNil(store.items.first?.pendingPlacementAt)
    }

    func testFinderMoveOutsideBoardUnmanagesStickyItem() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        let desktop = root.appendingPathComponent("Desktop", isDirectory: true)
        try FileManager.default.createDirectory(at: desktop, withIntermediateDirectories: true)
        let fileURL = desktop.appendingPathComponent("Task.txt")
        try Data("hello".utf8).write(to: fileURL)

        let storageURL = root.appendingPathComponent("state.json")
        let store = BoardStateStore(storageURL: storageURL, desktopDirectory: desktop)
        let ids = try store.importDesktopItems(urls: [fileURL])
        let itemID = try XCTUnwrap(ids.first)
        store.seedImportedSnapshots([
            DesktopItemSnapshot(
                id: itemID,
                resolvedURL: fileURL,
                displayName: "Task.txt",
                position: DesktopPoint(x: 500, y: 480),
                isMissing: false
            ),
        ])

        let classifier = ColumnClassifier(screenSize: .init(width: 1440, height: 900))
        store.assignItem(itemID, toColumn: .doing, position: classifier.nextAnchor(for: .doing, occupied: []))

        store.reconcileSnapshots([
            DesktopItemSnapshot(
                id: itemID,
                resolvedURL: fileURL,
                displayName: "Task.txt",
                position: DesktopPoint(x: 520, y: 420),
                isMissing: false
            ),
        ], using: classifier, source: .finder)

        XCTAssertTrue(store.items.isEmpty)
    }

    func testPendingPlacementOutsideBoardIsNotUnmanagedDuringReconcile() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        let desktop = root.appendingPathComponent("Desktop", isDirectory: true)
        try FileManager.default.createDirectory(at: desktop, withIntermediateDirectories: true)
        let fileURL = desktop.appendingPathComponent("Task.txt")
        try Data("hello".utf8).write(to: fileURL)

        let storageURL = root.appendingPathComponent("state.json")
        let store = BoardStateStore(storageURL: storageURL, desktopDirectory: desktop)
        let ids = try store.importDesktopItems(urls: [fileURL])
        let itemID = try XCTUnwrap(ids.first)
        let classifier = ColumnClassifier(screenSize: .init(width: 1440, height: 900))
        let stagedPosition = classifier.nextAnchor(for: .doing, occupied: [])

        store.stageImportedItem(itemID, toColumn: .doing, position: stagedPosition)
        store.reconcileSnapshots([
            DesktopItemSnapshot(
                id: itemID,
                resolvedURL: fileURL,
                displayName: "Task.txt",
                position: DesktopPoint(x: 444, y: 520),
                isMissing: false
            ),
        ], using: classifier, source: .finder)

        XCTAssertEqual(store.items.count, 1)
        XCTAssertEqual(store.items.first?.column, .doing)
        XCTAssertEqual(store.items.first?.lastKnownPosition, stagedPosition)
    }

    func testPendingBoardSyncOutsideBoardIsNotUnmanagedDuringReconcile() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        let desktop = root.appendingPathComponent("Desktop", isDirectory: true)
        try FileManager.default.createDirectory(at: desktop, withIntermediateDirectories: true)
        let fileURL = desktop.appendingPathComponent("Task.txt")
        try Data("hello".utf8).write(to: fileURL)

        let storageURL = root.appendingPathComponent("state.json")
        let store = BoardStateStore(storageURL: storageURL, desktopDirectory: desktop)
        let ids = try store.importDesktopItems(urls: [fileURL])
        let itemID = try XCTUnwrap(ids.first)
        let classifier = ColumnClassifier(screenSize: .init(width: 1440, height: 900))
        let originalPosition = classifier.nextAnchor(for: .inbox, occupied: [])

        store.assignItem(itemID, toColumn: .inbox, position: originalPosition)
        store.translateManagedItems(by: CGSize(width: 220, height: 0), persist: false)

        let shiftedClassifier = ColumnClassifier(
            screenSize: .init(width: 1440, height: 900),
            boardOrigin: CGPoint(
                x: classifier.boardFrame.origin.x + 220,
                y: classifier.boardFrame.origin.y
            )
        )

        store.reconcileSnapshots([
            DesktopItemSnapshot(
                id: itemID,
                resolvedURL: fileURL,
                displayName: "Task.txt",
                position: originalPosition,
                isMissing: false
            ),
        ], using: shiftedClassifier, source: .finder)

        XCTAssertEqual(store.items.count, 1)
        XCTAssertEqual(store.items.first?.column, .inbox)
        XCTAssertEqual(store.items.first?.pendingBoardSyncAt != nil, true)
    }

    func testAssignItemPublishesChangeForInPlaceMutation() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        let desktop = root.appendingPathComponent("Desktop", isDirectory: true)
        try FileManager.default.createDirectory(at: desktop, withIntermediateDirectories: true)
        let fileURL = desktop.appendingPathComponent("Task.txt")
        try Data("hello".utf8).write(to: fileURL)

        let storageURL = root.appendingPathComponent("state.json")
        let store = BoardStateStore(storageURL: storageURL, desktopDirectory: desktop)
        let ids = try store.importDesktopItems(urls: [fileURL])
        let itemID = try XCTUnwrap(ids.first)
        let classifier = ColumnClassifier(screenSize: .init(width: 1440, height: 900))
        let target = classifier.nextAnchor(for: .next, occupied: [])

        var emissionCount = 0
        let cancellable = store.objectWillChange.sink {
            emissionCount += 1
        }

        store.assignItem(itemID, toColumn: .next, position: target)
        withExtendedLifetime(cancellable) {}

        XCTAssertGreaterThan(emissionCount, 0)
        XCTAssertEqual(store.items.first?.column, .next)
        XCTAssertEqual(store.items.first?.lastKnownPosition, target)
    }
}
