"""ParquetBundle format v3: columnar annotation encoding.

v2 stringifies every annotation cell and packs multi-values as ``;``-joined
hits with ``|``-suffixed scores/evidence, which forces the browser to re-split
and dictionary-code 573K strings on load.  v3 moves that work to write time:
part 1 carries int32 dictionary codes (or CSR end offsets) and float64
numerics, part 3 carries wide float32 projections, and a new part 6 carries the
label dictionaries plus the CSR code/score/evidence payloads as raw
little-endian buffers.

Only the *container* changes.  ``encode_v3`` takes the v2-shaped tables the
pipeline already builds and the (sibling) ``decode_v3`` turns v3 parts back
into them, so every Python consumer keeps its string-cell logic and
``BUNDLE_FORMAT_VERSION = 2`` in :mod:`~protspace.data.annotations.encoding`
still versions the cell grammar.

The classification rules below intentionally mirror the browser's v2 reader
(``packages/core/src/components/data-loader/utils/conversion.ts``) so a v3
bundle and its v2 equivalent produce identical colours, code order and legend
entries.  Deviations are documented on the constants they come from.
"""

from __future__ import annotations

import io
import json
from typing import Any

import numpy as np
import pandas as pd
import pyarrow as pa
import pyarrow.compute as pc
import pyarrow.parquet as pq

from protspace.data.annotations.encoding import (
    FORMAT_VERSION_KEY,
    decode_field,
    migrate_legacy_annotation_table,
    read_format_version,
)

CONTAINER_VERSION = 3
MANIFEST_KEY = b"protspace_v3_manifest"

#: Cell/hit spellings that mean "missing".  Mirrors ``MISSING_VALUE_TOKENS``
#: in ``packages/utils/src/visualization/missing-values.ts``; compared against
#: the lower-cased, whitespace-trimmed token.
MISSING_TOKENS = frozenset({"na", "n/a", "nan", "null", "none", "__na__"})

#: ``EVIDENCE_CODE_RE`` from ``conversion.ts``: the part after a hit's last
#: ``|`` is an evidence code, not a score.
EVIDENCE_RE = r"^(?:[A-Z]{2,5}|ECO:\d+)$"

#: What JavaScript's ``Number()`` accepts *and* ``Number.isFinite`` keeps,
#: restricted to decimal literals.  Deviation from the browser: JS also parses
#: ``0x10``/``0o17``/``0b1`` as numbers, so a column of hex literals is
#: categorical here and numeric there.  Non-decimal literals do not occur in
#: annotation data and supporting them would cost a Python-level parse.
#: ``Infinity``/``1e999`` are excluded by the post-cast finiteness check.
JS_NUMBER_RE = r"^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$"

#: hyparquet only hands back zero-copy typed arrays for REQUIRED flat PLAIN
#: columns, so every v3 column is written non-nullable, undictionaried and in
#: one row group.
_PQ: dict[str, Any] = {
    "use_dictionary": False,
    "column_encoding": "PLAIN",
    "compression": "snappy",
    "write_statistics": False,
}

_EVIDENCE_DICT_NAME = "__evidence"


# --------------------------------------------------------------------------- #
# encoder
# --------------------------------------------------------------------------- #


def _write(table: pa.Table) -> bytes:
    """Serialize one v3 part: single row group, PLAIN, no dictionary."""
    buf = io.BytesIO()
    pq.write_table(table, buf, row_group_size=max(table.num_rows, 1), **_PQ)
    return buf.getvalue()


def _required_table(
    columns: dict[str, pa.Array], metadata: dict | None = None
) -> pa.Table:
    """Build a table whose every field is non-nullable."""
    schema = pa.schema(
        [pa.field(name, arr.type, nullable=False) for name, arr in columns.items()],
        metadata=metadata,
    )
    return pa.table(list(columns.values()), schema=schema)


def _as_string(column: pa.ChunkedArray | pa.Array) -> pa.Array:
    """Flatten to a single ``string`` array, rendering bools as ``True``/``False``."""
    arr = column.combine_chunks() if isinstance(column, pa.ChunkedArray) else column
    if isinstance(arr, pa.ChunkedArray):  # combine_chunks keeps the wrapper
        arr = arr.combine_chunks()
    if pa.types.is_boolean(arr.type):
        return pc.if_else(arr, pa.scalar("True"), pa.scalar("False"))
    if pa.types.is_string(arr.type):
        return arr
    return pc.cast(arr, pa.string())


def _missing_mask(trimmed: pa.Array) -> np.ndarray:
    """``normalizeMissingValue``: null, blank, or a MISSING_TOKENS spelling."""
    is_null = pc.is_null(trimmed)
    blank = pc.equal(trimmed, pa.scalar(""))
    token = pc.is_in(pc.utf8_lower(trimmed), value_set=pa.array(sorted(MISSING_TOKENS)))
    mask = pc.or_(pc.or_(is_null, blank), pc.fill_null(token, False))
    return np.asarray(pc.fill_null(mask, True))


def _regex_ok(values: pa.Array, pattern: str) -> np.ndarray:
    return np.asarray(pc.fill_null(pc.match_substring_regex(values, pattern), False))


def _parse_floats(values: pa.Array, ok: np.ndarray, blank_is_zero: bool) -> np.ndarray:
    """Cast the entries flagged by ``ok`` to float64; substitute 0 elsewhere.

    ``Number("")`` is ``0`` in JavaScript, which is how an empty score part
    (``"label|1,"``) becomes a real score.
    """
    fill = pa.scalar("0")
    safe = pc.if_else(pa.array(ok), values, fill)
    if blank_is_zero:
        safe = pc.if_else(pc.equal(safe, pa.scalar("")), fill, safe)
    return pc.cast(safe, pa.float64()).to_numpy(zero_copy_only=False)


def _frequency_order(codes: np.ndarray, n_labels: int) -> tuple[np.ndarray, np.ndarray]:
    """Return ``(rank, order)`` for the browser's descending-frequency sort.

    ``conversion.ts:1600-1605`` sorts ``Map.keys()`` (first-occurrence order)
    with a stable descending-count comparator, so ties keep first occurrence.
    """
    counts = np.bincount(codes, minlength=n_labels)
    order = np.argsort(-counts, kind="stable")
    rank = np.empty(n_labels, dtype=np.int32)
    rank[order] = np.arange(n_labels, dtype=np.int32)
    return rank, order


def _dict_payloads(name: str, labels: list[str]) -> list[tuple[str, bytes]]:
    """``dict:<name>`` utf8 blob + ``dict:<name>:end`` int32 byte offsets."""
    encoded = [label.encode("utf-8") for label in labels]
    ends = np.cumsum([len(b) for b in encoded], dtype=np.int64).astype("<i4")
    return [
        (f"dict:{name}", b"".join(encoded)),
        (f"dict:{name}:end", ends.tobytes()),
    ]


def _split_last_pipe(hits: pa.Array) -> tuple[pa.Array, pa.Array]:
    """Split each hit on its LAST ``|`` (``conversion.ts:440``).

    Returns ``(head, suffix_raw)``.  A hit without a ``|`` gets ``suffix_raw``
    ``""``, which is the same branch as a trailing-pipe hit: both keep the whole
    hit as the label.
    """
    parts = pc.split_pattern(hits, "|", max_splits=1, reverse=True)
    lengths = np.asarray(pc.list_value_length(parts))
    starts = np.concatenate(([0], np.cumsum(lengths, dtype=np.int64)[:-1]))
    flat = pc.list_flatten(parts)
    head = flat.take(pa.array(starts))
    has_two = lengths == 2
    suffix = pc.if_else(
        pa.array(has_two),
        flat.take(pa.array(np.where(has_two, starts + 1, starts))),
        pa.scalar(""),
    )
    return head, suffix


def _encode_annotation_column(
    column: pa.ChunkedArray | pa.Array,
    name: str,
    num_rows: int,
    evidence_dict: dict[str, int],
) -> tuple[dict[str, Any], pa.Array, list[tuple[str, bytes]]]:
    """Encode one annotation column.

    Returns ``(manifest_entry, part1_array, payloads)``.  ``part1_array`` is the
    ``<col>`` codes / values or the ``<col>__end`` CSR offsets; the caller picks
    the physical column name from ``manifest_entry["kind"]``.
    """
    source_type = str(column.type)
    arr = column.combine_chunks() if isinstance(column, pa.ChunkedArray) else column

    # Arrow-numeric source columns stay numeric regardless of content.  The
    # browser would call an all-null column categorical, but keeping the kind
    # tied to the Arrow type is what lets `decode_v3` restore `sourceType`.
    if pa.types.is_integer(arr.type) or pa.types.is_floating(arr.type):
        values = pc.cast(arr, pa.float64()).to_numpy(zero_copy_only=False)
        values = np.where(np.isfinite(values), values, np.nan)
        finite = values[~np.isnan(values)]
        numeric_type = "int" if np.all(np.mod(finite, 1) == 0) else "float"
        entry = {
            "kind": "numeric",
            "numericType": numeric_type,
            "sourceType": source_type,
        }
        return entry, pa.array(values, type=pa.float64()), []

    strings = _as_string(arr)
    trimmed = pc.utf8_trim_whitespace(strings)
    missing = _missing_mask(trimmed)

    # --- numeric inference (conversion.ts:71-125) --------------------------- #
    if not missing.all():
        numeric_ok = _regex_ok(trimmed, JS_NUMBER_RE) | missing
        if numeric_ok.all():
            values = _parse_floats(trimmed, ~missing, blank_is_zero=False)
            if np.isfinite(values[~missing]).all():
                values = np.where(missing, np.nan, values)
                finite = values[~missing]
                numeric_type = "int" if np.all(np.mod(finite, 1) == 0) else "float"
                entry = {
                    "kind": "numeric",
                    "numericType": numeric_type,
                    "sourceType": source_type,
                }
                return entry, pa.array(values, type=pa.float64()), []

    # --- categorical: split cells into hits --------------------------------- #
    cells = pc.if_else(pa.array(~missing), trimmed, pa.scalar(None, pa.string()))
    hit_lists = pc.split_pattern(cells, ";")
    row_of_hit = np.asarray(pc.list_parent_indices(hit_lists))
    hits = pc.utf8_trim_whitespace(pc.list_flatten(hit_lists))
    keep = ~_missing_mask(hits)
    if not keep.all():
        hits = hits.filter(pa.array(keep))
        row_of_hit = row_of_hit[keep]

    n_hits = len(hits)
    per_row = (
        np.bincount(row_of_hit, minlength=num_rows)
        if n_hits
        else np.zeros(num_rows, int)
    )
    max_hits = int(per_row.max()) if num_rows else 0

    if n_hits == 0:
        entry = {"kind": "categorical", "sourceType": source_type}
        codes = np.full(num_rows, -1, dtype=np.int32)
        return entry, pa.array(codes, type=pa.int32()), _dict_payloads(name, [])

    # --- per-hit label / score / evidence (conversion.ts:433-468) ----------- #
    head, suffix_raw = _split_last_pipe(hits)
    no_suffix = np.asarray(pc.equal(suffix_raw, pa.scalar("")))
    suffix = pc.utf8_trim_whitespace(suffix_raw)
    is_evidence = ~no_suffix & _regex_ok(suffix, EVIDENCE_RE)

    scored = np.zeros(n_hits, dtype=bool)
    hit_score_count = np.zeros(n_hits, dtype=np.int64)
    score_values = np.zeros(0, dtype=np.float64)

    candidate = np.flatnonzero(~no_suffix & ~is_evidence)
    if candidate.size:
        pieces = pc.split_pattern(suffix.take(pa.array(candidate)), ",")
        piece_len = np.asarray(pc.list_value_length(pieces)).astype(np.int64)
        flat = pc.utf8_trim_whitespace(pc.list_flatten(pieces))
        blank = np.asarray(pc.equal(flat, pa.scalar("")))
        numeric = _regex_ok(flat, JS_NUMBER_RE)
        parsed = _parse_floats(flat, numeric, blank_is_zero=True)
        valid = blank | (numeric & np.isfinite(parsed))
        owner = np.repeat(np.arange(candidate.size), piece_len)
        bad = np.bincount(owner, weights=~valid, minlength=candidate.size)
        ok = bad == 0
        scored[candidate[ok]] = True
        hit_score_count[candidate[ok]] = piece_len[ok]
        score_values = parsed[np.repeat(ok, piece_len)]

    use_head = pa.array(is_evidence | scored)
    labels = pc.if_else(use_head, pc.utf8_trim_whitespace(head), hits)

    # --- dictionary in decoded space --------------------------------------- #
    encoded_dict = pc.dictionary_encode(labels)
    raw_labels = encoded_dict.dictionary.to_pylist()
    unify: dict[str, int] = {}
    fold = np.empty(len(raw_labels), dtype=np.int32)
    for i, raw in enumerate(raw_labels):
        fold[i] = unify.setdefault(decode_field(raw), len(unify))
    provisional = fold[np.asarray(encoded_dict.indices)]
    rank, order = _frequency_order(provisional, len(unify))
    codes = rank[provisional].astype(np.int32)
    ordered_labels = list(unify)
    ordered_labels = [ordered_labels[i] for i in order]

    payloads = _dict_payloads(name, ordered_labels)
    has_scores = bool(scored.any())
    has_evidence = bool(is_evidence.any())

    if max_hits <= 1 and not has_scores and not has_evidence:
        row_codes = np.full(num_rows, -1, dtype=np.int32)
        row_codes[row_of_hit] = codes
        entry = {"kind": "categorical", "sourceType": source_type}
        return entry, pa.array(row_codes, type=pa.int32()), payloads

    end = np.cumsum(per_row, dtype=np.int64).astype("<i4")
    payloads.append((f"csr:{name}", codes.astype("<i4").tobytes()))

    if has_scores:
        payloads.append(
            (f"score_end:{name}", np.cumsum(hit_score_count).astype("<i4").tobytes())
        )
        payloads.append((f"scores:{name}", score_values.astype("<f4").tobytes()))
    if has_evidence:
        idx = np.flatnonzero(is_evidence)
        local = pc.dictionary_encode(suffix.take(pa.array(idx)))
        global_ids = np.array(
            [
                evidence_dict.setdefault(text, len(evidence_dict))
                for text in local.dictionary.to_pylist()
            ],
            dtype=np.int32,
        )
        ev_codes = np.full(n_hits, -1, dtype=np.int32)
        ev_codes[idx] = global_ids[np.asarray(local.indices)]
        payloads.append((f"evidence:{name}", ev_codes.astype("<i4").tobytes()))

    entry = {"kind": "multi", "sourceType": source_type}
    if has_scores:
        entry["scores"] = True
    if has_evidence:
        entry["evidence"] = True
    return entry, pa.array(end, type=pa.int32()), payloads


def _encode_projections(
    projections_metadata: pa.Table,
    projections_data: pa.Table,
    protein_ids: pa.Array,
) -> tuple[pa.Table, list[dict[str, Any]]]:
    """Pivot the long projections table to wide float32, aligned to part 1."""
    required = {"projection_name", "identifier", "x", "y"}
    missing = required - set(projections_data.column_names)
    if missing:
        raise ValueError(
            f"projections_data is missing required column(s): {sorted(missing)}"
        )

    names = projections_metadata.column("projection_name").to_pylist()
    if len(set(names)) != len(names):
        raise ValueError(
            f"Duplicate projection name(s) in projections_metadata: {names}"
        )

    dimensions = (
        projections_metadata.column("dimensions").to_pylist()
        if "dimensions" in projections_metadata.column_names
        else [None] * len(names)
    )
    has_z = "z" in projections_data.column_names

    index = pd.Index(protein_ids.to_pylist())
    num_rows = len(index)
    columns: dict[str, pa.Array] = {}
    manifest: list[dict[str, Any]] = []

    name_column = projections_data.column("projection_name")
    for name, declared in zip(names, dimensions, strict=True):
        sub = projections_data.filter(pc.equal(name_column, pa.scalar(name)))
        positions = index.get_indexer(sub.column("identifier").to_pylist())
        if len(positions) and positions.min() < 0:
            unknown = np.asarray(sub.column("identifier").to_pylist())[positions < 0]
            raise ValueError(
                f"projection '{name}' references identifier(s) absent from the "
                f"annotations table: {sorted(set(unknown.tolist()))[:5]}"
            )

        z = sub.column("z") if has_z else None
        z_present = (
            z is not None and not pa.types.is_null(z.type) and z.null_count < len(z)
        )
        dimension = int(declared) if declared in (2, 3) else (3 if z_present else 2)

        for axis in ("x", "y", "z")[:dimension]:
            values = np.full(num_rows, np.nan, dtype=np.float32)
            if axis == "z" and not z_present:
                source = None
            else:
                source = (
                    sub.column(axis).to_numpy(zero_copy_only=False).astype(np.float32)
                )
            if source is not None:
                values[positions] = source
            columns[f"{name}__{axis}"] = pa.array(values, type=pa.float32())
        manifest.append({"name": name, "dimension": dimension})

    return _required_table(columns), manifest


def encode_v3(
    annotations: pa.Table,
    projections_metadata: pa.Table,
    projections_data: pa.Table,
) -> tuple[bytes, bytes, bytes, bytes]:
    """Encode the v2-shaped pipeline tables as v3 parts 1, 2, 3 and 6."""
    if read_format_version(annotations) == 1:
        annotations = migrate_legacy_annotation_table(annotations)

    id_column = next(
        (c for c in ("protein_id", "identifier") if c in annotations.column_names), None
    )
    if id_column is None:
        raise ValueError(
            "annotations table has no 'protein_id' or 'identifier' column; "
            f"found {annotations.column_names}"
        )

    ids = _as_string(annotations.column(id_column))
    if ids.null_count:
        raise ValueError(f"annotations column '{id_column}' contains null values")
    duplicated = pc.sum(pc.greater(pc.value_counts(ids).field("counts"), 1)).as_py()
    if duplicated:
        raise ValueError(
            f"annotations column '{id_column}' contains {duplicated} duplicated value(s); "
            "protein identifiers must be unique"
        )

    num_rows = annotations.num_rows
    existing = set(annotations.column_names)
    evidence_dict: dict[str, int] = {}
    columns: dict[str, pa.Array] = {id_column: ids}
    manifest_columns: dict[str, Any] = {}
    payloads: list[tuple[str, bytes]] = []

    for name in annotations.column_names:
        if name == id_column:
            continue
        entry, array, column_payloads = _encode_annotation_column(
            annotations.column(name), name, num_rows, evidence_dict
        )
        physical = f"{name}__end" if entry["kind"] == "multi" else name
        if physical != name and physical in existing:
            raise ValueError(
                f"column '{name}' is multi-valued but '{physical}' already exists in "
                "the annotations table; rename one of them"
            )
        columns[physical] = array
        manifest_columns[name] = entry
        payloads.extend(column_payloads)

    if evidence_dict:
        payloads.extend(_dict_payloads(_EVIDENCE_DICT_NAME, list(evidence_dict)))

    projections_table, projection_manifest = _encode_projections(
        projections_metadata, projections_data, ids
    )

    manifest = {
        "idColumn": id_column,
        "columns": manifest_columns,
        "projections": projection_manifest,
    }
    metadata = {
        **{
            k: v
            for k, v in (annotations.schema.metadata or {}).items()
            if k != MANIFEST_KEY
        },
        FORMAT_VERSION_KEY: str(CONTAINER_VERSION).encode(),
        MANIFEST_KEY: json.dumps(manifest, separators=(",", ":")).encode(),
    }

    payload_table = _required_table(
        {
            "name": pa.array([n for n, _ in payloads], type=pa.string()),
            "data": pa.array([d for _, d in payloads], type=pa.binary()),
        }
    )

    return (
        _write(_required_table(columns, metadata)),
        _write(projections_metadata),
        _write(projections_table),
        _write(payload_table),
    )
