#!/usr/bin/env python3

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src" / "study-guide.md"
DIST = ROOT / "dist"
HTML = DIST / "abstract-linear-algebra-1-1-to-2-3.html"
PDF = DIST / "abstract-linear-algebra-1-1-to-2-3.pdf"
CHROME = Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
GENERATE = ROOT / "scripts" / "generate_source_guide.py"


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
        "--metadata=title:추상선형대수학 1.1-2.3 원문 정리본",
    ]

    run(
        common
        + [
            "--to=html5",
            "--css=../assets/study-guide.css",
            "--metadata=pagetitle:추상선형대수학 1.1-2.3 원문 정리본",
            "--mathjax",
            "-o",
            str(HTML),
        ]
    )

    run(
        [
            str(CHROME),
            "--headless",
            "--disable-gpu",
            "--run-all-compositor-stages-before-draw",
            "--virtual-time-budget=12000",
            "--no-pdf-header-footer",
            f"--print-to-pdf={PDF}",
            HTML.as_uri(),
        ]
    )

    print(f"Built {HTML}")
    print(f"Built {PDF}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except subprocess.CalledProcessError as exc:
        print(f"build failed: {' '.join(exc.cmd)}", file=sys.stderr)
        raise SystemExit(exc.returncode)
