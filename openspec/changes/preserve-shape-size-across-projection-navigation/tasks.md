## 1. Specification

- [x] 1.1 Validate the OpenSpec proposal, design, requirements, and task plan.

## 2. Regression Test

- [x] 2.1 Add focused coverage distinguishing the first automatic default load from a subsequent
      explicit default reset.
- [x] 2.2 Run the focused regression and observe the expected failure before implementation.

## 3. Implementation

- [x] 3.1 Update the dataset controller's persistence decision and non-clearing file-setting merge
      semantics using existing lifecycle and persistence state.
- [x] 3.2 Run the focused regressions and observe them pass without changing import precedence.

## 4. Verification

- [x] 4.1 Verify the saved Shape size survives the original reload and projection deep-link browser
      reproductions.
- [x] 4.2 Run the affected focused test suites.
- [x] 4.3 Run `pnpm precommit` successfully before committing and pushing.
