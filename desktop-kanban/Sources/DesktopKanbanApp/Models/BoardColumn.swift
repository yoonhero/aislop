import Foundation

enum BoardColumn: String, Codable, CaseIterable, Identifiable {
    case inbox
    case next
    case doing
    case done

    static let boardLanes: [BoardColumn] = [.inbox, .next, .doing]

    var id: String { rawValue }

    var title: String {
        switch self {
        case .inbox: "Inbox"
        case .next: "Next"
        case .doing: "Doing"
        case .done: "Done"
        }
    }

    var subtitle: String {
        switch self {
        case .inbox: "Newly captured clutter."
        case .next: "Queued up for action."
        case .doing: "Active desktop work."
        case .done: "Processed and archived visually."
        }
    }
}
