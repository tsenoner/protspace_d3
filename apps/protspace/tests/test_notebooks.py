"""The Colab notebooks have to survive IPython's cell transformation.

A cell magic (`%%capture`) is only recognised on the first line of a cell. Put
one below the `# @title` line that Colab needs there, and IPython parses it as
the line magic `%capture`, which does not exist: the cell raises `UsageError`
and aborts before the `pip install` and every import under it, taking all later
cells down with `NameError`. That shipped silently broken in two notebooks for
months, and the only thing keeping it fixed is a comment in each install cell
asking the next reader not to "simplify" the `subprocess.run` call back.

These tests are that comment's teeth. They glob the notebook directory rather
than naming files, so a notebook added later is covered without touching this
file.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

NOTEBOOK_DIR = Path(__file__).resolve().parents[1] / "notebooks"
NOTEBOOKS = sorted(NOTEBOOK_DIR.glob("*.ipynb"))


def _code_cells(path: Path):
    """Yield (index, source) for every code cell, source joined to one string."""
    nb = json.loads(path.read_text())
    for i, cell in enumerate(nb["cells"]):
        if cell.get("cell_type") != "code":
            continue
        source = cell["source"]
        yield i, source if isinstance(source, str) else "".join(source)


def test_notebook_directory_is_not_empty():
    """Guard the glob: an empty match would make every test below vacuous."""
    assert NOTEBOOKS, f"no notebooks found under {NOTEBOOK_DIR}"


@pytest.mark.parametrize("path", NOTEBOOKS, ids=lambda p: p.name)
def test_cell_magics_stay_on_the_first_line(path: Path):
    for index, source in _code_cells(path):
        for lineno, line in enumerate(source.splitlines()):
            if line.lstrip().startswith("%%") and lineno != 0:
                pytest.fail(
                    f"{path.name} cell {index}: cell magic {line.strip()!r} on line "
                    f"{lineno + 1}. Only line 1 is parsed as a cell magic; anywhere "
                    "else IPython reads it as a line magic and the cell aborts. Use "
                    "subprocess.run(..., capture_output=True) instead."
                )


@pytest.mark.parametrize("path", NOTEBOOKS, ids=lambda p: p.name)
def test_code_cells_compile_after_ipython_transformation(path: Path):
    """Catches the syntax errors a raw `compile()` would miss, and vice versa.

    Notebook cells are not plain Python: `!cmd` and `%magic` are rewritten
    before execution. Transforming first is what the real runtime does.

    `TransformerManager` is the transformer on its own, deliberately in place of
    `InteractiveShell.instance().input_transformer_manager`: the shell is a
    process-wide singleton that is never torn down, and building it sets
    `builtins.__IPYTHON__` and installs a `warnings` filter that would then
    outlive this test for the rest of the pytest session.
    """
    transform = pytest.importorskip(
        "IPython.core.inputtransformer2",
        reason="IPython is a dev-group dependency (via jupyter)",
    ).TransformerManager()

    for index, source in _code_cells(path):
        try:
            compile(transform.transform_cell(source), f"{path.name}:{index}", "exec")
        except SyntaxError as exc:
            pytest.fail(f"{path.name} cell {index} does not compile: {exc}")


@pytest.mark.parametrize("path", NOTEBOOKS, ids=lambda p: p.name)
def test_cells_carry_ids_when_the_format_requires_them(path: Path):
    """nbformat >= 4.5 requires cell ids.

    Without them every open regenerates random ones, so the file shows a diff
    nobody made.
    """
    nb = json.loads(path.read_text())
    if nb["nbformat"] * 100 + nb["nbformat_minor"] < 405:
        pytest.skip(f"{path.name} predates cell ids")
    missing = [i for i, cell in enumerate(nb["cells"]) if not cell.get("id")]
    assert not missing, f"{path.name}: cells {missing} have no id"
