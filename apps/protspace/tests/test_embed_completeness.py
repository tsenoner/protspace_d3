"""Completeness contract shared by both embedding backends.

The rule is `expected = requested - skipped`: a documented capability limit is
skipped and reported, anything else absent from the .h5 fails. Before this
contract the local backend exited 0 on a 90%-complete .h5, which then projected,
bundled and scored normally.
"""

from pathlib import Path

import h5py
import numpy as np
import pytest

from protspace.data.embedding import store
from protspace.data.loaders.fasta import check_fasta_coverage


def _write(h5_path: Path, ids) -> None:
    with h5py.File(h5_path, "a") as f:
        for pid in ids:
            f.create_dataset(pid, data=np.zeros(4, dtype=np.float32))


class TestFinishRun:
    def test_complete_run_succeeds(self, tmp_path):
        h5 = tmp_path / "o.h5"
        _write(h5, ["a", "b"])
        assert store.finish_run(h5, ["a", "b"]) == h5

    def test_missing_sequence_fails(self, tmp_path):
        h5 = tmp_path / "o.h5"
        _write(h5, ["a"])
        with pytest.raises(ValueError, match="Embedding incomplete"):
            store.finish_run(h5, ["a", "b"])

    def test_nothing_embedded_is_distinguished_from_partial(self, tmp_path):
        h5 = tmp_path / "o.h5"
        with pytest.raises(ValueError, match="No new embeddings were produced"):
            store.finish_run(h5, ["a", "b"])

    def test_capability_limit_is_skipped_not_failed(self, tmp_path):
        """The whole point: a sequence we deliberately never attempted must not
        fail the run, but must still be reported."""
        h5 = tmp_path / "o.h5"
        _write(h5, ["a"])
        assert store.finish_run(h5, ["a", "b"], skipped={"b": "too long"}) == h5

    def test_skips_are_named_with_their_reason(self, tmp_path, caplog):
        h5 = tmp_path / "o.h5"
        _write(h5, ["a"])
        with caplog.at_level("WARNING"):
            store.finish_run(h5, ["a", "b", "c"], skipped={"b": "too long", "c": "OOM"})
        text = caplog.text
        assert "too long" in text and "OOM" in text
        assert "b" in text and "c" in text

    def test_skipping_everything_is_still_a_failure(self, tmp_path):
        h5 = tmp_path / "o.h5"
        with pytest.raises(ValueError, match="No new embeddings were produced"):
            store.finish_run(h5, ["a"], skipped={"a": "too long"})

    def test_empty_request_means_resume_covered_it(self, tmp_path):
        """An empty outstanding set is not 'nothing was produced' -- it means a
        previous run already embedded everything."""
        h5 = tmp_path / "o.h5"
        _write(h5, ["a"])
        assert store.finish_run(h5, []) == h5

    def test_gate_reads_the_file_not_the_caller(self, tmp_path):
        """save_embeddings skips IDs already present, so a running total can claim
        sequences the file does not hold. The gate must read the file."""
        h5 = tmp_path / "o.h5"
        store.save_embeddings(h5, {"a": np.zeros(4, dtype=np.float32)})
        store.save_embeddings(h5, {"a": np.ones(4, dtype=np.float32)})  # skipped
        with pytest.raises(ValueError, match="Embedding incomplete"):
            store.finish_run(h5, ["a", "b"])

    def test_message_cannot_be_mistaken_for_a_service_outage(self, tmp_path):
        """The prep service substring-matches stderr to classify a failure as
        BIOCENTRAL_UNAVAILABLE and route the user to Colab. A coverage problem
        must not trip those patterns -- Colab would not fix it."""
        patterns = (
            "connection refused",
            "cannot connect to host",
            "connectionerror",
            "temporary failure in name resolution",
            "name or service not known",
            "503 service unavailable",
            "503 server error",
            "no healthy biocentral",
        )
        h5 = tmp_path / "o.h5"
        _write(h5, ["a"])
        with pytest.raises(ValueError) as exc:
            store.finish_run(h5, ["a", "b"])
        assert not [p for p in patterns if p in str(exc.value).lower()]


class TestValidateHeaders:
    def test_rejects_slash(self):
        with pytest.raises(ValueError, match="invalid for HDF5 dataset names"):
            store.validate_headers(["A/B"])

    def test_accepts_ordinary_ids(self):
        store.validate_headers(["P12345", "sp|P12345|NAME"])


class TestFastaCoverage:
    @staticmethod
    def _fasta(tmp_path, ids):
        p = tmp_path / "s.fasta"
        p.write_text("".join(f">{i}\nMKV\n" for i in ids))
        return p

    def test_uncovered_embeddings_block_similarity(self, tmp_path):
        """One uncovered protein zero-fills its diagonal, which suppresses the
        similarity-to-distance conversion for the WHOLE matrix and inverts MDS."""
        fasta = self._fasta(tmp_path, ["P1", "P2"])
        with pytest.raises(ValueError, match="absent from"):
            check_fasta_coverage(fasta, ["P1", "P2", "P3"], required=True)

    def test_uncovered_embeddings_only_warn_without_similarity(self, tmp_path, caplog):
        fasta = self._fasta(tmp_path, ["P1"])
        with caplog.at_level("WARNING"):
            check_fasta_coverage(fasta, ["P1", "P2"], required=False)
        assert "absent from" in caplog.text

    def test_fasta_superset_is_silent(self, tmp_path, caplog):
        """A resumed embedding cache legitimately covers fewer proteins than the
        FASTA it was built from."""
        fasta = self._fasta(tmp_path, ["P1", "P2", "P3"])
        with caplog.at_level("WARNING"):
            check_fasta_coverage(fasta, ["P1"], required=True)
        assert caplog.text == ""

    def test_identifier_styles_are_reconciled(self, tmp_path, caplog):
        """load_h5 keeps raw HDF5 keys while FASTA ids are parsed, so comparing
        them raw would report every protein uncovered."""
        fasta = self._fasta(tmp_path, ["sp|P12345|NAME_HUMAN"])
        with caplog.at_level("WARNING"):
            check_fasta_coverage(fasta, ["P12345"], required=True)
        assert caplog.text == ""
