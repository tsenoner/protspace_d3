## 1. Regression Coverage

- [x] 1.1 Add a focused manager test for deriving an empty UniProt length from a matching FASTA sequence.
- [x] 1.2 Run the focused test and record the expected RED failure against the current implementation.

## 2. Root-Cause Fix

- [x] 2.1 Enrich only missing primary annotation lengths from matching local FASTA sequences before downstream merging.
- [x] 2.2 Add coverage proving that an existing UniProt length is preserved.
- [x] 2.3 Run the focused tests and record GREEN results.

## 3. Verification

- [x] 3.1 Re-run the original unmapped-protein reproduction and confirm the output contains the FASTA-derived length.
- [x] 3.2 Run the affected Python package's lint, format, and non-slow test checks.
- [x] 3.3 Run the repository-mandated `pnpm precommit` gate before publishing.
