## Why

The Nature Methods submission builds its case on EAT being an _operation_ a biologist runs, not a static overlay — "function transferred in, candidate curation errors surfaced out"
(`protspace_publication/nm_2026/story/STORY_v2_nature_methods.md:9`). Three shipped gaps sit between that claim and the tool:

- **Running EAT at all required a marker column (#393).** An empty `Rule` matched nothing, so `protspace transfer` without `--query-*`/`--reference-*` raised "Classifier matched no query proteins". Users had to invent a column describing "the rows that are empty" — the shipped EAT demo bundle needed exactly that (`apps/protspace/data/eat_demo/README.md`).
- **The reliability filter misled in several ways (#380).** The legend slider identified its condition by pattern-matching `NOT(conf < X)`, so `>`, `between`, a non-negated `<`, and anything nested in a group were invisible to it — while `gt` is what the query builder produces by default for an eat-confidence column. Positive operators also hid every curated protein, which the slider's own help text promises cannot happen.
- **The two glyph classes were outlined inconsistently (#369)**, and the outline was a fraction of the sprite rather than an absolute width, so at the app's own `nature-1col` preset it fell below the reproducible-line floor for print while the predicted ring survived.

## What Changes

- A classification rule with no clauses is **open** (matches everything) rather than matching nothing, so passing no rules means "transfer within this dataset". Precedence between query and reference applies only between two _explicit_ rules, so an open rule never starves the other set.
- The reliability filter's conditions are identified by **ownership of the eat-confidence column**, at any depth, instead of by condition shape — so every operator mirrors, and a hand-built condition is recognised rather than duplicated.
- The reliability control gains **three modes** (at least / at most / between), each expressed as NOT-form conditions so curated proteins stay visible in all of them without changing the evaluator's null semantics.
- A query matching nothing **clears** the filter channel instead of being pushed as an active filter that blanks the plot.
- The glyph outline becomes an **absolute device-pixel width** derived from the shader's existing isotropic pixel scale, applied to both filled dots and predicted rings, budget-capped on the ring.

## Capabilities

### New Capabilities

- `eat-transfer-scope`: which proteins act as queries and references when `protspace transfer` runs, including the no-rules (self-transfer) case.
- `eat-reliability-filter`: how the EAT reliability control and the query builder express and share one filter.

### Modified Capabilities

<!-- The EAT specs live in the unarchived `add-eat-visualization` change, not in openspec/specs/, so there is no committed requirement to modify. -->

## Impact

- **Backend:** `apps/protspace/src/protspace/analysis/classification.py`, `cli/transfer.py`. `feat:` on `apps/protspace/` — earns a PyPI minor bump, which is correct for a user-visible CLI behaviour change.
- **Frontend:** `packages/core/src/components/control-bar/{control-bar,query-types,query-owned,eat-reliability}.ts`, `packages/core/src/components/legend/legend.ts` + styles, `packages/utils/src/visualization/eat-overlay.ts`, `apps/web/src/explore/runtime.ts`.
- **Not included:** audit mode (#424) — engine, CLI, bundle contract and a third glyph state, filed separately; persisting the reliability _mode_ to bundle settings (schema addition needing a migration story for the legacy scalar).
- **Bundle format:** unchanged. `format_version` stays 2; no new columns.
