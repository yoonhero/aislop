import Foundation

enum TransitionSource: String, Codable, CaseIterable {
    case board
    case finder
}

struct HistoryEvent: Identifiable, Codable, Equatable {
    var id: UUID
    var timestamp: Date
    var itemID: UUID
    var itemName: String
    var fromColumn: BoardColumn
    var toColumn: BoardColumn
    var source: TransitionSource
    var position: DesktopPoint
    var completedAt: Date?
}
