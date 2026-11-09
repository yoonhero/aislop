"""Create Firefox's update feed from a Mozilla-signed release package."""

import argparse
import hashlib
import json
from pathlib import Path
import re
from zipfile import ZipFile


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("xpi", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    source = Path(__file__).parent / "extension" / "manifest.json"
    manifest = json.loads(source.read_text())
    gecko = manifest["browser_specific_settings"]["gecko"]
    version = manifest["version"]
    if not re.fullmatch(r"[0-9]+\.[0-9]+\.[0-9]+", version):
        parser.error("Use a three-part release version in manifest.json.")
    if args.xpi.name != f"pastel-pen-{version}.xpi":
        parser.error("The release filename must match the manifest version.")

    with ZipFile(args.xpi) as package:
        names = set(package.namelist())
        if not {"META-INF/mozilla.rsa", "META-INF/mozilla.sf"} <= names:
            parser.error("Use the XPI returned by Mozilla signing.")
        if json.loads(package.read("manifest.json")) != manifest:
            parser.error("The signed XPI manifest must match the source manifest.")

    digest = hashlib.sha256(args.xpi.read_bytes()).hexdigest()
    download_base = gecko["update_url"].rsplit("/", 1)[0]
    feed = {
        "addons": {
            gecko["id"]: {
                "updates": [{
                    "version": version,
                    "update_link": f"{download_base}/{args.xpi.name}?download=1",
                    "update_hash": f"sha256:{digest}",
                    "applications": {
                        "gecko": {"strict_min_version": gecko["strict_min_version"]}
                    },
                }]
            }
        }
    }
    args.output.write_text(json.dumps(feed, indent=2) + "\n")


if __name__ == "__main__":
    main()
