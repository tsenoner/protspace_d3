## 1. Regression and Fix

- [x] 1.1 Add a focused regression test for unresolved, resolved-without-PDB, and resolved-with-PDB annotations, then verify the unresolved case fails on current code.
- [x] 1.2 Implement the minimal context-aware PDB transformation and verify the focused test passes.

## 2. Verification

- [x] 2.1 Re-run the mixed mapped/unmapped manager reproduction and confirm the unmapped PDB annotation is empty.
- [x] 2.2 Run the affected Python test suite and lint checks.
- [x] 2.3 Run the repository-mandated `pnpm precommit` gate.
