import { LitElement, html, type PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { customElement } from '../../utils/safe-custom-element';
import { searchStyles } from './search.styles';
import { isMacOrIos } from '@protspace/utils';
import { computeSearchSuggestions, type SearchSuggestion } from './search-suggestions';

const SEARCH_DEBOUNCE_MS = 120;

/**
 * Protein search component with autocomplete suggestions and multi-select state (no chips UI)
 */
@customElement('protspace-protein-search')
class ProtspaceProteinSearch extends LitElement {
  static styles = searchStyles;

  @property({ type: Array }) availableProteinIds: string[] = [];
  @property({ type: Array }) selectedProteinIds: string[] = [];

  @state() private searchQuery: string = '';
  @state() private searchSuggestions: SearchSuggestion[] = [];
  @state() private highlightedSuggestionIndex: number = -1;
  @state() private isInputFocused: boolean = false;

  private _suggestionDebounceId: ReturnType<typeof setTimeout> | null = null;

  render() {
    return html`
      <div class="search-container" @click=${this._focusSearchInput}>
        <div class="search-chips">
          <input
            id="protein-search-input"
            class="search-input"
            type="text"
            .value=${this.searchQuery}
            placeholder="Search or paste protein IDs"
            @input=${this._onSearchInput}
            @keydown=${this._onSearchKeydown}
            @blur=${this._onInputBlur}
            @focus=${this._onInputFocus}
            @paste=${this._onPaste}
          />

          <div class="search-keyboard-shortcut-hint">
            <kbd>${isMacOrIos() ? html`⌘K` : html`^K`}</kbd>
          </div>
        </div>

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
                      aria-label=${suggestion.isSelected
                        ? `${suggestion.id}, remove from selection`
                        : suggestion.id}
                      @mousedown=${(e: Event) => {
                        // Use mousedown to avoid blur before click
                        e.preventDefault();
                        this._activateSuggestion(suggestion);
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
      </div>
    `;
  }

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('keydown', this._handleBodyKeydown);
    // Listen for parent-initiated close
    this.addEventListener('close-search', () => {
      this._clearSuggestionDebounce();
      this.searchSuggestions = [];
      this.highlightedSuggestionIndex = -1;
      this.searchQuery = '';
      this.isInputFocused = false;
      // Blur the input element to sync state
      const input = this.shadowRoot?.querySelector(
        '#protein-search-input',
      ) as HTMLInputElement | null;
      input?.blur();
    });
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('keydown', this._handleBodyKeydown);
    this._clearSuggestionDebounce();
  }

  protected willUpdate(changed: PropertyValues<this>): void {
    // `searchSuggestions` is computed on a debounce, so a selection change made elsewhere
    // (including this component's own remove, which keeps the query) would otherwise leave
    // the open dropdown stale. Recomputing here cannot loop: it only writes
    // `searchSuggestions`, never `selectedProteinIds`.
    if (!changed.has('selectedProteinIds')) return;
    if (!this.searchQuery.trim() && !this.isInputFocused) return;
    this._updateSuggestions(true);
  }

  private _handleBodyKeydown = (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      this._focusSearchInput();
    }
  };

  private _focusSearchInput() {
    const input = this.shadowRoot?.querySelector(
      '#protein-search-input',
    ) as HTMLInputElement | null;
    input?.focus();
  }

  private _onPaste(e: ClipboardEvent) {
    const pastedText = e.clipboardData?.getData('text/plain') ?? '';
    const ids = pastedText.trim().split(/\s+/);

    if (ids.length > 1 || pastedText.includes('\n')) {
      e.preventDefault();
      this._addMultipleSelections(ids.filter(Boolean));
    }
  }

  private _onSearchInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchQuery = target.value;
    this._clearSuggestionDebounce();
    this._suggestionDebounceId = setTimeout(() => {
      this._suggestionDebounceId = null;
      this._updateSuggestions();
    }, SEARCH_DEBOUNCE_MS);
  }

  private _onSearchKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      this._flushSuggestions();
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (
        this.highlightedSuggestionIndex >= 0 &&
        this.highlightedSuggestionIndex < this.searchSuggestions.length
      ) {
        this._activateSuggestion(this.searchSuggestions[this.highlightedSuggestionIndex]);
      } else if (this.searchQuery.trim()) {
        this._addSelection(this.searchQuery.trim());
      }
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (this.searchSuggestions.length > 0) {
        const next = Math.min(
          this.highlightedSuggestionIndex + 1,
          this.searchSuggestions.length - 1,
        );
        this.highlightedSuggestionIndex = next;
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (this.searchSuggestions.length > 0) {
        const prev = Math.max(this.highlightedSuggestionIndex - 1, 0);
        this.highlightedSuggestionIndex = prev;
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this._clearSuggestionDebounce();
      this.searchSuggestions = [];
      this.highlightedSuggestionIndex = -1;
      this.searchQuery = '';
    }
  }

  private _onInputFocus() {
    this.isInputFocused = true;
    this._clearSuggestionDebounce();
    this._updateSuggestions();
    // Notify parent to close other dropdowns
    this.dispatchEvent(
      new CustomEvent('search-opened', {
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _onInputBlur() {
    this.isInputFocused = false;
    this._clearSuggestionDebounce();
    // Delay clearing suggestions to allow mousedown to fire on suggestions
    setTimeout(() => {
      this.searchSuggestions = [];
      this.highlightedSuggestionIndex = -1;
    }, 200);
  }

  private _clearSuggestionDebounce() {
    if (this._suggestionDebounceId !== null) {
      clearTimeout(this._suggestionDebounceId);
      this._suggestionDebounceId = null;
    }
  }

  private _flushSuggestions() {
    // Only settle a pending debounce. Recomputing when the list is already current
    // resets the highlight to 0, which would make arrow navigation impossible and
    // send Enter to the wrong row.
    if (this._suggestionDebounceId === null) return;
    this._clearSuggestionDebounce();
    this._updateSuggestions();
  }

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

  private _addSelection(id: string) {
    if (!id) return;

    // Validate and normalize the ID
    let validId = id;
    if (!this.availableProteinIds.includes(id)) {
      // Try case-insensitive exact match
      const exact = this.availableProteinIds.find((p) => p.toLowerCase() === id.toLowerCase());
      if (exact) {
        validId = exact;
      } else {
        // ID not found in available proteins - ignore
        this._clearSuggestionDebounce();
        this.searchQuery = '';
        this.searchSuggestions = [];
        this.highlightedSuggestionIndex = -1;
        return;
      }
    }

    // Check if already selected
    if (this.selectedProteinIds.includes(validId)) {
      this._clearSuggestionDebounce();
      this.searchQuery = '';
      this.searchSuggestions = [];
      this.highlightedSuggestionIndex = -1;
      return;
    }

    // Clear search state
    this._clearSuggestionDebounce();
    this.searchQuery = '';
    this.searchSuggestions = [];
    this.highlightedSuggestionIndex = -1;

    // Dispatch selection change event
    this.dispatchEvent(
      new CustomEvent('add-selection', {
        detail: { proteinId: validId },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _addMultipleSelections(ids: string[]) {
    const availableIdsSet = new Set(this.availableProteinIds);
    const lowerCaseAvailableMap = new Map<string, string>();
    this.availableProteinIds.forEach((id) => lowerCaseAvailableMap.set(id.toLowerCase(), id));

    const newValidIds = new Set<string>();

    for (const id of ids) {
      if (!id) continue;

      if (availableIdsSet.has(id)) {
        newValidIds.add(id);
      } else {
        const lowerId = id.toLowerCase();
        if (lowerCaseAvailableMap.has(lowerId)) {
          newValidIds.add(lowerCaseAvailableMap.get(lowerId)!);
        }
      }
    }

    const currentSelectedSet = new Set(this.selectedProteinIds);
    const uniqueNewIds = [...newValidIds].filter((id) => !currentSelectedSet.has(id));

    if (uniqueNewIds.length > 0) {
      this.dispatchEvent(
        new CustomEvent('add-selection-multiple', {
          detail: { proteinIds: uniqueNewIds },
          bubbles: true,
          composed: true,
        }),
      );
    }

    this._clearSuggestionDebounce();
    this.searchQuery = '';
    this.searchSuggestions = [];
    this.highlightedSuggestionIndex = -1;
  }

  /**
   * Public API: Clear all selections
   */
  public clearSelections() {
    if (this.selectedProteinIds.length > 0) {
      this.selectedProteinIds = [];

      this.dispatchEvent(
        new CustomEvent('selection-change', {
          detail: { proteinIds: [] },
          bubbles: true,
          composed: true,
        }),
      );
    }
  }

  /**
   * Public API: Set selections programmatically
   */
  public setSelections(proteinIds: string[]) {
    const validIds = proteinIds.filter((id) => this.availableProteinIds.includes(id));
    if (JSON.stringify(validIds) !== JSON.stringify(this.selectedProteinIds)) {
      this.selectedProteinIds = validIds;

      this.dispatchEvent(
        new CustomEvent('selection-change', {
          detail: { proteinIds: validIds },
          bubbles: true,
          composed: true,
        }),
      );
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'protspace-protein-search': ProtspaceProteinSearch;
  }
}
