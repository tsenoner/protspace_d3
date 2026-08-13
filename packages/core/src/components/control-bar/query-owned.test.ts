import { describe, expect, it } from 'vitest';
import { createGroup, createNumericCondition, isFilterGroup } from './query-types';
import type { FilterQuery, NumericCondition } from './query-types';
import { findOwnedCondition, replaceOwnedConditions } from './query-owned';

const KEY = 'ec__eat_confidence';

function owned(overrides: Partial<NumericCondition> = {}): NumericCondition {
  return createNumericCondition({
    annotation: KEY,
    owner: 'eat-reliability',
    operator: 'lt',
    max: 0.5,
    logicalOp: 'NOT',
    ...overrides,
  });
}

describe('findOwnedCondition', () => {
  it('finds an owned condition whatever its operator', () => {
    for (const operator of ['gt', 'lt', 'between'] as const) {
      const query: FilterQuery = [owned({ operator })];
      expect(findOwnedCondition(query, 'eat-reliability', KEY)).toHaveLength(1);
    }
  });

  it('finds an owned condition nested inside a group', () => {
    const query: FilterQuery = [createGroup({ conditions: [owned()] })];
    expect(findOwnedCondition(query, 'eat-reliability', KEY)).toHaveLength(1);
  });

  it('finds every owned condition when the slider owns a two-sided band', () => {
    const query: FilterQuery = [
      owned({ operator: 'lt', max: 0.3 }),
      owned({ operator: 'gt', min: 0.9 }),
    ];
    expect(findOwnedCondition(query, 'eat-reliability', KEY)).toHaveLength(2);
  });

  it('claims an untagged condition on the same column, whatever its operator', () => {
    // This is the heart of #380: a condition the user hand-built in the query builder
    // carries no owner tag, and the eat-confidence column exists only to drive the
    // reliability filter — so the slider must recognise it rather than append a
    // second, contradictory condition beside it. `gt` matters most: it is what the
    // query builder produces by default when an eat-confidence column is picked.
    for (const operator of ['gt', 'lt', 'between'] as const) {
      const query: FilterQuery = [createNumericCondition({ annotation: KEY, operator, min: 0.5 })];
      expect(findOwnedCondition(query, 'eat-reliability', KEY)).toHaveLength(1);
    }
  });

  it('ignores an owned condition belonging to a different base annotation', () => {
    const query: FilterQuery = [owned({ annotation: 'go__eat_confidence' })];
    expect(findOwnedCondition(query, 'eat-reliability', KEY)).toHaveLength(0);
  });
});

describe('replaceOwnedConditions', () => {
  it('removes owned conditions at any depth and appends the replacements', () => {
    const untouched = createNumericCondition({ annotation: 'length', operator: 'gt', min: 10 });
    const query: FilterQuery = [untouched, createGroup({ conditions: [owned()] })];

    const next = replaceOwnedConditions(query, 'eat-reliability', KEY, [
      owned({ operator: 'gt', min: 0.8 }),
    ]);

    const flat = next.filter((i): i is NumericCondition => !isFilterGroup(i));
    expect(flat.some((c) => c.annotation === 'length')).toBe(true);
    expect(findOwnedCondition(next, 'eat-reliability', KEY)).toHaveLength(1);
    expect(findOwnedCondition(next, 'eat-reliability', KEY)[0]?.operator).toBe('gt');
  });

  it('drops the owned conditions entirely when given none', () => {
    const query: FilterQuery = [owned()];
    expect(
      findOwnedCondition(
        replaceOwnedConditions(query, 'eat-reliability', KEY, []),
        'eat-reliability',
        KEY,
      ),
    ).toHaveLength(0);
  });

  it('leaves another base annotation’s owned condition alone', () => {
    const other = owned({ annotation: 'go__eat_confidence' });
    const next = replaceOwnedConditions([other, owned()], 'eat-reliability', KEY, []);
    expect(findOwnedCondition(next, 'eat-reliability', 'go__eat_confidence')).toHaveLength(1);
  });

  it('prunes a group left empty so it cannot AND-kill the query', () => {
    const query: FilterQuery = [createGroup({ conditions: [owned()] })];
    const next = replaceOwnedConditions(query, 'eat-reliability', KEY, []);
    expect(next.filter(isFilterGroup)).toHaveLength(0);
  });

  // Stripping and re-appending at the top level turned `A OR <owned>` into
  // `A AND <owned>`: with the owned condition removed, `A` became first, and a first
  // item's leading operator is ignored, so the user's OR was silently dropped.
  it('keeps the connector of the condition it replaces', () => {
    const first = createNumericCondition({ annotation: 'length', operator: 'gt', min: 10 });
    const query: FilterQuery = [first, owned({ logicalOp: 'OR' })];

    const next = replaceOwnedConditions(query, 'eat-reliability', KEY, [
      owned({ operator: 'gte', min: 0.6, logicalOp: undefined }),
    ]);

    expect(next).toHaveLength(2);
    expect((next[1] as NumericCondition).logicalOp).toBe('OR');
    expect((next[1] as NumericCondition).operator).toBe('gte');
  });

  it('replaces a nested condition inside its group rather than hoisting it', () => {
    const query: FilterQuery = [createGroup({ conditions: [owned()] })];

    const next = replaceOwnedConditions(query, 'eat-reliability', KEY, [
      owned({ operator: 'gte', min: 0.6, logicalOp: undefined }),
    ]);

    const groups = next.filter(isFilterGroup);
    expect(groups).toHaveLength(1);
    expect(groups[0].conditions).toHaveLength(1);
    expect(next.filter((item) => !isFilterGroup(item))).toHaveLength(0);
  });

  // The control only ever emits positive conditions, so carrying a NOT across would
  // re-negate the mode the user just picked.
  it('does not carry a NOT onto the replacement', () => {
    const query: FilterQuery = [owned({ logicalOp: 'NOT' })];

    const next = replaceOwnedConditions(query, 'eat-reliability', KEY, [
      owned({ operator: 'gte', min: 0.6, logicalOp: undefined }),
    ]);

    expect((next[0] as NumericCondition).logicalOp).toBeUndefined();
  });
});
