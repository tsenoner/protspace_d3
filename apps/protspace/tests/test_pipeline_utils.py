"""Tests for pipeline utility functions."""

import ast
import json
from collections import Counter
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from protspace.data.loaders.embedding_set import (
    EmbeddingSet,
    format_param_suffix,
    format_projection_name,
    merge_same_name_sets,
)
from protspace.data.processors import pipeline as pipeline_module
from protspace.data.processors.pipeline import (
    MethodSpec,
    PipelineConfig,
    ReductionPipeline,
    _run_with_overridden_config,
    disambiguation_suffix,
    parse_method_spec,
    parse_methods_arg,
)


def _preparation_notebook_projection_refetch_stages() -> frozenset[str]:
    notebook_path = (
        Path(__file__).parents[1] / "notebooks" / "ProtSpace_Preparation.ipynb"
    )
    notebook = json.loads(notebook_path.read_text())
    code_sources = (
        "".join(cell["source"])
        for cell in notebook["cells"]
        if cell["cell_type"] == "code"
    )
    generate_source = next(
        (source for source in code_sources if "def _on_gen" in source), None
    )
    if generate_source is None:
        pytest.fail("Generate callback not found in the Preparation notebook")
    tree = ast.parse(generate_source)
    config_call = next(
        (
            node
            for node in ast.walk(tree)
            if isinstance(node, ast.Call)
            and isinstance(node.func, ast.Name)
            and node.func.id == "PipelineConfig"
        ),
        None,
    )
    if config_call is None:
        pytest.fail("PipelineConfig(...) not found in the notebook Generate callback")
    refetch_keyword = next(
        (
            keyword
            for keyword in config_call.keywords
            if keyword.arg == "refetch_stages"
        ),
        None,
    )
    if refetch_keyword is None:
        pytest.fail(
            "PipelineConfig(...) with refetch_stages not found in the notebook "
            "Generate callback"
        )
    expression = ast.Expression(refetch_keyword.value)
    return eval(
        compile(expression, filename=str(notebook_path), mode="eval"),
        {"__builtins__": {}, "frozenset": frozenset},
    )


# ---------------------------------------------------------------------------
# parse_method_spec
# ---------------------------------------------------------------------------


class TestParseMethodSpec:
    def test_pca2(self):
        spec = parse_method_spec("pca2")
        assert spec.method == "pca"
        assert spec.dims == 2
        assert spec.overrides == ()

    def test_umap3(self):
        spec = parse_method_spec("umap3")
        assert spec.method == "umap"
        assert spec.dims == 3

    def test_tsne2(self):
        spec = parse_method_spec("tsne2")
        assert spec.method == "tsne"
        assert spec.dims == 2

    def test_pacmap2(self):
        spec = parse_method_spec("pacmap2")
        assert spec.method == "pacmap"
        assert spec.dims == 2

    def test_mds2(self):
        spec = parse_method_spec("mds2")
        assert spec.method == "mds"
        assert spec.dims == 2

    def test_localmap2(self):
        spec = parse_method_spec("localmap2")
        assert spec.method == "localmap"
        assert spec.dims == 2

    def test_invalid_no_digits(self):
        with pytest.raises(ValueError):
            parse_method_spec("pca")


# ---------------------------------------------------------------------------
# parse_method_spec with overrides
# ---------------------------------------------------------------------------


class TestParseMethodSpecWithOverrides:
    def test_single_override(self):
        spec = parse_method_spec("umap2:n_neighbors=50")
        assert spec.method == "umap"
        assert spec.dims == 2
        assert spec.overrides_dict == {"n_neighbors": 50}

    def test_multiple_overrides_semicolon(self):
        spec = parse_method_spec("umap2:n_neighbors=50;min_dist=0.1")
        assert spec.overrides_dict == {"n_neighbors": 50, "min_dist": 0.1}

    def test_int_coercion(self):
        spec = parse_method_spec("umap2:n_neighbors=100")
        assert isinstance(spec.overrides_dict["n_neighbors"], int)

    def test_float_coercion(self):
        spec = parse_method_spec("umap2:min_dist=0.5")
        assert isinstance(spec.overrides_dict["min_dist"], float)

    def test_string_metric(self):
        spec = parse_method_spec("umap2:metric=cosine")
        assert spec.overrides_dict["metric"] == "cosine"

    def test_unknown_param_raises(self):
        with pytest.raises(ValueError, match="Unknown parameter 'bogus'"):
            parse_method_spec("umap2:bogus=5")

    def test_missing_value_raises(self):
        with pytest.raises(ValueError, match="Invalid parameter format"):
            parse_method_spec("umap2:n_neighbors")

    def test_empty_params_after_colon(self):
        spec = parse_method_spec("umap2:")
        assert spec.overrides == ()

    def test_overrides_are_sorted(self):
        spec = parse_method_spec("umap2:min_dist=0.1;n_neighbors=50")
        keys = [k for k, _ in spec.overrides]
        assert keys == sorted(keys)


# ---------------------------------------------------------------------------
# MethodSpec
# ---------------------------------------------------------------------------


class TestMethodSpec:
    def test_str_no_overrides(self):
        spec = MethodSpec("pca", 2)
        assert str(spec) == "pca2"

    def test_str_with_overrides(self):
        spec = MethodSpec("umap", 2, (("min_dist", 0.1), ("n_neighbors", 50)))
        assert str(spec) == "umap2:min_dist=0.1;n_neighbors=50"

    def test_overrides_dict(self):
        spec = MethodSpec("umap", 2, (("n_neighbors", 50),))
        assert spec.overrides_dict == {"n_neighbors": 50}

    def test_equality(self):
        a = parse_method_spec("umap2:n_neighbors=50")
        b = parse_method_spec("umap2:n_neighbors=50")
        assert a == b

    def test_hashable(self):
        spec = parse_method_spec("umap2:n_neighbors=50")
        assert hash(spec) == hash(spec)


# ---------------------------------------------------------------------------
# parse_methods_arg
# ---------------------------------------------------------------------------


class TestParseMethodsArg:
    def test_single_comma_separated(self):
        result = parse_methods_arg(["pca2,umap2"])
        assert len(result) == 2
        assert result[0].method == "pca"
        assert result[1].method == "umap"

    def test_repeated(self):
        result = parse_methods_arg(["pca2", "umap2"])
        assert len(result) == 2

    def test_mixed_with_overrides(self):
        result = parse_methods_arg(["pca2", "umap2:n_neighbors=50;min_dist=0.1"])
        assert len(result) == 2
        assert result[1].overrides_dict == {"n_neighbors": 50, "min_dist": 0.1}

    def test_comma_separated_with_overrides(self):
        result = parse_methods_arg(["pca2,umap2:n_neighbors=50;min_dist=0.1,tsne2"])
        assert len(result) == 3
        assert result[0].method == "pca"
        assert result[1].overrides_dict == {"n_neighbors": 50, "min_dist": 0.1}
        assert result[2].method == "tsne"

    def test_deduplicates(self):
        result = parse_methods_arg(["umap2", "umap2"])
        assert len(result) == 1

    def test_different_overrides_not_deduped(self):
        result = parse_methods_arg(["umap2:n_neighbors=50", "umap2:n_neighbors=100"])
        assert len(result) == 2

    def test_backward_compatible(self):
        result = parse_methods_arg(["pca2,umap2,tsne2"])
        assert len(result) == 3

    def test_strips_whitespace(self):
        result = parse_methods_arg(["  pca2 , umap2  "])
        assert len(result) == 2

    def test_skips_empty_parts(self):
        result = parse_methods_arg(["pca2,,umap2"])
        assert len(result) == 2


# ---------------------------------------------------------------------------
# format_projection_name
# ---------------------------------------------------------------------------


class TestFormatProjectionName:
    def test_known_model_and_method(self):
        assert format_projection_name("prot_t5", "pca", 2) == "ProtT5 — PCA 2"

    def test_esm2(self):
        assert format_projection_name("esm2_650m", "umap", 2) == "ESM2-650M — UMAP 2"

    def test_mmseqs2(self):
        assert format_projection_name("MMseqs2", "mds", 2) == "MMseqs2 — MDS 2"

    def test_unknown_model_passthrough(self):
        assert (
            format_projection_name("custom_model", "pca", 3) == "custom_model — PCA 3"
        )

    def test_unknown_method_uppercased(self):
        assert (
            format_projection_name("prot_t5", "newmethod", 2) == "ProtT5 — NEWMETHOD 2"
        )

    def test_3d(self):
        assert format_projection_name("prot_t5", "tsne", 3) == "ProtT5 — t-SNE 3"

    def test_with_param_suffix(self):
        assert (
            format_projection_name("prot_t5", "umap", 2, "n=50, d=0.1")
            == "ProtT5 — UMAP 2 (n=50, d=0.1)"
        )

    def test_empty_suffix_no_parens(self):
        assert format_projection_name("prot_t5", "pca", 2, "") == "ProtT5 — PCA 2"


# ---------------------------------------------------------------------------
# format_param_suffix
# ---------------------------------------------------------------------------


class TestFormatParamSuffix:
    def test_single_param(self):
        assert format_param_suffix({"n_neighbors": 50}) == "n=50"

    def test_multiple_params_sorted(self):
        assert (
            format_param_suffix({"n_neighbors": 50, "min_dist": 0.1}) == "d=0.1, n=50"
        )

    def test_string_value(self):
        assert format_param_suffix({"metric": "cosine"}) == "m=cosine"

    def test_unknown_key_passthrough(self):
        assert format_param_suffix({"custom_key": 42}) == "custom_key=42"


# ---------------------------------------------------------------------------
# disambiguation_suffix
# ---------------------------------------------------------------------------


class TestDisambiguationSuffix:
    def test_unique_method_returns_empty(self):
        spec = parse_method_spec("umap2:n_neighbors=50")
        counts = Counter([(spec.method, spec.dims)])
        assert disambiguation_suffix(spec, counts) == ""

    def test_duplicates_with_overrides_return_suffixes(self):
        a = parse_method_spec("umap2:n_neighbors=15")
        b = parse_method_spec("umap2:n_neighbors=50")
        counts = Counter([(a.method, a.dims), (b.method, b.dims)])
        assert disambiguation_suffix(a, counts) == "n=15"
        assert disambiguation_suffix(b, counts) == "n=50"

    def test_plain_spec_alongside_override_returns_empty(self):
        """Mixed case: -m umap2 -m umap2:n_neighbors=50.

        The plain spec has no overrides, so its suffix is empty even though
        the (method, dims) pair is duplicated. The override spec carries the
        disambiguating suffix.
        """
        plain = MethodSpec("umap", 2)
        override = parse_method_spec("umap2:n_neighbors=50")
        counts = Counter([(plain.method, plain.dims), (override.method, override.dims)])
        assert disambiguation_suffix(plain, counts) == ""
        assert disambiguation_suffix(override, counts) == "n=50"

    def test_duplicate_method_no_overrides_anywhere(self):
        """If two specs collide with no overrides at all, suffix is empty.

        This case cannot occur via parse_methods_arg (it dedupes), but the
        helper should still behave sanely if called directly.
        """
        spec = MethodSpec("umap", 2)
        counts = Counter([(spec.method, spec.dims), (spec.method, spec.dims)])
        assert disambiguation_suffix(spec, counts) == ""


# ---------------------------------------------------------------------------
# _resolve_annotation_names
# ---------------------------------------------------------------------------


class TestResolveAnnotationNames:
    def _resolve(self, annotations):
        config = PipelineConfig(
            methods=[MethodSpec("pca", 2)],
            output_path=None,
            annotations=annotations,
        )
        pipeline = ReductionPipeline(config)
        return pipeline._resolve_annotation_names()

    def test_none(self):
        assert self._resolve(None) == ([], None)

    def test_empty_list(self):
        assert self._resolve([]) == ([], None)

    def test_single(self):
        assert self._resolve(["organism_name"]) == (["organism_name"], None)

    def test_comma_separated(self):
        assert self._resolve(["organism_name,ec_number"]) == (
            ["organism_name", "ec_number"],
            None,
        )

    def test_multiple_items(self):
        assert self._resolve(["organism_name", "ec_number"]) == (
            ["organism_name", "ec_number"],
            None,
        )

    def test_strips_whitespace(self):
        assert self._resolve(["  organism_name , ec_number  "]) == (
            ["organism_name", "ec_number"],
            None,
        )

    def test_skips_empty_parts(self):
        assert self._resolve(["a,,b", ""]) == (["a", "b"], None)

    def test_csv_path(self):
        assert self._resolve(["metadata.csv"]) == ([], "metadata.csv")

    def test_csv_with_annotations(self):
        assert self._resolve(["metadata.csv", "default,pfam"]) == (
            ["default", "pfam"],
            "metadata.csv",
        )

    def test_tsv_path(self):
        assert self._resolve(["data.tsv", "ec"]) == (["ec"], "data.tsv")


# ---------------------------------------------------------------------------
# _validate_headers
# ---------------------------------------------------------------------------


class TestValidateHeaders:
    def _make_pipeline(self):
        config = PipelineConfig(methods=[MethodSpec("pca", 2)], output_path=None)
        return ReductionPipeline(config)

    def _make_es(self, name, headers):
        return EmbeddingSet(
            name=name,
            data=np.random.rand(len(headers), 10).astype(np.float32),
            headers=headers,
        )

    def test_single_set(self):
        pipeline = self._make_pipeline()
        es = self._make_es("model", ["A", "B", "C"])
        result = pipeline._validate_headers([es])
        assert result == ["A", "B", "C"]

    def test_two_sets_same_headers(self):
        pipeline = self._make_pipeline()
        es1 = self._make_es("m1", ["A", "B", "C"])
        es2 = self._make_es("m2", ["A", "B", "C"])
        result = pipeline._validate_headers([es1, es2])
        assert result == ["A", "B", "C"]

    def test_intersection(self):
        pipeline = self._make_pipeline()
        es1 = self._make_es("m1", ["A", "B", "C"])
        es2 = self._make_es("m2", ["B", "C", "D"])
        result = pipeline._validate_headers([es1, es2])
        assert result == ["B", "C"]

    def test_no_overlap_raises(self):
        pipeline = self._make_pipeline()
        es1 = self._make_es("m1", ["A", "B"])
        es2 = self._make_es("m2", ["C", "D"])
        with pytest.raises(ValueError, match="No common"):
            pipeline._validate_headers([es1, es2])

    def test_reorders_data(self):
        pipeline = self._make_pipeline()
        es1 = self._make_es("m1", ["A", "B", "C"])
        es2 = self._make_es("m2", ["C", "B", "A"])
        # Save original row for "A" in es2 (index 2)
        es2_row_a = es2.data[2].copy()
        pipeline._validate_headers([es1, es2])
        # After validation, es2 should be reordered to match es1's order
        assert es2.headers == ["A", "B", "C"]
        np.testing.assert_array_equal(es2.data[0], es2_row_a)


# ---------------------------------------------------------------------------
# merge_same_name_sets
# ---------------------------------------------------------------------------


def _make_es(name, headers, data=None, precomputed=False, fasta_path=None):
    if data is None:
        data = np.random.rand(len(headers), 10).astype(np.float32)
    return EmbeddingSet(
        name=name,
        data=data,
        headers=headers,
        precomputed=precomputed,
        fasta_path=fasta_path,
    )


class TestMergeSameNameSets:
    def test_single_set_passthrough(self):
        es = _make_es("prot_t5", ["A", "B"])
        result = merge_same_name_sets([es])
        assert len(result) == 1
        assert result[0] is es

    def test_different_names_no_merge(self):
        es1 = _make_es("prot_t5", ["A", "B"])
        es2 = _make_es("esm2_650m", ["A", "B"])
        result = merge_same_name_sets([es1, es2])
        assert len(result) == 2
        assert result[0] is es1
        assert result[1] is es2

    def test_union_same_name_disjoint(self):
        """Core bug fix: same name + disjoint headers → union."""
        es1 = _make_es("prot_t5", ["A", "B"])
        es2 = _make_es("prot_t5", ["C", "D"])
        result = merge_same_name_sets([es1, es2])
        assert len(result) == 1
        assert result[0].name == "prot_t5"
        assert result[0].headers == ["A", "B", "C", "D"]
        assert result[0].data.shape == (4, 10)

    def test_union_preserves_order(self):
        es1 = _make_es("m", ["B", "A"])
        es2 = _make_es("m", ["D", "C"])
        result = merge_same_name_sets([es1, es2])
        assert result[0].headers == ["B", "A", "D", "C"]

    def test_overlap_identical_dedup(self):
        shared_row = np.ones((1, 10), dtype=np.float32)
        data1 = np.vstack([shared_row, np.zeros((1, 10), dtype=np.float32)])
        data2 = np.vstack([shared_row, np.full((1, 10), 2.0, dtype=np.float32)])
        es1 = _make_es("m", ["A", "B"], data=data1)
        es2 = _make_es("m", ["A", "C"], data=data2)
        result = merge_same_name_sets([es1, es2])
        assert result[0].headers == ["A", "B", "C"]
        assert result[0].data.shape == (3, 10)
        np.testing.assert_array_equal(result[0].data[0], shared_row[0])

    def test_overlap_conflicting_raises(self):
        data1 = np.ones((2, 10), dtype=np.float32)
        data2 = np.zeros((2, 10), dtype=np.float32)
        es1 = _make_es("m", ["A", "B"], data=data1)
        es2 = _make_es("m", ["A", "C"], data=data2)
        with pytest.raises(ValueError, match="conflicting embedding data"):
            merge_same_name_sets([es1, es2])

    def test_dimension_mismatch_raises(self):
        es1 = _make_es("m", ["A"], data=np.ones((1, 10), dtype=np.float32))
        es2 = _make_es("m", ["B"], data=np.ones((1, 20), dtype=np.float32))
        with pytest.raises(ValueError, match="dimension mismatch"):
            merge_same_name_sets([es1, es2])

    def test_precomputed_merge_raises(self):
        es1 = _make_es("m", ["A", "B"], precomputed=True)
        es2 = _make_es("m", ["C", "D"], precomputed=True)
        with pytest.raises(ValueError, match="precomputed"):
            merge_same_name_sets([es1, es2])

    def test_three_files_same_name(self):
        es1 = _make_es("m", ["A", "B"])
        es2 = _make_es("m", ["C", "D"])
        es3 = _make_es("m", ["E", "F"])
        result = merge_same_name_sets([es1, es2, es3])
        assert len(result) == 1
        assert result[0].headers == ["A", "B", "C", "D", "E", "F"]
        assert result[0].data.shape == (6, 10)

    def test_mixed_merge_and_intersect(self):
        """Same-name sets merged, then different names intersected via pipeline."""
        es1 = _make_es("prot_t5", ["A", "B"])
        es2 = _make_es("prot_t5", ["C", "D"])
        es3 = _make_es("esm2", ["A", "B", "C", "D"])
        result = merge_same_name_sets([es1, es2, es3])
        # prot_t5 merged into one (4 proteins), esm2 untouched (4 proteins)
        assert len(result) == 2
        assert result[0].name == "prot_t5"
        assert result[0].headers == ["A", "B", "C", "D"]
        assert result[1].name == "esm2"

    def test_fasta_path_preserved(self):
        from pathlib import Path

        es1 = _make_es("m", ["A"], fasta_path=None)
        es2 = _make_es("m", ["B"], fasta_path=Path("/tmp/seq.fasta"))
        result = merge_same_name_sets([es1, es2])
        assert result[0].fasta_path == Path("/tmp/seq.fasta")

    def test_empty_list(self):
        assert merge_same_name_sets([]) == []

    def test_same_name_no_overlap_through_pipeline(self):
        """Regression test for issue #44: same name, disjoint keys should work."""
        config = PipelineConfig(methods=[MethodSpec("pca", 2)], output_path=None)
        pipeline = ReductionPipeline(config)
        es1 = _make_es("prot_t5", ["A", "B"])
        es2 = _make_es("prot_t5", ["C", "D"])
        # Before the fix, this raised "No common protein identifiers"
        result = pipeline._validate_headers(merge_same_name_sets([es1, es2]))
        assert set(result) == {"A", "B", "C", "D"}


# ---------------------------------------------------------------------------
# project.py base.config isolation contract
# ---------------------------------------------------------------------------


class TestRunWithOverriddenConfig:
    """The shared helper must restore base.config between iterations so a
    `precomputed` flag (or any temporary key) cannot leak from one spec to
    the next.
    """

    def test_base_config_restored_after_call(self):
        original = {"metric": "euclidean", "n_neighbors": 15}

        class FakeBase:
            def __init__(self, cfg):
                self.config = cfg
                self.seen_config = None

            def process_reduction(self, data, method, dims):
                self.seen_config = dict(self.config)
                return {
                    "name": f"{method}{dims}",
                    "dimensions": dims,
                    "data": [],
                    "info": {},
                }

        base = FakeBase(dict(original))
        effective = {**original, "n_neighbors": 50, "precomputed": True}

        result = _run_with_overridden_config(base, effective, "umap", 2, data=None)

        assert base.seen_config == effective, (
            "process_reduction should observe the overridden config"
        )
        assert base.config == original, (
            f"base.config leaked override; expected {original}, got {base.config}"
        )
        assert result["name"] == "umap2"

    def test_config_restored_on_exception(self):
        original = {"metric": "euclidean"}

        class BoomBase:
            def __init__(self, cfg):
                self.config = cfg

            def process_reduction(self, data, method, dims):
                raise RuntimeError("boom")

        base = BoomBase(dict(original))
        with pytest.raises(RuntimeError, match="boom"):
            _run_with_overridden_config(
                base, {"metric": "cosine"}, "umap", 2, data=None
            )

        assert base.config == original


# ---------------------------------------------------------------------------
# precomputed-MDS branch: base.config isolation
# ---------------------------------------------------------------------------


class TestPrecomputedMDSConfigIsolation:
    """Regression tests for the precomputed-MDS branch in
    ReductionPipeline._run_reductions: a `precomputed` flag must not survive
    in self.base.config after the branch finishes — including when
    process_reduction raises.
    """

    def _make_pipeline(self):
        config = PipelineConfig(methods=[], output_path=None)
        return ReductionPipeline(config)

    def _make_precomputed_es(self):
        return EmbeddingSet(
            name="MMseqs2",
            data=np.eye(2, dtype=np.float32),
            headers=["A", "B"],
            precomputed=True,
        )

    def test_precomputed_mds_does_not_leak_precomputed_flag_on_success(self):
        pipeline = self._make_pipeline()

        def fake_reduce(data, method, dims):
            assert method == "mds"
            assert pipeline.base.config.get("precomputed") is True
            return {
                "name": "stub",
                "dimensions": dims,
                "data": np.zeros((2, dims), dtype=np.float32),
                "info": {},
            }

        pipeline.base.process_reduction = fake_reduce

        pipeline._run_reductions([self._make_precomputed_es()])

        assert "precomputed" not in pipeline.base.config

    def test_precomputed_mds_restores_config_on_exception(self):
        pipeline = self._make_pipeline()

        def boom(data, method, dims):
            raise RuntimeError("boom")

        pipeline.base.process_reduction = boom
        original_config_id = id(pipeline.base.config)

        with pytest.raises(RuntimeError, match="boom"):
            pipeline._run_reductions([self._make_precomputed_es()])

        assert "precomputed" not in pipeline.base.config
        assert id(pipeline.base.config) == original_config_id, (
            "base.config reference should be the original dict, not a replacement"
        )


# ---------------------------------------------------------------------------
# Preparation notebook cache identity
# ---------------------------------------------------------------------------


class TestPreparationNotebookCacheIdentity:
    def test_query_cache_path_changes_with_query(self, tmp_path):
        globin = pipeline_module._query_fasta_cache_path(
            tmp_path, "(family:globin) AND (reviewed:true)"
        )
        phosphatase = pipeline_module._query_fasta_cache_path(
            tmp_path, "(family:phosphatase) AND (reviewed:true)"
        )

        assert globin != phosphatase
        assert globin.parent == phosphatase.parent == tmp_path / "queries"

    def test_query_cache_path_is_reused_for_same_query(self, tmp_path):
        query = "(family:globin) AND (reviewed:true)"

        assert pipeline_module._query_fasta_cache_path(
            tmp_path, query
        ) == pipeline_module._query_fasta_cache_path(tmp_path, query)

    def test_input_cache_dir_changes_for_disjoint_fasta_inputs(self, tmp_path):
        first = tmp_path / "first.fasta"
        second = tmp_path / "second.fasta"
        first.write_text(">P1\nAAAA\n")
        second.write_text(">P2\nCCCC\n")

        first_cache = pipeline_module._input_cache_dir(tmp_path, first)
        second_cache = pipeline_module._input_cache_dir(tmp_path, second)

        assert first_cache != second_cache

    def test_input_cache_dir_changes_for_same_id_changed_sequence(self, tmp_path):
        fasta = tmp_path / "input.fasta"
        fasta.write_text(">P1\nAAAA\n")
        original_cache = pipeline_module._input_cache_dir(tmp_path, fasta)

        fasta.write_text(">P1\nCCCC\n")
        changed_cache = pipeline_module._input_cache_dir(tmp_path, fasta)

        assert changed_cache != original_cache

    def test_input_cache_dir_is_reused_for_identical_content(self, tmp_path):
        first = tmp_path / "first.fasta"
        renamed = tmp_path / "renamed.fasta"
        first.write_text(">P1\nAAAA\n")
        renamed.write_text(">P1\nAAAA\n")

        assert pipeline_module._input_cache_dir(
            tmp_path, first
        ) == pipeline_module._input_cache_dir(tmp_path, renamed)

    def test_embedding_cache_path_changes_with_backend(self, tmp_path):
        cache_dir = tmp_path / "inputs" / "content-key"

        local = pipeline_module._embedding_cache_path(cache_dir, "prot_t5", "local")
        biocentral = pipeline_module._embedding_cache_path(
            cache_dir, "prot_t5", "biocentral"
        )

        assert local != biocentral

    def test_embedding_cache_path_is_reused_for_same_backend(self, tmp_path):
        cache_dir = tmp_path / "inputs" / "content-key"

        assert pipeline_module._embedding_cache_path(
            cache_dir, "prot_t5", "local"
        ) == pipeline_module._embedding_cache_path(cache_dir, "prot_t5", "local")


# ---------------------------------------------------------------------------
# Annotation cache identity
# ---------------------------------------------------------------------------


def test_annotation_cache_is_rebuilt_for_different_identifiers(tmp_path, monkeypatch):
    from protspace.data.annotations.manager import ProteinAnnotationManager

    cache_dir = tmp_path / "cache"
    cache_dir.mkdir()
    pd.DataFrame(
        {
            "identifier": ["OLD1", "OLD2"],
            "protein_name": ["old", "old"],
            "gene_name": ["old", "old"],
            "uniprot_kb_id": ["old", "old"],
        }
    ).to_parquet(cache_dir / "all_annotations.parquet")

    pipeline = ReductionPipeline(
        PipelineConfig(
            methods=[],
            output_path=tmp_path / "output.parquetbundle",
            keep_tmp=True,
            intermediate_dir=cache_dir,
            annotations=["protein_name"],
        )
    )
    captured = {}

    def fresh_annotations(manager):
        captured["headers"] = manager.headers
        captured["cached_data"] = manager.cached_data
        return pd.DataFrame(
            {
                "identifier": ["NEW1", "NEW2"],
                "protein_name": ["new", "new"],
                "gene_name": ["new", "new"],
                "uniprot_kb_id": ["new", "new"],
            }
        )

    monkeypatch.setattr(ProteinAnnotationManager, "to_pd", fresh_annotations)

    result = pipeline._fetch_annotations(["NEW1", "NEW2"])

    assert captured["headers"] == ["NEW1", "NEW2"]
    assert captured["cached_data"] is None
    assert result["identifier"].tolist() == ["NEW1", "NEW2"]


def test_annotation_cache_is_reused_for_matching_identifiers(tmp_path, monkeypatch):
    from protspace.data.annotations.manager import ProteinAnnotationManager

    cache_dir = tmp_path / "cache"
    cache_dir.mkdir()
    pd.DataFrame(
        {
            "identifier": ["P1", "P2"],
            "protein_name": ["one", "two"],
            "gene_name": ["gene-one", "gene-two"],
            "uniprot_kb_id": ["id-one", "id-two"],
        }
    ).to_parquet(cache_dir / "all_annotations.parquet")
    pipeline = ReductionPipeline(
        PipelineConfig(
            methods=[],
            output_path=tmp_path / "output.parquetbundle",
            keep_tmp=True,
            intermediate_dir=cache_dir,
            annotations=["protein_name"],
        )
    )

    def unexpected_fetch(_manager):
        pytest.fail("matching annotation identifiers should reuse the cache")

    monkeypatch.setattr(ProteinAnnotationManager, "to_pd", unexpected_fetch)

    result = pipeline._fetch_annotations(["P2", "P1"])

    assert result["identifier"].tolist() == ["P1", "P2"]


def test_annotation_cache_superset_is_reused_without_truncation(tmp_path, monkeypatch):
    from protspace.data.annotations.manager import ProteinAnnotationManager

    cache_path = tmp_path / "cache" / "all_annotations.parquet"
    cache_path.parent.mkdir()
    cached = pd.DataFrame(
        {
            "identifier": ["P1", "P2", "P3"],
            "protein_name": ["one", "two", "three"],
            "gene_name": ["gene-one", "gene-two", "gene-three"],
            "uniprot_kb_id": ["id-one", "id-two", "id-three"],
        }
    )
    cached.to_parquet(cache_path)
    pipeline = ReductionPipeline(
        PipelineConfig(
            methods=[],
            output_path=tmp_path / "output.parquetbundle",
            keep_tmp=True,
            intermediate_dir=cache_path.parent,
            annotations=["protein_name"],
        )
    )

    def unexpected_fetch(_manager):
        pytest.fail("a cache covering every requested identifier should be reused")

    monkeypatch.setattr(ProteinAnnotationManager, "to_pd", unexpected_fetch)

    result = pipeline._fetch_annotations(["P2", "P1"])

    assert result["identifier"].tolist() == ["P1", "P2", "P3"]
    pd.testing.assert_frame_equal(pd.read_parquet(cache_path), cached)


# ---------------------------------------------------------------------------
# Preparation notebook projection refresh
# ---------------------------------------------------------------------------


def test_notebook_refreshes_same_name_changed_input_through_pipeline(tmp_path):
    refetch_stages = _preparation_notebook_projection_refetch_stages()
    assert refetch_stages == frozenset({"projections"})
    config = PipelineConfig(
        methods=parse_methods_arg(["umap2"]),
        output_path=tmp_path / "output" / "data.parquetbundle",
        keep_tmp=True,
        intermediate_dir=tmp_path / "output" / "tmp",
        annotations=None,
        refetch_stages=refetch_stages,
    )
    config.intermediate_dir.mkdir(parents=True)
    pipeline = ReductionPipeline(config)
    inputs = []

    def record_input(data, method, dims):
        inputs.append(data.copy())
        return {
            "name": f"{method}{dims}",
            "dimensions": dims,
            "info": {},
            "data": data[:, :dims].copy(),
        }

    pipeline.base.process_reduction = record_input
    headers = ["P1", "P2", "P3"]
    first_input = EmbeddingSet(
        name="prot_t5",
        data=np.zeros((3, 3), dtype=np.float32),
        headers=headers,
    )
    changed_input = EmbeddingSet(
        name="prot_t5",
        data=np.full((3, 3), 7.0, dtype=np.float32),
        headers=headers,
    )

    pipeline._run_reductions([first_input])
    changed = pipeline._run_reductions([changed_input])[0]

    assert len(inputs) == 2
    np.testing.assert_array_equal(
        changed["data"], np.full((3, 2), 7.0, dtype=np.float32)
    )
