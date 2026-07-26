#!/bin/sh
set -eu

here=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
app="$HOME/Applications/Codex Vim Focus.app"
agent="$HOME/Library/LaunchAgents/com.aislop.codex-vim-focus.plist"
label="gui/$(id -u)/com.aislop.codex-vim-focus"
action=${1:-install}

trash() {
  [ ! -e "$1" ] || {
    destination="$HOME/.Trash/$(basename "$1").$(date +%Y%m%d%H%M%S).$$"
    mv "$1" "$destination"
    echo "moved to: $destination"
  }
}

case "$action" in
  install)
    "$here/package-release.sh"
    stage=$(mktemp -d /tmp/codex-vim-focus-install.XXXXXX)
    trap 'rm -rf "$stage"' EXIT
    /usr/bin/ditto -x -k \
      "$here/dist/Codex-Vim-Focus-2.0.0.zip" "$stage"
    launchctl bootout "$label" 2>/dev/null || true
    pkill -TERM -x CodexVimFocus 2>/dev/null || true
    sleep 0.2
    trash "$app"
    trash "$agent"
    mkdir -p "$(dirname "$app")"
    /usr/bin/ditto "$stage/Codex Vim Focus.app" "$app"
    open "$app"
    trap - EXIT
    echo "installed: $app"
    echo "click Setup Everything in the VIM menu"
    ;;
  uninstall)
    launchctl bootout "$label" 2>/dev/null || true
    trash "$app"
    trash "$agent"
    karabiner_cli --set-variables \
      '{"aislop_codex_vim_textarea":0,"aislop_codex_vim_right_in_line":0}'
    echo "Codex Vim Focus removed"
    ;;
  *)
    echo "usage: $0 [install|uninstall]" >&2
    exit 2
    ;;
esac
