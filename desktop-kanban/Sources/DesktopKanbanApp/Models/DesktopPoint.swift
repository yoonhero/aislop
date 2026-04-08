import CoreGraphics
import Foundation

struct DesktopPoint: Codable, Equatable, Hashable {
    var x: Double
    var y: Double

    static let zero = DesktopPoint(x: 0, y: 0)

    init(x: Double, y: Double) {
        self.x = x
        self.y = y
    }

    init(_ point: CGPoint) {
        self.x = point.x
        self.y = point.y
    }

    var cgPoint: CGPoint {
        CGPoint(x: x, y: y)
    }

    func distance(to other: DesktopPoint) -> Double {
        hypot(x - other.x, y - other.y)
    }
}
