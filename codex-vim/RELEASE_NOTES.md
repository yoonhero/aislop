# Codex Vim Focus 2.0.0 RC1

This is the first packaged release of Codex Vim Focus, an unofficial macOS
menu-bar manager for Vim editing in the Codex desktop prompt.

## Install

1. Install [Karabiner-Elements](https://karabiner-elements.pqrs.org/).
2. Download and open `Codex-Vim-Focus-2.0.0.dmg`.
3. Drag **Codex Vim Focus** onto **Applications**.
4. Open the app, click `VIM` in the menu bar, then choose
   **Setup Everything**.
5. Grant Accessibility permission when macOS asks.

## Included

- 121 Karabiner manipulators with NORMAL, INSERT, VISUAL, and operator-pending
  composition.
- Prompt-only activation through macOS Accessibility metadata.
- Native mode-aware bar and translucent block carets.
- One-click setup, rebuild, update detection, launch-at-login, logs, removal,
  and Quit.
- Automatic rebuild after official Codex updates.
- Drag-to-Applications DMG, portable ZIP, and SHA-256 checksum files.

## RC security note

This RC is ad-hoc signed because no Apple Developer ID identity was available
when it was built. It is not notarized. macOS may require **Control-click →
Open** on first launch. The release pipeline supports Developer ID signing and
notarization for a future stable release.

The official `/Applications/ChatGPT.app` is never modified. The manager creates
a separate `~/Applications/Codex Vim.app` from the locally installed official
Codex bundle.
