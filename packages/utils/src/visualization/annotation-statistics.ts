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

/**
 * Display name + optimisation direction per metric, and the render order within a group.
 * Must cover the same keys as `METRIC_DESCRIPTIONS` in `metric-descriptions.ts`; nothing
 * enforces that automatically, so a metric added here needs a description there too.
 */
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
  /** Categories the scores were computed over; `null` when the bundle omits the provenance. */
  categories: number | null;
  /** Proteins the scores were computed over, which can be fewer than the dataset holds. */
  scored: number | null;
}

/**
 * A count from a row's `extra_json` provenance. That column is written by a separate toolchain, so
 * a missing, malformed or non-numeric entry means "unknown", never an exception.
 */
function extraCount(row: ProjectionStatisticRow | undefined, key: string): number | null {
  if (!row?.extra_json) return null;
  try {
    const value = (JSON.parse(row.extra_json) as Record<string, unknown>)[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
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
  // Per-category rows are excluded here rather than at each use: this summary is the
  // whole-annotation view, and `annotationCategoryScores` is the per-category one.
  const forAnnotation = statistics.filter(
    (row) =>
      row.annotation === annotation &&
      row.metric_kind !== 'meta' &&
      row.category == null &&
      Number.isFinite(row.value),
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

  // What the scores cover. `inProjection` only ever holds aggregate rows (per-category rows were
  // already filtered out of `forAnnotation` above), so these two counts come from the aggregate's
  // provenance; validity rows carry both, agreement rows only the protein count.
  const scopeRow =
    inProjection.find((row) => row.stat_family === 'annotation_validity') ?? inProjection[0];
  return {
    validity,
    agreement,
    categories: extraCount(scopeRow, 'n_categories'),
    scored: extraCount(scopeRow, 'n_labels'),
  };
}

/**
 * The column name the backend gives one K-selection's auto-clustering, reconstructed (never
 * parsed) from a `cluster_agreement` row's own `label_kind` + `space_name`
 * (`ClusterValidityStatistic` in `apps/protspace/src/protspace/stats/metrics/validity.py`).
 * A projection name can itself contain underscores, so splitting a column name apart is
 * ambiguous; rebuilding the name and comparing for equality is exact. `null` for any other
 * `label_kind`, so an unrecognised one can never accidentally match.
 */
function clusterColumnName(labelKind: string, spaceName: string): string | null {
  if (labelKind === 'kmeans_elbow') return `cluster_elbow_${spaceName}`;
  if (labelKind === 'kmeans_silhouette') return `cluster_silhouette_${spaceName}`;
  return null;
}

/** One annotation, and how well the selected auto-clustering recovers it. */
export interface ClusterAgreementEntry {
  annotation: string;
  metrics: AnnotationStatMetric[];
}

/**
 * ARI/NMI agreement for the auto-clustering the caller has selected, against every annotation
 * the backend compared it to, read in its natural direction: this clustering, at this K,
 * recovers each annotation at this ARI and NMI.
 *
 * The backend never files a `cluster_agreement` row under the cluster column's own name: like
 * every other stat, it's filed under the annotation being *scored* (`major_group`, `ec_number`,
 * …; see `annotationStatSummary` above), and `cluster_*` columns are themselves excluded from
 * ever being scored as an annotation (`annotation_select.py`). So the only way to find "this
 * clustering"'s rows is to reconstruct each row's column name via `clusterColumnName` and test
 * it against what's selected, never by filtering on `row.annotation`.
 *
 * Returns `[]` for anything that isn't one of the backend's `cluster_elbow_*` /
 * `cluster_silhouette_*` shapes, which doubles as the "should the block render at all" test.
 *
 * @param statistics Rows from the bundle's statistics part, if any.
 * @param clusterColumn Selected annotation column.
 */
export function clusterAgreement(
  statistics: readonly ProjectionStatisticRow[] | undefined,
  clusterColumn: string,
): ClusterAgreementEntry[] {
  if (!statistics?.length || !clusterColumn) return [];

  const byAnnotation = new Map<string, AnnotationStatMetric[]>();
  for (const row of statistics) {
    if (row.stat_family !== 'cluster_agreement' || !Number.isFinite(row.value)) continue;
    if (clusterColumnName(row.label_kind, row.space_name) !== clusterColumn) continue;
    const metrics = byAnnotation.get(row.annotation) ?? [];
    metrics.push(toMetric(row, null));
    byAnnotation.set(row.annotation, metrics);
  }

  // Group order follows first-encounter order in `statistics`. Unlike the label-kind groups in
  // `annotationStatSummary`, annotation names have no fixed small enum to sort against, so
  // there's nothing more "deliberate" this module could impose than the order rows arrived in.
  return [...byAnnotation.entries()].map(([annotation, metrics]) => ({
    annotation,
    metrics: metrics.sort(byMetricOrder),
  }));
}

/**
 * Whether an (annotation, projection) pair has at least one metric row worth rendering: the one
 * test the dropdown's "has stats" badge and the panel's render gate must share, so the two
 * cannot drift the way `annotationStatSummary(...) !== null` and `stats || agreement.length > 0`
 * once did. `summary` can be non-null with zero validity rows (a category a subsampled validity
 * pass drops while the unsampled agreement pass still recovers it), which is content-free on its
 * own; `agreement` (from `clusterAgreement`) is what makes a `cluster_*` column count instead.
 */
export function hasAnnotationStats(
  summary: AnnotationStatSummary | null,
  agreement: ClusterAgreementEntry[],
): boolean {
  return (summary?.validity.length ?? 0) > 0 || agreement.length > 0;
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

/** One category's separation scores, as plotted on the legend's score strips. */
export interface CategoryScore {
  category: string;
  /** Silhouette in the selected projection. Never null for a returned entry. */
  silhouette: number | null;
  /** The same metric on the source embedding: this category's ceiling. */
  silhouetteEmbedding: number | null;
  /** Per-cluster Davies-Bouldin: overlap with the single worst rival category. */
  daviesBouldin: number | null;
}

/**
 * Per-category scores for the legend strips, the counterpart to
 * `annotationStatSummary`'s whole-annotation view.
 *
 * Returns an empty array whenever there is nothing to plot: no statistics part, an
 * annotation the run did not score, or a bundle written before per-category rows
 * existed. That emptiness is also the "should the strips render at all" test.
 */
export function annotationCategoryScores(
  statistics: readonly ProjectionStatisticRow[] | undefined,
  annotation: string,
  projectionName: string,
): CategoryScore[] {
  if (!statistics?.length || !annotation) return [];

  const rows = statistics.filter(
    (row) =>
      row.annotation === annotation &&
      row.stat_family === 'annotation_validity' &&
      typeof row.category === 'string' &&
      row.category.length > 0 &&
      Number.isFinite(row.value),
  );
  if (rows.length === 0) return [];

  // Same rule as the aggregate summary: a bundle prepared from several embeddings
  // carries one row per embedding, and nothing links a projection back to the one it
  // came from, so no ceiling can be attributed rather than showing the wrong one.
  const embeddingNames = new Set(
    rows.filter((row) => row.space_kind === 'embedding').map((row) => row.space_name),
  );
  const ceilingUsable = embeddingNames.size === 1;

  const byCategory = new Map<string, CategoryScore>();
  const entryFor = (category: string): CategoryScore => {
    let entry = byCategory.get(category);
    if (!entry) {
      entry = {
        category,
        silhouette: null,
        silhouetteEmbedding: null,
        daviesBouldin: null,
      };
      byCategory.set(category, entry);
    }
    return entry;
  };

  for (const row of rows) {
    const entry = entryFor(row.category as string);
    if (row.space_kind === 'embedding') {
      if (ceilingUsable && row.metric === 'silhouette') {
        entry.silhouetteEmbedding = row.value;
      }
      continue;
    }
    if (row.space_name !== projectionName) continue;
    if (row.metric === 'silhouette') entry.silhouette = row.value;
    else if (row.metric === 'davies_bouldin') entry.daviesBouldin = row.value;
  }

  // A category scored only in the embedding has no position on the projection axis.
  return [...byCategory.values()].filter((entry) => entry.silhouette !== null);
}
