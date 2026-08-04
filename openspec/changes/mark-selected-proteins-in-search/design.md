## Context

`computeSearchSuggestions` dropped selected IDs from the suggestion list, so the component
could not distinguish "nothing matched" from "everything that matched is already selected".
The empty-state renderer treated both as a generic no-match.

## Goals

- A query that matches already-selected proteins never reports that nothing matched.
- Feedback works for partial queries, not only exact whole-ID queries.
- Feedback works when the suggestion list is non-empty, not only when it is empty.
- No per-keystroke work is added to `render()`.

## Non-Goals

- Substring or fuzzy matching. Suggestions remain prefix-only.
- Changes to paste handling, which routes through bulk add and only ever adds.
- Changes to structure-viewer behaviour on removal.
- Virtualised rendering of the suggestion list.

## Decisions

**Mark rather than classify.** Classifying the empty-state message requires the query to
be an exact ID _and_ the list to be empty. Both conditions are reachable-but-wrong in the
149-ID dataset from the original report. Keeping selected entries in the list removes the
distinction entirely: there is one rule, and the no-match message becomes truthful.

**Independent budgets.** Selected entries use a 10-entry budget separate from the 50-entry
selectable cap. A single shared cap would let 50+ selected matches fill the list and hide
every addable protein. The scan still exits early once both budgets are full, preserving
the sub-millisecond behaviour on 573K IDs.

**Natural order, not grouped.** Entries stay in `availableProteinIds` order and are
interleaved. Grouping would reorder results relative to what users see today.

**Asymmetric query handling.** Adding clears the query; removing preserves it. After
adding you typically search for the next protein; after removing you typically prune
within the current result set. The alternative — both preserving — regresses the
single-ID search-and-add flow that this change originated from.

**Recompute on selection change.** `searchSuggestions` is computed on a debounce, so a
preserved query would leave a stale list after a removal. A `willUpdate` hook recomputes
when `selectedProteinIds` changes and the dropdown is open, preserving the highlight index
clamped to the new length.

## Testing

Component-level coverage in jsdom drives the real custom element through its input and
debounce, which is where the original bug lived. A Playwright test was considered and
rejected: the behaviour is fully determined by the component's own inputs, so a browser
test would duplicate the component test at much higher cost, and the repository's E2E
suite is label-gated and does not run on pull requests by default. The composed flow is
verified manually in the browser against the demo dataset instead.
