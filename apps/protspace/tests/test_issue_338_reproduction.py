import ast
import json
from dataclasses import asdict
from pathlib import Path

import numpy as np

from protspace.data.loaders import EmbeddingSet
from protspace.data.processors.pipeline import (
    PipelineConfig,
    ReductionPipeline,
    parse_methods_arg,
)


class InputRecordingBase:
    def __init__(self, config):
        self.config = config
        self.reducers = {"umap": object()}
        self.inputs = []

    def process_reduction(self, data, method, dims):
        self.inputs.append(data.copy())
        return {
            "name": f"{method}{dims}",
            "dimensions": dims,
            "info": {},
            "data": data[:, :dims].copy(),
        }


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
    generate_source = next(source for source in code_sources if "def _on_gen" in source)
    tree = ast.parse(generate_source)
    config_call = next(
        node
        for node in ast.walk(tree)
        if isinstance(node, ast.Call)
        and isinstance(node.func, ast.Name)
        and node.func.id == "PipelineConfig"
    )
    refetch_keyword = next(
        (
            keyword
            for keyword in config_call.keywords
            if keyword.arg == "refetch_stages"
        ),
        None,
    )
    if refetch_keyword is None:
        return frozenset()
    expression = ast.Expression(refetch_keyword.value)
    return eval(
        compile(expression, filename=str(notebook_path), mode="eval"),
        {"__builtins__": {}, "frozenset": frozenset},
    )


def test_notebook_cache_invalidates_when_input_embeddings_change(tmp_path):
    cache_dir = tmp_path / "output" / "tmp"
    cache_dir.mkdir(parents=True)
    config = PipelineConfig(
        methods=parse_methods_arg(["umap2"]),
        output_path=tmp_path / "output" / "data.parquetbundle",
        keep_tmp=True,
        intermediate_dir=cache_dir,
        annotations=None,
        refetch_stages=_preparation_notebook_projection_refetch_stages(),
    )
    pipeline = object.__new__(ReductionPipeline)
    pipeline.config = config
    pipeline.base = InputRecordingBase(asdict(config.reducer_params))

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

    assert len(pipeline.base.inputs) == 2
    np.testing.assert_array_equal(
        changed["data"], np.full((3, 2), 7.0, dtype=np.float32)
    )
