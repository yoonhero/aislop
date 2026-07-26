#!/bin/sh
set -eu

here=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
project=$(dirname "$here")
version=${CODEX_VIM_FOCUS_VERSION:-2.0.0}
identity=${CODE_SIGN_IDENTITY:--}
dist="$here/dist"
stage=$(mktemp -d /tmp/codex-vim-focus-release.XXXXXX)
app="$stage/Codex Vim Focus.app"
runtime="$stage/runtime"
trap 'rm -rf "$stage"' EXIT

node "$project/build.mjs"
swift build -c release --package-path "$here"
npm install --prefix "$runtime" --omit=dev --no-audit --no-fund \
  @electron/asar@4.2.1

mkdir -p "$app/Contents/MacOS" "$app/Contents/Resources" "$dist"
install -m 755 "$here/.build/release/CodexVimFocus" \
  "$app/Contents/MacOS/CodexVimFocus"
install -m 644 "$here/Info.plist" "$app/Contents/Info.plist"
plutil -replace CFBundleShortVersionString -string "$version" \
  "$app/Contents/Info.plist"
plutil -replace CFBundleVersion -string "${version%%.*}" \
  "$app/Contents/Info.plist"

install -m 755 "$here/Resources/install-codex-vim.sh" \
  "$app/Contents/Resources/install-codex-vim.sh"
install -m 644 "$project/native-caret/patch-asar.mjs" \
  "$app/Contents/Resources/patch-asar.mjs"
install -m 644 "$project/karabiner-codex-vim.json" \
  "$app/Contents/Resources/karabiner-codex-vim.json"
cp -R "$runtime/node_modules" "$app/Contents/Resources/node_modules"

iconset="$stage/CodexVimFocus.iconset"
mkdir -p "$iconset"
swift "$here/make-icon.swift" "$stage/icon.png"
for spec in "16 16" "16 32" "32 32" "32 64" "128 128" "128 256" \
  "256 256" "256 512" "512 512" "512 1024"; do
  set -- $spec
  points=$1
  pixels=$2
  suffix=
  [ "$points" = "$pixels" ] || suffix=@2x
  sips -z "$pixels" "$pixels" "$stage/icon.png" \
    --out "$iconset/icon_${points}x${points}${suffix}.png" >/dev/null
done
iconutil -c icns "$iconset" -o "$app/Contents/Resources/CodexVimFocus.icns"

if [ "$identity" = - ]; then
  codesign --force --deep --sign - "$app"
else
  codesign --force --deep --options runtime --timestamp --sign "$identity" "$app"
fi
codesign --verify --deep --strict "$app"

archive="$dist/Codex-Vim-Focus-$version.zip"
dmg="$dist/Codex-Vim-Focus-$version.dmg"
rm -f "$archive" "$archive.sha256" "$dmg" "$dmg.sha256"
if [ -n "${NOTARY_PROFILE:-}" ]; then
  submission="$stage/notarization.zip"
  /usr/bin/ditto -c -k --sequesterRsrc --keepParent "$app" "$submission"
  xcrun notarytool submit "$submission" \
    --keychain-profile "$NOTARY_PROFILE" --wait
  xcrun stapler staple "$app"
fi
/usr/bin/ditto -c -k --sequesterRsrc --keepParent "$app" "$archive"
(cd "$dist" && shasum -a 256 "$(basename "$archive")" > "$(basename "$archive").sha256")

dmgroot="$stage/dmg"
mkdir -p "$dmgroot"
/usr/bin/ditto "$app" "$dmgroot/Codex Vim Focus.app"
ln -s /Applications "$dmgroot/Applications"
install -m 644 "$here/DMG-README.txt" "$dmgroot/Read Me.txt"
hdiutil create \
  -volname "Codex Vim Focus $version" \
  -srcfolder "$dmgroot" \
  -format UDZO \
  -imagekey zlib-level=9 \
  -ov "$dmg" >/dev/null

if [ "$identity" != - ]; then
  codesign --force --timestamp --sign "$identity" "$dmg"
fi
if [ -n "${NOTARY_PROFILE:-}" ]; then
  xcrun notarytool submit "$dmg" \
    --keychain-profile "$NOTARY_PROFILE" --wait
  xcrun stapler staple "$dmg"
fi
hdiutil verify "$dmg" >/dev/null
(cd "$dist" && shasum -a 256 "$(basename "$dmg")" > "$(basename "$dmg").sha256")
printf '%s\n%s\n' "$dmg" "$archive"
