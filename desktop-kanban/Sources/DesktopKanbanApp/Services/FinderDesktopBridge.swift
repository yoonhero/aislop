import Foundation

enum FinderBridgeError: LocalizedError {
    case executionFailed(String)
    case parseFailed(String)

    var errorDescription: String? {
        switch self {
        case .executionFailed(let message):
            return message
        case .parseFailed(let message):
            return "Finder response could not be parsed: \(message)"
        }
    }
}

actor FinderDesktopBridge {
    private let desktopDirectory: URL
    private let preferencesURL: URL

    private let fieldSeparator = Character(UnicodeScalar(31))
    private let recordSeparator = Character(UnicodeScalar(30))

    init(
        desktopDirectory: URL = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Desktop", isDirectory: true),
        preferencesURL: URL = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Library/Preferences/com.apple.finder.plist")
    ) {
        self.desktopDirectory = desktopDirectory.standardizedFileURL
        self.preferencesURL = preferencesURL
    }

    func fetchDesktopSettings() throws -> DesktopSettings {
        let data = try Data(contentsOf: preferencesURL)
        let plist = try PropertyListSerialization.propertyList(from: data, format: nil) as? [String: Any] ?? [:]
        return Self.parseDesktopSettings(from: plist)
    }

    func fetchManagedItemSnapshots(for references: [DesktopItemReference]) throws -> [DesktopItemSnapshot] {
        guard !references.isEmpty else {
            return []
        }
        let output = try runAppleScript(snapshotScript(for: references))
        return try parseSnapshotOutput(output)
    }

    func fetchDesktopInventory() throws -> [DesktopInventoryItem] {
        let output = try runAppleScript(desktopInventoryScript())
        return try parseDesktopInventoryOutput(output)
    }

    func moveItem(reference: DesktopItemReference, to position: DesktopPoint) throws {
        _ = try runAppleScript(moveScript(for: reference, to: position))
    }

    static func parseDesktopSettings(from plist: [String: Any]) -> DesktopSettings {
        let desktopViewSettings = plist["DesktopViewSettings"] as? [String: Any]
        let iconViewSettings = desktopViewSettings?["IconViewSettings"] as? [String: Any]
        let arrangeByRaw = (iconViewSettings?["arrangeBy"] as? String ?? "none").lowercased()
        let gridSpacing = iconViewSettings?["gridSpacing"] as? Int ?? DesktopSettings.default.gridSpacing
        return DesktopSettings(arrangement: arrangement(from: arrangeByRaw), gridSpacing: gridSpacing)
    }

    static func arrangement(from rawValue: String) -> DesktopArrangement {
        switch rawValue {
        case "none":
            return .none
        case "grid":
            return .grid
        case "name":
            return .name
        case "kind":
            return .kind
        case "date modified":
            return .dateModified
        case "date created":
            return .dateCreated
        case "size":
            return .size
        case "label":
            return .label
        default:
            return .unknown
        }
    }

    func parseSnapshotOutput(_ output: String) throws -> [DesktopItemSnapshot] {
        let records = output.split(separator: recordSeparator).map(String.init)
        if records.isEmpty, output.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return []
        }

        return try records.map { record in
            let fields = record.split(separator: fieldSeparator, omittingEmptySubsequences: false).map(String.init)
            guard let rawID = fields.first, let id = UUID(uuidString: rawID) else {
                throw FinderBridgeError.parseFailed(record)
            }

            if fields.count >= 3, fields[1] == "__MISSING__" {
                let resolvedPath = fields[2]
                let resolvedURL = URL(fileURLWithPath: resolvedPath)
                return DesktopItemSnapshot(
                    id: id,
                    resolvedURL: resolvedURL,
                    displayName: resolvedURL.lastPathComponent,
                    position: nil,
                    isMissing: true
                )
            }

            guard
                fields.count >= 5,
                let url = URL(string: fields[1]),
                let x = Double(fields[3]),
                let y = Double(fields[4])
            else {
                throw FinderBridgeError.parseFailed(record)
            }

            return DesktopItemSnapshot(
                id: id,
                resolvedURL: url.standardizedFileURL,
                displayName: fields[2],
                position: DesktopPoint(x: x, y: y),
                isMissing: false
            )
        }
    }

    func parseDesktopInventoryOutput(_ output: String) throws -> [DesktopInventoryItem] {
        let records = output.split(separator: recordSeparator).map(String.init)
        if records.isEmpty, output.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return []
        }

        return try records.compactMap { record in
            let fields = record.split(separator: fieldSeparator, omittingEmptySubsequences: false).map(String.init)
            guard
                fields.count >= 4,
                let url = URL(string: fields[0]),
                let x = Double(fields[2]),
                let y = Double(fields[3])
            else {
                throw FinderBridgeError.parseFailed(record)
            }

            return DesktopInventoryItem(
                resolvedURL: url.standardizedFileURL,
                displayName: fields[1],
                position: DesktopPoint(x: x, y: y)
            )
        }
    }

    private func runAppleScript(_ script: String) throws -> String {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/osascript")
        process.arguments = ["-e", script]

        let stdoutPipe = Pipe()
        let stderrPipe = Pipe()
        process.standardOutput = stdoutPipe
        process.standardError = stderrPipe

        try process.run()
        process.waitUntilExit()

        let stdout = String(data: stdoutPipe.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8) ?? ""
        let stderr = String(data: stderrPipe.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8) ?? ""

        guard process.terminationStatus == 0 else {
            let message = stderr.trimmingCharacters(in: .whitespacesAndNewlines)
            throw FinderBridgeError.executionFailed(message.isEmpty ? "osascript failed with exit code \(process.terminationStatus)." : message)
        }

        return stdout.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func snapshotScript(for references: [DesktopItemReference]) -> String {
        let ids = appleScriptList(references.map { $0.id.uuidString })
        let paths = appleScriptList(references.map { $0.url.path })

        return """
        set itemIDs to \(ids)
        set itemPaths to \(paths)
        set outputLines to {}
        repeat with itemIndex from 1 to count of itemIDs
            set itemID to item itemIndex of itemIDs
            set targetPath to item itemIndex of itemPaths
            try
                set finderItem to ((POSIX file targetPath) as alias)
                tell application "Finder"
                    set itemName to name of finderItem
                    set itemURL to URL of finderItem
                    set itemPosition to desktop position of finderItem
                end tell
                set end of outputLines to itemID & (ASCII character 31) & itemURL & (ASCII character 31) & itemName & (ASCII character 31) & ((item 1 of itemPosition) as string) & (ASCII character 31) & ((item 2 of itemPosition) as string)
            on error errorMessage number errorNumber
                try
                    set resolvedPath to POSIX path of (((POSIX file targetPath) as alias))
                on error
                    set resolvedPath to targetPath
                end try
                set end of outputLines to itemID & (ASCII character 31) & "__MISSING__" & (ASCII character 31) & resolvedPath & (ASCII character 31) & (errorNumber as string) & (ASCII character 31) & errorMessage
            end try
        end repeat
        set AppleScript's text item delimiters to ASCII character 30
        return outputLines as text
        """
    }

    private func moveScript(for reference: DesktopItemReference, to position: DesktopPoint) -> String {
        let path = escapedAppleScriptString(reference.url.path)
        let x = Int(position.x.rounded())
        let y = Int(position.y.rounded())
        return """
        tell application "Finder"
            set desktop position of ((POSIX file "\(path)") as alias) to {\(x), \(y)}
        end tell
        """
    }

    private func desktopInventoryScript() -> String {
        """
        tell application "Finder"
            set outputLines to {}
            repeat with finderItem in (every item of desktop)
                try
                    set itemName to name of finderItem
                    set itemURL to URL of finderItem
                    set itemPosition to desktop position of finderItem
                    set end of outputLines to itemURL & (ASCII character 31) & itemName & (ASCII character 31) & ((item 1 of itemPosition) as string) & (ASCII character 31) & ((item 2 of itemPosition) as string)
                end try
            end repeat
        end tell
        set AppleScript's text item delimiters to ASCII character 30
        return outputLines as text
        """
    }

    private func appleScriptList(_ values: [String]) -> String {
        let escaped = values.map { "\"\(escapedAppleScriptString($0))\"" }
        return "{\(escaped.joined(separator: ", "))}"
    }

    private func escapedAppleScriptString(_ value: String) -> String {
        value
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "\"", with: "\\\"")
    }
}
