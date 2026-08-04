# Mark Selected Proteins in Search Suggestions — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep already-selected proteins in the search suggestion list, marked and toggleable, so `No matching protein IDs found` is only ever shown when nothing actually matches.

**Architecture:** `computeSearchSuggestions` stops dropping selected IDs and instead returns `{ id, isSelected }` entries under two independent budgets. The search component renders selected entries as marked rows, activation toggles (add if unselected, remove if selected), and the render-time empty-state classification added by PR #398 is deleted outright. A new `remove-selection` event mirrors the existing `add-selection` path through `control-bar.ts`.

**Tech Stack:** TypeScript, Lit 3.3 web components, Vitest (jsdom for component tests), pnpm workspaces + Turbo.

**Spec:** `docs/superpowers/specs/2026-08-04-search-selected-marking-design.md`

## Global Constraints

- Branch is `feat/345-already-selected-message` (PR #398). This work **supersedes** that PR's `search.ts` approach; do not preserve `_getEmptyStateMessage` or the string `Protein ID is already selected`.
- No new dependencies. Do not add packages.
- Matching stays **prefix-only** (`startsWith`), case-insensitive. Do not introduce substring or fuzzy matching.
- The early-exit scan in `computeSearchSuggestions` must be preserved — it is what keeps the component sub-millisecond on Swiss-Prot's 573K IDs. No scan may run from inside `render()`.
- `MAX_SEARCH_SUGGESTIONS` stays `50`. New `MAX_SELECTED_SUGGESTIONS` is `10`.
- `docs/superpowers/` is gitignored (`.gitignore:53`) but plan/spec files are tracked anyway — use `git add -f` for any file under it.
- `pnpm precommit` only checks **staged** files (it runs lint-staged). Before the final push, also run `pnpm format:check` and the full `pnpm test:ci` explicitly.
- Commit prefixes: `fix(search):` for the behavioural work (matches the existing branch commit and cuts a patch release on squash-merge), `docs:` for OpenSpec and doc-only commits. Do **not** use `feat:` — it would cut an unwanted minor release.
- Every commit message ends with:
  ```
  Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01AFPj2NYVQc8B2vyUFNaD4r
  ```

**Targeted test command** (used throughout):

```bash
pnpm --filter @protspace/core exec vitest --run src/components/control-bar/<file>.test.ts
```

---

## File Structure

| File | Change | Responsibility |
| --- | --- | --- |
| `packages/core/src/components/control-bar/search-suggestions.ts` | Modify | Pure suggestion computation; owns the budgets and the `SearchSuggestion` type |
| `packages/core/src/components/control-bar/search-suggestions.test.ts` | Rewrite | Unit coverage for the computation |
| `packages/core/src/components/control-bar/search.ts` | Modify | Lit component: rendering, keyboard, activation, selection events |
| `packages/core/src/components/control-bar/search.styles.ts` | Modify | Marked-row and remove-affordance styling |
| `packages/core/src/components/control-bar/search.component.test.ts` | Rewrite | jsdom coverage driving the real custom element |
| `packages/core/src/components/control-bar/control-bar.ts` | Modify | Consumes `remove-selection`, owns `selectedIdsChips` |
| `openspec/changes/show-already-selected-search-message/` | Rename + rewrite | Spec-driven change record |

`packages/core/src/components/control-bar/search.test.ts` is **not** touched. It tests local reimplementations of the logic and imports nothing from `search.ts`, so it is unaffected. (It is a pre-existing shadow-test wart; out of scope.)

---

## Task 1: Suggestion computation returns marked entries

**Files:**

- Modify: `packages/core/src/components/control-bar/search-suggestions.ts` (whole file)
- Test: `packages/core/src/components/control-bar/search-suggestions.test.ts` (whole file)

**Interfaces:**

- Consumes: nothing from earlier tasks.
- Produces:
  - `export interface SearchSuggestion { id: string; isSelected: boolean }`
  - `export const MAX_SEARCH_SUGGESTIONS = 50`
  - `export const MAX_SELECTED_SUGGESTIONS = 10`
  - `computeSearchSuggestions(availableIds: readonly string[], selectedIds: Iterable<string>, query: string, isInputFocused: boolean, limit?: number, selectedLimit?: number): SearchSuggestion[]`

- [ ] **Step 1: Replace the test file with the new expectations**

Overwrite `packages/core/src/components/control-bar/search-suggestions.test.ts`. Note that the old `excludes already-selected IDs` block asserted the bug (selected IDs dropped) — it is replaced by `includes already-selected IDs as marked`, which asserts the inverse.

```ts
import { describe, it, expect } from 'vitest';
import {
  computeSearchSuggestions,
  MAX_SEARCH_SUGGESTIONS,
  MAX_SELECTED_SUGGESTIONS,
  type SearchSuggestion,
} from './search-suggestions';

/** Entry IDs in output order — for assertions that only care about ordering. */
const idsOf = (result: SearchSuggestion[]): string[] => result.map((entry) => entry.id);

/** Entry IDs that are marked as already selected. */
const selectedIdsOf = (result: SearchSuggestion[]): string[] =>
  result.filter((entry) => entry.isSelected).map((entry) => entry.id);

/** Entry IDs that are addable. */
const selectableIdsOf = (result: SearchSuggestion[]): string[] =>
  result.filter((entry) => !entry.isSelected).map((entry) => entry.id);

describe('computeSearchSuggestions', () => {
  describe('empty query + focused', () => {
    it('returns entries capped at the default selectable limit', () => {
      const ids = Array.from({ length: 200 }, (_, i) => `P${String(i).padStart(5, '0')}`);
      const result = computeSearchSuggestions(ids, [], '', true);
      expect(result).toHaveLength(MAX_SEARCH_SUGGESTIONS);
      expect(idsOf(result)).toEqual(ids.slice(0, MAX_SEARCH_SUGGESTIONS));
      expect(result.every((entry) => entry.isSelected === false)).toBe(true);
    });

    it('returns the first limit IDs in order', () => {
      const ids = ['A1', 'A2', 'A3', 'A4', 'A5'];
      const result = computeSearchSuggestions(ids, [], '', true, 3);
      expect(idsOf(result)).toEqual(['A1', 'A2', 'A3']);
    });

    it('surfaces current selections alongside selectable IDs', () => {
      const ids = ['A1', 'A2', 'A3', 'A4', 'A5'];
      const result = computeSearchSuggestions(ids, ['A1', 'A3'], '', true, 3);
      expect(idsOf(result)).toEqual(['A1', 'A2', 'A3', 'A4', 'A5']);
      expect(selectedIdsOf(result)).toEqual(['A1', 'A3']);
      expect(selectableIdsOf(result)).toEqual(['A2', 'A4', 'A5']);
    });
  });

  describe('empty query + NOT focused', () => {
    it('returns empty array', () => {
      const ids = ['P12345', 'P23456', 'P34567'];
      expect(computeSearchSuggestions(ids, [], '', false)).toEqual([]);
    });

    it('returns empty array even when IDs are selected', () => {
      const ids = Array.from({ length: 100 }, (_, i) => `P${i}`);
      expect(computeSearchSuggestions(ids, ['P1'], '', false)).toEqual([]);
    });
  });

  describe('non-empty prefix query', () => {
    it('returns only IDs starting with the query, case-insensitively', () => {
      const ids = ['P12345', 'P23456', 'P34567', 'Q12345', 'Q23456'];
      const result = computeSearchSuggestions(ids, [], 'p', true);
      expect(idsOf(result)).toEqual(['P12345', 'P23456', 'P34567']);
    });

    it('caps selectable results at the limit when there are many matches', () => {
      const ids = Array.from({ length: 200 }, (_, i) => `P${String(i).padStart(5, '0')}`);
      const result = computeSearchSuggestions(ids, [], 'p', true);
      expect(result).toHaveLength(MAX_SEARCH_SUGGESTIONS);
    });

    it('returns all matches when fewer than the limit', () => {
      const ids = ['P12345', 'P23456', 'Q99999'];
      const result = computeSearchSuggestions(ids, [], 'p', true);
      expect(idsOf(result)).toEqual(['P12345', 'P23456']);
    });
  });

  describe('case-insensitivity', () => {
    it('matches lowercase query against uppercase IDs', () => {
      const result = computeSearchSuggestions(['P12345', 'P23456', 'Q12345'], [], 'p12', true);
      expect(idsOf(result)).toEqual(['P12345']);
    });

    it('matches uppercase query against lowercase IDs', () => {
      const result = computeSearchSuggestions(['p12345', 'p23456', 'q12345'], [], 'P12', true);
      expect(idsOf(result)).toEqual(['p12345']);
    });

    it('marks a case-insensitively matched selected ID', () => {
      const result = computeSearchSuggestions(['P00595', 'Q12345'], ['P00595'], 'p00595', true);
      expect(result).toEqual([{ id: 'P00595', isSelected: true }]);
    });
  });

  describe('includes already-selected IDs as marked', () => {
    it('marks selected IDs given as an array instead of dropping them', () => {
      const ids = ['P12345', 'P23456', 'P34567'];
      const result = computeSearchSuggestions(ids, ['P12345', 'P23456'], 'p', true);
      expect(result).toEqual([
        { id: 'P12345', isSelected: true },
        { id: 'P23456', isSelected: true },
        { id: 'P34567', isSelected: false },
      ]);
    });

    it('marks selected IDs given as a Set', () => {
      const ids = ['P12345', 'P23456', 'P34567'];
      const result = computeSearchSuggestions(ids, new Set(['P12345', 'P23456']), 'p', true);
      expect(selectedIdsOf(result)).toEqual(['P12345', 'P23456']);
    });

    it('returns every match marked when all prefix matches are selected', () => {
      const ids = ['P00595', 'P00596', 'P00597', 'P00598', 'P00599', 'Q12345'];
      const selected = ['P00595', 'P00596', 'P00597', 'P00598', 'P00599'];
      const result = computeSearchSuggestions(ids, selected, 'P0059', true);
      expect(result).toHaveLength(5);
      expect(result.every((entry) => entry.isSelected)).toBe(true);
    });

    it('keeps a selected ID visible when it is a strict prefix of unselected IDs', () => {
      const ids = ['GT4', 'GT40', 'GT41', 'GT42'];
      const result = computeSearchSuggestions(ids, ['GT4'], 'GT4', true);
      expect(result).toEqual([
        { id: 'GT4', isSelected: true },
        { id: 'GT40', isSelected: false },
        { id: 'GT41', isSelected: false },
        { id: 'GT42', isSelected: false },
      ]);
    });

    it('returns an empty array when nothing prefix-matches', () => {
      const ids = ['P12345', 'Q23456'];
      expect(computeSearchSuggestions(ids, ['P12345'], 'zzz', true)).toEqual([]);
    });
  });

  describe('independent budgets', () => {
    it('caps selected entries at the selected limit', () => {
      const ids = Array.from({ length: 40 }, (_, i) => `A${String(i).padStart(3, '0')}`);
      const result = computeSearchSuggestions(ids, ids, 'a', true);
      expect(result).toHaveLength(MAX_SELECTED_SUGGESTIONS);
      expect(result.every((entry) => entry.isSelected)).toBe(true);
    });

    it('still surfaces selectable entries when selected matches exceed their budget', () => {
      const selected = Array.from({ length: 80 }, (_, i) => `A${String(i).padStart(3, '0')}`);
      const selectable = Array.from({ length: 20 }, (_, i) => `A${String(i + 800).padStart(3, '0')}`);
      const result = computeSearchSuggestions([...selected, ...selectable], selected, 'a', true);
      expect(selectedIdsOf(result)).toHaveLength(MAX_SELECTED_SUGGESTIONS);
      expect(selectableIdsOf(result)).toEqual(selectable);
    });

    it('respects custom limits for both budgets', () => {
      const ids = ['S1', 'S2', 'S3', 'U1', 'U2', 'U3'];
      const result = computeSearchSuggestions(ids, ['S1', 'S2', 'S3'], '', true, 2, 1);
      expect(selectedIdsOf(result)).toEqual(['S1']);
      expect(selectableIdsOf(result)).toEqual(['U1', 'U2']);
    });

    it('preserves natural array order across mixed selected and unselected runs', () => {
      const ids = ['A1', 'A2', 'A3', 'A4'];
      const result = computeSearchSuggestions(ids, ['A2', 'A4'], 'a', true);
      expect(idsOf(result)).toEqual(['A1', 'A2', 'A3', 'A4']);
    });
  });

  describe('custom limit param', () => {
    it('respects a custom selectable limit of 1', () => {
      const result = computeSearchSuggestions(['P12345', 'P23456', 'P34567'], [], 'p', true, 1);
      expect(idsOf(result)).toEqual(['P12345']);
    });

    it('respects a custom limit larger than available matches', () => {
      const result = computeSearchSuggestions(['P12345', 'P23456'], [], 'p', true, 100);
      expect(idsOf(result)).toEqual(['P12345', 'P23456']);
    });
  });

  describe('large input (early-exit proof)', () => {
    it('returns exactly the selectable limit for a 100K array with empty query + focus', () => {
      const ids = Array.from({ length: 100_000 }, (_, i) => `P${String(i).padStart(6, '0')}`);
      const result = computeSearchSuggestions(ids, [], '', true);
      expect(result).toHaveLength(MAX_SEARCH_SUGGESTIONS);
      expect(idsOf(result)).toEqual(ids.slice(0, MAX_SEARCH_SUGGESTIONS));
    });

    it('exits early once both budgets are full on a 100K array', () => {
      const ids = Array.from({ length: 100_000 }, (_, i) => `P${String(i).padStart(6, '0')}`);
      const selected = ids.slice(0, 500);
      const result = computeSearchSuggestions(ids, selected, 'p', true);
      expect(selectedIdsOf(result)).toHaveLength(MAX_SELECTED_SUGGESTIONS);
      expect(selectableIdsOf(result)).toHaveLength(MAX_SEARCH_SUGGESTIONS);
    });
  });

  describe('prefix-only (startsWith), NOT substring', () => {
    it('matches prefix but not infix', () => {
      const result = computeSearchSuggestions(['ABC', 'XABC'], [], 'abc', true);
      expect(idsOf(result)).toEqual(['ABC']);
    });

    it('does not match mid-string occurrence', () => {
      const result = computeSearchSuggestions(['ABC123', 'XYZ123', 'ABC456'], [], '123', true);
      expect(result).toEqual([]);
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
pnpm --filter @protspace/core exec vitest --run src/components/control-bar/search-suggestions.test.ts
```

Expected: FAIL. `MAX_SELECTED_SUGGESTIONS` and `SearchSuggestion` do not exist yet, and every assertion using `idsOf` fails because the current return value is `string[]`.

- [ ] **Step 3: Rewrite `search-suggestions.ts`**

Replace the whole file:

```ts
/** Hard cap on rendered selectable suggestions — prevents a 573K-node DOM explosion. */
export const MAX_SEARCH_SUGGESTIONS = 50;

/**
 * Hard cap on rendered already-selected suggestions. Budgeted separately from
 * `MAX_SEARCH_SUGGESTIONS` so that selectable entries stay visible no matter how many
 * prefix matches are already selected.
 */
export const MAX_SELECTED_SUGGESTIONS = 10;

/** One row of the suggestion dropdown. */
export interface SearchSuggestion {
  id: string;
  /** True when this protein is already in the current selection. */
  isSelected: boolean;
}

/**
 * Compute capped autocomplete suggestions with an early-exit scan.
 * - Empty query + focused: current selections plus the first selectable IDs.
 * - Empty query + not focused: none.
 * - Non-empty query: IDs that (case-insensitively) start with the query.
 *
 * Already-selected IDs are returned marked rather than dropped, so callers can render
 * them as removable rows instead of misreporting an empty result. Selected and
 * selectable entries draw from independent budgets and are returned in natural
 * `availableIds` order — they are interleaved, not grouped.
 *
 * Stops scanning as soon as both budgets are full (sub-ms even at 573K).
 */
export function computeSearchSuggestions(
  availableIds: readonly string[],
  selectedIds: Iterable<string>,
  query: string,
  isInputFocused: boolean,
  limit: number = MAX_SEARCH_SUGGESTIONS,
  selectedLimit: number = MAX_SELECTED_SUGGESTIONS,
): SearchSuggestion[] {
  const q = query.trim().toLowerCase();
  if (!q && !isInputFocused) return [];
  const selectedSet = selectedIds instanceof Set ? selectedIds : new Set(selectedIds);
  const out: SearchSuggestion[] = [];
  let selectableCount = 0;
  let selectedCount = 0;

  for (let i = 0; i < availableIds.length; i++) {
    if (selectableCount >= limit && selectedCount >= selectedLimit) break;
    const id = availableIds[i];
    if (q && !id.toLowerCase().startsWith(q)) continue;

    if (selectedSet.has(id)) {
      if (selectedCount >= selectedLimit) continue;
      out.push({ id, isSelected: true });
      selectedCount++;
    } else {
      if (selectableCount >= limit) continue;
      out.push({ id, isSelected: false });
      selectableCount++;
    }
  }

  return out;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
pnpm --filter @protspace/core exec vitest --run src/components/control-bar/search-suggestions.test.ts
```

Expected: PASS, all tests green.

- [ ] **Step 5: Confirm the type break in the component**

```bash
pnpm --filter @protspace/core type-check
```

Expected: FAIL in `search.ts` — `searchSuggestions` is now `SearchSuggestion[]` but is used as `string[]`. This is expected and is fixed in Task 2. Do not commit yet; Task 2 restores a green tree.

---

## Task 2: Render marked rows and delete the empty-state classification

**Files:**

- Modify: `packages/core/src/components/control-bar/search.ts` (lines 6, 21, 49-76, 149, 223-232)
- Modify: `packages/core/src/components/control-bar/search.styles.ts` (after line 118)
- Test: `packages/core/src/components/control-bar/search.component.test.ts` (whole file)

**Interfaces:**

- Consumes: `SearchSuggestion`, `computeSearchSuggestions` from Task 1.
- Produces: `.search-suggestion.selected` rows in the shadow DOM; `_getEmptyStateMessage()` no longer exists.

- [ ] **Step 1: Replace the component test file**

Overwrite `packages/core/src/components/control-bar/search.component.test.ts`. The existing test's assertion flips from the message string to a marked row.

```ts
/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './search';

type ProteinSearchElement = HTMLElement & {
  availableProteinIds: string[];
  selectedProteinIds: string[];
  updateComplete: Promise<unknown>;
};

const FIVE = ['P00595', 'P00596', 'P00597', 'P00598', 'P00599'];

async function setupSearch(
  available: string[] = ['P00595', 'Q12345'],
  selected: string[] = ['P00595'],
): Promise<ProteinSearchElement> {
  const element = document.createElement('protspace-protein-search') as ProteinSearchElement;
  element.availableProteinIds = available;
  element.selectedProteinIds = selected;
  document.body.appendChild(element);
  await element.updateComplete;
  return element;
}

/** Type a query into the real input and flush the 120ms suggestion debounce. */
async function typeQuery(element: ProteinSearchElement, query: string): Promise<void> {
  const input = element.shadowRoot!.querySelector('#protein-search-input') as HTMLInputElement;
  input.focus();
  input.value = query;
  input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  vi.advanceTimersByTime(120);
  await element.updateComplete;
}

const rowsOf = (element: ProteinSearchElement): HTMLElement[] =>
  Array.from(element.shadowRoot!.querySelectorAll('.search-suggestion'));

const rowText = (row: HTMLElement): string => row.textContent!.trim();

describe('protspace-protein-search feedback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  it('marks an exact already-selected protein instead of reporting no matches', async () => {
    const element = await setupSearch();
    await typeQuery(element, 'p00595');

    const rows = rowsOf(element);
    expect(rows).toHaveLength(1);
    expect(rowText(rows[0])).toBe('P00595');
    expect(rows[0].classList.contains('selected')).toBe(true);
    expect(element.shadowRoot!.querySelector('.no-results')).toBeNull();
  });

  it('lists every already-selected protein for a partial query', async () => {
    const element = await setupSearch([...FIVE, 'Q12345'], FIVE);
    await typeQuery(element, 'P0059');

    const rows = rowsOf(element);
    expect(rows.map(rowText)).toEqual(FIVE);
    expect(rows.every((row) => row.classList.contains('selected'))).toBe(true);
    expect(element.shadowRoot!.querySelector('.no-results')).toBeNull();
  });

  it('shows a selected ID that is a strict prefix of unselected IDs', async () => {
    const element = await setupSearch(['GT4', 'GT40', 'GT41'], ['GT4']);
    await typeQuery(element, 'GT4');

    const rows = rowsOf(element);
    expect(rows.map(rowText)).toEqual(['GT4', 'GT40', 'GT41']);
    expect(rows.map((row) => row.classList.contains('selected'))).toEqual([true, false, false]);
  });

  it('still reports no matches when nothing prefix-matches', async () => {
    const element = await setupSearch();
    await typeQuery(element, 'zzz');

    expect(rowsOf(element)).toHaveLength(0);
    expect(element.shadowRoot!.querySelector('.no-results')?.textContent).toBe(
      'No matching protein IDs found',
    );
  });

  it('surfaces current selections when the empty input is focused', async () => {
    const element = await setupSearch();
    const input = element.shadowRoot!.querySelector('#protein-search-input') as HTMLInputElement;
    input.focus();
    input.dispatchEvent(new Event('focus', { bubbles: true, composed: true }));
    await element.updateComplete;

    const rows = rowsOf(element);
    expect(rows.map(rowText)).toEqual(['P00595', 'Q12345']);
    expect(rows.map((row) => row.classList.contains('selected'))).toEqual([true, false]);
  });

  it('marks rows with aria-selected for assistive technology', async () => {
    const element = await setupSearch(['GT4', 'GT40'], ['GT4']);
    await typeQuery(element, 'GT4');

    const rows = rowsOf(element);
    expect(rows.map((row) => row.getAttribute('aria-selected'))).toEqual(['true', 'false']);
    expect(rows[0].getAttribute('title')).toBe('Remove from selection');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
pnpm --filter @protspace/core exec vitest --run src/components/control-bar/search.component.test.ts
```

Expected: FAIL — the component still filters selected IDs out, still renders `Protein ID is already selected`, and emits no `selected` class, `aria-selected`, or `title`.

- [ ] **Step 3: Update the import and state type in `search.ts`**

Replace line 6:

```ts
import { computeSearchSuggestions, type SearchSuggestion } from './search-suggestions';
```

Replace line 21:

```ts
  @state() private searchSuggestions: SearchSuggestion[] = [];
```

- [ ] **Step 4: Replace the suggestion-list render block**

Replace `search.ts` lines 49-76 with:

```ts
        ${this.searchSuggestions.length > 0 && (this.searchQuery || this.isInputFocused)
          ? html`
              <div class="search-suggestions" role="listbox">
                ${this.searchSuggestions.map(
                  (suggestion, i) => html`
                    <div
                      class="search-suggestion ${i === this.highlightedSuggestionIndex
                        ? 'active'
                        : ''} ${suggestion.isSelected ? 'selected' : ''}"
                      role="option"
                      aria-selected=${suggestion.isSelected}
                      title=${suggestion.isSelected ? 'Remove from selection' : ''}
                      @mousedown=${(e: Event) => {
                        // Use mousedown to avoid blur before click
                        e.preventDefault();
                        this._addSelection(suggestion.id);
                      }}
                    >
                      ${suggestion.id}
                    </div>
                  `,
                )}
              </div>
            `
          : this.searchQuery.trim() && this.searchSuggestions.length === 0
            ? html`
                <div class="search-suggestions">
                  <div class="no-results">No matching protein IDs found</div>
                </div>
              `
            : ''}
```

The `mousedown` handler still calls `_addSelection`; toggling arrives in Task 3.

- [ ] **Step 5: Fix the Enter branch and delete the empty-state classifier**

In `_onSearchKeydown`, replace the `_addSelection` call that indexes into `searchSuggestions` (line 149) with:

```ts
        this._addSelection(this.searchSuggestions[this.highlightedSuggestionIndex].id);
```

Delete the entire `_getEmptyStateMessage()` method (lines 223-232). Nothing else references it.

- [ ] **Step 6: Add the marked-row style**

In `search.styles.ts`, insert after the `.search-suggestion:hover, .active, :focus` rule (after line 118):

```css
    .search-suggestion.selected {
      color: var(--muted);
      opacity: 0.7;
    }

    .search-suggestion.selected::before {
      content: '✓';
      margin-right: var(--spacing-sm);
      color: var(--primary);
    }
```

- [ ] **Step 7: Run the component tests and the type check**

```bash
pnpm --filter @protspace/core exec vitest --run src/components/control-bar/search.component.test.ts
pnpm --filter @protspace/core type-check
```

Expected: PASS for both. The type error from Task 1 Step 5 is now resolved.

- [ ] **Step 8: Commit**

```bash
git add packages/core/src/components/control-bar/search-suggestions.ts \
        packages/core/src/components/control-bar/search-suggestions.test.ts \
        packages/core/src/components/control-bar/search.ts \
        packages/core/src/components/control-bar/search.styles.ts \
        packages/core/src/components/control-bar/search.component.test.ts
git commit -m "$(cat <<'EOF'
fix(search): show already-selected proteins as marked suggestions

Selected proteins were filtered out of the suggestion list, so a query whose
every match was already selected fell through to "No matching protein IDs
found" — a false statement. Searching P0059 with P00595-P00599 selected
reported no matches for five matching proteins.

Keep selected proteins in the list, marked, under a budget separate from the
selectable cap so addable entries stay visible. This makes the no-match
message truthful and removes the render-time classification scan.

Refs #345

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01AFPj2NYVQc8B2vyUFNaD4r
EOF
)"
```

---

## Task 3: Toggle-to-remove

**Files:**

- Modify: `packages/core/src/components/control-bar/search.ts` (import, render handler, `_onSearchKeydown`, `_updateSuggestions`, new `willUpdate` / `_activateSuggestion` / `_removeSelection`)
- Modify: `packages/core/src/components/control-bar/search.styles.ts`
- Modify: `packages/core/src/components/control-bar/control-bar.ts` (render binding near line 623-629; new handler after `_handleSearchSelectionAdd` which ends at line 1504)
- Test: `packages/core/src/components/control-bar/search.component.test.ts` (append cases)

**Interfaces:**

- Consumes: `SearchSuggestion` and the marked rows from Task 2.
- Produces: `remove-selection` CustomEvent with `detail: { proteinId: string }`, bubbling and composed. Consumed by `control-bar.ts` `_handleSearchSelectionRemove`.

- [ ] **Step 1: Append the removal tests**

Add these cases inside the existing `describe('protspace-protein-search feedback', ...)` block in `search.component.test.ts`:

```ts
  it('emits remove-selection when a marked row is clicked', async () => {
    const element = await setupSearch([...FIVE, 'Q12345'], FIVE);
    await typeQuery(element, 'P0059');

    const removed: string[] = [];
    element.addEventListener('remove-selection', (event) => {
      removed.push((event as CustomEvent<{ proteinId: string }>).detail.proteinId);
    });

    rowsOf(element)[0].dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(removed).toEqual(['P00595']);
  });

  it('removes the highlighted marked row on Enter', async () => {
    const element = await setupSearch([...FIVE, 'Q12345'], FIVE);
    await typeQuery(element, 'P0059');

    const removed: string[] = [];
    element.addEventListener('remove-selection', (event) => {
      removed.push((event as CustomEvent<{ proteinId: string }>).detail.proteinId);
    });

    const input = element.shadowRoot!.querySelector('#protein-search-input') as HTMLInputElement;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(removed).toEqual(['P00595']);
  });

  it('adds, not removes, when an unselected row is activated', async () => {
    const element = await setupSearch(['GT4', 'GT40'], ['GT4']);
    await typeQuery(element, 'GT4');

    const added: string[] = [];
    const removed: string[] = [];
    element.addEventListener('add-selection', (event) => {
      added.push((event as CustomEvent<{ proteinId: string }>).detail.proteinId);
    });
    element.addEventListener('remove-selection', (event) => {
      removed.push((event as CustomEvent<{ proteinId: string }>).detail.proteinId);
    });

    rowsOf(element)[1].dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(added).toEqual(['GT40']);
    expect(removed).toEqual([]);
  });

  it('keeps the query and flips the row to selectable after a removal', async () => {
    const element = await setupSearch([...FIVE, 'Q12345'], FIVE);
    await typeQuery(element, 'P0059');

    // Simulate the parent echoing the new selection back down.
    element.selectedProteinIds = FIVE.slice(1);
    await element.updateComplete;

    const rows = rowsOf(element);
    expect(rows.map(rowText)).toEqual(FIVE);
    expect(rows[0].classList.contains('selected')).toBe(false);
    expect(element.shadowRoot!.querySelector('.no-results')).toBeNull();
  });

  it('clamps the highlight when a removal shortens the list', async () => {
    const element = await setupSearch(['GT4', 'GT40'], ['GT4', 'GT40']);
    await typeQuery(element, 'GT40');
    expect(rowsOf(element)).toHaveLength(1);

    element.selectedProteinIds = ['GT4'];
    await element.updateComplete;

    const rows = rowsOf(element);
    expect(rows).toHaveLength(1);
    expect(rows[0].classList.contains('active')).toBe(true);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
pnpm --filter @protspace/core exec vitest --run src/components/control-bar/search.component.test.ts
```

Expected: FAIL — no `remove-selection` event is ever emitted, and the list does not recompute when `selectedProteinIds` changes.

- [ ] **Step 3: Add the Lit `PropertyValues` import**

Replace line 1 of `search.ts`:

```ts
import { LitElement, html, type PropertyValues } from 'lit';
```

- [ ] **Step 4: Route activation through a toggle**

In the render block from Task 2, replace the `mousedown` handler body:

```ts
                      @mousedown=${(e: Event) => {
                        // Use mousedown to avoid blur before click
                        e.preventDefault();
                        this._activateSuggestion(suggestion);
                      }}
```

In `_onSearchKeydown`, replace the Enter branch's suggestion call:

```ts
        this._activateSuggestion(this.searchSuggestions[this.highlightedSuggestionIndex]);
```

The `else if (this.searchQuery.trim())` fallback that calls `_addSelection(this.searchQuery.trim())` stays unchanged — it handles Enter with an empty list.

- [ ] **Step 5: Add the toggle, removal, and recompute methods**

Add to `search.ts`, immediately before `_addSelection`:

```ts
  private _activateSuggestion(suggestion: SearchSuggestion) {
    if (suggestion.isSelected) {
      this._removeSelection(suggestion.id);
    } else {
      this._addSelection(suggestion.id);
    }
  }

  private _removeSelection(id: string) {
    if (!this.selectedProteinIds.includes(id)) return;

    // Deliberately keeps `searchQuery` and the open dropdown so several proteins can be
    // pruned from one result set without retyping. `willUpdate` refreshes the list when
    // the parent echoes the new selection back down.
    this._clearSuggestionDebounce();

    this.dispatchEvent(
      new CustomEvent('remove-selection', {
        detail: { proteinId: id },
        bubbles: true,
        composed: true,
      }),
    );
  }
```

Replace `_updateSuggestions()` (lines 213-221) with:

```ts
  private _updateSuggestions(preserveHighlight = false) {
    const previousIndex = this.highlightedSuggestionIndex;
    this.searchSuggestions = computeSearchSuggestions(
      this.availableProteinIds,
      this.selectedProteinIds,
      this.searchQuery,
      this.isInputFocused,
    );

    if (this.searchSuggestions.length === 0) {
      this.highlightedSuggestionIndex = -1;
      return;
    }

    this.highlightedSuggestionIndex = preserveHighlight
      ? Math.min(Math.max(previousIndex, 0), this.searchSuggestions.length - 1)
      : 0;
  }
```

Add `willUpdate` immediately after `disconnectedCallback`:

```ts
  protected willUpdate(changed: PropertyValues<this>): void {
    // `searchSuggestions` is computed on a debounce, so a selection change made elsewhere
    // (including this component's own remove, which keeps the query) would otherwise leave
    // the open dropdown stale. Recomputing here cannot loop: it only writes
    // `searchSuggestions`, never `selectedProteinIds`.
    if (!changed.has('selectedProteinIds')) return;
    if (!this.searchQuery.trim() && !this.isInputFocused) return;
    this._updateSuggestions(true);
  }
```

- [ ] **Step 6: Add the remove affordance style**

In `search.styles.ts`, append after the `.search-suggestion.selected::before` rule from Task 2:

```css
    .search-suggestion.selected::after {
      content: '✕';
      float: right;
      opacity: 0;
      transition: var(--transition-fast);
    }

    .search-suggestion.selected:hover::after,
    .search-suggestion.selected.active::after {
      opacity: 1;
    }
```

- [ ] **Step 7: Wire the event through `control-bar.ts`**

Add the binding to the `<protspace-protein-search>` element (after line 628):

```ts
            @remove-selection=${this._handleSearchSelectionRemove}
```

Add the handler immediately after `_handleSearchSelectionAdd` (which ends at line 1504):

```ts
  private _handleSearchSelectionRemove(event: CustomEvent<{ proteinId: string }>) {
    const { proteinId } = event.detail;
    if (!proteinId || !this.selectedIdsChips.includes(proteinId)) return;

    const newSelection = this.selectedIdsChips.filter((id) => id !== proteinId);
    this.selectedIdsChips = newSelection;
    this.selectedProteinsCount = newSelection.length;

    if (
      this.autoSync &&
      this._scatterplotElement &&
      'selectedProteinIds' in this._scatterplotElement
    ) {
      (this._scatterplotElement as ScatterplotElementLike).selectedProteinIds = [...newSelection];
    }

    // Structure viewers are intentionally left alone, matching clear-all.
    this.dispatchEvent(
      new CustomEvent('protein-selection-change', {
        detail: { proteinIds: newSelection.slice() },
        bubbles: true,
        composed: true,
      }),
    );
  }
```

- [ ] **Step 8: Run the full core suite and type check**

```bash
pnpm --filter @protspace/core exec vitest --run src/components/control-bar/
pnpm --filter @protspace/core type-check
```

Expected: PASS for both.

- [ ] **Step 9: Commit**

```bash
git add packages/core/src/components/control-bar/search.ts \
        packages/core/src/components/control-bar/search.styles.ts \
        packages/core/src/components/control-bar/search.component.test.ts \
        packages/core/src/components/control-bar/control-bar.ts
git commit -m "$(cat <<'EOF'
fix(search): let marked suggestions toggle the selection off

Activating a marked suggestion now removes that protein via a new
remove-selection event, mirroring add-selection through the control bar.
Removal keeps the query so several proteins can be pruned from one result
set; adding still clears it, preserving the search-one-add-one flow.

Refs #345

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01AFPj2NYVQc8B2vyUFNaD4r
EOF
)"
```

---

## Task 4: Rewrite the OpenSpec change

**Files:**

- Rename: `openspec/changes/show-already-selected-search-message/` → `openspec/changes/mark-selected-proteins-in-search/`
- Modify: `proposal.md`, `design.md`, `specs/protein-search-feedback/spec.md`, `tasks.md`

**Interfaces:**

- Consumes: the shipped behaviour from Tasks 1-3.
- Produces: a change record that `openspec validate --strict` accepts.

- [ ] **Step 1: Rename the change directory**

```bash
git mv openspec/changes/show-already-selected-search-message \
       openspec/changes/mark-selected-proteins-in-search
```

The OpenSpec CLI has no rename command; `git mv` is the mechanism. Leave `.openspec.yaml` as-is (`schema: spec-driven`, `created: 2026-08-01`).

- [ ] **Step 2: Replace the spec delta**

Overwrite `openspec/changes/mark-selected-proteins-in-search/specs/protein-search-feedback/spec.md`:

```markdown
## ADDED Requirements

### Requirement: Protein search shows already-selected proteins as marked suggestions

The protein search SHALL include already-selected protein IDs in the suggestion list, visually marked as selected, rather than omitting them. Selected and selectable entries SHALL draw from independent display budgets so that selectable entries remain visible regardless of how many matches are already selected.

#### Scenario: Every prefix match is already selected

- **WHEN** a user searches a partial ID whose every available match is already selected
- **THEN** each matching protein is listed and marked as selected
- **AND** the feedback does not display `No matching protein IDs found`

#### Scenario: Selected ID is a strict prefix of unselected IDs

- **WHEN** a user searches an ID that is already selected and is also a strict prefix of other unselected IDs
- **THEN** the selected protein is listed and marked
- **AND** the unselected proteins remain listed and selectable

#### Scenario: Selected protein is searched using different letter case

- **WHEN** a user searches an available selected protein ID using different letter case
- **THEN** the protein is listed and marked as selected

#### Scenario: Selections are visible on an empty focused input

- **WHEN** a user focuses the search input with an empty query
- **THEN** current selections are listed and marked above the selectable entries

### Requirement: Activating a marked suggestion removes that protein

The protein search SHALL remove a protein from the selection when its marked suggestion is activated by click or by Enter, and SHALL preserve the current query so that further proteins can be removed from the same result set.

#### Scenario: Marked suggestion is clicked

- **WHEN** a user clicks a suggestion marked as already selected
- **THEN** that protein is removed from the selection
- **AND** the query is preserved and the row becomes selectable

#### Scenario: Marked suggestion is activated by keyboard

- **WHEN** a user presses Enter on a highlighted suggestion marked as already selected
- **THEN** that protein is removed from the selection

### Requirement: Generic no-match feedback remains available

The protein search SHALL show generic no-match feedback only when a non-empty query matches no available protein ID at all.

#### Scenario: Query matches nothing

- **WHEN** a non-empty query prefix-matches no available protein ID
- **THEN** the search feedback displays `No matching protein IDs found`
```

- [ ] **Step 3: Rewrite `proposal.md`**

Overwrite `openspec/changes/mark-selected-proteins-in-search/proposal.md`:

```markdown
## Why

Search suggestions excluded already-selected protein IDs, so a query whose every match
was already selected produced an empty list and fell through to
`No matching protein IDs found`. With P00595-P00599 selected, searching `P0059` reported
no matches for five matching proteins. The message was false, not merely unhelpful.

An earlier attempt classified the empty state — reporting `Protein ID is already selected`
when the query exactly matched a selected ID. That covered only exact whole-ID queries
with a completely empty suggestion list, leaving partial queries still misreporting and
prefix-colliding IDs (selected `GT4` alongside unselected `GT40`-`GT46`) with no feedback
at all, because the list was non-empty.

## What Changes

- Already-selected proteins stay in the suggestion list, marked, instead of being dropped.
- Selected and selectable entries draw from independent display budgets, so addable
  proteins stay visible however many matches are already selected.
- Activating a marked suggestion removes that protein; removal preserves the query so
  several proteins can be pruned from one result set.
- Focusing an empty search input now surfaces current selections above selectable entries.
- The empty-state classification is removed; `No matching protein IDs found` now renders
  only when nothing matches, which also removes a per-keystroke scan from `render()`.

## Impact

- Affected specs: `protein-search-feedback`
- Affected code: `packages/core/src/components/control-bar/search-suggestions.ts`,
  `search.ts`, `search.styles.ts`, `control-bar.ts`
- Verification: unit coverage in `search-suggestions.test.ts`, custom-element coverage in
  `search.component.test.ts`, plus manual browser verification against the demo dataset.
  No Playwright test is added — see `design.md` on why component-level coverage was chosen.
- Behaviour changes: pressing Enter on an already-selected ID now removes it (previously a
  no-op); focusing the empty input now lists current selections.
```

This resolves the third PR #398 review item — the old Impact section claimed an `apps/web` Playwright regression the diff never contained.

- [ ] **Step 4: Rewrite `design.md`**

Overwrite `openspec/changes/mark-selected-proteins-in-search/design.md`:

```markdown
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
be an exact ID *and* the list to be empty. Both conditions are reachable-but-wrong in the
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
```

- [ ] **Step 5: Rewrite `tasks.md`**

Overwrite `openspec/changes/mark-selected-proteins-in-search/tasks.md`:

```markdown
## 1. Suggestion Computation

- [x] 1.1 Return `{ id, isSelected }` entries instead of dropping selected IDs.
- [x] 1.2 Budget selected and selectable entries independently, preserving the early exit.
- [x] 1.3 Rewrite the unit suite, inverting the assertions that encoded the old exclusion.

## 2. Component Rendering

- [x] 2.1 Render marked rows with `aria-selected` and a remove title.
- [x] 2.2 Delete the empty-state classification and its render-time scan.
- [x] 2.3 Cover the partial-query, prefix-collision, and empty-focus cases in jsdom.

## 3. Toggle To Remove

- [x] 3.1 Emit `remove-selection` when a marked suggestion is activated.
- [x] 3.2 Recompute suggestions on selection change, preserving the clamped highlight.
- [x] 3.3 Handle `remove-selection` in the control bar, mirroring `add-selection`.

## 4. Verification

- [x] 4.1 Run `openspec validate mark-selected-proteins-in-search --strict`.
- [x] 4.2 Run the full JS suite, `pnpm format:check`, and `pnpm precommit`.
- [x] 4.3 Reproduce the original demo-dataset flow in the browser and check console health.
```

Leave the boxes unchecked while working; check them as each is completed.

- [ ] **Step 6: Validate the change**

```bash
npx openspec validate mark-selected-proteins-in-search --strict
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add openspec/changes/
git commit -m "$(cat <<'EOF'
docs: rewrite openspec change for selected-protein marking

Renames show-already-selected-search-message, inverts the partial-match
non-goal now that partial queries are the central case, and corrects the
Impact section that claimed an apps/web Playwright regression the change
never contained.

Refs #345

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01AFPj2NYVQc8B2vyUFNaD4r
EOF
)"
```

---

## Task 5: Full verification and PR update

**Files:** none modified.

- [ ] **Step 1: Run the full JavaScript suite**

```bash
pnpm test:ci
```

Expected: PASS. Record the total count; the baseline before this work was 1,872 passed with 1 intentional skip.

- [ ] **Step 2: Run formatting and quality gates**

```bash
pnpm format:check
pnpm precommit
```

Both must pass. `precommit` alone is insufficient — it runs lint-staged and therefore only inspects staged files, so `format:check` must be run separately.

- [ ] **Step 3: Verify in the browser**

Start the app with `pnpm dev` (app on `localhost:8080`), open `/explore` with the demo dataset, then:

1. Search `P00595`, press Enter — one protein selected.
2. Repeat for `P00596` through `P00599`.
3. Search `P0059` — expect five rows, each marked, and **no** `No matching protein IDs found`.
4. Click the first marked row — expect it removed, the query preserved, and the row now selectable.
5. Search `zzzz` — expect `No matching protein IDs found`.
6. Confirm the console shows no errors (existing Lit development warnings are expected).

- [ ] **Step 4: Push and update the PR**

```bash
git push
```

Then update the PR #398 description: the Summary, Root cause, Reproduction, and Verification sections all describe the superseded message-classification approach and must be rewritten to describe marking. Keep `Closes #345`.

---

## Self-Review Notes

- **Spec coverage:** every spec section maps to a task — Data layer → Task 1; Behaviour, Component, Styles, Accessibility → Tasks 2-3; Wiring → Task 3; Testing → Tasks 1-3 and 5; Relationship to PR #398 → Task 4 (items 1 and 2 dissolve through Tasks 1-3, item 3 is fixed in Task 4 Step 3).
- **Naming consistency:** `SearchSuggestion`, `MAX_SELECTED_SUGGESTIONS`, `_activateSuggestion`, `_removeSelection`, `_handleSearchSelectionRemove`, and the `remove-selection` event name are used identically in every task.
- **Known intermediate state:** after Task 1 the tree does not type-check, and after Task 2 clicking a marked row is a silent no-op. Both are resolved by the end of Task 3. Only Tasks 2, 3, and 4 commit.
