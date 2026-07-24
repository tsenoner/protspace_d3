#!/usr/bin/env python3
"""Sync uv.lock's workspace-member versions to the released version.

python-semantic-release bumps the version in the pyproject files but is
configured not to touch uv.lock. Since CI runs `uv sync --locked`, the resulting
version drift (the lock's protspace/protlabel `version` fields left at the old
value) breaks CI on the release commit and every PR that merges with it.

This script is run from semantic-release's `build_command` (after the version is
stamped, before the release commit) to keep the lock in sync. It is a **surgical
text edit** of only the two editable-member `version` fields — deliberately NOT
`uv lock`, because a full re-lock re-serializes every dependency marker in the
running uv's format (version-dependent churn, e.g. rewriting torch/cuda platform
markers) that we do not want landing in a release commit.

Version source: the `NEW_VERSION` env var that semantic-release provides, falling
back to the stamped `[project].version` in apps/protspace/pyproject.toml so the
script is also runnable standalone.
"""

import os
import pathlib
import re
import sys
import tomllib

_HERE = pathlib.Path(__file__).resolve()
APP_DIR = _HERE.parents[1]  # apps/protspace
LOCK_PATH = _HERE.parents[3] / "uv.lock"  # workspace root
MEMBERS = ("protspace", "protlabel")


def _resolve_version() -> str:
    env = os.environ.get("NEW_VERSION")
    if env:
        return env.strip()
    # Fallback (standalone runs): read the just-stamped [project].version.
    pyproject = tomllib.loads((APP_DIR / "pyproject.toml").read_text())
    return pyproject["project"]["version"]


def main() -> None:
    version = _resolve_version()
    text = LOCK_PATH.read_text()
    for name in MEMBERS:
        # Match only the [[package]] table's `name`/`version` pair (adjacent
        # lines), never a `{ name = "protspace" }` dependency reference.
        text, count = re.subn(
            rf'(name = "{name}"\nversion = )"[^"]+"',
            rf'\g<1>"{version}"',
            text,
        )
        if count != 1:
            sys.exit(f"expected exactly one '{name}' package entry, found {count}")
    LOCK_PATH.write_text(text)
    print(f"synced uv.lock ({', '.join(MEMBERS)}) -> {version}")


if __name__ == "__main__":
    main()
