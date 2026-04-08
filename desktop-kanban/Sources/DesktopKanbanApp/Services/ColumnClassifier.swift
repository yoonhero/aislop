import CoreGraphics
import Foundation

struct ColumnClassifier {
    let screenSize: CGSize
    let boardOrigin: CGPoint?
    let boardTopInset: CGFloat
    let boardWidthRatio: CGFloat
    let boardHeightRatio: CGFloat
    let boardMinWidth: CGFloat
    let boardMaxWidth: CGFloat
    let boardMinHeight: CGFloat
    let boardMaxHeight: CGFloat
    let boardPadding: CGFloat
    let columnSpacing: CGFloat
    let slotXInset: CGFloat
    let slotTopOffset: CGFloat
    let laneSpacing: CGFloat
    let rowSpacing: CGFloat
    let laneCount: Int
    let releaseGap: CGFloat
    let releaseRowSpacing: CGFloat

    init(
        screenSize: CGSize,
        boardOrigin: CGPoint? = nil,
        boardTopInset: CGFloat = 54,
        boardWidthRatio: CGFloat = 0.62,
        boardHeightRatio: CGFloat = 0.40,
        boardMinWidth: CGFloat = 820,
        boardMaxWidth: CGFloat = 1180,
        boardMinHeight: CGFloat = 250,
        boardMaxHeight: CGFloat = 380,
        boardPadding: CGFloat = 28,
        columnSpacing: CGFloat = 18,
        slotXInset: CGFloat = 52,
        slotTopOffset: CGFloat = 86,
        laneSpacing: CGFloat = 104,
        rowSpacing: CGFloat = 70,
        laneCount: Int = 2,
        releaseGap: CGFloat = 56,
        releaseRowSpacing: CGFloat = 72
    ) {
        self.screenSize = screenSize
        self.boardOrigin = boardOrigin
        self.boardTopInset = boardTopInset
        self.boardWidthRatio = boardWidthRatio
        self.boardHeightRatio = boardHeightRatio
        self.boardMinWidth = boardMinWidth
        self.boardMaxWidth = boardMaxWidth
        self.boardMinHeight = boardMinHeight
        self.boardMaxHeight = boardMaxHeight
        self.boardPadding = boardPadding
        self.columnSpacing = columnSpacing
        self.slotXInset = slotXInset
        self.slotTopOffset = slotTopOffset
        self.laneSpacing = laneSpacing
        self.rowSpacing = rowSpacing
        self.laneCount = laneCount
        self.releaseGap = releaseGap
        self.releaseRowSpacing = releaseRowSpacing
    }

    var boardFrame: CGRect {
        let widthCap = max(screenSize.width - 120, 720)
        let heightCap = max(screenSize.height - 160, 220)
        let width = min(max(screenSize.width * boardWidthRatio, boardMinWidth), min(boardMaxWidth, widthCap))
        let height = min(max(screenSize.height * boardHeightRatio, boardMinHeight), min(boardMaxHeight, heightCap))
        let defaultOrigin = CGPoint(
            x: max((screenSize.width - width) / 2, 40),
            y: max(boardTopInset, 28)
        )
        let origin = boardOrigin ?? defaultOrigin
        let clampedOrigin = CGPoint(
            x: min(max(origin.x, 20), max(screenSize.width - width - 20, 20)),
            y: min(max(origin.y, 20), max(screenSize.height - height - 20, 20))
        )
        return CGRect(
            x: clampedOrigin.x,
            y: clampedOrigin.y,
            width: width,
            height: height
        )
    }

    private var usableWidth: CGFloat {
        boardFrame.width - (boardPadding * 2)
    }

    private var baseColumnWidth: CGFloat {
        let laneCount = CGFloat(BoardColumn.boardLanes.count)
        let spacingCount = CGFloat(max(BoardColumn.boardLanes.count - 1, 0))
        return (usableWidth - (columnSpacing * spacingCount)) / laneCount
    }

    func frame(for column: BoardColumn) -> CGRect {
        guard let index = BoardColumn.boardLanes.firstIndex(of: column) else {
            return CGRect(
                x: boardFrame.maxX + columnSpacing,
                y: boardFrame.minY + 18,
                width: 0,
                height: boardFrame.height - 36
            )
        }
        return CGRect(
            x: boardFrame.minX + boardPadding + ((baseColumnWidth + columnSpacing) * CGFloat(index)),
            y: boardFrame.minY + 18,
            width: baseColumnWidth,
            height: boardFrame.height - 36
        )
    }

    func column(for position: DesktopPoint) -> BoardColumn {
        let clampedX = CGFloat(min(max(position.x, Double(boardFrame.minX)), Double(boardFrame.maxX - 1)))
        for column in BoardColumn.boardLanes {
            let columnFrame = frame(for: column)
            if clampedX >= columnFrame.minX, clampedX <= columnFrame.maxX {
                return column
            }
        }
        return BoardColumn.boardLanes.last ?? .doing
    }

    func columnForPanelPoint(_ point: CGPoint) -> BoardColumn? {
        guard point.x >= 0, point.y >= 0, point.x <= boardFrame.width, point.y <= boardFrame.height else {
            return nil
        }
        let desktopPoint = desktopPoint(forPanelPoint: point)
        guard isInsideBoardStrip(desktopPoint) else {
            return nil
        }
        return column(for: desktopPoint)
    }

    func nextAnchor(for column: BoardColumn, occupied: [DesktopPoint]) -> DesktopPoint {
        let slots = anchors(for: column, rows: 4)
        for slot in slots {
            let taken = occupied.contains { $0.distance(to: slot) < 18 }
            if !taken {
                return slot
            }
        }
        return slots.last ?? DesktopPoint(x: Double(frame(for: column).midX), y: Double(frame(for: column).midY))
    }

    func nearestAnchor(for column: BoardColumn, near position: DesktopPoint, occupied: [DesktopPoint]) -> DesktopPoint {
        let slots = anchors(for: column, rows: 4)
            .sorted { lhs, rhs in
                lhs.distance(to: position) < rhs.distance(to: position)
            }

        for slot in slots {
            let taken = occupied.contains { $0.distance(to: slot) < 18 }
            if !taken {
                return slot
            }
        }

        return nextAnchor(for: column, occupied: occupied)
    }

    func anchors(for column: BoardColumn, rows: Int) -> [DesktopPoint] {
        let columnFrame = frame(for: column)
        var anchors: [DesktopPoint] = []
        for row in 0..<rows {
            for lane in 0..<laneCount {
                let x: CGFloat
                let leading = columnFrame.minX + slotXInset
                let trailing = min(columnFrame.maxX - slotXInset, leading + (laneSpacing * CGFloat(laneCount - 1)))
                let step = (trailing - leading) / CGFloat(max(laneCount - 1, 1))
                x = leading + (CGFloat(lane) * step)
                let y = columnFrame.minY + slotTopOffset + (CGFloat(row) * rowSpacing)
                anchors.append(DesktopPoint(x: x, y: y))
            }
        }
        return anchors
    }

    func isInsideBoardStrip(_ position: DesktopPoint) -> Bool {
        boardFrame.contains(position.cgPoint)
    }

    func panelPoint(forDesktopPosition position: DesktopPoint) -> CGPoint {
        CGPoint(x: position.x - boardFrame.minX, y: position.y - boardFrame.minY)
    }

    func desktopPoint(forPanelPoint point: CGPoint) -> DesktopPoint {
        DesktopPoint(x: point.x + boardFrame.minX, y: point.y + boardFrame.minY)
    }

    func nextReleaseAnchor(occupied: [DesktopPoint]) -> DesktopPoint {
        let xStart = boardFrame.minX + 18
        let availableWidth = boardFrame.width - 36
        let columns = max(Int(availableWidth / 92), 5)
        let releaseTop = boardFrame.maxY + releaseGap

        for row in 0..<10 {
            for column in 0..<columns {
                let x = xStart + (CGFloat(column) * 92)
                let y = releaseTop + (CGFloat(row) * releaseRowSpacing)
                let point = DesktopPoint(x: x, y: y)
                let taken = occupied.contains { $0.distance(to: point) < 18 }
                if !taken {
                    return point
                }
            }
        }

        return DesktopPoint(x: xStart, y: releaseTop)
    }
}
