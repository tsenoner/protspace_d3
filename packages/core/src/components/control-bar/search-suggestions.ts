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
