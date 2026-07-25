import { LitElement, html, type PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { customElement } from '../../utils/safe-custom-element';
import { annotationSelectStyles } from './annotation-select.styles';
import { handleDropdownEscape } from '../../utils/dropdown-helpers';
import { groupAnnotations, type GroupedAnnotation } from './annotation-categories';
import {
  annotationLabel,
  annotationStatSummary,
  formatStatValue,
  getAnnotationMeta,
  isPredictedAnnotation,
  type Annotation,
  type AnnotationStatMetric,
  type AnnotationStatSummary,
  type ProjectionStatisticRow,
} from '@protspace/utils';
import '../common/info-popover';

/**
 * Custom dropdown component for annotation selection with section headers and search
 */
@customElement('protspace-annotation-select')
class ProtspaceAnnotationSelect extends LitElement {
  static styles = annotationSelectStyles;

  @property({ type: Array }) annotations: string[] = [];
  @property({ type: Object }) annotationDefinitions: Record<string, Pick<Annotation, 'runtime'>> =
    {};
  @property({ type: Array }) eatAnnotations: string[] = [];
  @property({ type: String, attribute: 'selected-annotation' }) selectedAnnotation: string = '';
  @property({ type: Array }) tooltipAnnotations: string[] = [];
  @property({ type: String }) placeholder: string = 'Select annotation';
  /** Rows of the bundle's optional statistics part; empty when it was prepared without `--stats`. */
  @property({ type: Array }) statistics: readonly ProjectionStatisticRow[] = [];
  /** Projection the statistics are reported for — statistics are scored per projection. */
  @property({ type: String, attribute: 'selected-projection' }) selectedProjection: string = '';

  @state() private open: boolean = false;
  @state() private query: string = '';
  @state() private highlightIndex: number = -1;

  connectedCallback() {
    super.connectedCallback();
    // Listen for parent-initiated close
    this.addEventListener('close-dropdown', () => {
      this.open = false;
      this.query = '';
      this.highlightIndex = -1;
    });
  }

  private toggleDropdown(event?: Event) {
    event?.stopPropagation();
    this.open = !this.open;
    if (this.open) {
      // Notify parent to close its dropdowns
      this.dispatchEvent(
        new CustomEvent('annotation-opened', {
          bubbles: true,
          composed: true,
        }),
      );
      // Focus search input when opening
      this.updateComplete.then(() => {
        const searchInput = this.shadowRoot?.querySelector(
          '#annotation-search-input',
        ) as HTMLInputElement | null;
        searchInput?.focus();
      });
    } else {
      this.query = '';
      this.highlightIndex = -1;
    }
  }

  private handleSearchInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.query = target.value;
    this.highlightIndex = -1; // Reset highlight when query changes
  }

  private handleKeydown(event: KeyboardEvent) {
    if (!this.open) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.toggleDropdown(event);
      }
      return;
    }

    const filtered = this.getFilteredGroupedAnnotations();
    const flatAnnotations = this.flattenGroupedAnnotations(filtered);

    if (event.key === 'Escape') {
      handleDropdownEscape(event, () => {
        this.open = false;
        this.query = '';
        this.highlightIndex = -1;
      });
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (flatAnnotations.length > 0) {
        this.highlightIndex = Math.min(this.highlightIndex + 1, flatAnnotations.length - 1);
        this.scrollToHighlighted();
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (flatAnnotations.length > 0) {
        this.highlightIndex = Math.max(this.highlightIndex - 1, 0);
        this.scrollToHighlighted();
      }
    } else if (event.key === 'Enter') {
      event.preventDefault();
      // Hover no longer moves highlightIndex (that re-rendered every row the pointer crossed),
      // so the row under the pointer and the keyboard highlight can differ — and both render
      // with the same background. The browser's :hover is the source of truth for the pointer,
      // and it must win, including when no arrow key was ever pressed (highlightIndex −1).
      const hovered = this.shadowRoot
        ?.querySelector('.dropdown-item:hover')
        ?.getAttribute('data-annotation');
      if (hovered) {
        this.selectAnnotation(hovered, event);
      } else if (this.highlightIndex >= 0 && this.highlightIndex < flatAnnotations.length) {
        this.selectAnnotation(flatAnnotations[this.highlightIndex], event);
      }
    }
  }

  private scrollToHighlighted() {
    this.updateComplete.then(() => {
      const highlighted = this.shadowRoot?.querySelector('.dropdown-item.highlighted');
      if (highlighted) {
        highlighted.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    });
  }

  private selectAnnotation(annotation: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.selectedAnnotation = annotation;
    this.open = false;
    this.query = '';
    this.highlightIndex = -1;

    // Dispatch annotation-select event
    this.dispatchEvent(
      new CustomEvent('annotation-select', {
        detail: { annotation },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private toggleTooltipAnnotation(annotation: string, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    if (annotation === this.selectedAnnotation) {
      return;
    }
    const isActive = this.tooltipAnnotations.includes(annotation);
    const next = isActive
      ? this.tooltipAnnotations.filter((name) => name !== annotation)
      : [...this.tooltipAnnotations, annotation];
    this.tooltipAnnotations = next;
    this.dispatchEvent(
      new CustomEvent('tooltip-annotation-toggle', {
        detail: { annotation, active: !isActive, tooltipAnnotations: next },
        bubbles: true,
        composed: true,
      }),
    );
  }

  /**
   * Categorize annotations using the shared utility.
   */
  private categorizeAnnotations(annotations: string[]): GroupedAnnotation[] {
    return groupAnnotations(annotations, this.annotationDefinitions);
  }

  /**
   * Filter annotations based on search query
   */
  private getFilteredGroupedAnnotations(): GroupedAnnotation[] {
    const grouped = this.categorizeAnnotations(this.annotations);
    const queryLower = this.query.trim().toLowerCase();

    if (!queryLower) {
      return grouped;
    }

    // Filter each category's annotations by column name or friendly label
    return grouped
      .map((group) => ({
        ...group,
        annotations: group.annotations.filter(
          (annotation) =>
            annotation.toLowerCase().includes(queryLower) ||
            annotationLabel(annotation, this.annotationDefinitions[annotation])
              .toLowerCase()
              .includes(queryLower),
        ),
      }))
      .filter((group) => group.annotations.length > 0); // Remove empty categories
  }

  /**
   * Flatten grouped annotations into a single array for keyboard navigation
   */
  private flattenGroupedAnnotations(grouped: GroupedAnnotation[]): string[] {
    const flat: string[] = [];
    for (const group of grouped) {
      flat.push(...group.annotations);
    }
    return flat;
  }

  /**
   * Per-annotation summaries, rebuilt only when their inputs change: render() re-runs on every
   * search keystroke and arrow press while the dropdown is open, and deriving each row's
   * summary there re-scans the whole statistics table per row for identical output.
   */
  private statSummaries = new Map<string, AnnotationStatSummary | null>();

  willUpdate(changed: PropertyValues<this>) {
    if (changed.has('statistics') || changed.has('selectedProjection')) {
      this.statSummaries.clear();
    }
  }

  private getStatSummary(annotation: string): AnnotationStatSummary | null {
    let summary = this.statSummaries.get(annotation);
    if (summary === undefined) {
      summary = annotationStatSummary(this.statistics, annotation, this.selectedProjection);
      this.statSummaries.set(annotation, summary);
    }
    return summary;
  }

  /**
   * One metric row: name (with a "lower is better" marker where that applies), its value in the
   * selected projection, and — for annotation-validity metrics — the same metric in the source
   * embedding, which is the separability ceiling the projection is measured against.
   */
  private renderStatMetric(metric: AnnotationStatMetric) {
    return html`
      <div class="stat-metric">
        <span class="stat-metric-label">
          ${metric.label}${metric.higherIsBetter
            ? ''
            : html`<span class="stat-lower-better" aria-hidden="true" title="Lower is better"
                  >↓</span
                ><span class="sr-only"> (lower is better)</span>`}
        </span>
        <span class="stat-metric-value">${formatStatValue(metric.value)}</span>
        <!-- The cell stays even when empty: \`.stat-metric\` is \`display: contents\`, so dropping
             it would shift every following row one column across the shared grid. -->
        <span class="stat-metric-embedding ${metric.embedding === null ? 'is-empty' : ''}">
          ${metric.embedding === null ? '' : `emb ${formatStatValue(metric.embedding)}`}
        </span>
      </div>
    `;
  }

  /** Projection-quality statistics for one annotation, projected into its ⓘ popover. */
  private renderStats(summary: AnnotationStatSummary) {
    return html`
      <div class="annotation-stats">
        ${summary.validity.length > 0
          ? html`
              <div class="stat-heading">Separation in ${this.selectedProjection}</div>
              ${summary.validity.map((metric) => this.renderStatMetric(metric))}
            `
          : ''}
        ${summary.agreement.length > 0
          ? html`
              <div class="stat-heading">Auto-cluster agreement</div>
              ${summary.agreement.map(
                (group) => html`
                  <div class="stat-group-label">${group.label}</div>
                  ${group.metrics.map((metric) => this.renderStatMetric(metric))}
                `,
              )}
            `
          : ''}
        <!-- Stated unconditionally: isolation, query filters, legend hides and the reliability
             threshold all narrow the view, and these scores are computed once over the whole
             dataset regardless. A flag tracking "is the view a subset?" cannot stay correct. -->
        <div class="stat-caveat">Computed on the full dataset, not the current view.</div>
      </div>
    `;
  }

  render() {
    const filtered = this.getFilteredGroupedAnnotations();
    const displayText = this.selectedAnnotation
      ? annotationLabel(
          this.selectedAnnotation,
          this.annotationDefinitions[this.selectedAnnotation],
        )
      : this.placeholder;

    return html`
      <div class="annotation-select-container">
        <button
          class="dropdown-trigger ${this.open ? 'open' : ''}"
          @click=${this.toggleDropdown}
          @keydown=${this.handleKeydown}
          aria-expanded=${this.open}
          aria-haspopup="listbox"
        >
          <span class="dropdown-trigger-text">${displayText}</span>
          <svg class="chevron-down" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        ${this.open
          ? html`
              <div class="dropdown-menu align-left" @click=${(e: Event) => e.stopPropagation()}>
                <div class="annotation-search-container">
                  <input
                    id="annotation-search-input"
                    class="annotation-search-input"
                    type="text"
                    .value=${this.query}
                    placeholder="Search annotations..."
                    @input=${this.handleSearchInput}
                    @keydown=${this.handleKeydown}
                  />
                </div>

                <div class="annotation-list-container">
                  ${filtered.length === 0
                    ? html` <div class="no-results">No matching annotations</div> `
                    : filtered.map((group) => {
                        let currentIndex = 0;
                        // Find starting index for this group
                        for (const g of filtered) {
                          if (g === group) break;
                          currentIndex += g.annotations.length;
                        }

                        return html`
                          <div class="annotation-section">
                            <div class="annotation-section-header">${group.category}</div>
                            <div class="annotation-section-items">
                              ${group.annotations.map((annotation) => {
                                // Hover styling comes from `dropdownMixin`'s `.dropdown-item:hover`.
                                // Mirroring it into `highlightIndex` re-rendered every row — and
                                // rebuilt every popover's stats block — per row the pointer crossed.
                                // The index is for keyboard navigation only.
                                const itemIndex = currentIndex++;
                                const isHighlighted = itemIndex === this.highlightIndex;
                                const isSelected = annotation === this.selectedAnnotation;
                                const isInTooltip = this.tooltipAnnotations.includes(annotation);
                                const hasEatPredictions = this.eatAnnotations.includes(annotation);
                                const definition = this.annotationDefinitions[annotation];
                                const meta = getAnnotationMeta(annotation, definition);
                                const hasDocs = meta.description.length > 0 || !!meta.docsUrl;
                                const stats = this.getStatSummary(annotation);
                                return html`
                                  <div
                                    class="dropdown-item ${isHighlighted
                                      ? 'highlighted'
                                      : ''} ${isSelected ? 'selected' : ''}"
                                    data-annotation=${annotation}
                                    @click=${(e: Event) => this.selectAnnotation(annotation, e)}
                                  >
                                    <span
                                      class="primary-indicator"
                                      aria-hidden="true"
                                      data-active=${isSelected ? 'true' : 'false'}
                                    >
                                      ${isSelected ? html`<span class="primary-dot"></span>` : ''}
                                    </span>
                                    ${hasDocs || stats
                                      ? html`<protspace-info-popover
                                          class="annotation-info ${stats ? 'has-stats' : ''}"
                                          placement="side"
                                          .description=${meta.description}
                                          docs-url=${meta.docsUrl ?? ''}
                                          label=${annotationLabel(annotation, definition)}
                                          @click=${(e: Event) => e.stopPropagation()}
                                          >${stats
                                            ? this.renderStats(stats)
                                            : ''}</protspace-info-popover
                                        >`
                                      : ''}
                                    <span class="dropdown-item-label"
                                      >${annotationLabel(annotation, definition)}</span
                                    >
                                    ${hasEatPredictions
                                      ? html`<span
                                          class="eat-badge"
                                          title="Embedding Annotation Transfer predictions available"
                                          aria-label="EAT predictions available"
                                          >EAT</span
                                        >`
                                      : ''}
                                    ${isPredictedAnnotation(annotation)
                                      ? html`<span
                                          class="predicted-badge"
                                          title="Predicted — computational, not experimentally curated"
                                          aria-label="Predicted"
                                          >⚡</span
                                        >`
                                      : ''}
                                    <span class="tooltip-toggle-slot">
                                      ${isSelected
                                        ? ''
                                        : html`<button
                                            type="button"
                                            class="tooltip-toggle-btn ${isInTooltip
                                              ? 'is-active'
                                              : ''}"
                                            title=${isInTooltip
                                              ? 'Hide from hover tooltip'
                                              : 'Show in hover tooltip'}
                                            aria-label=${isInTooltip
                                              ? `Hide ${annotation} from hover tooltip`
                                              : `Show ${annotation} in hover tooltip`}
                                            aria-pressed=${isInTooltip ? 'true' : 'false'}
                                            @click=${(e: Event) =>
                                              this.toggleTooltipAnnotation(annotation, e)}
                                            @mousedown=${(e: Event) => e.stopPropagation()}
                                          >
                                            ${isInTooltip
                                              ? html`<svg
                                                  viewBox="0 0 24 24"
                                                  width="16"
                                                  height="16"
                                                  fill="none"
                                                  stroke="currentColor"
                                                  stroke-width="2"
                                                  stroke-linecap="round"
                                                  stroke-linejoin="round"
                                                  aria-hidden="true"
                                                >
                                                  <path
                                                    d="M1.5 12s4-7.5 10.5-7.5S22.5 12 22.5 12 18.5 19.5 12 19.5 1.5 12 1.5 12z"
                                                  />
                                                  <circle cx="12" cy="12" r="3" />
                                                </svg>`
                                              : html`<svg
                                                  viewBox="0 0 24 24"
                                                  width="16"
                                                  height="16"
                                                  fill="none"
                                                  stroke="currentColor"
                                                  stroke-width="2"
                                                  stroke-linecap="round"
                                                  stroke-linejoin="round"
                                                  aria-hidden="true"
                                                >
                                                  <path d="M3 3l18 18" />
                                                  <path d="M10.585 10.587a2 2 0 0 0 2.83 2.828" />
                                                  <path
                                                    d="M16.681 16.673A8.717 8.717 0 0 1 12 18C6 18 2 12 2 12a13.16 13.16 0 0 1 3.176-3.836"
                                                  />
                                                  <path
                                                    d="M9.88 5.18A8.717 8.717 0 0 1 12 5c6 0 10 7 10 7a13.198 13.198 0 0 1-1.668 2.06"
                                                  />
                                                </svg>`}
                                          </button>`}
                                    </span>
                                  </div>
                                `;
                              })}
                            </div>
                          </div>
                        `;
                      })}
                </div>
              </div>
            `
          : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'protspace-annotation-select': ProtspaceAnnotationSelect;
  }
}
