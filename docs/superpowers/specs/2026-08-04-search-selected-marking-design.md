# Mark selected proteins in search suggestions

**Date:** 2026-08-04
**Issue:** [#345](https://github.com/tsenoner/protspace/issues/345)
**Supersedes:** the `search.ts` approach in [PR #398](https://github.com/tsenoner/protspace/pull/398)

## Problem

`computeSearchSuggestions` removes already-selected IDs from the suggestion list
(`search-suggestions.ts:26`). When every prefix match is already selected the list is
empty, and `search.ts:70` falls through to an empty-state branch that reports
`No matching protein IDs found`.

With P00595–P00599 selected, typing `P0059` matches five proteins, drops all five, and
reports that nothing matched. The message is false, not merely unhelpful.

PR #398 addressed one instance of this by classifying the empty state: if the query is an
exact case-insensitive match for a selected ID, say `Protein ID is already selected`. That
leaves two reachable states wrong — a partial query resolving only to selected proteins
still reports no matches, and when a selected ID is a strict prefix of unselected ones
(`GT4` selected, `GT40`–`GT46` available) the suggestion list is non-empty so no feedback
renders at all.

The root cause is that selected proteins are absent from the list. Classifying the empty
state treats a symptom; the fix is to stop hiding them.

## Approach

Selected proteins stay in the suggestion list and render as marked. Activating an entry
toggles it: unselected entries are added, selected entries are removed.

This makes `No matching protein IDs found` truthful — it can only render when nothing
prefix-matches — and removes the need for any classification logic at render time.

## Behaviour

### Suggestion list

Every available ID that prefix-matches the query appears, subject to the budgets below.
Entries already in `selectedProteinIds` render greyed with a ✓ and a ✕ affordance;
entries not selected render as today. Order is the natural `availableProteinIds` array
order — selected and unselected are interleaved, not grouped.

### Activation

The whole row is the activation target; the ✕ is affordance, not a separate button.
Click (via `mousedown`, preserving the existing blur-ordering workaround) and Enter behave
identically: add if unselected, remove if selected.

### Keyboard

Arrow keys traverse all entries uniformly. The default highlight stays at index 0
regardless of whether that entry is selected. There is no skip logic.

### Empty query

Focusing the empty search box shows up to `MAX_SELECTED_SUGGESTIONS` current selections
alongside the addable entries, in natural array order. Unfocused with an empty query still yields nothing.

### Deliberate behaviour changes

These are reversals of current behaviour and must be called out in the OpenSpec delta:

1. Typing an already-selected ID and pressing Enter **removes** it. Today it is a no-op
   (`search.ts:255-261`).
2. Focusing the empty search box now surfaces current selections. Today it lists only
   unselected IDs.
3. Removing a protein **keeps** the search query, so several proteins can be pruned from
   one result set without retyping. Adding a protein still clears the query, preserving
   today's search-one-add-one flow. This asymmetry is intentional: after adding you
   typically search for the next protein, after removing you typically prune within the
   current result set. If the asymmetry proves confusing in review, the alternative is to
   have both preserve the query — but that regresses the primary single-ID workflow from
   issue #345.

Paste is unaffected. `_onPaste` routes to `_addMultipleSelections`, which only ever adds.

## Data layer — `packages/core/src/components/control-bar/search-suggestions.ts`

Return type changes from `string[]` to `SearchSuggestion[]`:

```ts
export interface SearchSuggestion {
  id: string;
  isSelected: boolean;
}
```

The `if (selectedSet.has(id)) continue` skip is replaced by two independent budgets
tracked in a single pass:

```ts
export const MAX_SEARCH_SUGGESTIONS = 50;   // unchanged — selectable entries
export const MAX_SELECTED_SUGGESTIONS = 10; // new — already-selected entries
```

```
selectedSeen = 0   # selected IDs walked past, whether or not they match the query

for each id in availableIds:
  if selectableCount >= limit and (selectedCount >= selectedLimit or selectedSeen >= selectedSet.size):
    break
  isSelected = selectedSet.has(id)
  if isSelected: selectedSeen++
  if query and not id.toLowerCase().startsWith(query): continue
  if isSelected:
    if selectedCount >= selectedLimit: continue
    push { id, isSelected: true }; selectedCount++
  else:
    if selectableCount >= limit: continue
    push { id, isSelected: false }; selectableCount++
```

Separate budgets guarantee that addable proteins remain visible no matter how many prefix
matches are already selected. A single shared cap of 50 would let 50+ selected matches
fill the list and hide every addable entry.

The early-exit keeps this sub-millisecond on Swiss-Prot's 573K IDs. The exit condition
needs the selectable budget full AND the selected budget either full or exhausted —
exhausted meaning every currently-selected ID has been walked past, tracked by
`selectedSeen`. That second disjunct is load-bearing: requiring both budgets to be
*full* would never be satisfied when fewer than `selectedLimit` matches are selected,
which is the common case, and the scan would run to the end of the array on every
recompute. A selection sitting late in `availableIds` still forces a scan up to its
index — inherent to listing selections in natural order, and no worse than the
pre-existing worst case of a query with fewer total matches than the budget. This runs
debounced at `SEARCH_DEBOUNCE_MS` and never from `render()`.

## Component — `packages/core/src/components/control-bar/search.ts`

### State and recomputation

`searchSuggestions` becomes `SearchSuggestion[]`.

`_updateSuggestions()` gains a `preserveHighlight` parameter:

- Query-driven recompute resets the highlight to 0 (or -1 when empty), as today.
- `selectedProteinIds`-driven recompute preserves the current index, clamped to
  `[0, length - 1]`, or -1 when empty.

Add a `willUpdate(changed)` hook: when `changed.has('selectedProteinIds')` and the dropdown
is open (non-empty query or focused), call `_updateSuggestions(true)`. This is required —
`searchSuggestions` is `@state` computed at debounce time, so without it a removal would
leave the list stale while the query is preserved. It cannot loop: the recompute writes
`searchSuggestions`, which does not change `selectedProteinIds`.

### Activation

```ts
private _activateSuggestion(entry: SearchSuggestion) {
  entry.isSelected ? this._removeSelection(entry.id) : this._addSelection(entry.id);
}
```

Called from both the row `mousedown` handler and the Enter branch of `_onSearchKeydown`.
The existing Enter fallback for an empty list — `_addSelection(this.searchQuery.trim())` —
is retained unchanged.

### Removal

```ts
private _removeSelection(id: string) {
  if (!this.selectedProteinIds.includes(id)) return;
  this._clearSuggestionDebounce();
  this.dispatchEvent(new CustomEvent('remove-selection', {
    detail: { proteinId: id }, bubbles: true, composed: true,
  }));
}
```

It does not clear `searchQuery` or `searchSuggestions`; `willUpdate` refreshes the list
when the parent echoes the new `selectedProteinIds` back down. The removed row stays in
place and flips from marked to addable.

### Deletions

`_getEmptyStateMessage()` (`search.ts:223-232`) is deleted, along with the string
`'Protein ID is already selected'`. The empty-state branch renders the literal
`No matching protein IDs found`. This removes the per-keystroke `availableProteinIds.find`
with per-element `toLowerCase()` that ran from inside `render()`.

## Wiring — `packages/core/src/components/control-bar/control-bar.ts`

Bind `@remove-selection=${this._handleSearchSelectionRemove}` on the
`<protspace-protein-search>` element (`control-bar.ts:623-629`).

`_handleSearchSelectionRemove` mirrors `_handleSearchSelectionAdd` (`control-bar.ts:1476`):

1. Return early if the ID is absent from `selectedIdsChips`.
2. Filter it out; assign `selectedIdsChips` and `selectedProteinsCount`.
3. Under `autoSync`, sync `_scatterplotElement.selectedProteinIds`.
4. Dispatch `protein-selection-change` with the new array.

It does **not** call `loadProtein` on `protspace-structure-viewer` elements, matching how
clear-all leaves viewers untouched (`control-bar.ts:385`).

## Styles — `packages/core/src/components/control-bar/search.styles.ts`

Add a `.search-suggestion.selected` rule using existing custom properties: reduced opacity
against `--muted`, a ✓ before the ID, and a ✕ revealed on `:hover`/`.active`. The existing
`.search-suggestion:hover, .active, :focus` rule (line 113) already covers the highlight
treatment and needs no change.

## Accessibility

The suggestion container takes `role="listbox"` and rows take `role="option"` with
`aria-selected` reflecting `isSelected`. Selected rows carry `title="Remove from
selection"` and an `aria-label` of `${id}, remove from selection`; addable rows get an
`aria-label` of just their ID. `title` alone is not reliably announced by screen readers,
so the ✕ is not the only signal that a marked row is removable.

## Testing

`search-suggestions.test.ts`:

- Selected entries are returned with `isSelected: true` rather than dropped.
- Both budgets are enforced independently.
- Overflow: 80 selected prefix matches still yield addable entries in the output.
- Empty query with focus returns selected entries; without focus returns nothing.
- Natural array order is preserved across mixed selected/unselected runs.

`search.component.test.ts` — the existing regression test is retained but its assertion
flips from the message string to a marked entry. Added cases:

- P00595–P00599 selected, query `P0059` → five marked entries, no empty-state message.
- `GT4` selected with `GT40`–`GT46` available, query `GT4` → `GT4` marked plus six addable.
- Clicking a marked entry emits `remove-selection` with the right `proteinId`.
- Enter on a highlighted marked entry removes it.
- After removal the query is preserved and the row flips to addable.
- A query matching nothing still renders `No matching protein IDs found`.

## Scope boundaries

Out of scope: fuzzy or substring matching (suggestions remain prefix-only), any change to
paste handling, any change to structure-viewer behaviour, and virtualised rendering of the
suggestion list.

## Relationship to PR #398

This reverts PR #398's `search.ts` diff in full and rewrites its OpenSpec change. The
change directory `show-already-selected-search-message` should be renamed — it no longer
describes the behaviour — and its `design.md` non-goal on partial-match semantics inverted,
since partial matches are now the central case.

Of the three items raised in the PR review, items 1 and 2 dissolve rather than get fixed:

| Review item | Resolution |
| --- | --- |
| 1. `GT4`/`GT40` exact-ID prefix collision | Dissolved — no exact-vs-partial distinction remains |
| 2. O(N) `toLowerCase` scan inside `render()` | Deleted — the method it lived in is gone |
| 3. `proposal.md` claims an `apps/web` Playwright test the diff never added | Still required; independent one-line correction |
