import AppKit
import SwiftUI
import UniformTypeIdentifiers

private func columnTint(_ column: BoardColumn) -> Color {
    switch column {
    case .inbox:
        return Color(red: 0.96, green: 0.71, blue: 0.18)
    case .next:
        return Color(red: 0.93, green: 0.35, blue: 0.56)
    case .doing:
        return Color(red: 0.19, green: 0.62, blue: 0.92)
    case .done:
        return Color(red: 0.45, green: 0.73, blue: 0.35)
    }
}

private let boardFrameColor = Color(red: 0.80, green: 0.84, blue: 0.88)
private let boardShadow = Color.black.opacity(0.11)
private let boardSurface = Color(red: 0.98, green: 0.985, blue: 0.99)
private let boardSurfaceGlow = Color.white
private let boardInk = Color(red: 0.18, green: 0.24, blue: 0.30)
private let boardDryEraseBlue = Color(red: 0.17, green: 0.45, blue: 0.83)
private let boardDryEraseRed = Color(red: 0.88, green: 0.32, blue: 0.36)

private func markerFont(_ size: CGFloat) -> Font {
    .custom("Marker Felt", size: size)
}

private func stableSeed(for string: String) -> Int {
    string.unicodeScalars.reduce(0) { partial, scalar in
        ((partial * 31) + Int(scalar.value)) & 0x7fffffff
    }
}

private func stickyRotation(for item: ManagedDesktopItem) -> Double {
    let angles: [Double] = [-3.0, -1.5, 1.5, 3.0]
    return angles[stableSeed(for: item.id.uuidString) % angles.count]
}

private func loadFileURLs(from providers: [NSItemProvider], completion: @escaping ([URL]) -> Void) -> Bool {
    final class URLBox: @unchecked Sendable {
        private let lock = NSLock()
        private var urls: [URL] = []

        func append(_ url: URL) {
            lock.lock()
            urls.append(url)
            lock.unlock()
        }

        func snapshot() -> [URL] {
            lock.lock()
            defer { lock.unlock() }
            return urls
        }
    }

    let fileProviders = providers.filter { $0.hasItemConformingToTypeIdentifier(UTType.fileURL.identifier) }
    guard !fileProviders.isEmpty else {
        return false
    }

    let group = DispatchGroup()
    let box = URLBox()

    for provider in fileProviders {
        group.enter()
        provider.loadItem(forTypeIdentifier: UTType.fileURL.identifier, options: nil) { item, _ in
            defer { group.leave() }
            let resolvedURL: URL?
            switch item {
            case let data as Data:
                resolvedURL = URL(dataRepresentation: data, relativeTo: nil)
            case let url as URL:
                resolvedURL = url
            case let string as String:
                resolvedURL = URL(string: string)
            default:
                resolvedURL = nil
            }
            if let resolvedURL {
                box.append(resolvedURL.standardizedFileURL)
            }
        }
    }

    group.notify(queue: .main) {
        completion(box.snapshot())
    }
    return true
}

private struct ActiveStickyDrag {
    let item: ManagedDesktopItem
    let center: CGPoint
}

struct BoardOverlayView: View {
    @EnvironmentObject private var coordinator: AppCoordinator
    @State private var activeDrag: ActiveStickyDrag?
    @State private var hoveredDropColumn: BoardColumn?
    @State private var isExternalDropActive = false

    private let noteSize = CGSize(width: 82, height: 82)

    var body: some View {
        GeometryReader { geometry in
            let classifier = coordinator.boardClassifier
            let visibleItems = coordinator.managedItems.filter { item in
                !item.isMissing && classifier.isInsideBoardStrip(item.lastKnownPosition)
            }
            let boardFrame = classifier.boardFrame

            ZStack(alignment: .topLeading) {
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .fill(boardFrameColor)
                    .shadow(color: boardShadow, radius: 18, y: 8)

                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(
                        LinearGradient(
                            colors: [boardSurfaceGlow, boardSurface],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .padding(10)
                    .overlay(alignment: .topTrailing) {
                        Circle()
                            .fill(boardDryEraseBlue.opacity(0.16))
                            .frame(width: 84, height: 84)
                            .blur(radius: 18)
                            .padding(.top, 18)
                            .padding(.trailing, 22)
                    }
                    .overlay {
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .stroke(Color.white.opacity(0.75), lineWidth: 1.6)
                            .padding(10)
                    }
                    .overlay {
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .stroke(isExternalDropActive ? boardDryEraseBlue.opacity(0.45) : boardInk.opacity(0.08), lineWidth: isExternalDropActive ? 3 : 1)
                            .padding(10)
                            .animation(.easeOut(duration: 0.14), value: isExternalDropActive)
                    }
                
                boardMoveHandle
                    .padding(.top, 8)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                    .zIndex(30)

                ForEach(BoardColumn.boardLanes) { column in
                    let localFrame = classifier.frame(for: column).offsetBy(dx: -boardFrame.minX, dy: -boardFrame.minY)
                    BoardLaneOverlay(
                        column: column,
                        frame: localFrame,
                        isTargeted: hoveredDropColumn == column
                    )
                }

                if isExternalDropActive {
                    ExternalDropHint(column: hoveredDropColumn)
                        .padding(.top, 54)
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                        .zIndex(18)
                        .allowsHitTesting(false)
                        .transition(.move(edge: .top).combined(with: .opacity))
                }

                if let bannerText = coordinator.bannerText {
                    Text(bannerText)
                        .font(.system(size: 9, weight: .semibold, design: .monospaced))
                        .foregroundStyle(Color.red.opacity(0.9))
                        .lineLimit(2)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.white.opacity(0.96), in: Capsule())
                        .padding(.trailing, 14)
                        .padding(.bottom, 10)
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
                }

                ForEach(visibleItems) { item in
                    let center = noteCenter(for: item, classifier: classifier, bounds: geometry.size)
                    let isDragging = activeDrag?.item.id == item.id
                    StickyNoteCardView(
                        item: item,
                        size: noteSize,
                        onOpen: {
                            coordinator.openItem(item.id)
                        },
                        onDragChanged: { translation in
                            let previewCenter = CGPoint(
                                x: center.x + translation.width,
                                y: center.y + translation.height
                            )
                            isExternalDropActive = false
                            activeDrag = ActiveStickyDrag(
                                item: item,
                                center: previewCenter
                            )
                            hoveredDropColumn = classifier.columnForPanelPoint(previewCenter)
                        },
                        onDragEnded: { translation in
                            let finalCenter = CGPoint(x: center.x + translation.width, y: center.y + translation.height)
                            clearTransientInteractionState()
                            coordinator.handleStickyDrop(
                                id: item.id,
                                desktopLocation: classifier.desktopPoint(forPanelPoint: finalCenter)
                            )
                        }
                    )
                    .frame(width: noteSize.width, height: noteSize.height)
                    .position(x: center.x, y: center.y)
                    .opacity(isDragging ? 0.08 : 1)
                    .zIndex(4)
                }

                if let activeDrag {
                    StickyNoteFace(item: activeDrag.item, size: noteSize)
                        .frame(width: noteSize.width, height: noteSize.height)
                        .position(x: activeDrag.center.x, y: activeDrag.center.y)
                        .scaleEffect(1.05)
                        .shadow(color: Color.black.opacity(0.22), radius: 10, y: 8)
                        .zIndex(20)
                        .allowsHitTesting(false)
                }
            }
            .onDrop(
                of: [UTType.fileURL.identifier],
                delegate: BoardFileDropDelegate(
                    classifier: classifier,
                    onExternalDropActive: { isExternalDropActive = $0 },
                    onHoverColumn: { hoveredDropColumn = $0 },
                    onDropFiles: { urls, column in
                        clearTransientInteractionState()
                        coordinator.importDroppedDesktopItems(urls, into: column)
                    }
                )
            )
            .onChange(of: coordinator.lastSyncAt) {
                clearTransientInteractionState()
            }
            .onChange(of: coordinator.managedItems) {
                clearTransientInteractionState()
            }
            .onChange(of: coordinator.lastError) {
                clearTransientInteractionState()
            }
            .animation(.interactiveSpring(response: 0.24, dampingFraction: 0.82), value: coordinator.managedItems)
            .animation(.easeOut(duration: 0.12), value: hoveredDropColumn)
        }
    }

    private var boardMoveHandle: some View {
        WindowDragRegion()
            .overlay {
                HStack(spacing: 10) {
                    RoundedRectangle(cornerRadius: 999, style: .continuous)
                        .fill(boardInk.opacity(0.08))
                        .frame(width: 132, height: 20)
                        .overlay {
                            HStack(spacing: 6) {
                                Circle().fill(boardInk.opacity(0.20)).frame(width: 5, height: 5)
                                Circle().fill(boardInk.opacity(0.20)).frame(width: 5, height: 5)
                                Circle().fill(boardInk.opacity(0.20)).frame(width: 5, height: 5)
                            }
                        }
                }
                .allowsHitTesting(false)
            }
            .frame(maxWidth: .infinity, minHeight: 42, maxHeight: 42)
            .contentShape(Rectangle())
    }

    private func clearTransientInteractionState() {
        activeDrag = nil
        hoveredDropColumn = nil
        isExternalDropActive = false
    }

    private func noteCenter(for item: ManagedDesktopItem, classifier: ColumnClassifier, bounds: CGSize) -> CGPoint {
        let localPosition = classifier.panelPoint(forDesktopPosition: item.lastKnownPosition)
        let boardFrame = classifier.boardFrame
        let laneFrame = classifier
            .frame(for: item.column)
            .offsetBy(dx: -boardFrame.minX, dy: -boardFrame.minY)

        let minX = max((noteSize.width / 2) + 6, laneFrame.minX + (noteSize.width / 2) + 8)
        let maxX = min(bounds.width - (noteSize.width / 2) - 6, laneFrame.maxX - (noteSize.width / 2) - 10)
        let minY = max((noteSize.height / 2) + 6, laneFrame.minY + 76)
        let maxY = min(bounds.height - (noteSize.height / 2) - 6, laneFrame.maxY - (noteSize.height / 2) - 10)
        let snappedLocalPosition = snappedPanelPosition(for: item, classifier: classifier, fallback: localPosition)

        return CGPoint(
            x: min(max(snappedLocalPosition.x, minX), maxX),
            y: min(max(snappedLocalPosition.y, minY), maxY)
        )
    }

    private func snappedPanelPosition(for item: ManagedDesktopItem, classifier: ColumnClassifier, fallback: CGPoint) -> CGPoint {
        let anchorCenters = classifier
            .anchors(for: item.column, rows: 4)
            .map { classifier.panelPoint(forDesktopPosition: $0) }

        guard let nearestAnchor = anchorCenters.min(by: { hypot($0.x - fallback.x, $0.y - fallback.y) < hypot($1.x - fallback.x, $1.y - fallback.y) }) else {
            return fallback
        }

        let distance = hypot(nearestAnchor.x - fallback.x, nearestAnchor.y - fallback.y)
        return distance <= 28 ? nearestAnchor : fallback
    }
}

private struct BoardLaneOverlay: View {
    let column: BoardColumn
    let frame: CGRect
    let isTargeted: Bool

    var body: some View {
        RoundedRectangle(cornerRadius: 12, style: .continuous)
            .fill(Color.clear)
            .overlay(alignment: .topLeading) {
                laneHeader
                    .padding(.leading, 10)
                    .padding(.top, 12)
            }
            .overlay(alignment: .topLeading) {
                Rectangle()
                    .fill(columnTint(column).opacity(0.48))
                    .frame(height: 2)
                    .padding(.top, 58)
                    .padding(.horizontal, 10)
            }
            .overlay(alignment: .trailing) {
                if column != BoardColumn.boardLanes.last {
                    Rectangle()
                        .fill(boardInk.opacity(0.10))
                        .frame(width: 1.5)
                        .padding(.vertical, 24)
                }
            }
            .overlay {
                if isTargeted {
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(columnTint(column).opacity(0.16))
                        .overlay {
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .stroke(columnTint(column).opacity(0.92), style: StrokeStyle(lineWidth: 2, dash: [8, 5]))
                        }
                }
            }
            .frame(width: frame.width, height: frame.height)
            .position(x: frame.midX, y: frame.midY)
            .contentShape(Rectangle())
    }

    private var laneHeader: some View {
        HStack(spacing: 4) {
            Text(column.title)
                .font(markerFont(22))
                .foregroundStyle(boardInk)
        }
    }
}

private struct ExternalDropHint: View {
    let column: BoardColumn?

    var body: some View {
        HStack(spacing: 8) {
            Circle()
                .fill(boardDryEraseRed.opacity(0.9))
                .frame(width: 8, height: 8)
            Text(column.map { "Drop to pin in \($0.title)" } ?? "Drop onto the whiteboard to pin this item")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(boardInk)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 9)
        .background(Color.white.opacity(0.96), in: Capsule())
        .overlay {
            Capsule()
                .stroke(boardInk.opacity(0.10), lineWidth: 1)
        }
        .shadow(color: Color.black.opacity(0.08), radius: 12, y: 4)
    }
}

private struct StickyNoteCardView: View {
    let item: ManagedDesktopItem
    let size: CGSize
    let onOpen: () -> Void
    let onDragChanged: (CGSize) -> Void
    let onDragEnded: (CGSize) -> Void

    var body: some View {
        StickyNoteFace(item: item, size: size)
            .contentShape(Rectangle())
            .gesture(
                DragGesture(minimumDistance: 3)
                    .onChanged { value in
                        onDragChanged(value.translation)
                    }
                    .onEnded { value in
                        onDragEnded(value.translation)
                    }
            )
            .onTapGesture(count: 2, perform: onOpen)
    }
}

private struct StickyNoteFace: View {
    let item: ManagedDesktopItem
    let size: CGSize

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            RoundedRectangle(cornerRadius: 999)
                .fill(Color.white.opacity(0.56))
                .frame(width: 24, height: 5)
                .frame(maxWidth: .infinity, alignment: .center)

            Text(item.displayName)
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(Color.black.opacity(0.78))
                .lineLimit(2)

            Spacer(minLength: 0)

            HStack {
                Text(item.resolvedURL.pathExtension.isEmpty ? "item" : item.resolvedURL.pathExtension.lowercased())
                    .font(.system(size: 8, weight: .bold, design: .monospaced))
                    .foregroundStyle(Color.black.opacity(0.42))
                Spacer()
                if item.completedAt != nil {
                    Text("done")
                        .font(.system(size: 8, weight: .bold))
                        .foregroundStyle(Color.black.opacity(0.42))
                }
            }
        }
        .padding(.horizontal, 8)
        .padding(.top, 7)
        .padding(.bottom, 7)
        .frame(width: size.width, height: size.height, alignment: .topLeading)
        .background(columnTint(item.column).opacity(item.isMissing ? 0.34 : 0.92), in: RoundedRectangle(cornerRadius: 6, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 6, style: .continuous)
                .stroke(Color.black.opacity(0.06), lineWidth: 0.8)
        }
        .rotationEffect(.degrees(stickyRotation(for: item)))
        .shadow(color: Color.black.opacity(0.12), radius: 5, y: 4)
        .opacity(item.isMissing ? 0.55 : 1)
    }
}

private struct BoardFileDropDelegate: DropDelegate {
    let classifier: ColumnClassifier
    let onExternalDropActive: (Bool) -> Void
    let onHoverColumn: (BoardColumn?) -> Void
    let onDropFiles: ([URL], BoardColumn) -> Void

    func validateDrop(info: DropInfo) -> Bool {
        info.hasItemsConforming(to: [UTType.fileURL.identifier])
    }

    func dropEntered(info: DropInfo) {
        onExternalDropActive(true)
        onHoverColumn(classifier.columnForPanelPoint(info.location))
    }

    func dropUpdated(info: DropInfo) -> DropProposal? {
        let column = classifier.columnForPanelPoint(info.location)
        onExternalDropActive(true)
        onHoverColumn(column)
        return DropProposal(operation: column == nil ? .cancel : .copy)
    }

    func dropExited(info: DropInfo) {
        onExternalDropActive(false)
        onHoverColumn(nil)
    }

    func performDrop(info: DropInfo) -> Bool {
        let targetColumn = classifier.columnForPanelPoint(info.location)
        onExternalDropActive(false)
        onHoverColumn(nil)
        guard let targetColumn else {
            return false
        }
        return loadFileURLs(from: info.itemProviders(for: [UTType.fileURL.identifier])) { urls in
            onDropFiles(urls, targetColumn)
        }
    }
}

private struct WindowDragRegion: NSViewRepresentable {
    func makeNSView(context: Context) -> WindowDragRegionView {
        WindowDragRegionView()
    }

    func updateNSView(_ nsView: WindowDragRegionView, context: Context) {}
}

private final class WindowDragRegionView: NSView {
    private var dragStartScreenPoint: CGPoint?
    private var dragStartWindowOrigin: CGPoint?

    override var isOpaque: Bool { false }

    override func acceptsFirstMouse(for event: NSEvent?) -> Bool {
        true
    }

    override func mouseDown(with event: NSEvent) {
        guard let window else {
            super.mouseDown(with: event)
            return
        }

        dragStartScreenPoint = window.convertPoint(toScreen: event.locationInWindow)
        dragStartWindowOrigin = window.frame.origin
    }

    override func mouseDragged(with event: NSEvent) {
        guard
            let window,
            let dragStartScreenPoint,
            let dragStartWindowOrigin
        else {
            super.mouseDragged(with: event)
            return
        }

        let currentScreenPoint = window.convertPoint(toScreen: event.locationInWindow)
        let deltaX = currentScreenPoint.x - dragStartScreenPoint.x
        let deltaY = currentScreenPoint.y - dragStartScreenPoint.y
        window.setFrameOrigin(
            CGPoint(
                x: dragStartWindowOrigin.x + deltaX,
                y: dragStartWindowOrigin.y + deltaY
            )
        )
    }

    override func mouseUp(with event: NSEvent) {
        dragStartScreenPoint = nil
        dragStartWindowOrigin = nil
        super.mouseUp(with: event)
    }
}
