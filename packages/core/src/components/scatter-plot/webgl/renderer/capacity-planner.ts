/**
 * Plan the next renderer buffer capacity.
 *
 * - At least `minCapacityFloor` (MIN_CAPACITY).
 * - Across reloads (currentCapacity > 0), grow geometrically by 1.5x so progressively larger
 *   datasets don't trigger a reallocation every time.
 * - Rounded UP to a whole `capacityGranularity` block, so SoA arrays aren't oversized to the next
 *   power of two (which wasted ~83% at 573K) and the label atlas has no partial-row waste at its
 *   narrowest supported width.
 * - Bounded by `maxCapacity`, the largest point count the renderer will ever draw. Without this
 *   the 1.5x growth allocates for points that can never be rendered — and, because the label
 *   atlas is sized from capacity, pushes its height past `gl.MAX_TEXTURE_SIZE` at point counts
 *   well under the cap (900k then 950k used to plan 1,350,144).
 *
 * The bound never starves a load: it is floored at the snapped requirement, so asking for more
 * than `maxCapacity` still returns enough capacity for the request.
 */
export function planRendererCapacity(
  minCapacity: number,
  currentCapacity: number,
  minCapacityFloor: number,
  capacityGranularity: number,
  maxCapacity: number = Number.POSITIVE_INFINITY,
): number {
  const snap = (value: number) => Math.ceil(value / capacityGranularity) * capacityGranularity;
  const required = Math.max(minCapacity, minCapacityFloor);
  const target =
    currentCapacity > 0 ? Math.max(required, Math.ceil(currentCapacity * 1.5)) : required;
  return Math.min(snap(target), Math.max(snap(required), snap(maxCapacity)));
}
