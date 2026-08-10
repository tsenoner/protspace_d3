## 1. Own the condition instead of matching its shape

- [x] 1.1 Add a `ConditionOwner` tag and group-aware find/replace over conditions owned for a column.
- [x] 1.2 Treat an untagged numeric condition on an eat-confidence column as owned, so hand-built and restored conditions mirror.
- [x] 1.3 Replace the shape-matching helpers with an ownership lookup.

## 2. Three modes

- [x] 2.1 Model the filter as a mode plus bounds; translate each to one un-negated condition with the N/A presence chip.
- [x] 2.2 Respect the logical operator when reading the state back.
- [x] 2.3 Add the legend mode select and the band's second bound; reset the bound a mode no longer uses.
- [x] 2.4 Emit the full state from the legend and consume it in the runtime, keeping the scalar fallback.

## 3. Mirror and safety

- [x] 3.1 Key the de-dupe guard per eat-confidence column; force-emit on an annotation switch.
- [x] 3.2 Clear rather than activate the filter channel when a query matches nothing.

## 4. Verification

- [x] 4.1 `pnpm test:ci` core (1487) + utils (321); `pnpm format:check`; `knip` clean.
- [x] 4.2 Playwright `eat-visualization` — both scenarios, including #416's own "curated points stay visible" test.
- [ ] 4.3 Rebase onto `main` once #416 merges, then archive this change before the merge.
