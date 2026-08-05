/**
 * @vitest-environment jsdom
 *
 * Issue #343: the plot's existing point-count chip exposes whether the active
 * D3 view is zoomed in. The full transform remains non-reactive (F-48); only
 * crossings between identity and k > 1 schedule a Lit update for the marker.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as d3 from 'd3';
import type { VisualizationData } from '@protspace/utils';
import type { PlotInteractionHost } from './interaction/plot-interaction-controller';

vi.hoisted(() => {
  if (!('ResizeObserver' in globalThis)) {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null);
});

import './scatter-plot';

type ZoomIndicatorInternals = HTMLElement & {
  data: VisualizationData;
  selectedAnnotation: string;
  updateComplete: Promise<boolean>;
  firstUpdated(): void;
  _interactionHost(): PlotInteractionHost;
  _renderPlot(): void;
};

function makeData(): VisualizationData {
  return {
    protein_ids: ['p0'],
    projections: [{ name: 'umap', data: new Float32Array([0, 0]), dimension: 2 }],
    annotations: {
      family: {
        values: ['A'],
        colors: ['#ff0000'],
        shapes: ['circle'],
      },
    },
    annotation_data: { family: [[0]] },
  } as unknown as VisualizationData;
}

async function makePlot(): Promise<ZoomIndicatorInternals> {
  const plot = document.createElement('protspace-scatterplot') as ZoomIndicatorInternals;
  // Avoid WebGL/controller startup; these tests drive the real host bridge directly.
  plot.firstUpdated = () => {};
  plot.data = makeData();
  plot.selectedAnnotation = 'family';
  document.body.appendChild(plot);
  while (!(await plot.updateComplete)) {
    // Lit reports false while an update triggered by the previous cycle is pending.
  }
  return plot;
}

describe('scatterplot zoom indicator (#343)', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null);
  });

  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it('renders the point count and zoom label as spaced presentation items', async () => {
    const plot = await makePlot();
    const host = plot._interactionHost();
    host.onTransform(d3.zoomIdentity.scale(2));
    await plot.updateComplete;

    const chip = plot.shadowRoot?.querySelector('.plot-indicator');
    expect(chip?.querySelector('.point-count')?.textContent).toBe('1 points');
    expect(chip?.querySelector('.zoom-indicator')?.textContent).toBe('· Zoomed in');
    expect(Array.from(chip?.children ?? []).map((child) => child.className)).toEqual([
      'point-count',
      'zoom-indicator',
    ]);
  });

  it('schedules rendering only when the zoomed-in boundary changes', async () => {
    const plot = await makePlot();
    const host = plot._interactionHost();
    const renderPlot = vi.spyOn(plot, '_renderPlot').mockImplementation(() => {});

    host.onTransform(d3.zoomIdentity.scale(2));
    await plot.updateComplete;
    expect(renderPlot).toHaveBeenCalledTimes(1);

    renderPlot.mockClear();
    host.onTransform(d3.zoomIdentity.scale(3));
    await plot.updateComplete;
    expect(renderPlot).not.toHaveBeenCalled();

    host.onTransform(d3.zoomIdentity.translate(30, 20));
    await plot.updateComplete;
    expect(renderPlot).toHaveBeenCalledTimes(1);
    expect(plot.shadowRoot?.querySelector('.zoom-indicator')).toBeNull();

    renderPlot.mockClear();
    host.onTransform(d3.zoomIdentity.scale(0.5));
    await plot.updateComplete;
    expect(renderPlot).not.toHaveBeenCalled();
  });
});
