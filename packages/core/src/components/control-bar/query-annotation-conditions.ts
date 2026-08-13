import type { FilterQuery, FilterQueryItem, NumericCondition } from './query-types';
import { isFilterGroup } from './query-types';

/**
 * Locating and replacing every numeric condition targeting one annotation column.
 *
 * The EAT reliability slider used to identify "its" condition by matching the shape
 * `NOT(<eatKey> < X)` on operator and logical op, at the top level only. That made
 * `>`, `between`, a non-negated `<`, and anything nested in a group invisible to it —
 * so a drag appended a second, contradictory condition instead of replacing the first
 * (#380). Matching on the column instead makes every operator recognisable, and
 * recursing makes depth irrelevant.
 *
 * Identity is the column, not a tag the control writes. An eat-confidence column
 * exists *only* to drive the reliability filter — the frontend synthesises it and
 * keeps it out of the colour-by dropdown — so a numeric condition on it is that
 * filter however it was built. A tag would have to be honoured for untagged
 * hand-built conditions anyway, which is precisely the bug this fixes, so it would
 * decide nothing.
 */

/** A numeric condition targeting `annotation`, at this level (groups are walked separately). */
function isConditionFor(item: FilterQueryItem, annotation: string): item is NumericCondition {
  return !isFilterGroup(item) && item.kind === 'numeric' && item.annotation === annotation;
}

/** Every numeric condition on `annotation`, at any depth, in document order. */
export function findConditionsForAnnotation(
  query: FilterQuery,
  annotation: string,
): NumericCondition[] {
  const found: NumericCondition[] = [];
  const walk = (items: readonly FilterQueryItem[]) => {
    for (const item of items) {
      if (isFilterGroup(item)) walk(item.conditions);
      else if (isConditionFor(item, annotation)) found.push(item);
    }
  };
  walk(query);
  return found;
}

/**
 * The first item of a list has no preceding sibling, so a leading `AND`/`OR` renders
 * blank in the builder while the data disagrees. `NOT` stays — it meaningfully
 * complements the first item. Mirrors `query-builder._clearLeadingOp`.
 */
function clearLeadingOp(items: FilterQueryItem[]): FilterQueryItem[] {
  const first = items[0];
  if (!first || (first.logicalOp !== 'AND' && first.logicalOp !== 'OR')) return items;
  return [{ ...first, logicalOp: undefined }, ...items.slice(1)];
}

/**
 * Substitute `next` for every numeric condition on `annotation`, at any depth.
 * Conditions on a DIFFERENT annotation, and every hand-built condition elsewhere,
 * are preserved untouched.
 *
 * Replacement happens IN PLACE — each condition keeps its slot, its group, and the
 * connector the surrounding query gave it. Stripping and re-appending at the top
 * level instead rewrote `A OR <condition>` into `A AND <condition>`: with the
 * condition gone, `A` became first, and a first item's leading operator is ignored,
 * so the `OR` the user wrote was silently dropped. A `NOT` on the replaced condition
 * is not carried over — the control only ever emits positive conditions, and
 * re-negating one would invert the mode the user just picked.
 *
 * Surplus replacements (more `next` than slots) are appended at the top level;
 * surplus existing conditions are dropped, which is how duplicates left by an older
 * build get swept up.
 *
 * A group left empty by the removal is pruned: `evaluateItems` treats an empty group
 * as match-all, but keeping a visibly empty group in the builder is confusing, and an
 * empty group is never something the user authored.
 */
export function replaceConditionsForAnnotation(
  query: FilterQuery,
  annotation: string,
  next: readonly NumericCondition[],
): FilterQuery {
  const pending = [...next];

  const rewrite = (items: readonly FilterQueryItem[]): FilterQueryItem[] => {
    const out: FilterQueryItem[] = [];
    for (const item of items) {
      if (isFilterGroup(item)) {
        const conditions = rewrite(item.conditions);
        if (conditions.length > 0) out.push({ ...item, conditions: clearLeadingOp(conditions) });
      } else if (isConditionFor(item, annotation)) {
        const replacement = pending.shift();
        if (replacement) {
          out.push(
            item.logicalOp === undefined || item.logicalOp === 'NOT'
              ? replacement
              : { ...replacement, logicalOp: item.logicalOp },
          );
        }
      } else {
        out.push(item);
      }
    }
    return out;
  };

  return clearLeadingOp([...rewrite(query), ...pending]);
}
