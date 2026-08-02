/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import './projection-metadata';
import type { Projection, ProjectionStatisticRow } from '@protspace/utils';

type ProjectionMetadataElement = HTMLElement & {
  projection: Projection | null;
  statisticsRows?: readonly ProjectionStatisticRow[];
  selectedAnnotation: string;
  updateComplete: Promise<unknown>;
};

/** One faithfulness entry as the backend writes it: the value plus its provenance. */
function qualityEntry(value: number | null, scope: 'local' | 'global') {
  return { value, scope, k: 15, seed: 42, sampled: false, sample_size: 1428 };
}

/** One statistics row for `major_group`, scored in the projection the panel is showing. */
const statRow = (over: Partial<ProjectionStatisticRow> = {}): ProjectionStatisticRow => ({
  space_kind: 'projection',
  space_name: 'ProtT5 — UMAP 2',
  annotation: 'major_group',
  stat_family: 'annotation_validity',
  label_kind: 'annotation',
  metric: 'silhouette',
  metric_kind: 'validity',
  value: 0.326,
  ...over,
});

async function setup(
  metadata: Record<string, unknown>,
  stats?: { statistics: readonly ProjectionStatisticRow[]; selectedAnnotation: string },
): Promise<ProjectionMetadataElement> {
  const el = document.createElement('protspace-projection-metadata') as ProjectionMetadataElement;
  el.projection = { name: 'ProtT5 — UMAP 2', metadata };
  if (stats) {
    el.statisticsRows = stats.statistics;
    el.selectedAnnotation = stats.selectedAnnotation;
  }
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

/** The annotation-quality section, present only when the bundle scored this pair. */
function statsBlock(el: ProjectionMetadataElement): HTMLElement | null {
  return el.shadowRoot!.querySelector('.annotation-stats');
}

function rows(el: ProjectionMetadataElement): Array<[string, string]> {
  return Array.from(el.shadowRoot!.querySelectorAll('.item')).map((item) => [
    item.querySelector('dt')?.textContent?.trim() ?? '',
    item.querySelector('dd')?.textContent?.trim() ?? '',
  ]);
}

describe('protspace-projection-metadata quality rows', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders one labelled row per faithfulness metric instead of a JSON blob', async () => {
    const el = await setup({
      n_components: 2,
      quality: {
        knn_overlap: qualityEntry(0.5776844070961717, 'local'),
        trustworthiness: qualityEntry(0.9746417190838376, 'local'),
        random_triplet: qualityEntry(0.7109243697478992, 'global'),
      },
    });

    expect(rows(el)).toEqual([
      ['N Components', '2'],
      ['Knn Overlap (local)', '0.578'],
      ['Trustworthiness (local)', '0.975'],
      ['Random Triplet (global)', '0.711'],
    ]);
  });

  it('never leaves a serialized object in a value', async () => {
    const el = await setup({
      quality: { spearman_distance: qualityEntry(0.53, 'global') },
    });

    for (const [, value] of rows(el)) {
      expect(value).not.toContain('{');
    }
  });

  it('marks a metric the backend skipped as not available', async () => {
    // A metric that raised is written as `value: null`, not omitted.
    const el = await setup({ quality: { continuity: qualityEntry(null, 'local') } });

    expect(rows(el)).toEqual([['Continuity (local)', 'N/A']]);
  });
});

describe('protspace-projection-metadata annotation quality section', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('stays absent when the bundle has no score for this annotation and projection', async () => {
    // The projection half of the panel must look untouched for a bundle prepared without --stats.
    const plain = await setup({ n_components: 2 });
    expect(statsBlock(plain)).toBeNull();

    const otherAnnotation = await setup(
      { n_components: 2 },
      { statistics: [statRow()], selectedAnnotation: 'seq_start' },
    );
    expect(statsBlock(otherAnnotation)).toBeNull();

    const otherProjection = await setup(
      { n_components: 2 },
      {
        statistics: [statRow({ space_name: 'ProtT5 — PCA 2' })],
        selectedAnnotation: 'major_group',
      },
    );
    expect(statsBlock(otherProjection)).toBeNull();
  });

  it('names the annotation and shows each metric against its embedding ceiling', async () => {
    const el = await setup(
      { n_components: 2 },
      {
        statistics: [
          statRow({ extra_json: '{"n_categories": 5, "n_labels": 1427}' }),
          statRow({ space_kind: 'embedding', space_name: 'prot_t5', value: 0.095 }),
          statRow({ metric: 'davies_bouldin', value: 1.281 }),
        ],
        selectedAnnotation: 'major_group',
      },
    );

    expect(el.shadowRoot!.querySelector('.stats-header')!.textContent).toContain('Major group');
    const text = statsBlock(el)!.textContent!;
    expect(text).toContain('Separation in this projection');
    expect(text).toContain('0.326');
    expect(statsBlock(el)!.querySelector('.stat-metric-embedding')!.textContent).toContain('0.095');
    expect(text).not.toContain('emb 0.095');
    expect(text).toContain('5 categories · 1,427 proteins scored');
    expect(text).toContain('Computed on the full dataset');
  });

  it('marks each metric with the direction that counts as better', async () => {
    const el = await setup(
      { n_components: 2 },
      {
        statistics: [statRow(), statRow({ metric: 'davies_bouldin', value: 1.281 })],
        selectedAnnotation: 'major_group',
      },
    );

    const arrows = Array.from(statsBlock(el)!.querySelectorAll('.stat-direction'));
    expect(arrows.map((a) => a.textContent)).toEqual(['↑', '↓']);
    // The glyphs alone reach neither screen readers nor touch users.
    expect(arrows.every((a) => a.getAttribute('aria-hidden') === 'true')).toBe(true);
    expect(statsBlock(el)!.textContent).toContain('lower is better');
  });

  it('attaches a registered info popover to every rendered metric row', async () => {
    const el = await setup(
      { n_components: 2 },
      {
        statistics: [statRow(), statRow({ metric: 'davies_bouldin', value: 1.281 })],
        selectedAnnotation: 'major_group',
      },
    );

    const labels = statsBlock(el)!.querySelectorAll('.stat-metric-label');
    const popovers = statsBlock(el)!.querySelectorAll<HTMLElement & { description: string }>(
      '.stat-metric-label protspace-info-popover',
    );
    expect(labels).toHaveLength(2);
    expect(popovers).toHaveLength(labels.length);
    expect(customElements.get('protspace-info-popover')).toBeDefined();
    // Counting elements alone would survive a broken binding: info-popover keeps its host element
    // and merely renders nothing when it has no copy, so check the copy actually arrived.
    expect(popovers[0].description.length).toBeGreaterThan(20);
  });

  it('collapses the ceiling column for a metric missing its embedding row', async () => {
    const el = await setup(
      { n_components: 2 },
      {
        statistics: [
          statRow(),
          statRow({ space_kind: 'embedding', space_name: 'prot_t5', value: 0.095 }),
          statRow({ metric: 'davies_bouldin', value: 1.281 }),
        ],
        selectedAnnotation: 'major_group',
      },
    );

    const cells = Array.from(statsBlock(el)!.querySelectorAll('.stat-metric-embedding'));
    // Silhouette has an embedding-space row (a ceiling); Davies-Bouldin has none here.
    expect(cells.map((cell) => cell.classList.contains('is-empty'))).toEqual([false, true]);
  });
});

describe('metadata sections', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('separates reduction parameters from projection quality', async () => {
    const el = await setup({
      n_neighbors: 15,
      min_dist: 0.1,
      quality: {
        trustworthiness: qualityEntry(0.94, 'local'),
        continuity: qualityEntry(0.91, 'local'),
      },
    });

    const headings = Array.from(el.shadowRoot!.querySelectorAll('.section-heading')).map((node) =>
      node.textContent!.trim(),
    );
    expect(headings).toContain('Parameters');
    expect(headings).toContain('Projection quality');

    const parameters = el.shadowRoot!.querySelector('[data-section="parameters"]')!;
    expect(parameters.textContent).toContain('N Neighbors');
    expect(parameters.textContent).not.toContain('Trustworthiness');

    const quality = el.shadowRoot!.querySelector('[data-section="quality"]')!;
    expect(quality.textContent).toContain('Trustworthiness');
    expect(quality.textContent).not.toContain('N Neighbors');
  });

  it('labels the embedding ceiling instead of abbreviating it', async () => {
    const el = await setup(
      { n_neighbors: 15 },
      {
        statistics: [
          statRow(),
          statRow({ space_kind: 'embedding', space_name: 'prot_t5', value: 0.095 }),
        ],
        selectedAnnotation: 'major_group',
      },
    );

    const text = el.shadowRoot!.querySelector('.annotation-stats')!.textContent!;
    expect(text).toContain('In embedding');
    expect(text).not.toContain('emb 0.095');
  });

  it('omits the quality section entirely when there is no faithfulness', async () => {
    const el = await setup({ n_neighbors: 15 });

    const headings = Array.from(el.shadowRoot!.querySelectorAll('.section-heading')).map((node) =>
      node.textContent!.trim(),
    );
    expect(headings).toContain('Parameters');
    expect(headings).not.toContain('Projection quality');
  });

  it('shows the embedding column header only when some metric has a ceiling', async () => {
    const withoutCeiling = await setup(
      { n_neighbors: 15 },
      { statistics: [statRow()], selectedAnnotation: 'major_group' },
    );
    expect(statsBlock(withoutCeiling)!.querySelector('.stat-columns')).toBeNull();
    expect(statsBlock(withoutCeiling)!.querySelector('.stat-metric-label')!.textContent).toContain(
      'Silhouette',
    );

    const withCeiling = await setup(
      { n_neighbors: 15 },
      {
        statistics: [
          statRow(),
          statRow({ space_kind: 'embedding', space_name: 'prot_t5', value: 0.095 }),
        ],
        selectedAnnotation: 'major_group',
      },
    );
    expect(statsBlock(withCeiling)!.querySelector('.stat-columns')).not.toBeNull();
  });

  it('expands a nested quality object inside a JSON field, keeping siblings as parameters', async () => {
    const el = await setup({
      info: JSON.stringify({
        n_neighbors: 15,
        quality: { trustworthiness: qualityEntry(0.94, 'local') },
      }),
    });

    const parameters = el.shadowRoot!.querySelector('[data-section="parameters"]')!;
    expect(parameters.textContent).toContain('N Neighbors');
    expect(parameters.textContent).not.toContain('Trustworthiness');

    const quality = el.shadowRoot!.querySelector('[data-section="quality"]')!;
    expect(quality.textContent).toContain('Trustworthiness');
    expect(quality.textContent).not.toContain('N Neighbors');
  });
});

describe('auto-cluster agreement placement', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  /**
   * One clustering's agreement row against one recovered annotation, shaped exactly as the
   * backend emits it: filed under the *recovered* annotation's own name (`major_group`), never
   * under the cluster column's name (`cluster_elbow_...`). Selecting the cluster column is what
   * the panel matches against, not the row's `annotation` field.
   */
  const agreementRow = (over: Partial<ProjectionStatisticRow> = {}) =>
    statRow({
      stat_family: 'cluster_agreement',
      label_kind: 'kmeans_elbow',
      metric: 'adjusted_rand',
      metric_kind: 'agreement',
      value: 0.62,
      ...over,
    });

  it('hides agreement while an ordinary annotation is selected', async () => {
    const el = await setup(
      { n_neighbors: 15 },
      { statistics: [statRow(), agreementRow()], selectedAnnotation: 'major_group' },
    );

    const text = el.shadowRoot!.querySelector('.annotation-stats')!.textContent!;
    expect(text).toContain('Separation in this projection');
    expect(text).not.toContain('Recovers');
  });

  it('renders no stats block for an ordinary annotation with agreement but no validity', async () => {
    // A category can vanish from validity under subsampling while the (unsampled) agreement
    // pass still recovers it (annotation_validity.py:117): annotationStatSummary stays non-null
    // on the agreement row alone, but a summary with zero validity rows is not itself a metric
    // row worth a block for.
    const el = await setup(
      { n_neighbors: 15 },
      { statistics: [agreementRow()], selectedAnnotation: 'major_group' },
    );

    expect(statsBlock(el)).toBeNull();
  });

  it('shows one group per recovered annotation when the clustering itself is selected', async () => {
    const rows = [
      agreementRow({ annotation: 'major_group', metric: 'adjusted_rand', value: 0.62 }),
      agreementRow({
        annotation: 'major_group',
        metric: 'normalized_mutual_info',
        value: 0.58,
      }),
      agreementRow({ annotation: 'ec_number', metric: 'adjusted_rand', value: 0.31 }),
      agreementRow({
        annotation: 'ec_number',
        metric: 'normalized_mutual_info',
        value: 0.44,
      }),
    ];
    const el = await setup(
      { n_neighbors: 15 },
      { statistics: rows, selectedAnnotation: 'cluster_elbow_ProtT5 — UMAP 2' },
    );

    const text = el.shadowRoot!.querySelector('.annotation-stats')!.textContent!;
    expect(text).toContain('Recovers');
    // Both recovered annotations get their own named group, not a bare "elbow K" label.
    expect(text).toContain('Major group');
    expect(text).toContain('Ec number');
    // Both metrics rendered for each group, not just a stray heading string.
    expect(text).toContain('0.620');
    expect(text).toContain('0.580');
    expect(text).toContain('0.310');
    expect(text).toContain('0.440');

    const groupLabels = Array.from(statsBlock(el)!.querySelectorAll('.stat-group-label')).map(
      (node) => node.textContent,
    );
    expect(groupLabels).toEqual(['Major group', 'Ec number']);
  });
});
