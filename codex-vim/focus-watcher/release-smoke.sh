#!/bin/sh
set -eu

here=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
archive="$here/dist/Codex-Vim-Focus-2.0.0.zip"
dmg="$here/dist/Codex-Vim-Focus-2.0.0.dmg"
work=$(mktemp -d /tmp/codex-vim-release-smoke.XXXXXX)
trap 'rm -rf "$work"' EXIT

"$here/package-release.sh"
/usr/bin/ditto -x -k "$archive" "$work"
app="$work/Codex Vim Focus.app"
target="$work/Codex Vim Test.app"

codesign --verify --deep --strict "$app"
"$app/Contents/MacOS/CodexVimFocus" --diagnose > "$work/diagnostics.json"
node -e 'JSON.parse(require("fs").readFileSync(process.argv[1]))' \
  "$work/diagnostics.json"
"$app/Contents/Resources/install-codex-vim.sh" \
  /Applications/ChatGPT.app "$target"
codesign --verify --deep --strict "$target"

source_version=$(/usr/libexec/PlistBuddy \
  -c "Print :CFBundleVersion" /Applications/ChatGPT.app/Contents/Info.plist)
target_version=$(/usr/libexec/PlistBuddy \
  -c "Print :AislopCodexVimSourceBundleVersion" "$target/Contents/Info.plist")
patch_version=$(/usr/libexec/PlistBuddy \
  -c "Print :AislopCodexVimPatchVersion" "$target/Contents/Info.plist")
archive_hash=$(shasum -a 256 "$target/Contents/Resources/app.asar" | awk '{print $1}')
plist_hash=$(/usr/libexec/PlistBuddy \
  -c "Print :ElectronAsarIntegrity:Resources/app.asar:hash" \
  "$target/Contents/Info.plist")

test "$source_version" = "$target_version"
test "$patch_version" = 5
test "$archive_hash" = "$plist_hash"
hdiutil verify "$dmg" >/dev/null
mkdir "$work/mount"
hdiutil attach -nobrowse -readonly -mountpoint "$work/mount" "$dmg" >/dev/null
test -L "$work/mount/Applications"
test -f "$work/mount/Read Me.txt"
codesign --verify --deep --strict "$work/mount/Codex Vim Focus.app"
hdiutil detach "$work/mount" >/dev/null
echo "release smoke test passed · Codex $source_version · patch v$patch_version"
