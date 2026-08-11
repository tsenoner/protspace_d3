"""The optional-extras section exists twice and has to stay identical.

`apps/protspace/README.md` is what PyPI renders, `docs/guide/python-cli.md` is
what protspace.app renders, and neither can include the other. Nothing else in
the repo compares them: prettier skips `apps/protspace/` and vitepress never
sees the README, so this is the only thing standing between the two copies.
"""

from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[3]
README = Path(__file__).resolve().parents[1] / "README.md"
CLI_GUIDE = REPO_ROOT / "docs" / "guide" / "python-cli.md"


def _extras_block(markdown: str) -> list[str]:
    """The extras table + upgrade note, with table padding normalized away."""
    body = markdown.split("**Optional extras**", 1)[1].split("\n## ", 1)[0]
    rows = []
    for line in body.splitlines():
        line = line.strip()
        if not line:
            continue
        cells = [cell.strip() for cell in line.strip("|").split("|")]
        if all(set(cell) <= set("-:") for cell in cells):
            continue  # table separator row: padding only
        rows.append(" | ".join(cells))
    return rows


def test_extras_section_matches_between_readme_and_docs():
    if not CLI_GUIDE.exists():
        pytest.skip("published docs are not part of this checkout")

    assert _extras_block(README.read_text()) == _extras_block(CLI_GUIDE.read_text())
