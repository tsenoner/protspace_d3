import { LitElement, html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
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
} from '@protspace/utils';
import { projectionMetadataStyles } from './projection-metadata.styles';
import '../../common/info-popover';

@customElement('protspace-projection-metadata')
class ProtspaceProjectionMetadata extends LitElement {
  @property({ type: Object }) projection: Projection | null = null;
  /** Rows of the optional `statistics.parquet` part; absent unless prepared with `--stats`. */
  @property({ type: Array }) statisticsRows?: readonly ProjectionStatisticRow[];
  /** Annotation currently coloring the plot, which the quality section is scored on. */
  @property({ type: String, attribute: 'selected-annotation' }) selectedAnnotation = '';

  static styles = projectionMetadataStyles;

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
        aria-describedby="projection-metadata-content"
      >
        <svg class="icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 3v18h18" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M7 14v4" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M11 10v8" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 6v12" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 8v10" />
        </svg>
      </button>

      <div class="content" id="projection-metadata-content" role="tooltip">
        <div class="header">Projection Metadata</div>
        ${this._renderSection('Parameters', 'parameters', parameters)}
        ${this._renderSection('Projection quality', 'quality', quality)}
        ${hasAnnotationStats(stats, agreement)
          ? this._renderAnnotationStats(stats, agreement)
          : nothing}
      </div>
    `;
  }

  /** One labelled block. Absent rather than empty when the projection carries no such data. */
  private _renderSection(title: string, id: string, entries: Array<[string, string]>) {
    if (entries.length === 0) return nothing;
    return html`
      <div class="section-heading">${title}</div>
      <dl data-section="${id}">
        ${entries.map(
          ([key, value]) => html`
            <div class="item">
              <dt>${key}</dt>
              <dd>${value}</dd>
            </div>
          `,
        )}
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
      <div class="header stats-header">${annotationLabel(this.selectedAnnotation)}</div>
      <div class="annotation-stats">
        ${summary && summary.validity.length > 0
          ? html`
              <div class="stat-heading">Separation in this projection</div>
              ${hasEmbeddingCeiling
                ? html`
                    <div class="stat-columns">
                      <span></span>
                      <span>This projection</span>
                      <span>In embedding</span>
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
          ${metric.label}<span class="stat-direction" aria-hidden="true" title="${better} is better"
            >${metric.higherIsBetter ? '↑' : '↓'}</span
          ><span class="sr-only"> (${better.toLowerCase()} is better)</span>
          <!-- info-popover already renders nothing without a description; the guard here
               still avoids constructing an element per metric row that would render nothing
               anyway (every non-empty metric list runs through this once per row). -->
          ${description
            ? html`<protspace-info-popover
                .description=${description}
                label=${metric.label}
                align="right"
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
    parameters: Array<[string, string]>;
    quality: Array<[string, string]>;
  } {
    if (!this.projection?.metadata) return { parameters: [], quality: [] };

    const rawMetadata = this.projection.metadata;
    const parameterEntries: Array<[string, unknown]> = [];
    const qualityEntries: Array<[string, unknown]> = [];

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

    const format = (entries: Array<[string, unknown]>): Array<[string, string]> =>
      entries.map(([key, value]) => [
        this._formatMetadataKey(key),
        this._formatMetadataValue(value, key),
      ]);

    return { parameters: format(parameterEntries), quality: format(qualityEntries) };
  }

  /**
   * One entry per faithfulness metric, tagged with its scope ("local" neighbourhoods vs "global"
   * layout). The shared provenance each metric carries (k, seed, sampling, source embedding) is
   * dropped: it repeats per metric and would bury the five numbers worth reading.
   */
  private _qualityEntries(quality: Record<string, unknown>): Array<[string, unknown]> {
    return Object.entries(quality).map(([metric, entry]): [string, unknown] => {
      if (!entry || typeof entry !== 'object' || !('value' in entry)) return [metric, entry];
      const { value, scope } = entry as { value: unknown; scope?: unknown };
      return [typeof scope === 'string' ? `${metric} (${scope})` : metric, value];
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
