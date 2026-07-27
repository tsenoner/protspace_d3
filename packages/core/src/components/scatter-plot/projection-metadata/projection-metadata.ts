import { LitElement, html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { customElement } from '../../../utils/safe-custom-element';
import type {
  AnnotationStatMetric,
  AnnotationStatSummary,
  Projection,
  ProjectionStatisticRow,
} from '@protspace/utils';
import {
  NA_DISPLAY,
  annotationStatSummary,
  formatStatValue,
  prettifyAnnotationName,
} from '@protspace/utils';
import { projectionMetadataStyles } from './projection-metadata.styles';

@customElement('protspace-projection-metadata')
class ProtspaceProjectionMetadata extends LitElement {
  @property({ type: Object }) projection: Projection | null = null;
  /** Rows of the optional `statistics.parquet` part; absent unless prepared with `--stats`. */
  @property({ type: Array }) statistics?: readonly ProjectionStatisticRow[];
  /** Annotation currently coloring the plot, which the quality section is scored on. */
  @property({ type: String, attribute: 'selected-annotation' }) selectedAnnotation = '';

  static styles = projectionMetadataStyles;

  render() {
    const metadata = this._getProjectionMetadata();
    // Only this projection's own scores: the section is scoped by the panel it sits in.
    const stats = annotationStatSummary(
      this.statistics,
      this.selectedAnnotation,
      this.projection?.name ?? '',
    );

    if (metadata.length === 0) {
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
        <dl>
          ${metadata.map(
            ([key, value]) => html`
              <div class="item">
                <dt>${key}</dt>
                <dd>${value}</dd>
              </div>
            `,
          )}
        </dl>
        ${stats ? this._renderAnnotationStats(stats) : nothing}
      </div>
    `;
  }

  /**
   * How well the annotation currently coloring the plot separates in this projection. Absent
   * whenever the bundle carries no score for this (annotation, projection) pair, so a dataset
   * prepared without `--stats` sees the panel exactly as before.
   */
  private _renderAnnotationStats(summary: AnnotationStatSummary) {
    const scope = this._statScopeLine(summary);
    return html`
      <div class="header stats-header">${prettifyAnnotationName(this.selectedAnnotation)}</div>
      <div class="annotation-stats">
        ${summary.validity.length > 0
          ? html`
              <div class="stat-heading">Separation in this projection</div>
              ${summary.validity.map((metric) => this._renderStatMetric(metric))}
            `
          : ''}
        ${summary.agreement.length > 0
          ? html`
              <div class="stat-heading">Auto-cluster agreement</div>
              ${summary.agreement.map(
                (group) => html`
                  <div class="stat-group-label">${group.label}</div>
                  ${group.metrics.map((metric) => this._renderStatMetric(metric))}
                `,
              )}
            `
          : ''}
        ${scope ? html`<div class="stat-caveat">${scope}</div>` : ''}
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
    return html`
      <div class="stat-metric">
        <span class="stat-metric-label">
          ${metric.label}<span class="stat-direction" aria-hidden="true" title="${better} is better"
            >${metric.higherIsBetter ? '↑' : '↓'}</span
          ><span class="sr-only"> (${better.toLowerCase()} is better)</span>
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
   * Get formatted projection metadata for display
   */
  private _getProjectionMetadata(): Array<[string, string]> {
    if (!this.projection?.metadata) {
      return [];
    }

    const rawMetadata = this.projection.metadata;
    const processedEntries: Array<[string, unknown]> = [];

    // Filter and process metadata entries
    for (const [key, value] of Object.entries(rawMetadata)) {
      // Skip internal fields
      const lowerKey = key.toLowerCase();
      if (lowerKey === 'dimension' || lowerKey === 'dimensions' || lowerKey === 'name') {
        continue;
      }

      // Parse and flatten JSON fields
      if (this._isJsonField(lowerKey) && typeof value === 'string') {
        const parsed = this._tryParseJson(value);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          processedEntries.push(...Object.entries(parsed));
          continue;
        }
      }

      // Faithfulness rides in as a nested `{metric: {value, scope, ...provenance}}` map, which the
      // object branch of `_formatSingleValue` would print as one long JSON string.
      if (lowerKey === 'quality' && !!value && typeof value === 'object' && !Array.isArray(value)) {
        processedEntries.push(...this._qualityEntries(value as Record<string, unknown>));
        continue;
      }

      processedEntries.push([key, value]);
    }

    // Format all entries
    return processedEntries.map(([key, value]) => [
      this._formatMetadataKey(key),
      this._formatMetadataValue(value, key),
    ]);
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
