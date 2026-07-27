"""Fail if any locked dependency can never install from a wheel.

A package that publishes no wheel for our ``requires-python`` is compiled from
sdist on every install, for every user, forever -- and nothing else in CI
notices, because a source build succeeds. ``pymmseqs`` sat in the core
dependencies for months publishing cp310-only wheels against a ``>=3.12``
floor; ``dash-treeview-antd`` did the same from a 2018 sdist.

Reads ``uv.lock`` only: no network, no resolution, ~0.1s.
"""

from __future__ import annotations

import sys
import tomllib
from pathlib import Path

# Packages knowingly built from source. Keep this list short and justified --
# every entry is a per-install compile that someone pays for.
ALLOWED: dict[str, str] = {
    "pymmseqs": (
        "cp310-only wheels across all releases. Confined to the optional "
        "'similarity' extra, so it is opt-in rather than paid by every install. "
        "Upstream asked for 3.12+ wheels -- see issue #396."
    ),
}

REPO_ROOT = Path(__file__).resolve().parents[3]


def main() -> int:
    lock_path = REPO_ROOT / "uv.lock"
    lock = tomllib.loads(lock_path.read_text())

    offenders: list[tuple[str, str]] = []
    for pkg in lock.get("package", []):
        source = pkg.get("source", {})
        if "registry" not in source:
            continue  # workspace members and direct URLs have no wheels to check
        name, version = pkg["name"], pkg.get("version", "?")
        if pkg.get("wheels"):
            continue
        if name in ALLOWED:
            continue
        offenders.append((name, version))

    if not offenders:
        print(f"OK: every registry package in {lock_path.name} ships at least one wheel")
        return 0

    print("Locked packages with NO wheel on PyPI (compiled from sdist on every install):")
    for name, version in sorted(offenders):
        print(f"  - {name} {version}")
    print(
        "\nEither drop the dependency, move it behind an extra, ask upstream for wheels,\n"
        "or add it to ALLOWED in this script with a reason."
    )
    return 1


if __name__ == "__main__":
    sys.exit(main())
