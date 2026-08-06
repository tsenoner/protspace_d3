import json
import warnings
from pathlib import Path

NOTEBOOK_PATH = (
    Path(__file__).resolve().parents[1] / "notebooks" / "ProtSpace_Preparation.ipynb"
)
GENERATE_CELL_TITLE = "# @title 3. Generate & Download"
MIN_PARAMETER_GROUP_BASIS_PX = 300


def _generate_cell_source() -> str:
    notebook = json.loads(NOTEBOOK_PATH.read_text())
    for cell in notebook["cells"]:
        source_text = "".join(cell.get("source", []))
        if source_text.startswith(GENERATE_CELL_TITLE):
            return source_text
    raise AssertionError("Generate & Download cell not found")


def test_parameter_groups_wrap_before_slider_tracks_collapse():
    displayed_widgets = []
    namespace = {"display": displayed_widgets.append}

    source = _generate_cell_source()
    with warnings.catch_warnings():
        warnings.filterwarnings(
            "ignore",
            message=r"Passing unrecognized arguments to super\(Layout\).*",
            category=DeprecationWarning,
        )
        exec(compile(source, str(NOTEBOOK_PATH), "exec"), namespace)

    parameter_groups = namespace["param_groups"]
    assert displayed_widgets, "Generate cell did not render its widget tree"
    assert parameter_groups, "Generate cell did not create parameter groups"

    param_grid = namespace["param_grid"]
    assert "wrap" in (param_grid.layout.flex_flow or ""), (
        "Parameter grid must wrap; a nowrap row lets the cards shrink past their tracks"
    )

    for group, _methods in parameter_groups:
        assert group.layout.overflow == "hidden"
        flex_basis = group.layout.flex.split()[-1]
        assert flex_basis.endswith("px")
        basis_px = int(flex_basis.removesuffix("px"))
        assert basis_px >= MIN_PARAMETER_GROUP_BASIS_PX
