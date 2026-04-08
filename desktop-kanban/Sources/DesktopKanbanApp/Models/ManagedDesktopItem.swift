import Foundation

struct ManagedDesktopItem: Identifiable, Codable, Equatable {
    var id: UUID
    var bookmarkData: Data
    var resolvedURL: URL
    var displayName: String
    var originalDesktopPosition: DesktopPoint?
    var lastKnownPosition: DesktopPoint
    var column: BoardColumn
    var completedAt: Date?
    var pendingPlacementAt: Date?
    var pendingBoardSyncAt: Date?
    var isMissing: Bool
}
