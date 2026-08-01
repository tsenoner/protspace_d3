## Why

Protein search currently labels an exact match as "No matching protein IDs found" when that protein is already selected. The message is technically produced by an empty selectable-results list, but it is misleading because the protein exists and the user needs constructive feedback about its selected state.

## What Changes

- Distinguish an exact, case-insensitive match to an already-selected protein from a query with no matching protein ID.
- Render a constructive "Protein ID is already selected" search message for that state.
- Preserve existing suggestion filtering and generic no-match feedback for other queries.
- Add focused component regression coverage and verify the complete browser flow.

## Capabilities

### New Capabilities

- `protein-search-feedback`: User-facing feedback semantics for protein search queries that produce no selectable suggestions.

### Modified Capabilities

None.

## Impact

- Affects the protein-search web component in `packages/core` and its focused tests.
- Adds a narrow browser regression to the existing `apps/web` Playwright suite.
- Does not change public events, selection state, dependencies, or persisted data.
