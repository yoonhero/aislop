import CoreGraphics
import XCTest
@testable import DesktopKanbanApp

final class ColumnClassifierTests: XCTestCase {
    func testColumnClassificationUsesHorizontalBands() {
        let classifier = ColumnClassifier(screenSize: CGSize(width: 1440, height: 900))
        let inboxFrame = classifier.frame(for: .inbox)
        let nextFrame = classifier.frame(for: .next)
        let doingFrame = classifier.frame(for: .doing)

        XCTAssertEqual(classifier.column(for: DesktopPoint(x: inboxFrame.midX, y: inboxFrame.midY)), .inbox)
        XCTAssertEqual(classifier.column(for: DesktopPoint(x: nextFrame.midX, y: nextFrame.midY)), .next)
        XCTAssertEqual(classifier.column(for: DesktopPoint(x: doingFrame.midX, y: doingFrame.midY)), .doing)
        XCTAssertEqual(classifier.column(for: DesktopPoint(x: doingFrame.maxX - 2, y: doingFrame.midY)), .doing)
    }

    func testNextAnchorSkipsOccupiedSlots() {
        let classifier = ColumnClassifier(screenSize: CGSize(width: 1440, height: 900))
        let first = classifier.nextAnchor(for: .inbox, occupied: [])
        let second = classifier.nextAnchor(for: .inbox, occupied: [first])

        XCTAssertNotEqual(first, second)
        XCTAssertGreaterThan(second.x, first.x)
    }

    func testPanelAndDesktopCoordinateConversionRoundTrips() {
        let classifier = ColumnClassifier(screenSize: CGSize(width: 1440, height: 900))
        let target = classifier.nextAnchor(for: .doing, occupied: [])
        let panelPoint = classifier.panelPoint(forDesktopPosition: target)
        let roundTrip = classifier.desktopPoint(forPanelPoint: panelPoint)

        XCTAssertEqual(roundTrip, target)
        XCTAssertEqual(classifier.column(for: roundTrip), .doing)
    }

    func testPanelPointResolvesDropColumn() {
        let classifier = ColumnClassifier(screenSize: CGSize(width: 1440, height: 900))
        let nextAnchor = classifier.nextAnchor(for: .next, occupied: [])
        let panelPoint = classifier.panelPoint(forDesktopPosition: nextAnchor)

        XCTAssertEqual(classifier.columnForPanelPoint(panelPoint), .next)
        XCTAssertNil(classifier.columnForPanelPoint(CGPoint(x: -10, y: 12)))
    }

    func testCustomBoardOriginShiftsBoardFrameAndAnchors() {
        let classifier = ColumnClassifier(
            screenSize: CGSize(width: 1440, height: 900),
            boardOrigin: CGPoint(x: 120, y: 140)
        )

        XCTAssertEqual(classifier.boardFrame.origin.x, 120, accuracy: 0.001)
        XCTAssertEqual(classifier.boardFrame.origin.y, 140, accuracy: 0.001)

        let inboxAnchor = classifier.nextAnchor(for: .inbox, occupied: [])
        XCTAssertGreaterThan(inboxAnchor.x, 120)
        XCTAssertGreaterThan(inboxAnchor.y, 140)
    }

    func testBoardUsesThreeVisibleLanes() {
        let classifier = ColumnClassifier(screenSize: CGSize(width: 1440, height: 900))

        let inboxFrame = classifier.frame(for: .inbox)
        let nextFrame = classifier.frame(for: .next)
        let doingFrame = classifier.frame(for: .doing)

        XCTAssertEqual(inboxFrame.width, nextFrame.width, accuracy: 0.001)
        XCTAssertEqual(nextFrame.width, doingFrame.width, accuracy: 0.001)
        XCTAssertEqual(BoardColumn.boardLanes, [.inbox, .next, .doing])
    }

    func testNearestAnchorPrefersDropLocationWithinLane() {
        let classifier = ColumnClassifier(screenSize: CGSize(width: 1440, height: 900))
        let anchors = classifier.anchors(for: .next, rows: 2)
        let preferred = DesktopPoint(x: anchors[1].x + 6, y: anchors[1].y + 4)

        let resolved = classifier.nearestAnchor(for: .next, near: preferred, occupied: [])

        XCTAssertEqual(resolved, anchors[1])
    }
}
