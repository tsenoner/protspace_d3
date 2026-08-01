## 1. Regression Coverage

- [x] 1.1 Update the focused Biocentral retriever test to require the unambiguous negative TMbed category and observe it fail.
- [x] 1.2 Extend the generated Python-to-TypeScript bundle contract with a negative TMbed prediction and observe the consumer assertion fail.

## 2. Producer and Documentation

- [x] 2.1 Change the Biocentral TMbed adapter to emit `non-transmembrane` for a completed negative prediction.
- [x] 2.2 Update CLI and web annotation descriptions to document the corrected categorical vocabulary.

## 3. Verification

- [x] 3.1 Run the focused Python retriever and cross-language contract tests and confirm they pass.
- [x] 3.2 Regenerate annotation documentation and verify generated files are current.
- [x] 3.3 Run the affected Python lint/test gates and the repository-wide `pnpm precommit` gate.
- [x] 3.4 Verify a newly produced bundle displays the negative TMbed category separately from missing values.

## 4. Review Regression Coverage

- [x] 4.1 Add focused real-model regressions for `None` and empty TMbed payloads and observe the expected failures.
- [x] 4.2 Extend the generated bundle contract with an adapter-derived missing TMbed payload and observe the expected failure.

## 5. Missing Payload Fix

- [x] 5.1 Return the established missing representation before scanning absent TMbed topology payloads.

## 6. Review Verification

- [x] 6.1 Run the focused Biocentral and cross-language bundle contract tests and confirm they pass.
- [x] 6.2 Run Ruff, the complete non-slow ProtSpace Python suite, strict OpenSpec validation, and `pnpm precommit`.
- [x] 6.3 Prepare the verified change for the inline review follow-up and CI run.
