import type { ConditionOwner, FilterQuery, FilterQueryItem, NumericCondition } from './query-types';
import { isFilterGroup } from './query-types';

/**
 * Locating and replacing the conditions a dedicated control owns.
 *
 * The EAT reliability slider used to identify "its" condition by matching the shape
 * `NOT(<eatKey> < X)` on operator and logical op, at the top level only. That made
 * `>`, `between`, a non-negated `<`, and anything nested in a group invisible to it —
 * so a drag appended a second, contradictory condition instead of replacing the first
 * (#380). Matching on a declared owner instead makes every operator ownable, and
 * recursing makes depth irrelevant.
 */

/**
 * A numeric condition counts as owned when it targets the owning control's column and
 * carries either that owner's tag or no tag at all.
 *
 * Untagged counts deliberately. An eat-confidence column exists *only* to drive the
 * reliability filter — the frontend synthesises it and keeps it out of the colour-by
 * dropdown — so a condition on it is a reliability filter however it was built. If
 * ownership required the tag, a condition the user hand-built in the query builder
 * would stay invisible to the slider, which is the bug (#380), and a condition
 * restored from a bundle written before the tag existed would too.
 */
function isOwnedBy(
  item: FilterQueryItem,
  owner: ConditionOwner,
  annotation: string,
): item is NumericCondition {
  return (
    !isFilterGroup(item) &&
    item.kind === 'numeric' &&
    item.annotation === annotation &&
    (item.owner === owner || item.owner === undefined)
  );
}

/** Every condition `owner` owns for `annotation`, at any depth, in document order. */
export function findOwnedCondition(
  query: FilterQuery,
  owner: ConditionOwner,
  annotation: string,
): NumericCondition[] {
  const found: NumericCondition[] = [];
  const walk = (items: readonly FilterQueryItem[]) => {
    for (const item of items) {
      if (isFilterGroup(item)) walk(item.conditions);
      else if (isOwnedBy(item, owner, annotation)) found.push(item);
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
 * Substitute `next` for every condition `owner` owns for `annotation`, at any depth.
 * Conditions owned for a DIFFERENT annotation, and every hand-built condition, are
 * preserved untouched.
 *
 * Replacement happens IN PLACE — each owned condition keeps its slot, its group, and
 * the connector the surrounding query gave it. Stripping and re-appending at the top
 * level instead rewrote `A OR <owned>` into `A AND <owned>`: with the owned condition
 * gone, `A` became first, and a first item's leading operator is ignored, so the `OR`
 * the user wrote was silently dropped. A `NOT` on the replaced condition is not
 * carried over — the control only ever emits positive conditions, and re-negating one
 * would invert the mode the user just picked.
 *
 * Surplus replacements (more `next` than owned slots) are appended at the top level;
 * surplus owned conditions are dropped, which is how duplicates left by an older
 * build get swept up.
 *
 * A group left empty by the removal is pruned: `evaluateItems` treats an empty group
 * as match-all, but keeping a visibly empty group in the builder is confusing, and an
 * empty group is never something the user authored.
 */
export function replaceOwnedConditions(
  query: FilterQuery,
  owner: ConditionOwner,
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
      } else if (isOwnedBy(item, owner, annotation)) {
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
