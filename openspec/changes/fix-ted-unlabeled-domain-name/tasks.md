## 1. Regression Coverage

- [x] 1.1 Change the focused unlabeled-domain test to expect the TED source label and observe the
      expected failure against the current formatter.

## 2. Backend Fix

- [x] 2.1 Make the minimal formatter change that emits `-` for a domain without a CATH label.
- [x] 2.2 Run the focused regression test and complete TED retriever test module to observe them pass.

## 3. Documentation

- [x] 3.1 Update the TED annotation documentation sources to describe `-|{plddt}` output.
- [x] 3.2 Regenerate the annotation reference and verify generated documentation is current.
- [x] 3.3 Document the one-time `--refetch ted` requirement for existing formatted annotation
      caches in the user-facing references and migration plan.

## 4. Verification

- [x] 4.1 Re-run the W6JQJ9 reproduction and confirm unlabeled domains retain `-`.
- [x] 4.2 Validate the OpenSpec change strictly and run the repository `pnpm precommit` gate.
