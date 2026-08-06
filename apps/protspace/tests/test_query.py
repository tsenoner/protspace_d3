"""Tests for UniProt query FASTA downloads and publication."""

import builtins
import gzip
from pathlib import Path

import pytest

from protspace.data.loaders import query as query_module


class _Response:
    headers: dict[str, str] = {}

    def __init__(self, content: bytes):
        self.content = content

    def raise_for_status(self) -> None:
        pass

    def iter_content(self, chunk_size: int):
        yield self.content


class _InterruptingWriter:
    def __init__(self, wrapped):
        self.wrapped = wrapped

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return self.wrapped.__exit__(*args)

    def write(self, content: str):
        self.wrapped.write(content[:10])
        self.wrapped.flush()
        raise RuntimeError("interrupted extraction")


def _mock_download(monkeypatch, fasta: str) -> None:
    response = _Response(gzip.compress(fasta.encode()))
    monkeypatch.setattr(query_module.requests, "get", lambda *args, **kwargs: response)


def test_query_uniprot_does_not_publish_partial_fasta(tmp_path, monkeypatch):
    target = tmp_path / "query.fasta"
    _mock_download(monkeypatch, ">P1\nAAAA\n>P2\nCCCC\n")
    real_open = builtins.open

    def interrupt_cache_write(file, mode="r", *args, **kwargs):
        opened = real_open(file, mode, *args, **kwargs)
        if "w" in mode and Path(file).parent == tmp_path:
            return _InterruptingWriter(opened)
        return opened

    monkeypatch.setattr(query_module, "open", interrupt_cache_write, raising=False)

    with pytest.raises(RuntimeError, match="interrupted extraction"):
        query_module.query_uniprot("family:globin", save_to=target)

    assert not target.exists()
    assert list(tmp_path.iterdir()) == []


def test_query_uniprot_atomically_publishes_complete_fasta(tmp_path, monkeypatch):
    target = tmp_path / "query.fasta"
    fasta = ">sp|P1|ONE Protein one\nAAAA\n>P2 Protein two\nCCCC\n"
    _mock_download(monkeypatch, fasta)

    identifiers, path = query_module.query_uniprot("family:globin", save_to=target)

    assert identifiers == ["P1", "P2"]
    assert path == target
    assert target.read_text() == fasta
    assert list(tmp_path.iterdir()) == [target]
