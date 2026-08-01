/**
 * @vitest-environment jsdom
 *
 * Issue #343: the plot's existing point-count chip exposes whether the active
 * D3 view is zoomed in. The full transform remains non-reactive (F-48); only
 * crossings between identity and k > 1 schedule a Lit update for the marker.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
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
  requestUpdate(name?: PropertyKey, oldValue?: unknown): void;
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

function pointCountText(plot: ZoomIndicatorInternals): string {
  return (
    plot.shadowRoot?.querySelector('.plot-indicator')?.textContent?.replace(/\s+/g, ' ').trim() ??
    ''
  );
}

describe('scatterplot zoom indicator (#343)', () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it('shows only above identity and updates only when that boundary changes', async () => {
    const plot = document.createElement('protspace-scatterplot') as ZoomIndicatorInternals;
    // Avoid WebGL/controller startup; this test drives the real host bridge directly.
    plot.firstUpdated = () => {};
    plot.data = makeData();
    plot.selectedAnnotation = 'family';
    document.body.appendChild(plot);
    await plot.updateComplete;

    expect(pointCountText(plot)).not.toContain('Zoomed in');

    const host = plot._interactionHost();
    host.onTransform(d3.zoomIdentity.scale(2));
    await plot.updateComplete;
    expect(pointCountText(plot)).toContain('Zoomed in');

    const requestUpdate = vi.spyOn(plot, 'requestUpdate');
    host.onTransform(d3.zoomIdentity.scale(3));
    expect(requestUpdate).not.toHaveBeenCalled();

    host.onTransform(d3.zoomIdentity.translate(30, 20));
    await plot.updateComplete;
    expect(pointCountText(plot)).not.toContain('Zoomed in');

    host.onTransform(d3.zoomIdentity.scale(0.5));
    expect(requestUpdate).toHaveBeenCalledTimes(1);
    await plot.updateComplete;
    expect(pointCountText(plot)).not.toContain('Zoomed in');
  });
});
