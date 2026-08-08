## Why

Issue #338 reports stale projections after changing a dimensionality-reduction slider. The existing projection key already includes all reducer parameters, so that exact symptom is not reproduced by the current code. Auditing the same retained-cache flow exposed a separate reproducible problem: the Preparation notebook shares query FASTA, embedding, annotation, and projection caches across unrelated inputs. A later Generate action can therefore use stale or unioned upstream data when the selected query, FASTA, sequence content, or H5 input changes.

## What Changes

- Make every Generate action in `ProtSpace_Preparation.ipynb` explicitly recompute dimensionality-reduction projections.
- Partition retained query FASTA files by query text, publish them atomically, and partition other intermediates by input-file content so only compatible inputs share cache entries.
- Partition embedding H5 files by producing backend as well as input content and model.
- Validate annotation-cache identifiers before reuse.
- Continue retaining compatible query, embedding, and annotation intermediates.
- Add focused regression coverage for changed queries, interrupted FASTA extraction, backend switches and reuse, disjoint FASTA inputs, same-ID sequence changes, cross-dataset annotations, and explicitly refreshed projections.

## Capabilities

### New Capabilities

- `notebook-projection-cache-safety`: Defines how the Preparation notebook owns retained query, embedding, annotation, and projection intermediates across Generate actions.

### Modified Capabilities

None.

## Impact

- Affected notebook: `apps/protspace/notebooks/ProtSpace_Preparation.ipynb`.
- Affected loaders/helpers: atomic query FASTA publication plus annotation validation and content-/producer-addressed notebook cache paths.
- Affected tests: focused Python pipeline regressions using normal pipeline construction.
- No CLI defaults, bundle format, public Python API, or dependencies change.
