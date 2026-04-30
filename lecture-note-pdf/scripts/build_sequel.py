#!/usr/bin/env python3

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src" / "study-guide-3-4.md"
DIST = ROOT / "dist"
HTML = DIST / "abstract-linear-algebra-3-4.html"
PDF = DIST / "abstract-linear-algebra-3-4.pdf"
CHROME = Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
GENERATE = ROOT / "scripts" / "generate_sequel_guide.py"
TITLE = "추상선형대수학 3-4장 교과서화 노트"


def run(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True, cwd=ROOT)


def main() -> int:
    DIST.mkdir(parents=True, exist_ok=True)

    if not CHROME.exists():
        print(f"build failed: missing Chrome binary at {CHROME}", file=sys.stderr)
        return 1

    run(["python3", str(GENERATE)])

    common = [
        "pandoc",
        str(SRC),
        "--from=markdown+tex_math_dollars+tex_math_single_backslash",
        "--standalone",
        "--toc",
        "--toc-depth=3",
        f"--metadata=title:{TITLE}",
    ]

    run(common + ["--to=html5", "--css=../assets/study-guide.css", f"--metadata=pagetitle:{TITLE}", "--mathjax", "-o", str(HTML)])
    run([
        str(CHROME),
        "--headless",
        "--disable-gpu",
        "--run-all-compositor-stages-before-draw",
        "--virtual-time-budget=12000",
        "--no-pdf-header-footer",
        f"--print-to-pdf={PDF}",
        HTML.as_uri(),
    ])

    print(f"Built {HTML}")
    print(f"Built {PDF}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except subprocess.CalledProcessError as exc:
        print(f"build failed: {' '.join(exc.cmd)}", file=sys.stderr)
        raise SystemExit(exc.returncode)
