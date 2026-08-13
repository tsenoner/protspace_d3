import { createNumericCondition } from './query-types';
import type { NumericCondition } from './query-types';
import { NA_VALUE, clamp01 } from '@protspace/utils';
import type { EatReliabilityState } from '@protspace/utils';

export type { EatReliabilityState };

/**
 * The EAT reliability filter's user-facing model, and its translation to and from
 * query conditions.
 *
 * ## Why every mode carries an N/A chip
 *
 * Curated proteins have no prediction, so they carry `null` in the eat-confidence
 * column and no comparison can match them. The presence chip is what keeps them
 * visible: `>= X` with `[NA_VALUE]` reads "reliable enough, **or** not an EAT
 * prediction at all". Every mode therefore states its intent directly, as one
 * un-negated condition:
 *
 *   at least X    ->  confidence >= X   or N/A
 *   at most  X    ->  confidence <= X   or N/A
 *   between A,B   ->  confidence between A and B (inclusive), or N/A
 *
 * The predecessor spelled the first of these `NOT(confidence < X)`, which worked
 * only because `NOT` was a bare index complement that happened to sweep nulls back
 * in. `NOT` now means "has a value AND does not match", so the negated form would
 * hide curated points instead — the exact opposite of what the control promises.
 */

/**
 * "Show everything." Emits no condition at all, so a fresh dataset — or a bundle
 * with no saved position — leaves the filter box clean, the contract the EAT e2e
 * asserts.
 */
export const DEFAULT_EAT_RELIABILITY: EatReliabilityState = { mode: 'atLeast', min: 0, max: 1 };

/**
 * `clamp01` with a defined result for non-finite input. The shared `clamp01` passes
 * `NaN` through, and a bound can arrive as `NaN` from an emptied number input.
 */
export const clampBound = (value: number): number => (Number.isFinite(value) ? clamp01(value) : 0);

/** The owned condition expressing `state`, or none when nothing is constrained. */
export function conditionsForReliability(
  annotation: string,
  state: EatReliabilityState,
): NumericCondition[] {
  const min = clampBound(state.min);
  const max = clampBound(state.max);
  const base = {
    annotation,
    owner: 'eat-reliability' as const,
    // Curated points carry no confidence score; this chip is what retains them.
    presence: [NA_VALUE],
  };

  switch (state.mode) {
    case 'atLeast':
      return min > 0 ? [createNumericCondition({ ...base, operator: 'gte', min })] : [];
    case 'atMost':
      return max < 1 ? [createNumericCondition({ ...base, operator: 'lte', max })] : [];
    case 'between':
      // `between` is inclusive on both ends, so a full-range band constrains nothing.
      return min > 0 || max < 1
        ? [createNumericCondition({ ...base, operator: 'between', min, max })]
        : [];
    default:
      return [];
  }
}

/**
 * Recover the control's position from the conditions it owns — the reverse mirror.
 * A shape it does not recognise degrades to whichever bound is present rather than
 * silently resetting to 0, which is what made a hand-built condition invisible.
 */
export function reliabilityFromConditions(
  conditions: readonly NumericCondition[],
): EatReliabilityState {
  for (const condition of conditions) {
    // A negated condition inverts which side is kept, so it cannot be read as if
    // it were the positive form.
    const negated = condition.logicalOp === 'NOT';
    switch (condition.operator) {
      case 'gte':
      case 'gt':
        if (condition.min !== null) {
          return negated
            ? { mode: 'atMost', min: 0, max: clampBound(condition.min) }
            : { mode: 'atLeast', min: clampBound(condition.min), max: 1 };
        }
        break;
      case 'lte':
      case 'lt':
        if (condition.max !== null) {
          return negated
            ? { mode: 'atLeast', min: clampBound(condition.max), max: 1 }
            : { mode: 'atMost', min: 0, max: clampBound(condition.max) };
        }
        break;
      case 'between':
        if (condition.min !== null && condition.max !== null) {
          return { mode: 'between', min: clampBound(condition.min), max: clampBound(condition.max) };
        }
        break;
    }
  }
  return DEFAULT_EAT_RELIABILITY;
}
