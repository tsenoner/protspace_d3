## Why

The EAT reliability control could only ever say "hide below X", and the legend slider and the Filter query builder were meant to be two views of one condition but only agreed on a single hard-coded shape.

The control identified its condition by pattern-matching that shape at the top level of the query. Everything else was invisible to it — a different operator, a negated form, or anything nested in a group — so a change **appended** a second, contradictory condition instead of replacing the first, and the slider read 0% while the plot was heavily filtered. That shape is also the one the UI is least likely to produce: picking an eat-confidence column in the query builder creates a condition defaulting to `>`.

Two further defects made states the user could not escape: a query matching nothing was pushed as an _active_ filter, which the scatter plot reads as "hide everything"; and the mirror's de-dupe guard was a single shared scalar, so a change on one transferred annotation was compared against another's threshold.

## What Changes

- The control's condition is identified by **ownership of the eat-confidence column**, at any depth, tagged or not — so every operator mirrors, a hand-built condition is recognised rather than duplicated, and one restored from a bundle written before the tag existed still works.
- The control gains **three modes** — at least, at most, and a band — each expressed as a single un-negated condition carrying the N/A presence chip, so curated proteins stay visible in all three.
- The de-dupe guard is **keyed per eat-confidence column**, and switching the coloured-by annotation force-emits, because the control is otherwise still showing the previous base's position.
- A query matching nothing **clears** the filter channel instead of activating it.

## Capabilities

### New Capabilities

- `eat-reliability-filter`: how the EAT reliability control and the query builder express and share one filter.

## Impact

- **Stacked on #416** (`feat/improved_filtering`), which redefines `NOT` from a bare set complement to "has a value **and** does not match" and introduces presence chips plus the inclusive `gte`/`lte` operators. Every mode here is built on that model: the negated form this change originally used would hide curated points under the new `NOT`.
- **Frontend:** `packages/core/src/components/control-bar/{control-bar,query-types,query-owned,eat-reliability}.ts`, `packages/core/src/components/legend/legend.ts` + styles, `packages/utils/src/visualization/eat-overlay.ts`, `apps/web/src/explore/runtime.ts`.
- **Not included:** persisting the reliability _mode_ to bundle settings — a schema addition needing a migration story for bundles carrying only the legacy scalar.
- **Bundle format:** unchanged.
