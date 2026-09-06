#!/usr/bin/env python3
"""Regenerate the browser's golden format-v3 bundle fixture.

``packages/core/src/components/data-loader/utils/__fixtures__/v3-sample.parquetbundle``
is the cross-language contract for parquetbundle v3: Python writes it here,
`bundle-v3.ts` reads it in vitest.  It is a **superset** of the committed
``v2-sample.parquetbundle``: proteins ``P1``/``P2`` carry byte-identical
``cath`` and ``go_bp`` cells (including the percent-encoded ``;`` inside a CATH
name and the ``|IDA`` evidence suffix), so every assertion the v2 golden test
makes still holds, and four more proteins plus six more columns cover the v3
paths a two-row two-column table cannot reach:

* a plain single-valued categorical (``kingdom``) whose frequency order differs
  from its first-occurrence order;
* multi-valued columns with scores (``cath``, ``pfam``) and with evidence codes
  (``go_bp``, both the ``IDA`` and the ``ECO:0000269`` spellings);
* ``pfam`` also has two scores on one hit, and zero hits at the first, an
  interior and the last row, so the reader's CSR prefix-sum and the synthetic
  ``<NA>`` insertion are exercised at every boundary;
* scores that only survive in float64: ``1e-200`` flushes to zero in float32
  and ``123456789`` re-spells as ``1.2345679e+08``;
* a numeric int column (``length``) and a numeric float one
  (``hydrophobicity``), each with a blank cell;
* ``predicted_tm``, whose labels are the literal missing-value spellings
  ``none`` and ``NA`` — Python keeps them (v3 is a container encoding), the
  browser folds them into ``<NA>`` at read time;
* a 2D (``pca2``, P1/P2 at the v2 fixture's coordinates) and a 3D (``umap3``)
  projection;
* the EAT companion trio on ``kingdom`` (``__pred_value`` string,
  ``__pred_confidence`` float32, ``__pred_source`` string), null for the
  proteins with no prediction.

Settings and statistics are deliberately absent, so the container's two
zero-byte slots keep the payloads part at position six.

Usage::

    cd apps/protspace && uv run python scripts/generate_v3_fixture.py
"""

from __future__ import annotations

import logging
from pathlib import Path

import numpy as np
import pandas as pd
import pyarrow as pa

from protspace.data.annotations.encoding import encode_field, stamp_format_version
from protspace.data.io.bundle import write_bundle
from protspace.data.io.predictions import add_overlay_columns
from protspace.data.processors.base_processor import BaseProcessor

FIXTURE_PATH = (
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

PROTEIN_IDS = ["P1", "P2", "P3", "P4", "P5", "P6"]

# The v2 fixture's CATH name: a label whose own text contains the ';' the v2
# grammar reserves as the hit separator, so it has to travel percent-encoded.
_CATH_NAME = encode_field("Ribosomal Protein L15; Chain: K; domain 2")
_CATH_1 = f"G3DSA:1.10.10.10 ({_CATH_NAME})"

ANNOTATION_CELLS: dict[str, list[str]] = {
    # P1/P2 are the v2 fixture's cells, verbatim.
    "cath": [
        f"{_CATH_1}|50.2;G3DSA:6.20.10.10|60.5",
        "6.20.10.10",
        "G3DSA:6.20.10.10|123456789",
        "",
        f"{_CATH_1}|1e-200",
        "6.20.10.10",
    ],
    "go_bp": [
        "apoptotic process|IDA",
        "",
        "apoptotic process|IDA;protein folding|ECO:0000269",
        "protein folding|IEA",
        "",
        "apoptotic process|EXP",
    ],
    # Zero hits first, interior and last; two scores on one hit; a label
    # carrying the encoded '|' the grammar reserves as the suffix separator.
    "pfam": [
        "",
        "PF00001 (7tm%3B1)|1e-10,2.5;PF00002|0.5",
        "",
        "PF00001 (7tm%3B1)|0.25",
        "PF00003 (a%7Cb)|3",
        "",
    ],
    # Frequency order (Bacteria, Archaea, Eukaryota) differs from first
    # occurrence only at the tail, which is what pins the tie-break rule.
    "kingdom": ["Bacteria", "Archaea", "Bacteria", "Eukaryota", "Bacteria", "Archaea"],
    # Literal missing-value spellings kept as labels: a display decision the
    # browser makes, not a container one.
    "predicted_tm": ["none", "none", "TM helix", "none", "NA", "TM helix"],
    "length": ["120", "", "340", "0", "-15", "1024"],
    "hydrophobicity": ["0.5", "-1.25", "", "3.0", "1e-3", "42"],
}

# (query_id, label, reliability, distance, source_id) for the EAT overlay.
PREDICTIONS = [
    ("P2", "Bacteria", 0.875, 0.12, "Q9XYZ1"),
    ("P4", "Archaea", 0.5, 0.44, "P0A7B8"),
    ("P5", "Bacteria", 0.25, 0.91, "A0A123"),
]

PROJECTIONS = [
    {
        "name": "pca2",
        "dimensions": 2,
        "info": {"components": 2},
        # P1 and P2 sit exactly where the v2 fixture puts them.
        "data": np.array(
            [
                [0.0, 0.0],
                [1.0, 1.0],
                [2.5, -3.5],
                [-4.0, 0.25],
                [5.0, 5.0],
                [-1.5, 2.0],
            ],
            dtype=np.float32,
        ),
    },
    {
        "name": "umap3",
        "dimensions": 3,
        "info": {"n_neighbors": 15},
        "data": np.arange(18, dtype=np.float32).reshape(6, 3) / 4.0,
    },
]


def source_tables() -> list[pa.Table]:
    """The three v2-shaped tables the prepare pipeline would hand ``write_bundle``."""
    from protlabel import Prediction

    processor = BaseProcessor({}, {})
    frame = pd.DataFrame({"identifier": PROTEIN_IDS, **ANNOTATION_CELLS})
    annotations = processor._create_protein_annotations_table(frame)

    annotations = add_overlay_columns(
        annotations,
        "kingdom",
        [
            Prediction(
                query_id=q,
                label=lab,
                source_id=s,
                distance=d,
                reliability=r,
                k=1,
                metric="euclidean",
            )
            for q, lab, r, d, s in PREDICTIONS
        ],
        identifiers=PROTEIN_IDS,
    )
    # append_column/drop_columns are not guaranteed to carry schema metadata.
    annotations = stamp_format_version(annotations)

    return [
        annotations,
        processor._create_projections_metadata_table(PROJECTIONS),
        processor._create_projections_data_table(PROJECTIONS, PROTEIN_IDS),
    ]


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    write_bundle(source_tables(), FIXTURE_PATH)
    print(f"{FIXTURE_PATH} ({FIXTURE_PATH.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
