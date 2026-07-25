import { describe, it, expect } from 'vitest';
import type { ProjectionStatisticRow } from '../types';
import { annotationStatSummary, formatStatValue } from './annotation-statistics';

const row = (over: Partial<ProjectionStatisticRow>): ProjectionStatisticRow => ({
  space_kind: 'projection',
  space_name: 'UMAP 2',
  annotation: 'major_group',
  stat_family: 'annotation_validity',
  label_kind: 'annotation',
  metric: 'silhouette',
  metric_kind: 'validity',
  value: 0.326,
  ...over,
});

// Mirrors the shape of a real `--stats` bundle: validity in the projection, the same metrics on
// the source embedding, agreement rows per K-selection, and a `meta` n_clusters row.
const ROWS: ProjectionStatisticRow[] = [
  row({ metric: 'calinski_harabasz', value: 851.87 }),
  row({ metric: 'davies_bouldin', value: 1.281 }),
  row({ metric: 'silhouette', value: 0.326 }),
  row({ space_kind: 'embedding', space_name: 'prot_t5', metric: 'silhouette', value: 0.095 }),
  row({
    space_kind: 'embedding',
    space_name: 'prot_t5',
    metric: 'davies_bouldin',
    value: 2.958,
  }),
  row({ space_name: 'PCA 2', metric: 'silhouette', value: 0.039 }),
  row({
    stat_family: 'cluster_agreement',
    label_kind: 'kmeans_elbow',
    metric: 'normalized_mutual_info',
    metric_kind: 'agreement',
    value: 0.558,
  }),
  row({
    stat_family: 'cluster_agreement',
    label_kind: 'kmeans_elbow',
    metric: 'adjusted_rand',
    metric_kind: 'agreement',
    value: 0.362,
  }),
  row({
    annotation: '',
    stat_family: 'cluster_validity',
    label_kind: 'kmeans_elbow',
    metric: 'n_clusters',
    metric_kind: 'meta',
    value: 7,
  }),
];

describe('annotationStatSummary', () => {
  it('returns null when the bundle carries no statistics', () => {
    expect(annotationStatSummary(undefined, 'major_group', 'UMAP 2')).toBeNull();
    expect(annotationStatSummary([], 'major_group', 'UMAP 2')).toBeNull();
  });

  it('returns null for an annotation that was not scored', () => {
    expect(annotationStatSummary(ROWS, 'not_scored', 'UMAP 2')).toBeNull();
  });

  it('reports validity for the selected projection in a fixed metric order', () => {
    const summary = annotationStatSummary(ROWS, 'major_group', 'UMAP 2');
    expect(summary?.validity.map((m) => m.metric)).toEqual([
      'silhouette',
      'davies_bouldin',
      'calinski_harabasz',
    ]);
    expect(summary?.validity[0].value).toBe(0.326);
  });

  it('pairs each validity metric with its source-embedding ceiling', () => {
    const summary = annotationStatSummary(ROWS, 'major_group', 'UMAP 2');
    expect(summary?.validity.map((m) => m.embedding)).toEqual([0.095, 2.958, null]);
  });

  it('does not leak another projection‘s scores', () => {
    const summary = annotationStatSummary(ROWS, 'major_group', 'PCA 2');
    expect(summary?.validity).toHaveLength(1);
    expect(summary?.validity[0].value).toBe(0.039);
  });

  it('marks Davies-Bouldin as lower-is-better and the rest as higher-is-better', () => {
    const summary = annotationStatSummary(ROWS, 'major_group', 'UMAP 2');
    const byMetric = Object.fromEntries(summary!.validity.map((m) => [m.metric, m.higherIsBetter]));
    expect(byMetric).toEqual({
      silhouette: true,
      davies_bouldin: false,
      calinski_harabasz: true,
    });
  });

  it('groups agreement metrics by K-selection with a readable label', () => {
    const summary = annotationStatSummary(ROWS, 'major_group', 'UMAP 2');
    expect(summary?.agreement).toHaveLength(1);
    expect(summary?.agreement[0].label).toBe('elbow K');
    expect(summary?.agreement[0].metrics.map((m) => m.metric)).toEqual([
      'adjusted_rand',
      'normalized_mutual_info',
    ]);
  });

  it('never surfaces meta rows such as n_clusters', () => {
    const metrics = annotationStatSummary(ROWS, 'major_group', 'UMAP 2')!;
    const all = [...metrics.validity, ...metrics.agreement.flatMap((g) => g.metrics)];
    expect(all.some((m) => m.metric === 'n_clusters')).toBe(false);
    // The n_clusters row alone must not be enough to claim the annotation has statistics.
    const metaOnly = ROWS.filter((r) => r.metric_kind === 'meta');
    expect(annotationStatSummary(metaOnly, '', 'UMAP 2')).toBeNull();
  });

  it('returns null when the annotation is scored only in other projections', () => {
    const embeddingOnly = ROWS.filter((r) => r.space_kind === 'embedding');
    expect(annotationStatSummary(embeddingOnly, 'major_group', 'UMAP 2')).toBeNull();
  });

  it('drops the embedding ceiling when two embeddings scored the same metric', async () => {
    // A multi-embedding bundle has one embedding row per (annotation, metric, embedding), and
    // nothing in the tidy schema says which embedding this projection came from.
    const summary = annotationStatSummary(
      [
        row({ metric: 'silhouette', value: 0.326 }),
        row({ space_kind: 'embedding', space_name: 'prot_t5', metric: 'silhouette', value: 0.095 }),
        row({
          space_kind: 'embedding',
          space_name: 'esm2_650m',
          metric: 'silhouette',
          value: 0.41,
        }),
      ],
      'major_group',
      'UMAP 2',
    );

    expect(summary!.validity[0].value).toBe(0.326);
    expect(summary!.validity[0].embedding).toBeNull();
  });

  it('keeps the ceiling when a single embedding scored the metric twice-over rows', async () => {
    const summary = annotationStatSummary(
      [
        row({ metric: 'silhouette', value: 0.326 }),
        row({ space_kind: 'embedding', space_name: 'prot_t5', metric: 'silhouette', value: 0.095 }),
      ],
      'major_group',
      'UMAP 2',
    );

    expect(summary!.validity[0].embedding).toBe(0.095);
  });

  it('ignores non-finite rows entirely', () => {
    // A NaN double from a foreign writer is not a score: it must not switch the ⓘ icon on,
    // and as a ceiling it must not defeat the `embedding === null` column collapse.
    expect(annotationStatSummary([row({ value: Number.NaN })], 'major_group', 'UMAP 2')).toBeNull();

    const summary = annotationStatSummary(
      [
        row({ metric: 'silhouette', value: 0.326 }),
        row({
          space_kind: 'embedding',
          space_name: 'prot_t5',
          metric: 'silhouette',
          value: Number.NaN,
        }),
      ],
      'major_group',
      'UMAP 2',
    );
    expect(summary!.validity[0].embedding).toBeNull();
  });

  it('orders agreement groups independently of parquet row order', async () => {
    const agreementRow = (labelKind: string, value: number) =>
      row({
        stat_family: 'cluster_agreement',
        label_kind: labelKind,
        metric: 'adjusted_rand',
        metric_kind: 'agreement',
        value,
      });
    // silhouette-K rows first — the reverse of what the current writer happens to emit.
    const summary = annotationStatSummary(
      [agreementRow('kmeans_silhouette', 0.2), agreementRow('kmeans_elbow', 0.5)],
      'major_group',
      'UMAP 2',
    );

    expect(summary!.agreement.map((group) => group.label)).toEqual(['elbow K', 'silhouette K']);
  });
});

describe('formatStatValue', () => {
  it('keeps three decimals for bounded scores and drops them for unbounded ones', () => {
    expect(formatStatValue(0.326)).toBe('0.326');
    expect(formatStatValue(-0.65094)).toBe('-0.651');
    expect(formatStatValue(851.8693)).toBe('852');
  });

  it('renders a dash for non-finite values', () => {
    expect(formatStatValue(Number.NaN)).toBe('—');
  });

  it('never prints a signed zero', () => {
    expect(formatStatValue(-0.0003)).toBe('0.000');
    expect(formatStatValue(-0)).toBe('0.000');
    expect(formatStatValue(0.0003)).toBe('0.000');
  });

  it('applies the whole-number threshold after rounding', () => {
    expect(formatStatValue(-99.9996)).toBe('-100');
    expect(formatStatValue(99.9996)).toBe('100');
    expect(formatStatValue(99.4)).toBe('99.400');
  });
});
