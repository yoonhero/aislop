import XCTest
@testable import DesktopKanbanApp

final class FinderDesktopBridgeTests: XCTestCase {
    func testDesktopSettingsParserReadsArrangeByAndGridSpacing() {
        let plist: [String: Any] = [
            "DesktopViewSettings": [
                "IconViewSettings": [
                    "arrangeBy": "name",
                    "gridSpacing": 64,
                ],
            ],
        ]

        let settings = FinderDesktopBridge.parseDesktopSettings(from: plist)

        XCTAssertEqual(settings.arrangement, .name)
        XCTAssertEqual(settings.gridSpacing, 64)
        XCTAssertFalse(settings.allowsManualPlacement)
    }

    func testSnapshotParserHandlesSuccessAndMissingRows() async throws {
        let bridge = FinderDesktopBridge()
        let unit = String(UnicodeScalar(31))
        let record = String(UnicodeScalar(30))
        let id1 = UUID()
        let id2 = UUID()
        let output = [
            "\(id1.uuidString)\(unit)file:///Users/ysh/Desktop/AWQ.pdf\(unit)AWQ.pdf\(unit)223\(unit)866",
            "\(id2.uuidString)\(unit)__MISSING__\(unit)/Users/ysh/Documents/AWQ.pdf\(unit)-1728\(unit)missing",
        ].joined(separator: record)

        let snapshots = try await bridge.parseSnapshotOutput(output)

        XCTAssertEqual(snapshots.count, 2)
        XCTAssertEqual(snapshots[0].position, DesktopPoint(x: 223, y: 866))
        XCTAssertFalse(snapshots[0].isMissing)
        XCTAssertTrue(snapshots[1].isMissing)
        XCTAssertEqual(snapshots[1].resolvedURL?.path, "/Users/ysh/Documents/AWQ.pdf")
    }

    func testDesktopInventoryParserHandlesRows() async throws {
        let bridge = FinderDesktopBridge()
        let unit = String(UnicodeScalar(31))
        let record = String(UnicodeScalar(30))
        let output = [
            "file:///Users/ysh/Desktop/Folder\(unit)Folder\(unit)412\(unit)188",
            "file:///Users/ysh/Desktop/Task.md\(unit)Task.md\(unit)504\(unit)188",
        ].joined(separator: record)

        let inventory = try await bridge.parseDesktopInventoryOutput(output)

        XCTAssertEqual(inventory.count, 2)
        XCTAssertEqual(inventory[0].resolvedURL.path, "/Users/ysh/Desktop/Folder")
        XCTAssertEqual(inventory[0].position, DesktopPoint(x: 412, y: 188))
        XCTAssertEqual(inventory[1].displayName, "Task.md")
    }
}
