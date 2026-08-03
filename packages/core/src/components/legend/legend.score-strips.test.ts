// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import type { ProjectionStatisticRow, VisualizationData } from '@protspace/utils';
import './legend';
import type { ProtspaceLegend } from './legend';
import type { ScoreStripPoint } from './category-score-strip';

const STAT_BASE = {
  annotation: 'family',
  stat_family: 'annotation_validity' as const,
  label_kind: 'annotation',
  metric_kind: 'validity' as const,
};

function makeData(): VisualizationData {
  return {
    protein_ids: ['p1', 'p2'],
    projections: [
      { name: 'UMAP 2', dimension: 2, data: new Float32Array(4) },
      { name: 'PCA 2', dimension: 2, data: new Float32Array(4) },
    ],
    annotations: {
      family: {
        kind: 'categorical',
        values: ['A', 'B'],
        colors: ['#ff0000', '#00ff00'],
        shapes: ['circle', 'circle'],
      },
    },
    annotation_data: {
      family: new Int32Array([0, 1]),
    },
    statisticsRows: [
      // UMAP 2: category A's silhouette is 0.5.
      {
        ...STAT_BASE,
        space_kind: 'projection',
        space_name: 'UMAP 2',
        metric: 'silhouette',
        category: 'A',
        value: 0.5,
      },
      {
        ...STAT_BASE,
        space_kind: 'projection',
        space_name: 'UMAP 2',
        metric: 'silhouette',
        category: 'B',
        value: 0.2,
      },
      {
        ...STAT_BASE,
        space_kind: 'projection',
        space_name: 'UMAP 2',
        metric: 'davies_bouldin',
        category: 'A',
        value: 1.2,
      },
      {
        ...STAT_BASE,
        space_kind: 'projection',
        space_name: 'UMAP 2',
        metric: 'davies_bouldin',
        category: 'B',
        value: 0.9,
      },
      // PCA 2: the same category A scores completely differently (-0.3, not 0.5).
      {
        ...STAT_BASE,
        space_kind: 'projection',
        space_name: 'PCA 2',
        metric: 'silhouette',
        category: 'A',
        value: -0.3,
      },
      {
        ...STAT_BASE,
        space_kind: 'projection',
        space_name: 'PCA 2',
        metric: 'silhouette',
        category: 'B',
        value: -0.1,
      },
      {
        ...STAT_BASE,
        space_kind: 'projection',
        space_name: 'PCA 2',
        metric: 'davies_bouldin',
        category: 'A',
        value: 2.0,
      },
      {
        ...STAT_BASE,
        space_kind: 'projection',
        space_name: 'PCA 2',
        metric: 'davies_bouldin',
        category: 'B',
        value: 1.5,
      },
    ] satisfies ProjectionStatisticRow[],
  };
}

type MockScatterplot = HTMLElement & {
  data: VisualizationData;
  selectedAnnotation: string;
  selectedProjectionIndex: number;
  eatOverlayEnabled: boolean;
  hiddenAnnotationValues: string[];
  otherAnnotationValues: string[];
  config: Record<string, never>;
  filtersActive: boolean;
  filteredProteinIds: string[];
  getCurrentData(): VisualizationData;
  isIsolationMode(): boolean;
  getIsolationHistory(): string[][];
};

type StripElement = HTMLElement & {
  label: string;
  higherIsBetter: boolean;
  points: ScoreStripPoint[];
};

async function setup() {
  const data = makeData();
  const plot = document.createElement('protspace-scatterplot') as MockScatterplot;
  Object.assign(plot, {
    data,
    selectedAnnotation: 'family',
    selectedProjectionIndex: 0,
    eatOverlayEnabled: true,
    hiddenAnnotationValues: [],
    otherAnnotationValues: [],
    config: {},
    filtersActive: false,
    filteredProteinIds: [],
    getCurrentData: () => data,
    isIsolationMode: () => false,
    getIsolationHistory: () => [],
  });
  document.body.append(plot);

  // A bare, unregistered element is enough: the sync controller matches control bars
  // by tag name (see scatterplot-sync-controller.ts `_onScatterplotDiscovered`), the
  // same setup already used by scatterplot-sync-controller.test.ts.
  const controlBar = document.createElement('protspace-control-bar');
  document.body.append(controlBar);

  const legend = document.createElement('protspace-legend') as ProtspaceLegend;
  document.body.append(legend);
  await legend.updateComplete;

  return { data, legend, plot, controlBar };
}

describe('legend score strips', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('re-syncs the strips to the new projection when the control bar reports a projection change', async () => {
    const { legend, plot, controlBar } = await setup();

    const before = legend.shadowRoot!.querySelector('protspace-score-strip') as StripElement;
    expect(before.points.find((point) => point.category === 'A')?.value).toBe(0.5);

    // Mirrors what protspace-control-bar's applyProjectionSelection does in production:
    // it sets the scatterplot's index directly, then dispatches projection-change.
    plot.selectedProjectionIndex = 1;
    controlBar.dispatchEvent(
      new CustomEvent('projection-change', {
        detail: { projection: 'PCA 2' },
        bubbles: true,
        composed: true,
      }),
    );
    await legend.updateComplete;

    const after = legend.shadowRoot!.querySelector('protspace-score-strip') as StripElement;
    expect(after.points.find((point) => point.category === 'A')?.value).toBe(-0.3);
  });

  it('passes higherIsBetter=false to the Davies-Bouldin strip and true to the Silhouette strip', async () => {
    const { legend } = await setup();

    const strips = Array.from(
      legend.shadowRoot!.querySelectorAll('protspace-score-strip'),
    ) as StripElement[];
    const silhouette = strips.find((strip) => strip.label === 'Silhouette')!;
    const daviesBouldin = strips.find((strip) => strip.label === 'Davies-Bouldin')!;

    expect(silhouette.higherIsBetter).toBe(true);
    expect(daviesBouldin.higherIsBetter).toBe(false);
  });

  it('re-sorts by separation after a projection switch, not just a data resync', async () => {
    // _sortedLegendItems is only re-derived in updated() when _legendItems or
    // _categoryScores changes. A projection switch changes only the scores (same
    // two categories stay visible), so this is the one path that exercises the
    // `|| changedProperties.has('_categoryScores')` half of that guard. Silhouette
    // ranks A above B on UMAP 2 and B above A on PCA 2 (see makeData), so a stale
    // sort would still show the UMAP 2 order after switching.
    const { legend, plot, controlBar } = await setup();

    const internals = legend as unknown as {
      _dialogSettings: { annotationSortModes: Record<string, string> } & Record<string, unknown>;
      _handleSettingsSave: () => void;
    };
    internals._dialogSettings = {
      ...internals._dialogSettings,
      annotationSortModes: { family: 'silhouette-desc' },
    };
    internals._handleSettingsSave();
    // Same two-cycle wait legend.score-sync.test.ts documents: _handleSettingsSave
    // sets _legendItems; _sortedLegendItems only re-derives from it in the next
    // updated().
    await legend.updateComplete;
    await legend.updateComplete;

    const rowOrder = () =>
      [...legend.shadowRoot!.querySelectorAll('[data-value]')].map((row) =>
        row.getAttribute('data-value'),
      );
    // UMAP 2: A (0.5) outranks B (0.2).
    expect(rowOrder().indexOf('A')).toBeLessThan(rowOrder().indexOf('B'));

    plot.selectedProjectionIndex = 1;
    controlBar.dispatchEvent(
      new CustomEvent('projection-change', {
        detail: { projection: 'PCA 2' },
        bubbles: true,
        composed: true,
      }),
    );
    // Same two-cycle wait as above: _categoryScores changes in the first cycle,
    // and updated() only re-derives _sortedLegendItems from it in the next one.
    await legend.updateComplete;
    await legend.updateComplete;

    // PCA 2: B (-0.1) outranks A (-0.3) -- the ranking must invert, not stay stale.
    expect(rowOrder().indexOf('B')).toBeLessThan(rowOrder().indexOf('A'));
  });
});
