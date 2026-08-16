// @vitest-environment jsdom
/**
 * What the renderer actually draws, and what it uploads.
 *
 * The clamp used to cut at 1,000,000 — silently, by array position, while the UI
 * went on reporting the full count. It is still there (an embedder can assign
 * `.data` directly, bypassing the loader) but it now sits at the loader's own
 * cap, so nothing a user can load reaches it.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import * as d3 from 'd3';
import { WebGLRenderer } from './webgl-renderer';
import { MAX_RENDERABLE_POINTS } from '../types';
import type { PlotData } from '@protspace/utils';
import type { ScalePair, WebGLStyleGetters } from '../types';
import { createMockCanvas } from './test-support/mock-webgl2';

/**
 * A PlotData of `length` points backed by tiny arrays. Capacity planning and the
 * clamp both read `length`; the staging loops read xs/ys/proteinIds at the slots
 * they visit, and reading past the end yields undefined rather than throwing.
 */
function plotData(length: number): PlotData {
  return {
    length,
    xs: new Float32Array(length),
    ys: new Float32Array(length),
    zs: null,
    originalIndices: null,
    proteinIds: new Array(length).fill('p'),
  };
}

const scales = (): ScalePair => ({
  x: d3.scaleLinear().domain([0, 1]).range([0, 800]),
  y: d3.scaleLinear().domain([0, 1]).range([0, 600]),
});

const style = (): WebGLStyleGetters => ({
  getColors: () => ['#f00'],
  getPointSize: () => 9,
  getOpacity: () => 1,
  getDepth: () => 0,
  getShape: () => 'circle',
  isPredicted: () => false,
});

function makeRenderer() {
  const { canvas, gl } = createMockCanvas({ maxTextureSize: 8192 });
  const renderer = new WebGLRenderer(
    canvas,
    scales,
    () => d3.zoomIdentity,
    () => ({ width: 800, height: 600 }),
    style(),
  );
  return { renderer, gl: gl as unknown as Record<string, ReturnType<typeof vi.fn>> };
}

describe('WebGLRenderer draw count', () => {
  afterEach(() => vi.restoreAllMocks());

  it('draws every point of a dataset the loader would admit', () => {
    const { renderer } = makeRenderer();
    renderer.render(plotData(1_500_000));
    // Above the old 1,000,000 threshold, where the renderer used to draw half.
    expect(renderer.drawnPointCount).toBe(1_500_000);
  });

  it('draws every point at exactly the cap', () => {
    const { renderer } = makeRenderer();
    renderer.render(plotData(MAX_RENDERABLE_POINTS));
    expect(renderer.drawnPointCount).toBe(MAX_RENDERABLE_POINTS);
  });

  it('still clamps beyond the cap, and the shortfall is observable', () => {
    // Only reachable by an embedder assigning `.data` directly. The point of the
    // accessor is that this state can be seen at all.
    const { renderer } = makeRenderer();
    const overCap = MAX_RENDERABLE_POINTS + 500_000;
    renderer.render(plotData(overCap));
    expect(renderer.drawnPointCount).toBe(MAX_RENDERABLE_POINTS);
    expect(renderer.drawnPointCount).toBeLessThan(overCap);
  });
});

describe('WebGLRenderer upload accounting', () => {
  afterEach(() => vi.restoreAllMocks());

  it('uploads nothing when neither the data nor the styling changed', () => {
    // This is the #456 fix stated as an invariant: a repeat render of the SAME
    // object — which is what a camera move now produces at every dataset size —
    // must not touch the GPU's buffers.
    const { renderer } = makeRenderer();
    const pd = plotData(50_000);

    renderer.render(pd);
    const afterFirst = renderer.uploadedBytesTotal;
    expect(afterFirst).toBeGreaterThan(0);

    renderer.render(pd);
    renderer.render(pd);
    expect(renderer.uploadedBytesTotal).toBe(afterFirst);
  });

  it('uploads again when the styling really does change', () => {
    const { renderer } = makeRenderer();
    const pd = plotData(50_000);
    renderer.render(pd);
    const afterFirst = renderer.uploadedBytesTotal;

    renderer.invalidateStyleCache();
    renderer.render(pd);
    expect(renderer.uploadedBytesTotal).toBeGreaterThan(afterFirst);
  });
});

describe('WebGLRenderer capacity shrink', () => {
  afterEach(() => vi.restoreAllMocks());

  it('releases an outsized footprint when a much smaller dataset replaces it', () => {
    // Grow-only capacity was harmless while the clamp bounded it at 1,000,000.
    // At a 2,000,000 cap, "load 2M then open the 5K demo" would hold the larger
    // footprint for the session and re-upload a capacity-sized atlas on every
    // restage. The bytes counter is the observable proxy for the footprint.
    const { renderer } = makeRenderer();
    renderer.render(plotData(400_000));
    const afterLarge = renderer.uploadedBytesTotal;

    renderer.render(plotData(5_000));
    const smallUpload = renderer.uploadedBytesTotal - afterLarge;

    // A reallocation happened (so bytes moved) and it was far smaller than the
    // large load, i.e. sized to the new data rather than to the old capacity.
    expect(smallUpload).toBeGreaterThan(0);
    expect(smallUpload).toBeLessThan(afterLarge / 4);
  });

  it('does not thrash on an ordinary dataset switch', () => {
    // Within 4x, capacity is retained: the second load must reuse the buffers
    // rather than reallocate them.
    const { renderer, gl } = makeRenderer();
    renderer.render(plotData(400_000));
    const bufferDataCalls = gl.bufferData.mock.calls.length;

    renderer.render(plotData(200_000));
    expect(gl.bufferData.mock.calls.length).toBe(bufferDataCalls);
  });
});
