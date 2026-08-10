"""Tests for the query/reference classifier."""

import pyarrow as pa
import pytest

from protspace.analysis.classification import Rule, classify


def _table():
    return pa.table(
        {
            "identifier": ["TRINITY_1", "TRINITY_2", "P00001", "P00002"],
            "protein_category": ["mSCR", "mSCR", "neurotoxin", "enzyme"],
        }
    )


def test_prefix_rule_selects_queries():
    q = Rule(id_prefixes=["TRINITY_"])
    r = Rule(where=[("protein_category", "neurotoxin")])
    qi, ri = classify(_table(), q, r)
    assert qi == [0, 1]
    assert ri == [2]


def test_where_substring_is_case_insensitive():
    q = Rule(where=[("protein_category", "MSCR")])
    r = Rule(id_prefixes=["P0"])
    qi, ri = classify(_table(), q, r)
    assert qi == [0, 1]
    assert ri == [2, 3]


def test_query_takes_precedence_over_reference():
    # A protein matching both rules is classified as a query, never a reference.
    q = Rule(id_prefixes=["P00001"])
    r = Rule(where=[("protein_category", "neurotoxin")])
    qi, ri = classify(_table(), q, r)
    assert 2 in qi
    assert 2 not in ri


def test_empty_query_match_raises():
    q = Rule(id_prefixes=["NOPE_"])
    r = Rule(id_prefixes=["P0"])
    with pytest.raises(ValueError, match="no query"):
        classify(_table(), q, r)


def test_missing_where_column_raises():
    q = Rule(where=[("not_a_column", "x")])
    r = Rule(id_prefixes=["P0"])
    with pytest.raises(KeyError):
        classify(_table(), q, r)


def test_protein_matching_neither_rule_is_excluded():
    # P00002 / enzyme matches neither rule -> absent from both lists.
    q = Rule(id_prefixes=["TRINITY_"])
    r = Rule(where=[("protein_category", "neurotoxin")])
    qi, ri = classify(_table(), q, r)
    assert 3 not in qi
    assert 3 not in ri


def test_multiple_id_prefixes_use_or_semantics():
    q = Rule(id_prefixes=["TRINITY_", "P00001"])
    r = Rule(id_prefixes=["P00002"])
    qi, ri = classify(_table(), q, r)
    assert qi == [0, 1, 2]
    assert ri == [3]


# ── Open (unrestricted) rules ──────────────────────────────────────────────
#
# A rule with no clauses means "no restriction", not "match nothing". Both
# rules open is the self-transfer case (#393): every protein is a candidate on
# both sides, and `run_transfer` does the real partitioning per column on
# missing-vs-present, which is why the candidate sets are allowed to overlap.


def test_both_rules_open_makes_every_protein_a_candidate_on_both_sides():
    qi, ri = classify(_table(), Rule(), Rule())
    assert qi == [0, 1, 2, 3]
    assert ri == [0, 1, 2, 3]


def test_open_reference_rule_does_not_starve_references():
    # Query rule is explicit; an open reference rule must still offer every
    # other protein as a reference instead of returning an empty set.
    qi, ri = classify(_table(), Rule(id_prefixes=["TRINITY_"]), Rule())
    assert qi == [0, 1]
    assert ri == [0, 1, 2, 3]


def test_open_query_rule_does_not_starve_queries():
    qi, ri = classify(_table(), Rule(), Rule(id_prefixes=["P0"]))
    assert qi == [0, 1, 2, 3]
    assert ri == [2, 3]


def test_open_rule_does_not_consume_proteins_from_the_other_set():
    # The precedence rule applies only between two explicit rules. An open
    # rule that "matches" a protein must not remove it from the other set.
    _, ri = classify(_table(), Rule(), Rule(id_prefixes=["TRINITY_"]))
    assert ri == [0, 1]


def test_open_query_rule_on_empty_table_raises_a_rule_free_message():
    empty = pa.table({"identifier": [], "protein_category": []})
    with pytest.raises(ValueError, match="no proteins"):
        classify(empty, Rule(), Rule())
