## Context

`WebglRenderPerfRunner` lives in `packages/core` and drives the scatter-plot it benchmarks through
an `as any` cast on its host (`_hostAny()`), reaching ~16 private members. That coupling is
invisible to TypeScript, ESLint and Knip, so any refactor that relocates a member breaks the
benchmark silently. It has now happened twice: `f75bcd86` reshaped `_plotData` (repaired same-day by
`7b7683a7`, because someone was running the benchmark), and `fee47903` moved `_zoom` and
`_svgSelection` into `PlotInteractionController` (not repaired, because nobody ran it — `pnpm perf`
is in no CI workflow).

The failure mode is the problem as much as the break. The gate is a conjunction of reach-ins whose
only failure signal is silent falsiness, so it spins to a 10-minute timeout and reports "timed out
waiting for data to fully load" — a message that names none of the seven things it was waiting on.

The suite around it compounds this: `apps/web/src/perf/webgl-perf-suite.ts` loops datasets with no
per-dataset catch and downloads only after the loop, so any single throw discards the whole run.
That matters most in exactly the scenario the harness is wanted for — probing the point ceiling with
progressively larger synthetic bundles, where the largest dataset is expected to fail.

## Goals / Non-Goals

**Goals:**

- Restore the benchmark to producing results, at every site the extraction broke — not only the one
  the issue reported.
- Make readiness mean what it says: gate on a predicate the interaction layer vouches for.
- Keep measurements comparable with pre-refactor baselines.
- Let a failing dataset cost its own results and nothing else.
- Fail loudly and specifically where the harness previously hung or silently degraded.
- Leave a test that fails in CI on the next occurrence of this class of break.

**Non-Goals:**

- Eliminating the reach-in coupling wholesale. A fully typed `WebglRenderPerfHost` bridge for all
  ~16 members is the durable fix for _name_ drift, but it is a larger refactor than restoring the
  benchmark warrants, and it cannot catch _semantic_ drift (a bridge method that keeps type-checking
  while returning null). Deferred; the regression test covers values in the meantime.
- The remaining harness defects found while auditing: `reuseExistingServer: false` colliding with a
  running dev server, the shared `outputDir` wiping prior runs, the OPFS write inside the measured
  load window, `plot_perf_results.py` ingesting the CDP sidecar as a phantom browser, the 2s dead
  wait after each scenario, and clickPoint measuring app-level click side effects. Each is a
  separate follow-up; none makes the benchmark hang or lose data.
- Adding `pnpm perf` to CI. It needs a headed GPU browser and real bundles; the unit-level
  regression test is what belongs in CI.

## Decisions

**Add behaviour methods to the controller, not accessors for its d3 internals.**
Exposing `get zoom()` / `get svgSelection()` would be the same reach-in with a nicer name: it
re-exports two objects whose _pairing_ is an invariant — d3 keeps the live transform in `__zoom` on
the node the behaviour was `.call()`-installed on — and hands back exactly the coupling the F-07
extraction removed. `isZoomReady` / `zoomBy` / `panBy` / `setTransform` encode the pairing once,
keep the null guard in one place, and drop four `no-explicit-any` disables. `setTransform` is barely
new surface: `resetZoom()` is already that call wrapped in a 750ms transition.

**Drive d3's behaviour, never `applyZoom()`.**
`applyZoom()` writes the transform back to the host and re-renders, but never updates `__zoom`.
Routing the scenarios through it would look equivalent and be wrong twice over: the node's datum
would desync so the next real gesture jumps, and the measured render would come from the wrong
trigger path. Because `selection.call(f, ...args)` is defined as `f(selection, ...args)`, calling
the behaviour directly is exactly what the pre-refactor code did, so baselines stay comparable.

**Gate on `isZoomReady`, not on the controller being non-null.**
Three independent reasons the weaker check is wrong: the host assigns the controller one statement
before calling `initialize()`; `initialize()` returns early when the host has no SVG and nothing
retries it; and `disconnectedCallback` tears down without nulling the field. Deliberately _not_ a
"torn down" flag — teardown leaves zoom installed and functional, so such a flag would report
not-ready for a working controller and could reintroduce the hang on any DOM move.

**Suppress the tour in the harness, not in the app.**
`storageState` seeding the tour's completion key is what the e2e config already does; the perf
config never got it. This keeps application code free of any branch on a benchmark concern and
suppresses the tour _before first paint_, rather than dismissing it after it has already painted and
animated. `openspec/specs/e2e-validation/spec.md` scopes performance tooling out of itself
("tight performance thresholds SHALL live in dedicated performance tooling"), so this is new
behavior for the perf harness rather than a delta to that capability.

**Record dataset failures in the results file rather than aborting.**
Catch per dataset, record the dataset id and error message, continue. The results file becomes the
report of what happened, including what failed — which is the artifact wanted when hunting a
ceiling.

Failures go in a **separate top-level `failures` array**, not as an `error` field on an entry in
`results`. `plot_perf_results.py` yields every member of `results` as a dataset payload, so a
failure record placed there would plot as a phantom dataset with empty bars — reproducing the exact
bug the CDP sidecar already causes in that script. Keeping `results` homogeneous means the plotter
needs no change at all.

**Pair that catch with stricter validation.**
Swallowing per-dataset errors would otherwise convert loud failures into a green run with quiet
gaps — trading one silent-failure mode for another. The spec assertion must therefore fail on a
captured error and on any scenario that recorded no passes, which also closes a pre-existing gap
where an all-timeouts run passed and became NaN bars in the plotter.

**Test in jsdom, asserting behavior.**
jsdom reproduces the break exactly: `WebGLRenderer`'s constructor only stores its arguments and
defers GL acquisition, so `_webglRenderer` is non-null and five of the gate's seven conditions
already hold — only the two that drifted fail. The test drives the runner instance the _host_ owns,
so a future change to the runner's constructor keeps being exercised instead of rewriting the test
that constrains it. It asserts the gate resolves, still rejects on a never-loading host, still
rejects on a fully-loaded host whose interaction layer was never initialized, and that the zoom
helpers move the plot.

The third assertion is the one that makes "delete the failing condition" a non-fix, and it is not
interchangeable with the second: a host with no `data` fails the gate on `host.data` alone, so it
stays red whether or not the zoom condition is there. Only a host where every _other_ condition
holds can prove the gate consults the interaction layer at all.

## Risks / Trade-offs

- **The reach-in coupling is reduced, not removed** → the runner still resolves `_interaction` and
  ~9 other private host members by name, so renaming any of them re-breaks it silently. Mitigated
  by the regression test for the values that matter; the typed bridge remains the durable answer.
- **Per-dataset catch could mask real failures** → mitigated by making the spec fail on any recorded
  error, so a caught failure is still a red run; it just no longer costs the other datasets.
- **Results-file shape changes** → mitigated by construction: `results` keeps its existing shape and
  failures live under a new top-level key the plotter never reads. Verified by running the plotter
  on a mixed success/failure file — it emitted every plot and registered no phantom dataset.
- **`zoomBy` clamping** → `scaleBy` is clamped to the scaleExtent snapshotted at `initialize()`, so
  a pre-zoomed plot could make the in/out pair not round-trip and measure a near-no-op. It cannot
  hang (the transform still emits and renders), and the transform restore returns the pre-run state.
- **`panBy` names a transform-space operation** → d3 applies `tx1 = tx0 + k·dx`, so displacement
  scales with zoom level and a reader may assume pixels. Documented at the method.
- **jsdom is not a GPU** → the test proves the readiness/wiring contract, never render performance.
  Real timings still require `pnpm perf` on a headed GPU browser.
