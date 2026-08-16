import type { PlotDataPoint } from '@protspace/utils';

// ScalePair is owned by @protspace/utils (data-processor `createScales`); re-export
// it here so webgl code importing `ScalePair` from this module still resolves.
export type { ScalePair } from '@protspace/utils';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface WebGLStyleGetters {
  getColors: (point: PlotDataPoint) => string[];
  getPointSize: (point: PlotDataPoint) => number;
  getOpacity: (point: PlotDataPoint) => number;
  getDepth: (point: PlotDataPoint) => number;
  getShape: (point: PlotDataPoint) => string;
  isPredicted: (point: PlotDataPoint) => boolean;
}

/**
 * Framebuffer resources for offscreen rendering
 */
export interface FramebufferResources {
  framebuffer: WebGLFramebuffer;
  texture: WebGLTexture;
  depthBuffer: WebGLRenderbuffer;
  width: number;
  height: number;
}

/** Attribute locations for the point shader program. */
export interface PointAttribLocations {
  dataPosition: number;
  size: number;
  color: number;
  depth: number;
  labelCount: number;
  shape: number;
  predicted: number;
}

/** Uniform locations for the point shader program. */
export interface PointUniformLocations {
  resolution: WebGLUniformLocation | null;
  transform: WebGLUniformLocation | null;
  dpr: WebGLUniformLocation | null;
  gamma: WebGLUniformLocation | null;
  knockoutColor: WebGLUniformLocation | null;
  labelColors: WebGLUniformLocation | null;
  labelTextureSize: WebGLUniformLocation | null;
  maxLabels: WebGLUniformLocation | null;
  /** Points the label atlas covers; 0 disables the multi-label branch entirely. */
  labelAtlasCapacity: WebGLUniformLocation | null;
}

// ============================================================================
// Configuration Constants
// ============================================================================

/**
 * Last-resort staging clamp, equal to the loader's per-projection cap.
 *
 * Because `projections_data` is long-format — one row per (protein x projection)
 * — the loader's row cap bounds proteins-per-projection for any projection count,
 * so this is unreachable through any file a user can load. It exists only because
 * a `@protspace/core` embedder can assign `.data` directly, bypassing validation.
 *
 * It was 1_000_000, and doubled as the viewport-culling threshold. That aliasing
 * is what made the renderer degrade ~850x at exactly the largest two-projection
 * dataset the loader would accept (#456).
 */
export { MAX_POINTS_PER_PROJECTION as MAX_RENDERABLE_POINTS } from '../../../utils/limits';

/** Default gamma value (standard sRGB) */
export const DEFAULT_GAMMA = 2.2;
