"""Classify proteins as transfer queries vs annotated references.

Rules match by ID prefix and/or a case-insensitive metadata substring
(``column ~ substring``). No biology is hardcoded; an *explicit* query rule
that matches nothing is an error.

A rule with no clauses is **open** — it restricts nothing and matches every
protein. Passing no rules at all therefore means "transfer within this
dataset": every protein is a candidate on both sides, and the caller splits
them per column into the ones missing a value (queries) and the ones holding
one (references).
"""

from __future__ import annotations

from dataclasses import dataclass, field

import pyarrow as pa


@dataclass
class Rule:
    """A classification rule. A protein matches if ANY clause matches.

    A rule with no clauses at all is *open*: it expresses "no restriction"
    rather than "match nothing" (see ``is_open``).
    """

    id_prefixes: list[str] = field(default_factory=list)
    where: list[tuple[str, str]] = field(default_factory=list)  # (column, substring)

    @property
    def is_open(self) -> bool:
        """True when the rule carries no clauses, i.e. it restricts nothing.

        An open rule matches every protein. This is what makes self-transfer
        (#393) work without a marker column: with both rules open, every
        protein is a candidate query *and* a candidate reference, and
        ``run_transfer`` does the real split per column on missing-vs-present.
        """
        return not self.id_prefixes and not self.where


def _matches(rule: Rule, identifier: str, column_data: dict[str, list], i: int) -> bool:
    if rule.is_open:
        return True
    if any(identifier.startswith(p) for p in rule.id_prefixes):
        return True
    for column, substring in rule.where:
        value = column_data[column][i]
        if value is not None and substring.lower() in str(value).lower():
            return True
    return False


def classify(
    annotations: pa.Table,
    query_rule: Rule,
    reference_rule: Rule,
    *,
    identifiers: list[str] | None = None,
) -> tuple[list[int], list[int]]:
    """Return (query_indices, reference_indices) into the annotations table.

    Between two *explicit* rules, query classification takes precedence: a
    protein matching both is a query and never a reference. An **open** rule
    (no clauses) expresses no preference, so it never takes a protein away from
    the other set — which is what lets both sets cover the whole table when no
    rules are given. The two lists may therefore overlap; callers are expected
    to make the final, disjoint split themselves (``run_transfer`` does it per
    column on missing-vs-present).

    Raises ValueError if an explicit query rule matches nothing.

    ``identifiers`` may be a pre-materialized list of the string identifier
    column (same order as ``annotations``) to avoid re-materializing it when the
    caller already has it.
    """
    columns = set(annotations.column_names)
    # Validate where-columns up front so an empty table still raises KeyError.
    for rule in (query_rule, reference_rule):
        for column, _ in rule.where:
            if column not in columns:
                raise KeyError(f"Classification column {column!r} not in annotations")

    # Materialize only the columns the rules actually need (identifier + any
    # where-columns) instead of the whole table — the latter is ~GB-scale at
    # Swiss-Prot row counts.
    if identifiers is None:
        identifiers = [str(v) for v in annotations.column("identifier").to_pylist()]
    where_columns = {
        column for rule in (query_rule, reference_rule) for column, _ in rule.where
    }
    column_data = {c: annotations.column(c).to_pylist() for c in where_columns}

    # Precedence applies only *between two explicit rules*: there, a protein
    # matching both is a query and never a reference. When either side is open
    # it expresses no preference, so it must not consume proteins away from the
    # other set — otherwise two open rules would hand every protein to the
    # query list and leave references empty, and transfer would silently
    # do nothing.
    both_explicit = not query_rule.is_open and not reference_rule.is_open

    query_indices: list[int] = []
    reference_indices: list[int] = []
    for i, identifier in enumerate(identifiers):
        is_query = _matches(query_rule, identifier, column_data, i)
        is_reference = _matches(reference_rule, identifier, column_data, i)
        if is_query and is_reference and both_explicit:
            is_reference = False
        if is_query:
            query_indices.append(i)
        if is_reference:
            reference_indices.append(i)

    if not query_indices:
        if query_rule.is_open:
            # Nothing to blame on the rules — the table itself is empty.
            raise ValueError("Classifier found no proteins to use as queries.")
        raise ValueError(
            "Classifier matched no query proteins; check --query-id-prefix / "
            "--query-where rules."
        )
    return query_indices, reference_indices
