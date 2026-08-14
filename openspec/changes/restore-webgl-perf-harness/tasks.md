## 1. Restore the broken interaction coupling

- [x] 1.1 Add `isZoomReady` getter to `PlotInteractionController`, beside the existing
      `mainGroup`/`overlayGroup`/`isBrushing` getters
- [x] 1.2 Add `zoomBy`, `panBy`, `setTransform` to the controller, driving d3's zoom behaviour so
      the node's `__zoom` datum stays authoritative
- [x] 1.3 Add a typed `_interaction()` accessor to `WebglRenderPerfRunner`, plus a
      `_requireInteraction()` that throws rather than letting the zoom sites degrade to `?.`
      no-ops; the controller is `import type`-only because nothing needs the class at runtime
- [x] 1.4 Repoint all five `_zoom`/`_svgSelection` sites: the readiness gate, `_applyZoomScale`,
      `_applyZoomTranslate`, and the guard plus transform-restore in each of `_runZoomInOutScenario`
      and `_runDragCanvasScenario`
- [x] 1.5 Remove the four `@typescript-eslint/no-explicit-any` disables the rewrite makes redundant
- [x] 1.6 Confirm zero remaining `_zoom`/`_svgSelection` references in `webgl-render-perf.ts`

## 2. Lock the coupling with a test

- [x] 2.1 Add `webgl-render-perf.host-contract.test.ts` (jsdom), driving the runner instance the
      host owns rather than a freshly constructed one
- [x] 2.2 Assert the gate resolves against a loaded host
- [x] 2.3 Assert the gate still rejects on a host that never loads
- [x] 2.3a Assert the gate rejects on a fully-loaded host whose interaction layer was never
      initialized — this is the case that makes deleting the drifted condition a non-fix; 2.3
      alone does not, because that host fails the gate on `data` before zoom is ever consulted
- [x] 2.4 Assert the zoom helpers actually move the plot, read back through the controller's public
      `mainGroup` rather than any private field
- [x] 2.5 Verify the test is red on the parent commit and green with the fix

## 3. Remove the tour from the measured window

- [x] 3.1 Seed the tour-completion `storageState` in `perf/playwright.config.ts`, matching the e2e
      config
- [x] 3.2 Verify with a DOM probe that no driver.js element appears during a full run
- [x] 3.3 Verify a normal `/explore` visit still auto-starts the tour

## 4. Make a failing dataset cost only itself

- [x] 4.1 Wrap the per-dataset body of the suite loop in a catch that records
      `{ datasetId, error }` and continues to the next dataset
- [x] 4.2 Emit the results file whenever at least one dataset produced measurements, carrying the
      recorded failures in a top-level `failures` array — kept out of `results` so the plotter does
      not treat a failure as a phantom dataset
- [x] 4.3 Fail loudly when no dataset produced measurements, rather than emitting a file that reads
      as a successful run
- [x] 4.4 Bound every unbounded await in `loadDataset` — the three loader waits plus the bundle
      `fetch` and `arrayBuffer` — so a load that never finalizes fails at its own timeout, naming
      the dataset and the unmet condition
- [x] 4.5 Stop the heap poller on the failure path so it does not outlive its dataset, with the
      `try` opening immediately after the poller so nothing can throw past the stop
- [x] 4.6 Mark the `loaderDone` rejection handled at creation: `data-error` fires an await earlier
      than it is consumed, so its rejection reached a microtask checkpoint unhandled and surfaced as
      a page error, failing the run the per-dataset catch was meant to survive
- [x] 4.7 Confirm `perf/plot_perf_results.py` needs no change: ran it on a mixed success/failure
      file, all plots emitted, no phantom dataset registered

## 5. Stop an empty run passing as green

- [x] 5.1 Assert in `perf/webgl-perf.spec.ts` that no dataset recorded an error, surfacing the
      error text on failure
- [x] 5.2 Assert every expected scenario recorded at least one pass, closing the pre-existing gap
      where an all-timeouts run passed and became NaN bars in the plotter

## 6. Verify

- [ ] 6.1 `pnpm test` green across the workspace
- [ ] 6.2 `pnpm precommit` green
- [ ] 6.3 `PERF_DATASETS=5K PERF_ITERATIONS=2 pnpm perf --project=chrome` completes and records real
      passes for all four scenarios
- [ ] 6.4 Fault-inject a bad dataset id and confirm the run still emits results for the good
      dataset, records the failure, and fails the spec
- [ ] 6.5 CI green on the PR, including the E2E suite

## 7. Close out

- [ ] 7.1 Reread `proposal.md` and `design.md` against the final diff
- [ ] 7.2 `openspec archive restore-webgl-perf-harness` as the last commit on the branch, before
      the merge, and confirm the new capability's `## Purpose` is not left as a TBD placeholder
