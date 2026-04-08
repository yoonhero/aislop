import Darwin
import Foundation

final class DesktopChangeMonitor {
    private let fileURL: URL
    private let queue = DispatchQueue(label: "fun.aislop.desktop-kanban.dsstore-monitor")

    private var fileDescriptor: CInt = -1
    private var source: DispatchSourceFileSystemObject?

    init(fileURL: URL) {
        self.fileURL = fileURL
    }

    func start(onChange: @escaping @Sendable () -> Void) {
        stop()

        fileDescriptor = open(fileURL.path, O_EVTONLY)
        guard fileDescriptor >= 0 else {
            return
        }

        let source = DispatchSource.makeFileSystemObjectSource(
            fileDescriptor: fileDescriptor,
            eventMask: [.write, .extend, .attrib, .rename, .delete],
            queue: queue
        )

        source.setEventHandler(handler: onChange)
        source.setCancelHandler { [fileDescriptor] in
            close(fileDescriptor)
        }
        source.resume()
        self.source = source
    }

    func stop() {
        source?.cancel()
        source = nil
        if fileDescriptor >= 0 {
            close(fileDescriptor)
            fileDescriptor = -1
        }
    }

    deinit {
        stop()
    }
}
