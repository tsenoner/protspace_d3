## 1. Regression coverage

- [x] 1.1 Integrate the same-name changed-embedding projection regression into the normal pipeline suite and construct `ReductionPipeline` through its initializer.
- [x] 1.2 Add focused regressions for query changes, disjoint FASTA inputs, same-ID sequence changes, and annotation identifier mismatches.
- [x] 1.3 Run the new cache-identity regressions before implementation and record the expected failures.
- [x] 1.4 Add RED regressions for Local/Biocentral cache ownership, same-backend reuse, and interrupted query FASTA publication.

## 2. Notebook implementation

- [x] 2.1 Configure `ProtSpace_Preparation.ipynb` to explicitly refresh only the projection stage on every Generate action.
- [x] 2.2 Partition cached query FASTA files by query text.
- [x] 2.3 Partition retained embedding, annotation, and projection intermediates by selected input-file content.
- [x] 2.4 Validate cached annotation identifiers before reuse and preserve incremental reuse for matching inputs.
- [x] 2.5 Scope embedding H5 paths by producing backend while retaining same-backend/model reuse.
- [x] 2.6 Stage, validate, and atomically publish query FASTA cache files, cleaning incomplete artifacts.

## 3. Focused verification

- [x] 3.1 Run the regression after implementation and observe it pass.
- [x] 3.2 Validate the notebook with `nbformat` and compile every code cell after removing Colab magics.
- [x] 3.3 Verify the original two-run reproduction returns coordinates from the changed input and invokes the reducer twice.
- [x] 3.4 Run the consolidated pipeline regressions and the full non-slow Python suite.

## 4. Repository gates

- [x] 4.1 Run affected Python tests and Ruff checks.
- [x] 4.2 Run `openspec validate fix-notebook-projection-cache --strict`.
- [x] 4.3 Run `pnpm precommit` before commit and push.
