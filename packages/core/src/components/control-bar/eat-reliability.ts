import { createNumericCondition } from './query-types';
import type { NumericCondition } from './query-types';
import type { EatReliabilityState } from '@protspace/utils';

export type { EatReliabilityState };

/**
 * The EAT reliability filter's user-facing model, and its translation to and from
 * query conditions.
 *
 * ## Why every mode is a NOT
 *
 * `matchesNumericValue` returns false for a null value, and curated proteins carry
 * null in the eat-confidence column because they have no prediction to score. Only
 * the `NOT` index-complement in `query-evaluate.ts` puts them back. So a positive
 * `confidence > X` hides the entire curated background — typically most of the
 * dataset — which is the opposite of what the slider promises ("curated annotations
 * always stay visible").
 *
 * Expressing all three modes as NOT-complements makes that promise true by
 * construction, in every mode, without touching the evaluator's null semantics —
 * which are deliberate and locked by characterization tests in query-evaluate.test.ts.
 *
 *   at least X    ->  NOT(conf < X)                    (the shape shipped bundles carry)
 *   at most  X    ->  NOT(conf > X)
 *   between A,B   ->  NOT(conf < A) AND NOT(conf > B)
 *
 * A band needs two conditions rather than one `between`: `NOT(between(a,b))` is the
 * band's *complement*, the inverse of what the control means.
 */

/**
 * "Show everything." Emits no condition at all, so a fresh dataset — or a bundle with
 * no saved position — leaves the filter box clean, the contract the EAT e2e asserts.
 */
export const DEFAULT_EAT_RELIABILITY: EatReliabilityState = { mode: 'atLeast', min: 0, max: 1 };

const clamp01 = (value: number): number =>
  Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;

function lowerBound(annotation: string, min: number): NumericCondition {
  return createNumericCondition({
    annotation,
    owner: 'eat-reliability',
    operator: 'lt',
    max: min,
    logicalOp: 'NOT',
  });
}

function upperBound(annotation: string, max: number): NumericCondition {
  return createNumericCondition({
    annotation,
    owner: 'eat-reliability',
    operator: 'gt',
    min: max,
    logicalOp: 'NOT',
  });
}

/** The owned conditions expressing `state`. Empty when nothing is constrained. */
export function conditionsForReliability(
  annotation: string,
  state: EatReliabilityState,
): NumericCondition[] {
  const min = clamp01(state.min);
  const max = clamp01(state.max);
  const conditions: NumericCondition[] = [];
  if (state.mode !== 'atMost' && min > 0) conditions.push(lowerBound(annotation, min));
  if (state.mode !== 'atLeast' && max < 1) conditions.push(upperBound(annotation, max));
  return conditions;
}

/**
 * Recover the slider position from the conditions it owns — the reverse mirror.
 * Unrecognised or partial sets degrade to whichever bounds are present rather than
 * silently resetting to 0, which is what made a hand-built condition invisible.
 */
export function reliabilityFromConditions(
  conditions: readonly NumericCondition[],
): EatReliabilityState {
  let min = 0;
  let max = 1;
  let hasLower = false;
  let hasUpper = false;

  for (const condition of conditions) {
    // The logical op flips which side of the bound is kept, so it cannot be ignored:
    // `NOT(conf < X)` keeps confidence AT OR ABOVE X (a lower bound), while a bare
    // `conf < X` keeps confidence BELOW X (an upper bound) — opposite meanings from
    // the same operator. Reading a bare `lt` as a lower bound made the slider believe
    // a hand-built condition already said what it was about to write, so it skipped
    // the replacement and left the contradiction in place.
    const negated = condition.logicalOp === 'NOT';
    if (condition.operator === 'lt' && condition.max !== null) {
      if (negated) {
        min = clamp01(condition.max);
        hasLower = true;
      } else {
        max = clamp01(condition.max);
        hasUpper = true;
      }
    } else if (condition.operator === 'gt' && condition.min !== null) {
      if (negated) {
        max = clamp01(condition.min);
        hasUpper = true;
      } else {
        min = clamp01(condition.min);
        hasLower = true;
      }
    } else if (condition.operator === 'between') {
      // A hand-built band the user tagged onto this column; read both bounds.
      if (condition.min !== null) {
        min = clamp01(condition.min);
        hasLower = true;
      }
      if (condition.max !== null) {
        max = clamp01(condition.max);
        hasUpper = true;
      }
    }
  }

  if (hasLower && hasUpper) return { mode: 'between', min, max };
  if (hasUpper) return { mode: 'atMost', min: 0, max };
  if (hasLower) return { mode: 'atLeast', min, max: 1 };
  return DEFAULT_EAT_RELIABILITY;
}
