# Changelog

## Unreleased

- Wait for the official Codex bundle to settle before rebuilding it, reject a
  source bundle that changes during the copy, and limit automatic rebuilding to
  one attempt per source build.
- Stop polling every ten seconds and ignore unrelated application-termination
  notifications.
- Keep Accessibility monitoring silent at launch; prompt only from explicit
  setup/menu actions.

## 2.0.0 RC2

- Reread app metadata from `Info.plist` so update detection cannot reuse stale
  `Bundle` values after replacing Codex Vim.

## 2.0.0

- Rebuilt Codex Vim Focus as the menu-bar setup and update manager.
- Added one-click Karabiner, native Codex copy, Accessibility, and login setup.
- Added official Codex build detection and deferred automatic rebuilds.
- Bundled the ASAR runtime; end-user setup no longer needs npm, npx, or jq.
- Added native mode-aware INSERT, NORMAL, and VISUAL carets.
- Removed the inaccurate Accessibility cursor overlay and calibration menu.
- Added recoverable removal, logs, status details, and a real Quit command.
- Added a drag-to-Applications DMG with verification, checksums, and optional
  Developer ID notarization.
