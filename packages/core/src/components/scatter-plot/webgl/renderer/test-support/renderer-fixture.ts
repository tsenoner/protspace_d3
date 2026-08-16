/**
 * Shared fixtures for the `WebGLRenderer` suites.
 *
 * These were copied verbatim into each renderer test file, so a `PlotData` or
 * `WebGLStyleGetters` shape change needed the same edit in each — and because
 * `type-check` skips `*.test.ts`, a missed copy only surfaced at runtime.
 */
import type { vi } from 'vitest';
import * as d3 from 'd3';
import type { PlotData } from '@protspace/utils';
import type { ScalePair, WebGLStyleGetters } from '../../types';
import type { RendererDegradedDetail } from '../../../scatter-plot.events';
import { WebGLRenderer } from '../webgl-renderer';
import { createMockCanvas, type MockGLOptions } from './mock-webgl2';

/**
 * A PlotData of `length` points backed by tiny arrays. The renderer only reads
 * xs/ys/proteinIds at staged slots, and capacity planning reads `length` alone,
 * so this exercises million-point geometry without allocating million-point data.
 */
export function plotData(length: number): PlotData {
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

function style(colors: string[] = ['#f00']): WebGLStyleGetters {
  return {
    getColors: () => colors,
    getPointSize: () => 9,
    getOpacity: () => 1,
    getDepth: () => 0,
    getShape: () => 'circle',
    isPredicted: () => false,
    // Storage-shaped in production; here, "does this fixture render pies".
    isMultilabel: () => colors.length > 1,
  };
}

export type MockGL = Record<string, ReturnType<typeof vi.fn>>;

/**
 * A renderer over a mock GL context, with the style getters supplied by the
 * caller — for suites whose getters change mid-session.
 */
export function makeRendererWithStyle(styleGetters: WebGLStyleGetters, opts: MockGLOptions = {}) {
  const { canvas, gl } = createMockCanvas(opts);
  const degraded: RendererDegradedDetail[] = [];
  const renderer = new WebGLRenderer(
    canvas,
    scales,
    () => d3.zoomIdentity,
    () => ({ width: 800, height: 600 }),
    styleGetters,
    undefined,
    () => [1, 1, 1],
    (detail) => degraded.push(detail),
  );
  return { renderer, gl: gl as unknown as MockGL, degraded };
}

export function makeRenderer(opts: MockGLOptions = {}, colors?: string[]) {
  return makeRendererWithStyle(style(colors), opts);
}
