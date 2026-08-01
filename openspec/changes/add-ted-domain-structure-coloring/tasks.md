## 1. TED Structure Data

- [x] 1.1 Add a failing StructureService regression test for valid TED domains and discontinuous segments
- [x] 1.2 Parse optional TED domains into typed StructureData without failing structure loading
- [x] 1.3 Cover unavailable and malformed TED responses

## 2. Mol\* Color Themes

- [x] 2.1 Add failing tests for deterministic domain colors, discontinuous ranges, and neutral unassigned residues
- [x] 2.2 Register the TED color provider and expose reversible pLDDT/TED theme switching in the Mol\* adapter

## 3. Structure Viewer Control

- [x] 3.1 Add failing component tests for the color control's default, enabled, disabled, and switching states
- [x] 3.2 Add the accessible two-mode color control and mode-specific explanatory text

## 4. Verification

- [x] 4.1 Re-run focused unit tests and the original browser reproduction
- [x] 4.2 Run the repository test suite and mandated `pnpm precommit` gate
