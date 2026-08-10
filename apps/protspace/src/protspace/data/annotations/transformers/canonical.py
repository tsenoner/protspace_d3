"""Shared vocabulary for annotations persisted as canonical boolean strings.

Boolean-ish annotations (``xref_pdb``, ``signal_peptide``, ...) are stored as the
strings ``"True"``/``"False"``. Cached values are read back and re-transformed on
resumed runs, so every transform that emits one of these must also accept one
unchanged — otherwise a second pass reinterprets it as raw source data.
"""

CANONICAL_BOOLEANS = ("False", "True")
