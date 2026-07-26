# Codex Vim

Modal Vim editing for the Codex desktop prompt on macOS.

Codex Vim is unofficial. It keeps `/Applications/ChatGPT.app` untouched,
scopes Karabiner to the focused prompt through macOS Accessibility, and creates
a separate `~/Applications/Codex Vim.app` for the native mode-aware caret.

## Install

Requirements:

- macOS 13 or newer;
- the official Codex desktop app in `/Applications/ChatGPT.app`;
- [Karabiner-Elements](https://karabiner-elements.pqrs.org/).

Download the
[2.0.0 RC2 DMG](https://github.com/yoonhero/aislop/releases/download/codex-vim-v2.0.0-rc.2/Codex-Vim-Focus-2.0.0.dmg),
open it, then drag
**Codex Vim Focus.app** onto the **Applications** shortcut. Open the installed
app and, from the `VIM` menu-bar item, click:

> **Setup Everything**

That single action:

1. installs the Karabiner grammar into the selected profile;
2. builds the separate Codex Vim app using Codex's bundled Node runtime;
3. enables launch at login;
4. requests Accessibility permission.

No global `node`, `npm`, `npx`, or `jq` installation is used at setup time.

## Menu-bar manager

**Codex Vim Focus** is the control plane:

- reports Accessibility, Karabiner, Codex build, and patch status;
- installs or refreshes Karabiner rules with timestamped backups;
- builds, rebuilds, launches, and removes Codex Vim;
- detects official Codex build changes every ten seconds;
- automatically rebuilds a stale copy after Codex Vim has quit;
- opens logs and Accessibility settings;
- supports launch-at-login without forcing the app to stay alive;
- includes a real **Quit Codex Vim Focus** command.

The generated Codex Vim copy records both the source `CFBundleVersion` and
cursor patch version in its `Info.plist`. Its own Sparkle updates are disabled:
the manager always rebuilds from the current signed official app instead.

## Cursor modes

- **INSERT:** blinking native bar at full theme text color;
- **NORMAL:** static native block at 42% opacity;
- **VISUAL:** static native block at 32% plus a restrained selection tint.

The native Chromium renderer owns position, wrapping, scrolling, and line
height. Colors derive from `currentColor`, so light and dark themes invert
automatically. The former Accessibility-positioned blue overlay has been
removed.

## Keys

| Key | NORMAL mode |
| --- | --- |
| `Esc` | enter NORMAL without blurring the prompt |
| `i` / `a` | insert here / after the cursor |
| `I` / `A` | insert at line start / end |
| `o` / `O` | open a line below / above |
| `h j k l` | move by character or visual line |
| `w e b` | move by macOS word boundaries |
| `0` / `$` | line start / end |
| `gg` / `G` | prompt start / end |
| `x` / `X` / `D` | delete forward / backward / to line end |
| `u` / `Ctrl-r` | undo / redo |
| `p` | paste |
| `v` | enter VISUAL mode |
| `Ctrl-Esc` | emergency return to INSERT |

Operator composition includes `dw`, `db`, `d$`, `dd`, `ciw`, `caw`, `yy`,
`dgg`, `cG`, and their change/yank equivalents.

## Privacy boundary

Focus observes only:

- frontmost application and focused Accessibility role;
- collapsed selection index and line number for Vim's `a` boundary;
- official and generated Codex bundle versions.

It does not read, retain, or log prompt text.

## Build a release

```sh
./focus-watcher/package-release.sh
```

The default artifact is ad-hoc signed for local testing. Public macOS
distribution should use Developer ID signing and notarization:

```sh
CODE_SIGN_IDENTITY="Developer ID Application: …" \
NOTARY_PROFILE="codex-vim-notary" \
./focus-watcher/package-release.sh
```

The release contains both a drag-to-Applications DMG and a portable ZIP.
Artifacts and SHA-256 checksums are written to `focus-watcher/dist/`. With
`NOTARY_PROFILE`, both the app and final DMG are submitted and stapled.

## Development

```sh
node test.mjs
swift build -c release --package-path focus-watcher
./focus-watcher/install.sh
```

The source installer replaces only the local Focus manager. Files it supersedes
are moved to the Trash, not permanently deleted.

## Uninstall

Use the menu's **Remove** submenu for Codex Vim and Karabiner rules. Then quit
and move **Codex Vim Focus.app** to the Trash.
