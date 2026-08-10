import { describe, expect, it } from 'vitest';
import {
  DEFAULT_EAT_RELIABILITY,
  conditionsForReliability,
  reliabilityFromConditions,
} from './eat-reliability';
import type { EatReliabilityState } from './eat-reliability';

const KEY = 'ec__eat_confidence';

describe('conditionsForReliability', () => {
  it('emits nothing at the default, so a fresh dataset has a clean filter box', () => {
    expect(conditionsForReliability(KEY, DEFAULT_EAT_RELIABILITY)).toEqual([]);
  });

  it('expresses every mode as a NOT, so curated points are retained by construction', () => {
    const states: EatReliabilityState[] = [
      { mode: 'atLeast', min: 0.3, max: 1 },
      { mode: 'atMost', min: 0, max: 0.7 },
      { mode: 'between', min: 0.3, max: 0.7 },
    ];
    for (const state of states) {
      const conditions = conditionsForReliability(KEY, state);
      expect(conditions.length).toBeGreaterThan(0);
      // A positive operator would exclude null-confidence (curated) proteins; only the
      // NOT index-complement re-includes them. See query-numeric-helpers.ts.
      expect(conditions.every((c) => c.logicalOp === 'NOT')).toBe(true);
      expect(conditions.every((c) => c.owner === 'eat-reliability')).toBe(true);
      expect(conditions.every((c) => c.annotation === KEY)).toBe(true);
    }
  });

  it('keeps "at least" on the shape the shipped bundles already carry', () => {
    const [condition] = conditionsForReliability(KEY, { mode: 'atLeast', min: 0.4, max: 1 });
    expect(condition).toMatchObject({ operator: 'lt', max: 0.4, logicalOp: 'NOT' });
  });

  it('uses a single upper-bound condition for "at most"', () => {
    const [condition] = conditionsForReliability(KEY, { mode: 'atMost', min: 0, max: 0.6 });
    expect(condition).toMatchObject({ operator: 'gt', min: 0.6, logicalOp: 'NOT' });
  });

  it('uses two conditions for a band, not a single between()', () => {
    // NOT(between(a,b)) is the band's complement — the inverse of what the slider means.
    const conditions = conditionsForReliability(KEY, { mode: 'between', min: 0.3, max: 0.7 });
    expect(conditions).toHaveLength(2);
    expect(conditions.map((c) => c.operator).sort()).toEqual(['gt', 'lt']);
  });

  it('omits a bound that is not constraining', () => {
    expect(conditionsForReliability(KEY, { mode: 'between', min: 0, max: 1 })).toHaveLength(0);
    expect(conditionsForReliability(KEY, { mode: 'between', min: 0.5, max: 1 })).toHaveLength(1);
  });
});

describe('reliabilityFromConditions', () => {
  it('round-trips every mode', () => {
    const states: EatReliabilityState[] = [
      { mode: 'atLeast', min: 0.3, max: 1 },
      { mode: 'atMost', min: 0, max: 0.7 },
      { mode: 'between', min: 0.25, max: 0.75 },
    ];
    for (const state of states) {
      expect(reliabilityFromConditions(conditionsForReliability(KEY, state))).toEqual(state);
    }
  });

  it('reads no conditions as the default', () => {
    expect(reliabilityFromConditions([])).toEqual(DEFAULT_EAT_RELIABILITY);
  });
});

describe('reliabilityFromConditions — the logical op flips the bound', () => {
  it('reads NOT(conf < X) as a lower bound but a bare conf < X as an upper bound', () => {
    const negated = reliabilityFromConditions([
      {
        id: 'a',
        kind: 'numeric',
        annotation: KEY,
        operator: 'lt',
        min: null,
        max: 0.5,
        logicalOp: 'NOT',
      },
    ]);
    expect(negated).toEqual({ mode: 'atLeast', min: 0.5, max: 1 });

    const bare = reliabilityFromConditions([
      { id: 'b', kind: 'numeric', annotation: KEY, operator: 'lt', min: null, max: 0.5 },
    ]);
    expect(bare).toEqual({ mode: 'atMost', min: 0, max: 0.5 });
  });

  it('reads NOT(conf > X) as an upper bound but a bare conf > X as a lower bound', () => {
    const negated = reliabilityFromConditions([
      {
        id: 'a',
        kind: 'numeric',
        annotation: KEY,
        operator: 'gt',
        min: 0.5,
        max: null,
        logicalOp: 'NOT',
      },
    ]);
    expect(negated).toEqual({ mode: 'atMost', min: 0, max: 0.5 });

    const bare = reliabilityFromConditions([
      { id: 'b', kind: 'numeric', annotation: KEY, operator: 'gt', min: 0.5, max: null },
    ]);
    expect(bare).toEqual({ mode: 'atLeast', min: 0.5, max: 1 });
  });
});
