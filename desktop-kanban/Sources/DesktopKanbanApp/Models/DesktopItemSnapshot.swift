import Foundation

struct DesktopItemReference: Equatable {
    var id: UUID
    var url: URL
    var fallbackName: String
}

struct DesktopItemSnapshot: Equatable {
    var id: UUID
    var resolvedURL: URL?
    var displayName: String
    var position: DesktopPoint?
    var isMissing: Bool
}

struct DesktopInventoryItem: Equatable {
    var resolvedURL: URL
    var displayName: String
    var position: DesktopPoint
}
