"""The golden v3 bundle both languages read.

``packages/core/src/components/data-loader/utils/__fixtures__/v3-sample.parquetbundle``
is committed binary: Python writes it (``scripts/generate_v3_fixture.py``) and
vitest reads it, so it is the only place the two v3 implementations meet.  These
tests keep the committed bytes and the generator from drifting apart, and pin the
exact cells the browser side asserts on -- a fixture nobody reads back in Python
is a fixture that silently rots.

Regenerate with ``uv run python scripts/generate_v3_fixture.py``.
"""

import importlib.util
import io
import json
import sys
from pathlib import Path

import pyarrow.parquet as pq
import pytest

from protspace.data.io.bundle import (
    PARQUET_BUNDLE_DELIMITER,
    read_settings_from_bundle,
    read_tables,
)
from protspace.data.io.bundle_v3 import MANIFEST_KEY

FIXTURE = (
    Path(__file__).resolve().parents[3]
    / "packages"
    / "core"
    / "src"
    / "components"
    / "data-loader"
    / "utils"
    / "__fixtures__"
    / "v3-sample.parquetbundle"
)

_SPEC = importlib.util.spec_from_file_location(
    "generate_v3_fixture",
    Path(__file__).parent.parent / "scripts" / "generate_v3_fixture.py",
)
generator = importlib.util.module_from_spec(_SPEC)
sys.modules["generate_v3_fixture"] = generator
_SPEC.loader.exec_module(generator)

pytestmark = pytest.mark.skipif(
    not FIXTURE.exists(), reason="browser fixtures not checked out"
)


@pytest.fixture(scope="module")
def parts() -> list[bytes]:
    return FIXTURE.read_bytes().split(PARQUET_BUNDLE_DELIMITER)


@pytest.fixture(scope="module")
def tables():
    return read_tables(FIXTURE)


def test_fixture_is_a_six_part_v3_container(parts):
    assert len(parts) == 6
    # No settings, no statistics -- the two zero-byte slots are what keeps the
    # payloads part at index five, where the browser reads it positionally.
    assert parts[3] == b"" and parts[4] == b""
    assert read_settings_from_bundle(FIXTURE) is None

    footer = pq.read_metadata(io.BytesIO(parts[0])).metadata
    assert footer[b"protspace_format_version"] == b"3"
    assert pq.read_table(io.BytesIO(parts[5])).column_names == ["name", "data"]


def test_manifest_declares_every_kind_the_reader_dispatches_on(parts):
    manifest = json.loads(pq.read_metadata(io.BytesIO(parts[0])).metadata[MANIFEST_KEY])

    assert manifest["idColumn"] == "protein_id"
    assert manifest["projections"] == [
        {"name": "pca2", "dimension": 2},
        {"name": "umap3", "dimension": 3},
    ]
    assert manifest["columns"] == {
        "cath": {"kind": "multi", "sourceType": "string", "scores": True},
        "go_bp": {"kind": "multi", "sourceType": "string", "evidence": True},
        "pfam": {"kind": "multi", "sourceType": "string", "scores": True},
        "kingdom": {"kind": "categorical", "sourceType": "string"},
        "predicted_tm": {"kind": "categorical", "sourceType": "string"},
        "length": {"kind": "numeric", "numericType": "int", "sourceType": "string"},
        "hydrophobicity": {
            "kind": "numeric",
            "numericType": "float",
            "sourceType": "string",
        },
        "kingdom__pred_value": {"kind": "categorical", "sourceType": "string"},
        "kingdom__pred_confidence": {
            "kind": "numeric",
            "numericType": "float",
            "sourceType": "float",
        },
        "kingdom__pred_source": {"kind": "categorical", "sourceType": "string"},
    }


def test_part_one_is_the_physical_v3_schema(parts):
    schema = pq.read_schema(io.BytesIO(parts[0]))

    # Multi columns become a hit count; categoricals a code; numerics a double.
    assert schema.names == [
        "protein_id",
        "cath__count",
        "go_bp__count",
        "pfam__count",
        "kingdom",
        "predicted_tm",
        "length",
        "hydrophobicity",
        "kingdom__pred_value",
        "kingdom__pred_confidence",
        "kingdom__pred_source",
    ]
    # hyparquet only hands back typed arrays for REQUIRED flat columns.
    assert all(not field.nullable for field in schema)


def test_read_tables_gives_back_the_v2_cells_the_generator_started_from(tables):
    annotations, _metadata, _data = tables
    cells = generator.ANNOTATION_CELLS

    assert annotations.column("protein_id").to_pylist() == generator.PROTEIN_IDS
    # P1/P2's cath and go_bp are the v2 golden fixture's own cells: the
    # percent-encoded ';' inside a CATH name survives the hit split, an unnamed
    # bare code stays unnamed, and the '|IDA' evidence suffix round-trips.
    for column in ("cath", "go_bp", "pfam", "kingdom", "predicted_tm", "length"):
        assert annotations.column(column).to_pylist() == cells[column], column

    # A score only float64 can carry: 1e-200 flushes to zero in float32 and
    # 123456789 re-spells as 1.2345679e+08.
    assert "|1e-200" in annotations.column("cath")[4].as_py()
    assert annotations.column("cath")[2].as_py().endswith("|123456789")

    # Documented non-identities: a float numeric column comes back in its
    # shortest round-trip spelling, and a null string cell as "".
    assert annotations.column("hydrophobicity").to_pylist() == [
        "0.5",
        "-1.25",
        "",
        "3.0",
        "0.001",
        "42.0",
    ]
    assert annotations.column("kingdom__pred_source").to_pylist() == [
        "",
        "Q9XYZ1",
        "",
        "P0A7B8",
        "A0A123",
        "",
    ]
    # sourceType restores the EAT confidence's float32, missing as NaN.
    confidence = annotations.column("kingdom__pred_confidence")
    assert confidence.type == "float"
    assert [confidence[i].as_py() for i in (1, 3, 4)] == [0.875, 0.5, 0.25]


def test_read_tables_rebuilds_both_projections_in_protein_order(tables):
    _annotations, metadata, data = tables

    assert metadata.column("projection_name").to_pylist() == ["pca2", "umap3"]
    assert metadata.column("dimensions").to_pylist() == [2, 3]

    frame = data.to_pandas()
    pca2 = frame[frame.projection_name == "pca2"]
    assert pca2.identifier.tolist() == generator.PROTEIN_IDS
    # P1 and P2 sit where the v2 golden fixture puts them.
    assert pca2[["x", "y"]].values.tolist()[:2] == [[0.0, 0.0], [1.0, 1.0]]
    assert pca2.z.isna().all()  # 2D: no z

    umap3 = frame[frame.projection_name == "umap3"]
    assert umap3[["x", "y", "z"]].values.tolist()[0] == [0.0, 0.25, 0.5]


def test_committed_fixture_still_matches_its_generator(tmp_path):
    """The committed bytes are what ``scripts/generate_v3_fixture.py`` writes today.

    Compared decoded rather than byte-for-byte: parquet embeds the writer
    version, so bytes would fail on every pyarrow bump for no reason.
    """
    from protspace.data.io.bundle import write_bundle

    regenerated = tmp_path / "v3-sample.parquetbundle"
    write_bundle(generator.source_tables(), regenerated)

    for fresh, committed in zip(
        read_tables(regenerated), read_tables(FIXTURE), strict=True
    ):
        assert fresh.equals(committed)
