// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ProjectionStatisticRow, VisualizationData } from '@protspace/utils';
import './legend';
import type { ProtspaceLegend } from './legend';
import type { ScoreStripPoint } from './category-score-strip';

const STAT_BASE = {
  space_kind: 'projection' as const,
  space_name: 'UMAP 2',
  annotation: 'major_group',
  stat_family: 'annotation_validity' as const,
  label_kind: 'annotation',
  metric: 'silhouette',
  metric_kind: 'validity' as const,
};

const statRow = (over: Partial<ProjectionStatisticRow>): ProjectionStatisticRow => ({
  ...STAT_BASE,
  value: 0,
  ...over,
});

function makeData(extraRows: ProjectionStatisticRow[] = []): VisualizationData {
  return {
    protein_ids: ['p1', 'p2', 'p3', 'p4'],
    projections: [{ name: 'UMAP 2', dimension: 2, data: new Float32Array(8) }],
    annotations: {
      major_group: {
        kind: 'categorical',
        values: ['Elapidae', 'Viperidae'],
        colors: ['#ff0000', '#00ff00'],
        shapes: ['circle', 'circle'],
      },
    },
    annotation_data: {
      major_group: new Int32Array([0, 0, 1, 1]),
    },
    statisticsRows: [
      statRow({ category: 'Elapidae', value: 0.81 }),
      statRow({ category: 'Viperidae', value: -0.15 }),
      ...extraRows,
    ],
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
  highlighted: string | null;
  points: ScoreStripPoint[];
};

// The brief's original fixture drove a `legend.onDataChange(data, annotation, projection)`
// entry point that does not exist: `onDataChange` is a private closure field inside
// ScatterplotSyncController's constructor options (legend.ts:237), never assigned onto the
// element itself. The only way in is what legend.score-strips.test.ts already proved: a
// mock <protspace-scatterplot> the sync controller discovers by tag name.
async function setup(data: VisualizationData): Promise<ProtspaceLegend> {
  const plot = document.createElement('protspace-scatterplot') as MockScatterplot;
  Object.assign(plot, {
    data,
    selectedAnnotation: 'major_group',
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
  // by tag name (scatterplot-sync-controller.ts `_onScatterplotDiscovered`).
  document.body.append(document.createElement('protspace-control-bar'));

  const legend = document.createElement('protspace-legend') as ProtspaceLegend;
  document.body.append(legend);
  await legend.updateComplete;
  return legend;
}

describe('legend score strip synchronisation', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('marks the legend row when a dot is hovered', async () => {
    const legend = await setup(makeData());
    const strip = legend.shadowRoot!.querySelector('protspace-score-strip')!;

    strip.dispatchEvent(
      new CustomEvent('strip-hover', {
        detail: { category: 'Elapidae' },
        bubbles: true,
        composed: true,
      }),
    );
    await legend.updateComplete;

    const marked = legend.shadowRoot!.querySelectorAll('.legend-item-score-hover');
    expect(marked).toHaveLength(1);
    expect(marked[0].getAttribute('data-value')).toBe('Elapidae');
  });

  it('marks the dot when a legend row is hovered', async () => {
    const legend = await setup(makeData());
    const row = legend.shadowRoot!.querySelector('[data-value="Viperidae"]')!;

    row.dispatchEvent(new Event('mouseenter', { bubbles: false }));
    await legend.updateComplete;

    const strip = legend.shadowRoot!.querySelector('protspace-score-strip') as StripElement;
    expect(strip.highlighted).toBe('Viperidae');
  });

  it('clears the mark on pointer leave', async () => {
    const legend = await setup(makeData());
    const row = legend.shadowRoot!.querySelector('[data-value="Viperidae"]')!;

    row.dispatchEvent(new Event('mouseenter', { bubbles: false }));
    await legend.updateComplete;
    // Confirm the mark actually appeared, so this test cannot pass merely because
    // hovering never marked anything in the first place.
    expect(legend.shadowRoot!.querySelectorAll('.legend-item-score-hover')).toHaveLength(1);

    row.dispatchEvent(new Event('mouseleave', { bubbles: false }));
    await legend.updateComplete;

    expect(legend.shadowRoot!.querySelectorAll('.legend-item-score-hover')).toHaveLength(0);
  });

  it('still plots a category that has no legend row, in grey', async () => {
    // Scores are computed over the whole dataset, so a category swept into the
    // "Other" bucket must keep its dot or the distribution would be misstated.
    const legend = await setup(makeData([statRow({ category: 'NotInTheLegend', value: 0.4 })]));

    const strip = legend.shadowRoot!.querySelector('protspace-score-strip') as StripElement;
    expect(strip.points.find((point) => point.category === 'NotInTheLegend')?.color).toBe('#888');
  });

  it('toggles the category on a dot click, exactly like clicking its legend row', async () => {
    const legend = await setup(makeData());
    const strip = legend.shadowRoot!.querySelector('protspace-score-strip')!;
    expect(
      legend.shadowRoot!.querySelector('[data-value="Elapidae"]')!.classList.contains('hidden'),
    ).toBe(false);

    strip.dispatchEvent(
      new CustomEvent('strip-click', {
        detail: { category: 'Elapidae' },
        bubbles: true,
        composed: true,
      }),
    );
    // _handleItemClick sets _legendItems; _sortedLegendItems (what the template renders)
    // only re-derives from it in the *next* updated() cycle, so this needs two chained
    // awaits, same as the existing _highlightDroppedItem (legend.ts).
    await legend.updateComplete;
    await legend.updateComplete;

    expect(
      legend.shadowRoot!.querySelector('[data-value="Elapidae"]')!.classList.contains('hidden'),
    ).toBe(true);
  });

  it('is inert on click for a dot with no legend row (the "Other" bucket)', async () => {
    const legend = await setup(makeData([statRow({ category: 'NotInTheLegend', value: 0.4 })]));
    const strip = legend.shadowRoot!.querySelector('protspace-score-strip')!;
    const onItemClick = vi.fn();
    legend.addEventListener('legend-item-click', onItemClick);

    strip.dispatchEvent(
      new CustomEvent('strip-click', {
        detail: { category: 'NotInTheLegend' },
        bubbles: true,
        composed: true,
      }),
    );
    await legend.updateComplete;

    expect(onItemClick).not.toHaveBeenCalled();
  });
});
