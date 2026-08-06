import { LitElement, html, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';
import { customElement } from '../../../utils/safe-custom-element';
import type {
  AnnotationStatMetric,
  AnnotationStatSummary,
  ClusterAgreementEntry,
  Projection,
  ProjectionStatisticRow,
} from '@protspace/utils';
import {
  AUTO_CLUSTER_SCORE_CAVEAT,
  NA_DISPLAY,
  annotationLabel,
  annotationStatSummary,
  clusterAgreement,
  formatStatValue,
  hasAnnotationStats,
  isAutoClusterColumn,
  metricDescription,
  metricDisplay,
} from '@protspace/utils';
import { projectionMetadataStyles } from './projection-metadata.styles';
import '../../common/info-popover';

/** One rendered `<dt>/<dd>` pair. An empty `description` renders no ⓘ. */
interface MetadataRow {
  label: string;
  value: string;
  description: string;
  /** Faithfulness scope ("local" / "global"), rendered as a group heading. Null groups first. */
  scope?: string | null;
}

/** Human-readable heading for a faithfulness scope group. */
const SCOPE_HEADINGS: Record<string, string> = {
  local: 'Local — are the same proteins still neighbours?',
  global: 'Global — is the overall layout preserved?',
};

/**
 * What the two value columns mean. "This projection" and "Source embedding" are short enough to
 * fit the card but say nothing on their own about *why* there are two numbers — that the second
 * is a ceiling, and the gap between them is the cost of flattening to 2D.
 */
const SEPARATION_SCOPE_DESCRIPTION =
  'Two numbers per metric. "Projection" scores the layout you are looking at. "Embedding" ' +
  'scores the same annotation on the full high-dimensional embedding this projection was ' +
  'computed from — flattening it to 2D can only lose structure, never add it, so that column ' +
  'is the best any projection of this data could achieve. A small gap means the projection ' +
  'kept what was there; a large one means it lost it.';

/** A faithfulness metric before display: the raw key is kept so it can be looked up. */
interface QualityEntry {
  metric: string;
  scope: string | null;
  value: unknown;
}

@customElement('protspace-projection-metadata')
class ProtspaceProjectionMetadata extends LitElement {
  @property({ type: Object }) projection: Projection | null = null;
  /** Rows of the optional `statistics.parquet` part; absent unless prepared with `--stats`. */
  @property({ type: Array }) statisticsRows?: readonly ProjectionStatisticRow[];
  /** Annotation currently coloring the plot, which the quality section is scored on. */
  @property({ type: String, attribute: 'selected-annotation' }) selectedAnnotation = '';

  /**
   * Click-pinned open, so the panel survives the pointer leaving it — the same affordance the
   * ⓘ popovers inside it already have. Hover alone made the panel unusable for its own content:
   * reading a metric's ⓘ, or selecting a number, means travelling outside the card.
   */
  @state() private _pinned = false;

  static styles = projectionMetadataStyles;

  disconnectedCallback() {
    super.disconnectedCallback();
    this._setPinned(false);
  }

  private _setPinned(pinned: boolean): void {
    if (this._pinned === pinned) return;
    this._pinned = pinned;
    // Bound once per toggle rather than kept for the element's lifetime: an always-on
    // document listener on a component that exists per scatter-plot is a cost for a state
    // that is off almost always.
    if (pinned) {
      document.addEventListener('pointerdown', this._onDocumentPointerDown, true);
      document.addEventListener('keydown', this._onDocumentKeydown, true);
    } else {
      document.removeEventListener('pointerdown', this._onDocumentPointerDown, true);
      document.removeEventListener('keydown', this._onDocumentKeydown, true);
    }
  }

  /** `composedPath` rather than `contains`: the click may originate inside a nested shadow root. */
  private _onDocumentPointerDown = (event: Event) => {
    if (!event.composedPath().includes(this)) this._setPinned(false);
  };

  private _onDocumentKeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    // Let a pinned ⓘ inside the panel take Escape first; it closes on its own keydown handler
    // and stopping here would leave the user pressing Escape twice with nothing happening.
    this._setPinned(false);
    (this.shadowRoot?.querySelector('.trigger') as HTMLElement | null)?.focus();
  };

  render() {
    const { parameters, quality } = this._splitMetadata();
    // `stats`: validity scored for this exact projection, so it is scoped by the panel it sits
    // in. `agreement` (below) is deliberately not scoped that way: ARI/NMI describe the
    // clustering itself, not whichever projection the panel happens to be open on, and the
    // stats header already names the clustering via the selected `cluster_*` column. Filtering
    // it to `this.projection` would leave a user who just selected, say, `cluster_elbow_ProtT5
    // — PCA 2` while viewing `ProtT5 — UMAP 2` staring at nothing instead of PCA 2's numbers.
    const stats = annotationStatSummary(
      this.statisticsRows,
      this.selectedAnnotation,
      this.projection?.name ?? '',
    );
    // Non-empty only when the selected annotation is itself a `cluster_elbow_*` /
    // `cluster_silhouette_*` column. That column now also carries its own validity scores,
    // so the two blocks below routinely render together for a clustering: "how separated is
    // it" (optimistic, it drew its own boundaries) above "what does it recover" (independent).
    const agreement = clusterAgreement(this.statisticsRows, this.selectedAnnotation);

    // The stats block counts toward "is there anything to show". A projection whose
    // `info_json` is empty or absent yields no parameters AND no quality rows, so gating on
    // those alone hid a fully populated statistics section — while the color-by dropdown still
    // badged the annotation with "select this annotation and open the projection metadata
    // panel". Both sides ask `hasAnnotationStats`, so both must agree on whether it renders.
    if (parameters.length === 0 && quality.length === 0 && !hasAnnotationStats(stats, agreement)) {
      return html``;
    }

    return html`
      <button
        class="trigger"
        type="button"
        tabindex="0"
        aria-label="View projection metadata"
        aria-expanded=${this._pinned}
        aria-describedby="projection-metadata-content"
        @click=${() => this._setPinned(!this._pinned)}
      >
        <svg class="icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 3v18h18" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M7 14v4" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M11 10v8" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 6v12" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 8v10" />
        </svg>
      </button>

      <div
        class="content ${this._pinned ? 'is-pinned' : ''}"
        id="projection-metadata-content"
        role="tooltip"
        data-info-popover-boundary
      >
        <!-- The projection's own name, which the panel never showed: _splitMetadata skips
             the "name" key, so a card describing one projection out of several did not say
             which. It also replaces the second header bar the stats block used to print
             (the annotation name), which duplicated the legend panel's own title and made
             that block read as a stray card. -->
        <div class="header">${this.projection?.name || 'Projection metadata'}</div>
        <!-- Ordered by what the reader came for, now that the card scrolls. Separation is
             what the color-by dropdown's STATS badge points at and the only block that
             changes when you recolour, so it must not open below the fold; the reduction
             parameters never change and are the reference material, so they go last. -->
        ${hasAnnotationStats(stats, agreement)
          ? this._renderAnnotationStats(stats, agreement)
          : nothing}
        ${this._renderSection('Faithfulness to the embedding', 'quality', quality)}
        ${this._renderSection('How it was made', 'parameters', parameters)}
      </div>
    `;
  }

  /**
   * One labelled block. Absent rather than empty when the projection carries no such data.
   *
   * A row carrying a `description` gets the same ⓘ as the separation metrics below it. The
   * faithfulness names ("Random Triplet", "Spearman Distance") say least to a biologist of
   * anything in this panel, so leaving them bare made the one section that most needed
   * explaining the only one without it.
   */
  private _renderSection(title: string, id: string, rows: MetadataRow[]) {
    if (rows.length === 0) return nothing;
    let renderedScope: string | null | undefined;
    return html`
      <div class="section-heading">${title}</div>
      <dl data-section="${id}">
        ${rows.map((row) => {
          // A heading once per scope run rather than "(local)" on every label. The backend
          // emits the metrics grouped, so a change of scope is a change of group.
          const heading =
            row.scope && row.scope !== renderedScope ? SCOPE_HEADINGS[row.scope] : null;
          renderedScope = row.scope;
          return html`
            ${heading ? html`<div class="scope-heading">${heading}</div>` : nothing}
            <div class="item">
              <dt>
                <span class="item-label">${row.label}</span>
                ${row.description
                  ? html`<protspace-info-popover
                      placement="side"
                      .description=${row.description}
                      label=${row.label}
                    ></protspace-info-popover>`
                  : nothing}
              </dt>
              <dd>${row.value}</dd>
            </div>
          `;
        })}
      </dl>
    `;
  }

  /**
   * How well the selected annotation separates in this projection (`summary`), and/or how well
   * the selected auto-clustering recovers every annotation it was compared against
   * (`agreement`). For a `cluster_*` column both carry content: the clustering is scored on its
   * own labels *and* compared against every annotation. For an ordinary annotation `agreement`
   * is empty. Each is rendered independently rather than assumed exclusive, which is also what
   * keeps a bundle written before clusterings were self-scored (agreement only) rendering.
   */
  private _renderAnnotationStats(
    summary: AnnotationStatSummary | null,
    agreement: ClusterAgreementEntry[],
  ) {
    const scope = summary ? this._statScopeLine(summary) : '';
    // A bundle prepared without an embedding pass has every ceiling null: naming a column
    // of entirely blank cells would only take width back from the label column for nothing.
    const hasEmbeddingCeiling = summary?.validity.some((metric) => metric.embedding !== null);
    return html`
      <div class="annotation-stats">
        ${summary && summary.validity.length > 0
          ? html`
              <!-- The annotation is a chip inside the heading, not a header bar of its own.
                   It is an INPUT to this section (same report, recoloured), not a change of
                   subject, and a second bar printing the annotation name simply repeated the
                   legend panel's title one column over. -->
              <div class="stat-heading">
                <span
                  >Separation, scored on
                  <span class="stat-annotation-chip"
                    >${annotationLabel(this.selectedAnnotation)}</span
                  ></span
                >
                <protspace-info-popover
                  placement="side"
                  label="separation scores"
                  .description=${SEPARATION_SCOPE_DESCRIPTION}
                ></protspace-info-popover>
              </div>
              ${hasEmbeddingCeiling
                ? html`
                    <!-- One word each. These sit in the grid's two auto-sized columns, which
                         size to max-content, so the longer headings "This projection" and
                         "Source embedding" set those widths from the widest HEADING rather
                         than the widest number. Measured: that left the metric-name column
                         36px and pushed its info icon out over the values. The heading's own
                         info icon carries the full explanation instead. -->
                    <div class="stat-columns">
                      <span></span>
                      <span>Projection</span>
                      <span>Embedding</span>
                    </div>
                  `
                : ''}
              ${summary.validity.map((metric) => this._renderStatMetric(metric))}
            `
          : ''}
        ${agreement.length > 0
          ? html`
              <div class="stat-heading">Recovers</div>
              ${agreement.map(
                (entry) => html`
                  <div class="stat-group-label">${annotationLabel(entry.annotation)}</div>
                  ${entry.metrics.map((metric) => this._renderStatMetric(metric))}
                `,
              )}
            `
          : ''}
        ${scope ? html`<div class="stat-caveat">${scope}</div>` : ''}
        <!-- The clustering is scored on the labels it drew itself, in the projection it drew
             them in, so "Separation in this projection" reads high by construction. "Recovers"
             is the honest half of this panel for a cluster column: ARI/NMI compare it against
             something it did not choose. -->
        ${isAutoClusterColumn(this.statisticsRows, this.selectedAnnotation)
          ? html`<div class="stat-caveat">${AUTO_CLUSTER_SCORE_CAVEAT}</div>`
          : nothing}
        <!-- Stated unconditionally: isolation, query filters, legend hides and the reliability
             threshold all narrow the view, and these scores are computed once over the whole
             dataset regardless. A flag tracking "is the view a subset?" cannot stay correct. -->
        <div class="stat-caveat">Computed on the full dataset.</div>
      </div>
    `;
  }

  /**
   * One metric row: name (with an arrow for the direction that counts as better), its value in
   * this projection, and (for annotation-validity metrics) the same metric in the source
   * embedding, which is the separability ceiling the projection is measured against.
   */
  private _renderStatMetric(metric: AnnotationStatMetric) {
    // Marked on every metric, not only on the one that inverts: an arrow that shows up on
    // Davies-Bouldin alone reads as a warning about that row rather than as a direction.
    const better = metric.higherIsBetter ? 'Higher' : 'Lower';
    const description = metricDescription(metric.metric);
    return html`
      <div class="stat-metric">
        <span class="stat-metric-label">
          <span class="stat-metric-name"
            >${metric.label}<span
              class="stat-direction"
              aria-hidden="true"
              title="${better} is better"
              >${metric.higherIsBetter ? '↑' : '↓'}</span
            ><span class="sr-only"> (${better.toLowerCase()} is better)</span></span
          >
          <!-- info-popover already renders nothing without a description; the guard here
               still avoids constructing an element per metric row that would render nothing
               anyway (every non-empty metric list runs through this once per row). -->
          ${description
            ? html`<protspace-info-popover
                placement="side"
                .description=${description}
                label=${metric.label}
              ></protspace-info-popover>`
            : nothing}
        </span>
        <span class="stat-metric-value">${formatStatValue(metric.value)}</span>
        <!-- The cell stays even when empty: \`.stat-metric\` is \`display: contents\`, so dropping
             it would shift every following row one column across the shared grid. -->
        <span class="stat-metric-embedding ${metric.embedding === null ? 'is-empty' : ''}">
          ${metric.embedding === null
            ? ''
            : html`<span class="sr-only">in embedding </span>${formatStatValue(metric.embedding)}`}
        </span>
      </div>
    `;
  }

  /**
   * What the scores cover: "5 categories · 1,427 proteins scored", dropping whichever count the
   * bundle left out. An annotation rarely labels every protein, so the second number is also the
   * closest thing the bundle has to per-category coverage.
   */
  private _statScopeLine(summary: AnnotationStatSummary): string {
    const parts: string[] = [];
    const { categories, scored } = summary;
    if (categories !== null) {
      parts.push(`${categories} ${categories === 1 ? 'category' : 'categories'}`);
    }
    if (scored !== null) {
      parts.push(`${scored.toLocaleString()} ${scored === 1 ? 'protein' : 'proteins'} scored`);
    }
    return parts.join(' · ');
  }

  /**
   * Reduction parameters and projection quality, kept apart. They answer different
   * questions: the parameters are what was asked for, the quality is what came out, and
   * a single flat list invites reading `n_neighbors` and `trustworthiness` as peers.
   */
  private _splitMetadata(): {
    parameters: MetadataRow[];
    quality: MetadataRow[];
  } {
    if (!this.projection?.metadata) return { parameters: [], quality: [] };

    const rawMetadata = this.projection.metadata;
    const parameterEntries: Array<[string, unknown]> = [];
    const qualityEntries: QualityEntry[] = [];

    for (const [key, value] of Object.entries(rawMetadata)) {
      const lowerKey = key.toLowerCase();
      if (lowerKey === 'dimension' || lowerKey === 'dimensions' || lowerKey === 'name') {
        continue;
      }

      if (this._isJsonField(lowerKey) && typeof value === 'string') {
        const parsed = this._tryParseJson(value);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          for (const [innerKey, innerValue] of Object.entries(parsed)) {
            if (
              innerKey.toLowerCase() === 'quality' &&
              !!innerValue &&
              typeof innerValue === 'object' &&
              !Array.isArray(innerValue)
            ) {
              qualityEntries.push(...this._qualityEntries(innerValue as Record<string, unknown>));
            } else {
              parameterEntries.push([innerKey, innerValue]);
            }
          }
          continue;
        }
      }

      if (lowerKey === 'quality' && !!value && typeof value === 'object' && !Array.isArray(value)) {
        qualityEntries.push(...this._qualityEntries(value as Record<string, unknown>));
        continue;
      }

      parameterEntries.push([key, value]);
    }

    const parameters: MetadataRow[] = parameterEntries.map(([key, value]) => ({
      label: this._formatMetadataKey(key),
      value: this._formatMetadataValue(value, key),
      // Reduction parameters are the reducer's own knobs, documented by the reducer; only
      // the metrics below have a registry entry to explain them.
      description: '',
    }));

    const quality: MetadataRow[] = qualityEntries.map(({ metric, scope, value }) => {
      const display = metricDisplay(metric);
      // A description is exactly what "the registry knows this metric" means, so it also
      // decides whether the registry's spelling ("kNN Overlap") beats the prettified key.
      const known = display.description.length > 0;
      return {
        // The scope is a group heading now, not a suffix on every row. "(local)" / "(global)"
        // on each of five labels cost more width than the panel has — "Spearman Distance
        // (global) ⓘ" pushed its own value onto a second line.
        label: known ? display.label : this._formatMetadataKey(metric),
        // These are statistics, so they follow `formatStatValue` like every other score in
        // the app rather than the generic metadata formatter's own rounding — which is still
        // right for reduction parameters, and still handles the `value: null` a skipped
        // metric is written as.
        value:
          typeof value === 'number' && Number.isFinite(value)
            ? formatStatValue(value)
            : this._formatMetadataValue(value, metric),
        description: display.description,
        scope,
      };
    });

    return { parameters, quality };
  }

  /**
   * One entry per faithfulness metric, tagged with its scope ("local" neighbourhoods vs "global"
   * layout). The shared provenance each metric carries (k, seed, sampling, source embedding) is
   * dropped: it repeats per metric and would bury the five numbers worth reading.
   */
  private _qualityEntries(quality: Record<string, unknown>): QualityEntry[] {
    return Object.entries(quality).map(([metric, entry]): QualityEntry => {
      if (!entry || typeof entry !== 'object' || !('value' in entry)) {
        return { metric, scope: null, value: entry };
      }
      const { value, scope } = entry as { value: unknown; scope?: unknown };
      return { metric, scope: typeof scope === 'string' ? scope : null, value };
    });
  }

  /**
   * Check if a key indicates a JSON field
   */
  private _isJsonField(key: string): boolean {
    return key === 'info' || key === 'info_json' || key.includes('json');
  }

  /**
   * Safely parse JSON string
   */
  private _tryParseJson(value: string): unknown {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  /**
   * Format metadata key to Title Case
   */
  private _formatMetadataKey(key: string): string {
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .split(' ')
      .filter((word) => word.length > 0)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Format metadata value with appropriate precision
   */
  private _formatMetadataValue(value: unknown, key: string): string {
    if (value == null) return NA_DISPLAY;

    const lowerKey = key.toLowerCase();
    const isVarianceRatio =
      lowerKey.includes('explained_variance') || lowerKey.includes('variance_ratio');

    if (Array.isArray(value)) {
      return value.map((item) => this._formatSingleValue(item, isVarianceRatio)).join(', ');
    }

    return this._formatSingleValue(value, isVarianceRatio);
  }

  /**
   * Format a single metadata value
   */
  private _formatSingleValue(value: unknown, isVarianceRatio: boolean): string {
    if (typeof value === 'number') {
      if (Number.isInteger(value)) return value.toString();
      return value.toFixed(isVarianceRatio ? 2 : 3);
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }
    return String(value);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'protspace-projection-metadata': ProtspaceProjectionMetadata;
  }
}
