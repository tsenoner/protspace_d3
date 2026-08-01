## Context

`protspace-protein-search` computes selectable suggestions by excluding IDs in `selectedProteinIds`. Its renderer currently maps every non-empty query with zero suggestions to the same generic message. Consequently, an exact query for a selected protein is indistinguishable from a query that is absent from the dataset.

The component already receives the complete available and selected ID lists. The change therefore requires no new state, event, or parent-component contract.

## Goals / Non-Goals

**Goals:**

- Classify an exact, case-insensitive query for an available selected ID as already selected.
- Keep suggestion filtering and selection behavior unchanged.
- Protect the rendered behavior with a real component regression test and repeat the original browser reproduction after the fix.

**Non-Goals:**

- Change partial-match semantics, bulk-paste feedback, selection events, or search styling.
- Add notifications, persistence, or new dependencies.
- Refactor the existing search helpers or broader control-bar code.

## Decisions

### Decide the empty-state message from existing component inputs

When the trimmed query exactly matches an available ID case-insensitively and that canonical ID is selected, the renderer will use `Protein ID is already selected`; otherwise it will retain `No matching protein IDs found`.

This keeps classification beside the rendered empty state and avoids changing `computeSearchSuggestions`, whose responsibility is correctly limited to selectable results. Changing suggestion generation to return selected IDs was rejected because it would make already-selected proteins actionable suggestions and blur the selection contract.

### Exercise the actual custom element in the regression test

The regression test will instantiate `protspace-protein-search`, provide available and selected IDs, enter the query through its input, flush the existing debounce, and assert the rendered message. This is preferred over extending the duplicated helper logic in `search.test.ts`, which cannot fail when the component's render branch regresses.

### Keep browser verification manual and focused

The same demo-dataset path used for reproduction will be repeated in the in-app browser after implementation. A new full-app Playwright spec is not required for this isolated rendering branch because the component test covers the durable contract while browser verification proves the production composition.

## Risks / Trade-offs

- [Risk] Selected IDs could become stale relative to available IDs. → Require the query to resolve through `availableProteinIds` before reporting it as selected.
- [Risk] Exact matching could diverge from existing search normalization. → Use the same trimmed, case-insensitive comparison already used by search validation.
- [Trade-off] Bulk paste with only selected IDs remains silent. → Bulk feedback is outside issue #345 and remains unchanged.
