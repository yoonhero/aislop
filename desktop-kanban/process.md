# Desktop Kanban Drag/Drop Process

## Whiteboard Pass (2026-04-08, later)

### Requested Changes
1. Remove the visible "move board" copy from the drag affordance.
2. Fix the case where moving the board quickly makes managed icons appear to disappear.
3. Smooth out folder/file drag UX further.
4. Remove the in-board `Done` lane and treat dragging a sticky note out of the board as the completion path.
5. Shift the overall board look from chalkboard to whiteboard.

### Root-Cause Hypotheses For This Pass
- W1: board repositioning currently moves only the panel frame, not the managed-item positions held in board state, so the board can outrun its own sticky-note dataset during fast movement and temporarily filter those notes out as "outside board."
- W2: even with optimistic sticky-note rendering, Finder icon movement is only updated through ordinary item moves. Board movement needs its own batched sync path so the underlying Desktop icons catch up after the panel shifts.
- W3: external file drag UX still depends mostly on lane highlighting. It needs a clearer drop-state cue and more consistent state transitions during hover, exit, and perform-drop.
- W4: removing the `Done` lane is not just a visual change; column geometry, drop classification, instructions, and history/completion semantics need to separate "board lanes" from the full enum of historical transition states.
- W5: the current dark green palette still encodes a chalkboard metaphor, so simply tweaking one or two colors will not be enough. Surface, frame, ink, and lane separator colors all need to move into a whiteboard palette together.

### Planned Checks For This Pass
- [x] Introduce a dedicated "board lanes" list so UI geometry uses only `Inbox`, `Next`, and `Doing`, while `Done` remains only a historical/completion state.
- [x] Update sticky-note completion so dropping outside the board completes/removes the item.
- [x] Make board dragging optimistically translate managed positions live and debounce the Finder icon sync so fast drags do not make notes disappear.
- [x] Improve external file/folder drag feedback with clearer active-drop state, animation, and helper messaging.
- [x] Restyle the board from chalkboard to whiteboard without regressing readability.
- [x] Re-run build/tests and append verification notes.

### Resolution Notes For This Pass
1. Removed the visible move-label copy
   - The top drag affordance now stays visual-only with no helper text such as "move board".
   - The visible pill no longer intercepts pointer events; the actual drag region underneath owns the interaction.
2. Fixed fast board-move disappearance
   - Board movement now translates managed item positions optimistically as the panel moves, instead of waiting for Finder reconciliation.
   - Added a separate pending board-sync state so a refresh arriving before Finder finishes moving icons does not incorrectly treat those items as outside the board and unmanage them.
   - Finder icon movement is now synced through a debounced board-move path so the real Desktop icons catch up after the whiteboard stops moving.
3. Smoothed file/folder drag UX
   - Added an explicit external-drop active state, animated lane emphasis, and a helper capsule that tells the user where the file/folder will be pinned.
   - The board border now shifts into an active drop state during hover, which makes drop intent more obvious before release.
4. Removed the in-board `Done` lane
   - The board now renders only `Inbox`, `Next`, and `Doing`.
   - `Done` remains in the model for history/completion bookkeeping, but the completion gesture is now simply dropping a sticky note outside the board.
5. Shifted the surface to a whiteboard look
   - Updated the frame, surface, ink, and highlight colors away from dark green chalkboard tones and toward a whiteboard palette with dry-erase marker accents.
   - Lane separators and headers were retuned to fit the lighter surface without losing contrast.

## Reopened UX Pass (2026-04-08)

### Current Reopened Problems
1. Board movement is still effectively broken in real use.
   - The visible drag strip exists, but the board does not consistently follow the pointer on the Desktop.
   - This blocks all later UX tuning because a fixed board position makes lane geometry debugging misleading.
2. Internal sticky-note drag/drop still feels abrupt and under-instrumented.
   - Only external file drops drive lane hover feedback right now.
   - Existing sticky-note drags provide almost no target preview while moving, so the user gets feedback only after release.
3. Secondary UX issues are compounding the drag perception.
   - Hover/focus state is cleared in several places, but not from one unified drag lifecycle.
   - `Done` is visually narrower now, but the board still treats drag affordance, lane hit zones, and note placement as loosely coupled concerns rather than one geometry system.
   - The top drag affordance needs to move the actual panel reliably before any styling on it matters.

### Root-Cause Hypotheses For This Pass
- R1: `WindowDragRegionView.mouseDown` delegates to `window?.performDrag(with:)`, but a desktop-level, borderless, non-activating `NSPanel` is not a reliable host for AppKit's standard window-drag loop. A manual frame-drag path is likely required instead of asking AppKit to drag the panel for us.
- R2: `hoveredDropColumn` is currently wired to `BoardFileDropDelegate`, so lane emphasis exists only for Finder file drops. Internal sticky drags never publish their provisional lane target, which makes the drag feel "dead" until the note snaps on release.
- R3: Sticky-note drag completion still jumps directly to `moveItem(id:to:)`, which computes the final slot from lane occupancy only. That is operationally correct, but without a live provisional target state and a consistent release-state reset, the UX reads as laggy and sticky even when the underlying data mutation is immediate.
- R4: The move strip should own one clear interaction path. Right now it is visually large enough, but it still depends on a fragile native drag handoff instead of deterministic pointer math tied to the panel frame.
- Confirmed after code audit: the move-strip visuals were also sitting in an overlay above the `NSViewRepresentable` drag host, so the region most users actually press was not guaranteed to forward mouse events to the AppKit drag implementation underneath.

### Planned Checks For This Pass
- [x] Replace native `performDrag(with:)` board movement with deterministic manual panel dragging and persist the resulting origin.
- [x] Feed internal sticky drags into the same lane-target state that external drops use so the hovered lane updates live during movement.
- [x] Unify drag lifecycle cleanup so provisional hover/focus state clears on internal drop completion, cancellation, sync, and state refresh from one consistent path.
- [x] Re-check `Done` width and anchor behavior after movement and hover changes so the smaller lane still receives drops correctly.
- [x] Re-run `swift build` and `swift test`, then append concrete verification notes here.

### Resolution Notes For This Pass
1. Board movement
   - Replaced `window?.performDrag(with:)` with a manual `mouseDown` / `mouseDragged` / `mouseUp` implementation that directly updates the panel frame origin.
   - This removes the dependency on AppKit's native drag loop for a non-activating desktop panel and makes the board movement path deterministic.
   - Disabled hit testing on the visible move-strip overlay content itself so the backing drag host always receives the pointer events.
2. Internal sticky drag feedback
   - Internal sticky drags now compute their provisional center continuously and publish `hoveredDropColumn` from the same `ColumnClassifier` used by external file drops.
   - That gives live lane emphasis during note movement instead of only after release.
3. Drop smoothness
   - Added `nearestAnchor(for:near:occupied:)` so a sticky note dropped inside a lane resolves to the closest available slot instead of always jumping to the first free slot in that column.
   - This keeps the final landing position more consistent with where the user actually released the note.
4. Drag-state cleanup
   - Consolidated transient cleanup into one helper that clears both `activeDrag` and `hoveredDropColumn`.
   - That helper now runs on internal drop completion, external file drop completion, sync refresh, item refresh, and error transitions so stale focus/hover outlines do not linger.
5. Motion/readability follow-up
   - Added lightweight animation for managed-item layout changes and lane emphasis changes so the board updates feel less abrupt without animating the actively dragged ghost itself.

## Problem Statement
- Current user-facing bug: drag-in behavior is effectively working only for `Done`.
- Related symptom: sticky notes do not reliably move between `Inbox`, `Next`, and `Doing`.
- Reopened symptom: after drag/drop, the board can appear frozen because the note is not shown immediately while Finder sync is still pending.
- UI follow-up: `Done` lane header/rendering can appear visually misaligned, and the board itself needs to be movable.
- UI follow-up 2: post-it alignment should stay within lane bounds, lingering drop focus must clear after drop/sync, and board drag affordance needs a larger hit area.
- Requirement: keep iterating until drag/drop routing is lane-correct for both external Desktop items and internal sticky-note moves.

## Hypotheses
- H1: in-place state mutation was not publishing UI updates, so non-destructive lane changes looked broken while `Done` appeared to work because it removed items.
- H2: external file drag-in is routed through per-lane transparent SwiftUI drop targets, and only one effective target is receiving drops.
- H3: drag source stability is weakened by changing the dragged sticky note’s hit-testing state mid-gesture.
- H4: imported items are not staged visibly on the board until Finder snapshot/move completes, so slow sync looks like a frozen board.
- H5: a refresh arriving before the first Finder move completes can unmanage a freshly imported item unless the initial placement is treated as pending.
- H6: lane header rendering should be made more deterministic instead of relying on nested flexible stacks inside positioned overlays.
- H7: board placement needs an explicit persisted origin instead of a hard-coded centered default only.
- H8: note centers are being clamped only to board bounds, not lane bounds, so left-most notes can visually bleed into headers/borders.
- H9: drop focus can linger unless the hover state is cleared not only on drop delegate callbacks but also on board state/sync transitions.
- H10: a very small drag pill is not a sufficient board-move affordance in practice.

## Checks
- [x] Audit state mutation and publish paths in `BoardStateStore`.
- [x] Add regression test that `assignItem` publishes when mutating an existing item in place.
- [x] Replace per-lane external drop targets with a single board-level drop delegate that resolves the target lane from drop location.
- [x] Keep dragged sticky note alive during gesture without disabling the original gesture host.
- [x] Re-run build/tests after structural drag/drop fix.
- [x] Make imported notes appear optimistically before Finder move completes.
- [x] Protect freshly imported notes from being un-managed by an early reconcile while their first move is pending.
- [x] Make lane header rendering deterministic so `Done` does not visually drift.
- [x] Allow the board itself to be repositioned and persist the chosen placement.
- [x] Clamp note rendering inside its lane rather than only inside the whole board.
- [x] Clear drop focus on sync/item changes, not only on raw drop delegate exit.
- [x] Expand board-move drag area from a tiny pill to a top drag strip.

## Fix Log
- Added explicit `objectWillChange.send()` calls on material store mutations so lane-to-lane moves repaint immediately.
- Added unit coverage for in-place mutation publication.
- Removed per-lane `.onDrop` handlers and replaced them with one board-level `DropDelegate`.
- Added `columnForPanelPoint(_:)` so drop routing uses the same classifier as Finder icon placement.
- Stopped disabling hit-testing on the original sticky note during drag so the gesture host remains stable until `onEnded`.
- Added `pendingPlacementAt` to imported items so they can appear on the board immediately and survive early refreshes.
- Changed import flow to stage notes into the target lane first, then fetch original Finder position metadata, then move the actual icon.
- Added regression tests for staged imports preserving board position and for pending items surviving outside-board snapshots during initial sync.
- Reworked lane header rendering to use fixed overlays instead of flexible per-lane stack layout.
- Added persisted `boardOrigin` support plus a drag handle so the chalkboard can be repositioned.
- Added classifier coverage for custom board origin behavior.
- Adjusted anchor geometry so sticky notes sit deeper inside each lane.
- Changed note rendering clamp to lane-local bounds, which fixes the left-edge overflow visible in screenshots.
- Added extra hover-state resets tied to sync/item changes so the dashed focus region does not stick after drop.
- Enlarged the board move affordance to a full top drag strip while keeping the visible handle centered.

## Verification Log
- `swift build`: passing after publish-path fix.
- `swift test`: passing after publish-path fix.
- `swift build`: passing after board-level drop delegate refactor.
- `swift test`: passing after board-level drop delegate refactor.
- `./.build/debug/DesktopKanban`: launches and remains resident for smoke-run window.
- `swift build`: passing after optimistic import staging refactor.
- `swift test`: passing after optimistic import staging refactor.
- `./.build/debug/DesktopKanban`: launches and remains resident after optimistic import staging refactor.
- `swift build`: passing after deterministic lane overlay + movable board refactor.
- `swift test`: passing after deterministic lane overlay + movable board refactor.
- `./.build/debug/DesktopKanban`: launches and remains resident after movable board refactor.
- `swift build`: passing after note alignment + hover reset + wider drag strip refactor.
- `swift test`: passing after note alignment + hover reset + wider drag strip refactor.
- `swift build`: passing after manual board-drag + internal hover-preview + nearest-anchor drop refactor.
- `swift test`: passing after manual board-drag + internal hover-preview + nearest-anchor drop refactor.
- `swift build`: passing after whiteboard restyle + outside-board completion + board-sync preview refactor.
- `swift test`: passing after whiteboard restyle + outside-board completion + board-sync preview refactor.

## Exit Criteria
- [x] External Desktop files can be dropped into `Inbox`, `Next`, and `Doing` using lane position, not only `Done`.
- [x] Existing sticky notes visibly move between lanes without requiring a removal/reinsert path.
- [x] `Done` and outside-board release behavior still works.
- [x] Build and tests pass after the final drag/drop fix.
