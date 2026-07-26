import type { ProjectionStatisticRow } from '../types.js';

/**
 * Selects the per-annotation slice of the optional `statistics.parquet` bundle part, so the
 * annotation picker can answer "how well does colouring by this annotation actually separate
 * in the projection I'm looking at?".
 *
 * Everything here is defensive: a bundle may carry no statistics at all, statistics for only
 * some annotations, or only some metrics per annotation (the backend skips Davies–Bouldin and
 * Calinski–Harabasz for high-cardinality annotations). Rows that aren't scores (`metric_kind
 * === 'meta'`, e.g. `n_clusters`) are never surfaced.
 */

/** Display name + optimisation direction per metric, and the render order within a group. */
const METRIC_DISPLAY: Record<string, { label: string; higherIsBetter: boolean }> = {
  silhouette: { label: 'Silhouette', higherIsBetter: true },
  davies_bouldin: { label: 'Davies–Bouldin', higherIsBetter: false },
  calinski_harabasz: { label: 'Calinski–Harabasz', higherIsBetter: true },
  adjusted_rand: { label: 'ARI', higherIsBetter: true },
  normalized_mutual_info: { label: 'NMI', higherIsBetter: true },
};

/** Human name for a K-selection labelling (`label_kind`), falling back to the raw value. */
const LABEL_KIND_DISPLAY: Record<string, string> = {
  kmeans_elbow: 'elbow K',
  kmeans_silhouette: 'silhouette K',
};

/**
 * Render order, derived from the display maps rather than restated: a metric added to
 * `METRIC_DISPLAY` alone would otherwise silently sort last. Validity and agreement metrics
 * never share a list, so one order covers both.
 */
const METRIC_ORDER = Object.keys(METRIC_DISPLAY);
const LABEL_KIND_ORDER = Object.keys(LABEL_KIND_DISPLAY);

export interface AnnotationStatMetric {
  metric: string;
  /** Human-readable metric name. */
  label: string;
  value: number;
  /**
   * The same metric scored on the source embedding, the separability "ceiling" a 2D
   * projection is measured against. `null` when the bundle has no embedding-space row.
   */
  embedding: number | null;
  /** False for Davies–Bouldin; true for every other metric currently emitted. */
  higherIsBetter: boolean;
}

export interface AnnotationAgreementGroup {
  labelKind: string;
  /** Human-readable K-selection name, e.g. "elbow K". */
  label: string;
  metrics: AnnotationStatMetric[];
}

export interface AnnotationStatSummary {
  /** How cleanly the annotation's own categories separate in this projection. */
  validity: AnnotationStatMetric[];
  /** How well each auto-clustering of this projection recovers the annotation. */
  agreement: AnnotationAgreementGroup[];
}

function toMetric(
  row: ProjectionStatisticRow,
  embeddingValue: number | null,
): AnnotationStatMetric {
  const display = METRIC_DISPLAY[row.metric];
  return {
    metric: row.metric,
    label: display?.label ?? row.metric,
    value: row.value,
    embedding: embeddingValue,
    higherIsBetter: display?.higherIsBetter ?? true,
  };
}

/** Position of `key` in `order`; unknown keys (a newer backend adding one) sort last. */
function orderIndex(order: string[], key: string): number {
  const index = order.indexOf(key);
  return index === -1 ? order.length : index;
}

const byMetricOrder = (a: AnnotationStatMetric, b: AnnotationStatMetric) =>
  orderIndex(METRIC_ORDER, a.metric) - orderIndex(METRIC_ORDER, b.metric);

/**
 * Build the statistics shown behind an annotation's ⓘ icon, or `null` when the bundle has no
 * score for this (annotation, projection) pair, which is also the "should we show the icon at
 * all?" test.
 *
 * @param statistics Rows from the bundle's statistics part, if any.
 * @param annotation Annotation column name, matched against `statistics.annotation`.
 * @param projectionName Currently selected projection, matched against `statistics.space_name`.
 */
export function annotationStatSummary(
  statistics: readonly ProjectionStatisticRow[] | undefined,
  annotation: string,
  projectionName: string,
): AnnotationStatSummary | null {
  if (!statistics?.length || !annotation) return null;

  // A non-finite value (NaN/null from a foreign writer) is not a score: it must not switch
  // the ⓘ icon on, and a NaN ceiling would defeat the `embedding === null` column collapse.
  const forAnnotation = statistics.filter(
    (row) =>
      row.annotation === annotation && row.metric_kind !== 'meta' && Number.isFinite(row.value),
  );
  if (forAnnotation.length === 0) return null;

  // The embedding-space ceiling is projection-independent, but a bundle prepared from several
  // embeddings carries one row per (annotation, metric, embedding); the driver runs the
  // embedding pass once per embedding set. Nothing in the tidy schema links a projection back
  // to the embedding it came from, so a metric scored on more than one embedding has no
  // ceiling we can attribute: mark it conflicted (`null`) rather than show a different
  // embedding's number. Absent = no embedding row at all.
  const ceilings = new Map<string, { source: string; value: number } | null>();
  for (const row of forAnnotation) {
    if (row.space_kind !== 'embedding' || row.stat_family !== 'annotation_validity') continue;
    const entry = ceilings.get(row.metric);
    if (entry === undefined) {
      ceilings.set(row.metric, { source: row.space_name, value: row.value });
    } else if (entry !== null && entry.source !== row.space_name) {
      ceilings.set(row.metric, null);
    }
  }

  const inProjection = forAnnotation.filter(
    (row) => row.space_kind === 'projection' && row.space_name === projectionName,
  );

  const validity = inProjection
    .filter((row) => row.stat_family === 'annotation_validity')
    .map((row) => toMetric(row, ceilings.get(row.metric)?.value ?? null))
    .sort(byMetricOrder);

  const agreementByLabelKind = new Map<string, AnnotationStatMetric[]>();
  for (const row of inProjection) {
    if (row.stat_family !== 'cluster_agreement') continue;
    const metrics = agreementByLabelKind.get(row.label_kind) ?? [];
    metrics.push(toMetric(row, null));
    agreementByLabelKind.set(row.label_kind, metrics);
  }

  // Sorted here rather than inherited from parquet row order, so the popover's group order is
  // this module's decision and not the Python writer's iteration order over K-selections.
  const agreement = [...agreementByLabelKind.entries()]
    .sort(([a], [b]) => orderIndex(LABEL_KIND_ORDER, a) - orderIndex(LABEL_KIND_ORDER, b))
    .map(([labelKind, metrics]) => ({
      labelKind,
      label: LABEL_KIND_DISPLAY[labelKind] ?? labelKind,
      metrics: metrics.sort(byMetricOrder),
    }));

  if (validity.length === 0 && agreement.length === 0) return null;
  return { validity, agreement };
}

/**
 * Format a statistic for display. Calinski–Harabasz is unbounded and runs into the hundreds or
 * thousands, so it would waste the popover's width at 3 decimals; bounded scores keep them.
 */
export function formatStatValue(value: number): string {
  if (!Number.isFinite(value)) return '—';
  // Round before testing the threshold, so -99.9996 renders as "-100" and not "-100.000"; and
  // drop the sign `toFixed` keeps on a value that rounded to zero, which reads as a glitch.
  const decimals = value.toFixed(3);
  const rounded = Number(decimals);
  const text = Math.abs(rounded) >= 100 ? value.toFixed(0) : decimals;
  return rounded === 0 ? text.replace('-', '') : text;
}
