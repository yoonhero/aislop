#!/usr/bin/env bash
set -euo pipefail

project_dir=$(cd "$(dirname "$0")" && pwd)
output_dir=$(mkdir -p "$1" && cd "$1" && pwd)
version=$(node -p 'require(process.argv[1]).version' "$project_dir/extension/manifest.json")
stage=$(mktemp -d)
trap 'rm -rf "$stage"' EXIT

cp -R "$project_dir/extension" "$stage/extension"
mkdir "$stage/note-renderer"
for file in markdown.js math.js package.json package-lock.json; do
  cp "$project_dir/note-renderer/$file" "$stage/note-renderer/"
done
cat > "$stage/README.md" <<'BUILD'
HiBulb Firefox extension source

Use Node.js 24 and npm. From the root of this archive, run:

    npm ci --prefix note-renderer
    npm run build --prefix note-renderer
    npx --yes web-ext@9.2.0 build --source-dir extension

The renderer build bundles the local Markdown and TeX entry points into
extension/vendor. web-ext packages the extension directory for Firefox.
BUILD

npm ci --prefix "$stage/note-renderer"
npm run build --prefix "$stage/note-renderer"
for bundle in markdown.mjs math.mjs; do
  cmp "$project_dir/extension/vendor/$bundle" "$stage/extension/vendor/$bundle"
done

cd "$stage"
rm -f "$output_dir/pastel-pen-$version-review-source.zip"
zip -q -r "$output_dir/pastel-pen-$version-review-source.zip" README.md extension \
  note-renderer/markdown.js note-renderer/math.js note-renderer/package.json note-renderer/package-lock.json \
  -x '*/.DS_Store'
