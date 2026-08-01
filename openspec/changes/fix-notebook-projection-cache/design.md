## Context

`ProtSpace_Preparation.ipynb` keeps `output/tmp` so expensive FASTA downloads, embeddings, and annotations can survive repeated Generate actions. `ReductionPipeline` also stores projections there. Its projection cache key includes the logical embedding name, method, dimensions, and reducer parameters, but not the embedding matrix or headers. The notebook reuses generic embedding names such as `prot_t5`, so a changed input can collide with a prior projection. The issue's desired notebook behavior is simpler than the CLI's reusable-cache behavior: Generate must recompute projections.

## Goals / Non-Goals

**Goals:**

- Guarantee that every Preparation-notebook Generate action reduces the current embedding data.
- Preserve caching for the notebook's more expensive input, embedding, and annotation stages.
- Cover changed input with an observable reducer-execution regression.

**Non-Goals:**

- Redesign projection cache identity for CLI users.
- Disable every notebook cache or alter query/embedding/annotation refresh semantics.
- Change reducer parameters, projection naming, bundle layout, or output paths.

## Decisions

### Request the existing projections refetch stage from the notebook

The notebook will construct `PipelineConfig` with `refetch_stages=frozenset({"projections"})`. `ReductionPipeline._load_cached_projection` already treats that stage as an instruction to bypass cached coordinates, while the other retained intermediates remain available.

This uses the pipeline's public configuration contract and keeps cache lifecycle in one place.

**Alternative: delete `proj_*.npz` files before each run.** Rejected because it duplicates cache naming/lifecycle knowledge in the notebook and introduces an unnecessary destructive filesystem operation.

**Alternative: hash all embedding bytes and headers in the core cache key.** Rejected for this issue because it broadens CLI cache semantics and adds hashing cost to all callers. The notebook explicitly wants fresh projections on Generate, so selecting the existing refetch stage is both clearer and narrower.

### Exercise actual cache behavior in the regression

The regression will use the real `ReductionPipeline._run_reductions` cache path with a deterministic fake reducer. It will run two same-name embedding sets with different data through a configuration that requests projection refresh, then assert the reducer sees both inputs and the second result reflects the second input.

The notebook artifact will also be validated as a parseable notebook with parseable code cells, following existing notebook verification practice.

## Risks / Trade-offs

- **Projection reruns take longer even when nothing changed.** → This is the explicit notebook correctness contract; expensive embedding and annotation intermediates remain cached.
- **The regression could test pipeline behavior without proving notebook wiring.** → Verification will additionally inspect the executed notebook configuration path and validate all notebook code cells.
- **A future pipeline refetch API rename could break the notebook.** → The focused pipeline regression and notebook configuration verification make that failure visible.

## Migration Plan

No data migration is required. Existing projection cache files may remain in `output/tmp`; the notebook will stop reading them during Generate. Rollback is a one-line notebook configuration revert.

## Open Questions

None.
