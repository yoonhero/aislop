#!/bin/sh
set -eu

here=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec "$here/focus-watcher/install.sh" "${1:-install}"
