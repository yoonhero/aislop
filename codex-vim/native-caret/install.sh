#!/bin/sh
set -eu

here=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
source_app=${CODEX_SOURCE_APP:-/Applications/ChatGPT.app}
target_app=${CODEX_VIM_APP:-"$HOME/Applications/Codex Vim.app"}
action=${1:-install}

trash() {
  [ ! -e "$1" ] || {
    destination="$HOME/.Trash/$(basename "$1").$(date +%Y%m%d%H%M%S).$$"
    mv "$1" "$destination"
    echo "moved previous copy to: $destination"
  }
}

case "$action" in
  install)
    [ -f "$source_app/Contents/Resources/app.asar" ] || {
      echo "Codex app not found: $source_app" >&2
      exit 1
    }

    mkdir -p "$(dirname "$target_app")"
    staging="$target_app.installing.$$"
    trap 'rm -rf "$staging" "${work:-}"' EXIT
    cp -cR "$source_app" "$staging"

    work=$(mktemp -d /tmp/codex-vim-caret.XXXXXX)
    npx --yes @electron/asar@latest extract \
      "$staging/Contents/Resources/app.asar" "$work/app"
    node "$here/patch-asar.mjs" "$work/app"
    npx --yes @electron/asar@latest pack \
      "$work/app" "$work/app.asar"
    install -m 644 "$work/app.asar" \
      "$staging/Contents/Resources/app.asar"

    hash=$(shasum -a 256 "$staging/Contents/Resources/app.asar" | awk '{print $1}')
    /usr/libexec/PlistBuddy \
      -c "Set :ElectronAsarIntegrity:Resources/app.asar:hash $hash" \
      "$staging/Contents/Info.plist"
    plutil -replace CFBundleDisplayName -string "Codex Vim" \
      "$staging/Contents/Info.plist"
    plutil -replace CFBundleName -string "Codex Vim" \
      "$staging/Contents/Info.plist"

    codesign --force --deep --sign - "$staging"
    trash "$target_app"
    mv "$staging" "$target_app"
    defaults write com.aislop.codex-vim-focus cursor.enabled -bool false

    echo "installed: $target_app"
    echo "quit Codex, then open Codex Vim to use the native block caret"
    ;;
  uninstall)
    trash "$target_app"
    echo "native cursor copy removed"
    ;;
  *)
    echo "usage: $0 [install|uninstall]" >&2
    exit 2
    ;;
esac
