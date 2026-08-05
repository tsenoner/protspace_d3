## Context

`ProtSpace_Preparation.ipynb` keeps `output/tmp` so expensive FASTA downloads, embeddings, and annotations can survive repeated Generate actions. `ReductionPipeline` also stores projections there. Projection keys already include the logical embedding name, method, dimensions, and every reducer parameter, so the slider-only symptom in issue #338 is not reproduced by the current implementation. The reproducible collision is broader: the notebook stores every query as `sequences.fasta`, every model as `{embedder}.h5`, every annotation set as `all_annotations.parquet`, and projections under one shared directory. Changing datasets can therefore reuse a different query's FASTA, append disjoint proteins to an embedding file, retain an old embedding for a changed sequence with the same identifier, or return annotations for unrelated identifiers.

## Goals / Non-Goals

**Goals:**

- Guarantee that every Preparation-notebook Generate action reduces the current embedding data.
- Preserve caching for compatible query, embedding, and annotation inputs.
- Prevent query, embedding, and annotation cache reuse across incompatible inputs.
- Cover changed queries, disjoint inputs, same-ID sequence changes, annotation identifiers, and projection refresh with focused regressions.

**Non-Goals:**

- Redesign projection cache identity for CLI users.
- Disable every notebook cache or redesign backend resume semantics.
- Change reducer parameters, projection naming, bundle layout, or output paths.

## Decisions

### Request the existing projections refetch stage from the notebook

The notebook will construct `PipelineConfig` with `refetch_stages=frozenset({"projections"})`. `ReductionPipeline._load_cached_projection` already treats that stage as an instruction to bypass cached coordinates, while the other retained intermediates remain available.

This uses the pipeline's public configuration contract and keeps cache lifecycle in one place.

Reducer-parameter changes already select a distinct projection cache key. Explicit projection refresh remains a notebook-level correctness guarantee and also protects same-name inputs whose matrices differ.

**Alternative: delete `proj_*.npz` files before each run.** Rejected because it duplicates cache naming/lifecycle knowledge in the notebook and introduces an unnecessary destructive filesystem operation.

**Alternative: hash all embedding bytes and headers in the core projection key.** Rejected because it broadens CLI cache semantics and adds hashing cost to all callers. The notebook explicitly wants fresh projections on Generate, so selecting the existing refetch stage is clearer and narrower.

### Partition retained notebook caches by their owning input

UniProt query FASTA paths are derived from a short SHA-256 digest of the exact query text. Once an input file is available, the notebook derives its intermediate directory from a streaming SHA-256 digest of that file's bytes. Query and uploaded FASTA inputs therefore place embedding, annotation, and projection intermediates under a content-owned directory; H5 inputs use the same rule directly.

This keeps byte-identical inputs reusable while separating changed queries, disjoint FASTA files, and same-identifier sequences whose residues changed. The helper functions live beside the existing pipeline cache logic, and the notebook supplies the resulting directory through the existing `PipelineConfig.intermediate_dir` contract.

**Alternative: teach each embedding backend to reconcile per-sequence hashes inside H5.** Rejected because both backends already implement resumable H5 writes and changing that format would broaden this notebook-scoped fix.

### Validate annotation identifiers before reuse

`ReductionPipeline._fetch_annotations` compares the cached and requested identifier multisets before considering cached columns. A mismatch rebuilds the annotation cache for the current headers instead of passing incompatible rows into the bundle merge. Exact-identifier caches retain the existing incremental column/source behavior.

### Exercise actual cache behavior in the regression

The projection regression uses a normally constructed `ReductionPipeline` and substitutes only the reducer call. It runs two same-name embedding sets with different data through the notebook's configured projection refresh, then asserts the reducer sees both inputs and the second result reflects the second input. Additional focused tests assert cache paths differ for query changes, disjoint FASTA inputs, and same-ID changed sequences, and that annotation identifiers are validated before reuse.

The notebook artifact will also be validated as a parseable notebook with parseable code cells, following existing notebook verification practice.

## Risks / Trade-offs

- **Projection reruns take longer even when nothing changed.** → This is the explicit notebook correctness contract; expensive embedding and annotation intermediates remain cached.
- **Hashing an input file adds one sequential read per Generate action.** → Example and uploaded inputs are already read for processing, and the bounded cost avoids far more expensive incompatible embedding reuse.
- **Old shared cache files remain under `output/tmp`.** → New input-owned paths ignore them; no destructive migration is required.
- **The regression could test pipeline behavior without proving notebook wiring.** → Verification will additionally inspect the executed notebook configuration path and validate all notebook code cells.
- **A future pipeline refetch API rename could break the notebook.** → The focused pipeline regression and notebook configuration verification make that failure visible.

## Migration Plan

No data migration is required. Existing shared FASTA, embedding, annotation, and projection files may remain in `output/tmp`; the notebook uses new query- and input-owned subpaths and stops reading incompatible shared entries. Rollback restores the shared cache paths and removes the explicit projection refresh.

## Open Questions

None.
