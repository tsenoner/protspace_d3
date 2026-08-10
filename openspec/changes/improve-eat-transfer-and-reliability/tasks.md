## 1. Transfer scope (#393)

- [x] 1.1 Add `Rule.is_open`; an open rule matches every protein.
- [x] 1.2 Apply query-over-reference precedence only between two explicit rules, so an open rule never starves the other set.
- [x] 1.3 Keep the "explicit rule matched nothing" error, and give the open-rule case its own message.
- [x] 1.4 Update the CLI docstring, option help and the "nothing transferred" warning, which all assumed rules were required.
- [x] 1.5 Tests: open-rule classification, self-transfer end to end, query-only no longer a silent no-op, no self-sourced predictions.
- [x] 1.6 Verify on the 832-protein phosphatase fixture — reproduces the manuscript's 91.55% EC / 99.06% family held-out accuracy with no rules.

## 2. Reliability filter (#380)

- [x] 2.1 Add a `ConditionOwner` tag and group-aware find/replace over conditions owned for a column.
- [x] 2.2 Treat an untagged numeric condition on an eat-confidence column as owned, so hand-built and restored conditions mirror.
- [x] 2.3 Model the filter as a mode plus bounds; translate every mode to NOT-form conditions.
- [x] 2.4 Respect the logical operator when reading the state back — a bare `lt` is an upper bound, a negated one is a lower bound.
- [x] 2.5 Key the mirror's de-dupe guard per eat-confidence column; force-emit on an annotation switch.
- [x] 2.6 Clear rather than activate the filter channel when a query matches nothing.
- [x] 2.7 Add the legend mode select and the band's second bound; reset the bound a mode no longer uses.
- [x] 2.8 Emit the full state from the legend and consume it in the runtime, keeping the scalar fallback.
- [x] 2.9 Tests: all operators replaced not appended, group nesting, curated retained per mode, band from both sides, mode round-trip, layout at 320px.

## 3. Glyph outline (#369)

- [x] 3.1 Hoist the isotropic pixel scale so the ring and the outline share one definition.
- [x] 3.2 Measure the outline in device pixels instead of as a fraction of the sprite.
- [x] 3.3 Apply it to both filled dots and predicted rings; budget-cap it against ring width.
- [x] 3.4 Anti-alias the outline's inner edge.
- [x] 3.5 Rewrite the characterization assertion that pinned the outline being skipped on rings.

## 4. Verification

- [x] 4.1 `uv run pytest` (840 passed) + `uv run ruff check`.
- [x] 4.2 `pnpm test:ci` across core/utils/app; `pnpm format:check`; `pnpm precommit` on every commit.
- [x] 4.3 Playwright `eat-visualization` against the real phosphatase bundle — proves the shader compiles and the legend layout holds.
- [ ] 4.4 Archive this change before the merge (`/opsx:archive`).
