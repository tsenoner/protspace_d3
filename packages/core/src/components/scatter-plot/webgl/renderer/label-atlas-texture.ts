/**
 * GL-side companion to {@link ./label-atlas-plan}.
 *
 * `label-atlas-plan.ts` owns the *geometry* of the multi-label colour atlas and
 * is deliberately GL-free. This module owns everything that has to touch a
 * context to act on that geometry: reading the device limit, draining the error
 * flag, and allocating/refreshing the texture itself.
 *
 * Both live (`webgl-renderer.ts`) and export (`export-renderer.ts`) paths go
 * through here, for the same reason the plan is shared — the two contexts must
 * not drift on placeholder format, filter mode, or failure handling.
 */

import { MIN_MAX_TEXTURE_SIZE, type LabelAtlasPlan } from './label-atlas-plan';

/**
 * The single opaque texel uploaded whenever no atlas is in play.
 *
 * It keeps the sampler texture-complete and is never read: the shader's
 * `u_labelAtlasCapacity` is 0 in exactly these cases, so the pie branch is
 * unreachable. Module-level because it is immutable and uploaded by value.
 */
const PLACEHOLDER_TEXEL = new Uint8Array([0, 0, 0, 255]);

/**
 * Read `gl.MAX_TEXTURE_SIZE`, falling back to the WebGL2 specification floor if
 * the driver returns something unusable. Costs a synchronous round-trip, so
 * callers cache it per context rather than re-asking per allocation.
 */
export function readMaxTextureSize(gl: WebGL2RenderingContext): number {
  return sanitizeMaxTextureSize(gl.getParameter(gl.MAX_TEXTURE_SIZE));
}

/**
 * Coerce a reported or host-supplied texture limit to a usable number. Shared
 * with the export path, which receives the live context's limit as a plain
 * number rather than reading it itself.
 */
export function sanitizeMaxTextureSize(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 1
    ? value
    : MIN_MAX_TEXTURE_SIZE;
}

/**
 * Clear the GL error flag.
 *
 * The flag is sticky and context-wide: nothing else in the renderer drains it,
 * so without this an allocation check reports the first error raised anywhere in
 * the context's lifetime and misattributes it to the call being checked. Draining
 * immediately before an allocating call is what makes the check after it mean
 * "this call failed".
 */
export function drainGlErrors(gl: WebGL2RenderingContext): void {
  // Bounded in practice: drivers keep a short error queue and return NO_ERROR
  // once it is empty.
  while (gl.getError() !== gl.NO_ERROR) {
    /* discard */
  }
}

/** Upload the 1x1 placeholder into the currently bound TEXTURE_2D. */
export function uploadPlaceholderAtlas(gl: WebGL2RenderingContext): void {
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, PLACEHOLDER_TEXEL);
  setAtlasFiltering(gl);
}

/**
 * Allocate atlas storage in the currently bound TEXTURE_2D and report whether
 * the driver accepted it.
 *
 * An over-size or out-of-memory `texImage2D` raises a GL error rather than
 * throwing, so the return value is the only signal: callers must not record the
 * texture as initialised unless it is `gl.NO_ERROR`. Returns the raw GL error
 * code so the caller can distinguish `OUT_OF_MEMORY` from `INVALID_VALUE`
 * without this module knowing anything about how that is surfaced.
 */
export function allocateLabelAtlas(
  gl: WebGL2RenderingContext,
  plan: LabelAtlasPlan,
  texels: Uint8Array,
): number {
  drainGlErrors(gl);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA8,
    plan.width,
    plan.height,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    texels,
  );
  const error = gl.getError();
  if (error === gl.NO_ERROR) setAtlasFiltering(gl);
  return error;
}

/**
 * Refresh already-allocated atlas storage in place, uploading only the rows the
 * drawn points actually occupy.
 *
 * Storage is sized from *capacity*, which overshoots the drawn count after a
 * geometric grow, and this runs on every recolour — so uploading `plan.height`
 * rows would push megabytes of never-sampled texels per legend click.
 */
export function refreshLabelAtlas(
  gl: WebGL2RenderingContext,
  plan: LabelAtlasPlan,
  texels: Uint8Array,
  pointCount: number,
): void {
  const rows = Math.min(plan.height, Math.ceil((pointCount * plan.stride) / plan.width));
  if (rows < 1) return;
  gl.texSubImage2D(
    gl.TEXTURE_2D,
    0,
    0,
    0,
    plan.width,
    rows,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    texels.subarray(0, rows * plan.width * 4),
  );
}

/** NEAREST in both directions: the atlas is a lookup table, never interpolated. */
function setAtlasFiltering(gl: WebGL2RenderingContext): void {
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
}
