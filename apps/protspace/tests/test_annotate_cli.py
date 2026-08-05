"""Tests for the standalone ``protspace annotate`` command."""

import pandas as pd
from typer.testing import CliRunner

from protspace.cli.app import app


def test_fasta_sequences_are_passed_to_annotation_manager(tmp_path, monkeypatch):
    """FASTA-only proteins must reach sequence-backed annotation sources."""
    import protspace.data.annotations.manager as manager_module

    fasta = tmp_path / "input.fasta"
    fasta.write_text(
        ">sp|P12345|KNOWN Known protein\nMKV\n>custom-protein description\nAAAG\n"
    )
    captured: dict[str, object] = {}

    class FakeManager:
        def __init__(self, *args, **kwargs):
            captured.update(kwargs)

        def to_pd(self):
            return pd.DataFrame({"identifier": captured["headers"]})

    monkeypatch.setattr(manager_module, "ProteinAnnotationManager", FakeManager)

    output = tmp_path / "annotations.parquet"
    result = CliRunner().invoke(
        app,
        ["annotate", "-i", str(fasta), "-o", str(output)],
    )

    assert result.exit_code == 0, result.output
    assert captured["headers"] == ["P12345", "custom-protein"]
    assert captured["sequences"] == {
        "P12345": "MKV",
        "custom-protein": "AAAG",
    }
