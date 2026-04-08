import SwiftUI

struct SettingsView: View {
    @EnvironmentObject private var coordinator: AppCoordinator

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            header

            HStack(alignment: .top, spacing: 16) {
                summaryCard
                actionsCard
            }

            HStack(alignment: .top, spacing: 16) {
                managedItemsCard
                historyCard
            }
        }
        .padding(22)
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Desktop Kanban")
                .font(.system(size: 28, weight: .bold, design: .rounded))
            Text("State is persisted locally in Application Support. Direct Finder icon moves are reconciled back into the board.")
                .foregroundStyle(.secondary)
        }
    }

    private var summaryCard: some View {
        GroupBox("Board Status") {
            VStack(alignment: .leading, spacing: 12) {
                summaryRow(label: "Managed items", value: "\(coordinator.managedItems.count)")
                summaryRow(label: "History events", value: "\(coordinator.historyEvents.count)")
                summaryRow(label: "Desktop Sort By", value: coordinator.desktopSettings.arrangement.label)
                summaryRow(label: "Grid spacing", value: "\(coordinator.desktopSettings.gridSpacing)")
                summaryRow(label: "Last sync", value: coordinator.lastSyncAt?.formatted(date: .abbreviated, time: .standard) ?? "Never")
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.top, 8)
        }
        .frame(maxWidth: .infinity)
    }

    private var actionsCard: some View {
        GroupBox("Actions") {
            VStack(alignment: .leading, spacing: 10) {
                Button("Import Desktop Items…") {
                    coordinator.importItems()
                }
                Button("Refresh From Finder") {
                    coordinator.refreshFromFinder()
                }
                Text("Drag Desktop files directly onto the board to pin them as sticky notes. Drag a sticky note off the board to complete it and restore the original icon.")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(.secondary)
                    .padding(.top, 4)
                if let bannerText = coordinator.bannerText {
                    Text(bannerText)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(.secondary)
                        .padding(.top, 4)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.top, 8)
        }
        .frame(width: 280)
    }

    private var managedItemsCard: some View {
        GroupBox("Managed Items") {
            List(coordinator.managedItems) { item in
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text(item.displayName)
                            .font(.system(size: 13, weight: .semibold))
                        Spacer()
                        Text(item.column.title)
                            .font(.system(size: 11, weight: .bold))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(.quaternary, in: Capsule())
                    }
                    Text(item.resolvedURL.path)
                        .font(.system(size: 11, weight: .medium, design: .monospaced))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                    if item.isMissing {
                        Text("Currently missing from the Desktop.")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(.red)
                    }
                }
                .padding(.vertical, 4)
            }
            .listStyle(.plain)
            .frame(minHeight: 280)
        }
        .frame(maxWidth: .infinity)
    }

    private var historyCard: some View {
        GroupBox("History") {
            List(coordinator.historyEvents) { event in
                VStack(alignment: .leading, spacing: 5) {
                    HStack {
                        Text(event.itemName)
                            .font(.system(size: 13, weight: .semibold))
                        Spacer()
                        Text(event.source.rawValue.uppercased())
                            .font(.system(size: 10, weight: .bold, design: .monospaced))
                            .foregroundStyle(.secondary)
                    }
                    Text("\(event.fromColumn.title) -> \(event.toColumn.title)")
                        .font(.system(size: 12, weight: .medium))
                    Text(event.timestamp.formatted(date: .abbreviated, time: .standard))
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(.secondary)
                }
                .padding(.vertical, 4)
            }
            .listStyle(.plain)
            .frame(minHeight: 280)
        }
        .frame(maxWidth: .infinity)
    }

    private func summaryRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .foregroundStyle(.secondary)
            Spacer()
            Text(value)
                .font(.system(size: 12, weight: .semibold, design: .monospaced))
        }
    }
}
