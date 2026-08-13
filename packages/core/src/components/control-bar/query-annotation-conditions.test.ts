import { describe, expect, it } from 'vitest';
import { createGroup, createNumericCondition, isFilterGroup } from './query-types';
import type { FilterQuery, NumericCondition } from './query-types';
import {
  findConditionsForAnnotation,
  replaceConditionsForAnnotation,
} from './query-annotation-conditions';

const KEY = 'ec__eat_confidence';

/** A reliability-shaped condition on the eat-confidence column. */
function onKey(overrides: Partial<NumericCondition> = {}): NumericCondition {
  return createNumericCondition({
    annotation: KEY,
    operator: 'lt',
    max: 0.5,
    logicalOp: 'NOT',
    ...overrides,
  });
}

describe('findConditionsForAnnotation', () => {
  it('finds a condition whatever its operator', () => {
    for (const operator of ['gt', 'lt', 'between'] as const) {
      const query: FilterQuery = [onKey({ operator })];
      expect(findConditionsForAnnotation(query, KEY)).toHaveLength(1);
    }
  });

  it('finds a condition nested inside a group', () => {
    const query: FilterQuery = [createGroup({ conditions: [onKey()] })];
    expect(findConditionsForAnnotation(query, KEY)).toHaveLength(1);
  });

  it('finds every condition when the column carries a two-sided band', () => {
    const query: FilterQuery = [
      onKey({ operator: 'lt', max: 0.3 }),
      onKey({ operator: 'gt', min: 0.9 }),
    ];
    expect(findConditionsForAnnotation(query, KEY)).toHaveLength(2);
  });

  it('claims a hand-built condition on the same column, whatever its operator', () => {
    // This is the heart of #380: the eat-confidence column exists only to drive the
    // reliability filter, so a condition the user hand-built in the query builder IS
    // that filter — the slider must recognise it rather than append a second,
    // contradictory condition beside it. `gt` matters most: it is what the query
    // builder produces by default when an eat-confidence column is picked.
    for (const operator of ['gt', 'lt', 'between'] as const) {
      const query: FilterQuery = [createNumericCondition({ annotation: KEY, operator, min: 0.5 })];
      expect(findConditionsForAnnotation(query, KEY)).toHaveLength(1);
    }
  });

  it('ignores a condition belonging to a different base annotation', () => {
    const query: FilterQuery = [onKey({ annotation: 'go__eat_confidence' })];
    expect(findConditionsForAnnotation(query, KEY)).toHaveLength(0);
  });
});

describe('replaceConditionsForAnnotation', () => {
  it('replaces conditions at any depth', () => {
    const untouched = createNumericCondition({ annotation: 'length', operator: 'gt', min: 10 });
    const query: FilterQuery = [untouched, createGroup({ conditions: [onKey()] })];

    const next = replaceConditionsForAnnotation(query, KEY, [onKey({ operator: 'gt', min: 0.8 })]);

    const flat = next.filter((i): i is NumericCondition => !isFilterGroup(i));
    expect(flat.some((c) => c.annotation === 'length')).toBe(true);
    expect(findConditionsForAnnotation(next, KEY)).toHaveLength(1);
    expect(findConditionsForAnnotation(next, KEY)[0]?.operator).toBe('gt');
  });

  it('drops the column’s conditions entirely when given none', () => {
    const query: FilterQuery = [onKey()];
    expect(
      findConditionsForAnnotation(replaceConditionsForAnnotation(query, KEY, []), KEY),
    ).toHaveLength(0);
  });

  it('leaves another base annotation’s condition alone', () => {
    const other = onKey({ annotation: 'go__eat_confidence' });
    const next = replaceConditionsForAnnotation([other, onKey()], KEY, []);
    expect(findConditionsForAnnotation(next, 'go__eat_confidence')).toHaveLength(1);
  });

  it('prunes a group left empty so it cannot AND-kill the query', () => {
    const query: FilterQuery = [createGroup({ conditions: [onKey()] })];
    const next = replaceConditionsForAnnotation(query, KEY, []);
    expect(next.filter(isFilterGroup)).toHaveLength(0);
  });

  // Stripping and re-appending at the top level turned `A OR <cond>` into
  // `A AND <cond>`: with the condition removed, `A` became first, and a first
  // item's leading operator is ignored, so the user's OR was silently dropped.
  it('keeps the connector of the condition it replaces', () => {
    const first = createNumericCondition({ annotation: 'length', operator: 'gt', min: 10 });
    const query: FilterQuery = [first, onKey({ logicalOp: 'OR' })];

    const next = replaceConditionsForAnnotation(query, KEY, [
      onKey({ operator: 'gte', min: 0.6, logicalOp: undefined }),
    ]);

    expect(next).toHaveLength(2);
    expect((next[1] as NumericCondition).logicalOp).toBe('OR');
    expect((next[1] as NumericCondition).operator).toBe('gte');
  });

  it('replaces a nested condition inside its group rather than hoisting it', () => {
    const query: FilterQuery = [createGroup({ conditions: [onKey()] })];

    const next = replaceConditionsForAnnotation(query, KEY, [
      onKey({ operator: 'gte', min: 0.6, logicalOp: undefined }),
    ]);

    const groups = next.filter(isFilterGroup);
    expect(groups).toHaveLength(1);
    expect(groups[0].conditions).toHaveLength(1);
    expect(next.filter((item) => !isFilterGroup(item))).toHaveLength(0);
  });

  // The control only ever emits positive conditions, so carrying a NOT across would
  // re-negate the mode the user just picked.
  it('does not carry a NOT onto the replacement', () => {
    const query: FilterQuery = [onKey({ logicalOp: 'NOT' })];

    const next = replaceConditionsForAnnotation(query, KEY, [
      onKey({ operator: 'gte', min: 0.6, logicalOp: undefined }),
    ]);

    expect((next[0] as NumericCondition).logicalOp).toBeUndefined();
  });
});
