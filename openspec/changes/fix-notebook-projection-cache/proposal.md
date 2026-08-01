## Why

The Preparation notebook keeps one intermediate directory across Generate runs, but projection cache identity does not include the input embeddings. A later run can therefore rebundle stale coordinates when its input changes while the embedding name, method, and reducer parameters remain the same.

## What Changes

- Make every Generate action in `ProtSpace_Preparation.ipynb` explicitly recompute dimensionality-reduction projections.
- Continue retaining the notebook's expensive query, embedding, and annotation intermediates; only projection reuse changes.
- Add regression coverage proving an explicitly refreshed projection does not reuse coordinates from changed input data.

## Capabilities

### New Capabilities

- `notebook-projection-cache-safety`: Defines how the Preparation notebook treats cached projections across Generate actions.

### Modified Capabilities

None.

## Impact

- Affected notebook: `apps/protspace/notebooks/ProtSpace_Preparation.ipynb`.
- Affected tests: Python pipeline regression coverage for notebook-equivalent projection refresh behavior.
- No CLI defaults, bundle format, public Python API, or dependencies change.
