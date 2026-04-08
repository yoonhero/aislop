import Foundation

enum DesktopArrangement: String, Codable, Equatable {
    case none
    case grid
    case name
    case kind
    case dateModified
    case dateCreated
    case size
    case label
    case unknown

    var label: String {
        switch self {
        case .none: "None"
        case .grid: "Snap to Grid"
        case .name: "Name"
        case .kind: "Kind"
        case .dateModified: "Date Modified"
        case .dateCreated: "Date Created"
        case .size: "Size"
        case .label: "Tags"
        case .unknown: "Unknown"
        }
    }
}

struct DesktopSettings: Codable, Equatable {
    var arrangement: DesktopArrangement
    var gridSpacing: Int

    static let `default` = DesktopSettings(arrangement: .none, gridSpacing: 54)

    var allowsManualPlacement: Bool {
        arrangement == .none
    }
}
