"""Package the Zotero plugin and its already-bundled Markdown/KaTeX modules."""
import argparse
import hashlib
import json
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument('output', type=Path)
args = parser.parse_args()
manifest = json.loads((root / 'manifest.json').read_text())
version = manifest['version']
args.output.mkdir(parents=True, exist_ok=True)
output = args.output / f'hibulb-zotero-{version}.xpi'
with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
    for name in ('manifest.json', 'bootstrap.js', 'reader.js', 'reader.css', 'note.css', 'icon.png'):
        archive.write(root / name, name)
    for file in sorted((root / 'vendor').iterdir()):
        archive.write(file, 'vendor/' + file.name)
zotero = manifest['applications']['zotero']
feed = {'addons': {zotero['id']: {'updates': [{
    'version': version,
    'update_link': zotero['update_url'].rsplit('/', 1)[0] + '/' + output.name + '?download=1',
    'update_hash': 'sha256:' + hashlib.sha256(output.read_bytes()).hexdigest(),
    'applications': {'zotero': {key: zotero[key] for key in ('strict_min_version', 'strict_max_version')}},
}]}}}
(args.output / 'updates.json').write_text(json.dumps(feed, indent=2) + '\n')
print(output)
