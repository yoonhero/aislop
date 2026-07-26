#!/bin/sh
set -eu

source_app=${1:?source app required}
target_app=${2:?target app required}
resources=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
node="$source_app/Contents/Resources/cua_node/bin/node"
asar="$resources/node_modules/@electron/asar/bin/asar.mjs"
patch="$resources/patch-asar.mjs"
patch_version=5

[ -x "$node" ] || { echo "Bundled Codex Node runtime not found" >&2; exit 1; }
[ -f "$asar" ] || { echo "Codex Vim Focus runtime is incomplete" >&2; exit 1; }
[ -f "$patch" ] || { echo "Cursor patch is missing" >&2; exit 1; }

if pgrep -f "^$target_app/Contents/MacOS/ChatGPT" >/dev/null 2>&1; then
  echo "Quit Codex Vim before rebuilding it." >&2
  exit 1
fi

parent=$(dirname "$target_app")
staging="$target_app.installing.$$"
work=$(mktemp -d /tmp/codex-vim-focus.XXXXXX)
trap 'rm -rf "$staging" "$work"' EXIT
mkdir -p "$parent"

cp -cR "$source_app" "$staging" 2>/dev/null \
  || /usr/bin/ditto "$source_app" "$staging"
"$node" "$asar" extract "$staging/Contents/Resources/app.asar" "$work/app"
"$node" "$patch" "$work/app"
"$node" "$asar" pack "$work/app" "$work/app.asar"
install -m 644 "$work/app.asar" "$staging/Contents/Resources/app.asar"

info="$staging/Contents/Info.plist"
source_version=$(/usr/libexec/PlistBuddy -c "Print :CFBundleVersion" "$source_app/Contents/Info.plist")
hash=$(shasum -a 256 "$staging/Contents/Resources/app.asar" | awk '{print $1}')

set_plist() {
  /usr/libexec/PlistBuddy -c "Set :$1 $2" "$info" 2>/dev/null \
    || /usr/libexec/PlistBuddy -c "Add :$1 $3 $2" "$info"
}

set_plist "ElectronAsarIntegrity:Resources/app.asar:hash" "$hash" string
set_plist CFBundleDisplayName "Codex Vim" string
set_plist CFBundleName "Codex Vim" string
set_plist AislopCodexVimSourceBundleVersion "$source_version" string
set_plist AislopCodexVimPatchVersion "$patch_version" string
set_plist SUEnableAutomaticChecks false bool
set_plist SUAutomaticallyUpdate false bool
set_plist SUAllowsAutomaticUpdates false bool

xattr -dr com.apple.quarantine "$staging" 2>/dev/null || true
codesign --force --deep --sign - "$staging"

if [ -e "$target_app" ]; then
  trash="$HOME/.Trash/Codex Vim.$(date +%Y%m%d%H%M%S).$$.app"
  mv "$target_app" "$trash"
fi
mv "$staging" "$target_app"
echo "Installed Codex Vim build $source_version"
