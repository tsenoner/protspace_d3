## 1. Regression and Fix

- [x] 1.1 Add a focused regression test for unresolved, resolved-without-PDB, and resolved-with-PDB annotations, then verify the unresolved case fails on current code.
- [x] 1.2 Implement the minimal context-aware PDB transformation and verify the focused test passes.

## 2. Verification

- [x] 2.1 Re-run the mixed mapped/unmapped manager reproduction and confirm the unmapped PDB annotation is empty.
- [x] 2.2 Run the affected Python test suite and lint checks.
- [x] 2.3 Run the repository-mandated `pnpm precommit` gate.

## 3. Cache Round-Trip Review Follow-up

- [x] 3.1 Add a manager/cache round-trip regression test for canonical empty, `False`, and `True` PDB values, then verify the `False` case fails on current code.
- [x] 3.2 Make PDB transformation idempotent for persisted canonical boolean strings and verify the focused regression passes.
- [x] 3.3 Re-run strict OpenSpec validation, affected and full Python tests, Ruff, `pnpm precommit`, and the bundle contract.

## 4. Cache Migration and Documentation Review Follow-up

- [x] 4.1 Add a failing regression proving that a complete legacy PDB cache is
      refetched and rewritten with the current annotation-cache semantics marker.
- [x] 4.2 Implement the smallest source-scoped legacy cache invalidation and verify
      unaffected cached sources remain on the shared merge path.
- [x] 4.3 Add a failing mixed cached-InterPro/refetched-UniProt regression and make
      signal-peptide canonicalization idempotent.
- [x] 4.4 Update canonical PDB value documentation, regenerate the derived guide,
      and validate the OpenSpec change strictly.
- [x] 4.5 Run affected and full Python tests, Ruff, the bundle contract, and the
      repository-mandated `pnpm precommit` gate.
