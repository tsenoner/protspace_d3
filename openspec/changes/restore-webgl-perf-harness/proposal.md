## Why

`pnpm perf` has produced no results since `fee47903` (2026-06-21). The B8 interaction-layer
extraction moved `_zoom` and `_svgSelection` off the scatter-plot host into
`PlotInteractionController`; the perf runner reaches the host through an `as any` cast, so both
silently became `undefined`. Nothing failed at build time — the benchmark just stopped producing
data, and every run spun ~10 minutes before dying on `timed out waiting for data to fully load`.

This is the second drift of the same readiness gate (`7b7683a7` repaired `_plotData` in May), and
`pnpm perf` runs in no CI workflow, so nothing catches the next one. Measuring the point ceiling
above Swiss-Prot scale is blocked on the harness working — and on it surviving a dataset that
fails, which is the expected outcome when probing for a ceiling.

## What Changes

- Give `PlotInteractionController` the public API the benchmark needs — `isZoomReady`, `zoomBy`,
  `panBy`, `setTransform` — and route the perf runner's five `_zoom`/`_svgSelection` sites through
  a typed accessor. The issue reported only the readiness gate; the same fields are also read by
  both zoom helpers and by a guard plus a transform-restore in each of the zoomInOut and dragCanvas
  scenarios, so a gate-only fix trades a hang for an immediate throw.
- Gate readiness on `isZoomReady` rather than on the controller being non-null: the host assigns
  the controller one statement before calling `initialize()`, which is what wires zoom up.
- Suppress the product tour during benchmark runs via `storageState`, matching the e2e config.
  The tour auto-starts on the same `data-loaded` event the benchmark drives and is never
  dismissed, so driver.js composited a dimming overlay over the canvas for the whole measured
  window — inflating results (5K: clickPoint 28.35ms → 7.00ms, zoomInOut 1.75ms → 1.17ms).
- Capture per-dataset failures instead of discarding the whole run. The suite loops datasets with
  no per-dataset catch and downloads only after the loop completes, so one throw loses every
  already-measured dataset and yields zero output.
- Bound the three unbounded awaits in the dataset load path, so a load that never finalizes fails
  with a diagnosable error instead of hanging until the spec's 44-minute download timeout.
- Add a jsdom regression test asserting the runner's observable contract with its host, so the
  next extraction fails in CI rather than silently.
- Strengthen spec validation so a run whose scenarios recorded nothing cannot pass as green.

## Capabilities

### New Capabilities

- `webgl-perf-harness`: what the WebGL render benchmark guarantees — that it reaches a genuine
  ready state before measuring, that it measures through the real interaction path, that a
  failing dataset degrades to a recorded error rather than losing the run, and that its results
  are distinguishable from an empty run.

### Modified Capabilities

<!-- None. `e2e-validation` explicitly scopes performance tooling out of itself: "tight
     performance thresholds SHALL live in dedicated performance tooling" (spec.md:91), so its
     tour-suppression requirement binds the correctness suite, not perf/. -->

## Impact

- `packages/core/src/components/scatter-plot/interaction/plot-interaction-controller.ts` — four new
  public members; no behavior change for existing callers.
- `packages/core/src/components/scatter-plot/webgl-render-perf.ts` — five rewritten call sites, a
  typed controller accessor, four `no-explicit-any` disables removed.
- `packages/core/src/components/scatter-plot/webgl-render-perf.host-contract.test.ts` — new; runs
  in the existing `pnpm test:ci` gate on every frontend PR.
- `apps/web/src/perf/webgl-perf-suite.ts` — per-dataset error capture, bounded load waits.
- `perf/playwright.config.ts` — tour-completion `storageState`.
- `perf/webgl-perf.spec.ts` — assertions that a captured error and an empty run both fail.
- Results-file shape gains a top-level `failures` array. `results` itself is unchanged, so
  `perf/plot_perf_results.py` needs no modification.
- No product behavior changes. No PyPI release: `protspace-release.yml` is path-filtered to
  `apps/protspace/**`, which this change does not touch.
