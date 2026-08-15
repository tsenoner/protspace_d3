## 1. Extend the mock WebGL2 context (own commit — every renderer suite depends on it)

- [ ] 1.1 Add the constants `MAX_TEXTURE_SIZE` (0x0d33), `NO_ERROR` (0), `INVALID_VALUE` (0x0501),
      `INVALID_OPERATION` (0x0502), `OUT_OF_MEMORY` (0x0505) to `test-support/mock-webgl2.ts`
- [ ] 1.2 Add `getParameter(pname)` returning `opts.maxTextureSize ?? 8192` for `MAX_TEXTURE_SIZE`,
      preserving whatever the existing suites already rely on for other parameters
- [ ] 1.3 Add `getError()` shifting from an `opts.glErrors: number[]` queue, then `NO_ERROR`
- [ ] 1.4 Make `texImage2D`, `texSubImage2D` and `uniform1i` recording `vi.fn()`s rather than no-ops
- [ ] 1.5 Run the full renderer suite unchanged and confirm green before touching any source

## 2. Plan atlas geometry in a pure module

- [ ] 2.1 Add `webgl/renderer/label-atlas-plan.ts` with `MAX_LABELS`, the width ladder
      `[2048, 4096, 8192]`, the stride ladder `[8, 4, 2]`, `LabelAtlasPlan`, and `planLabelAtlas`
- [ ] 2.2 Iterate stride outer, width inner, smallest width first, so a device at 4096 or above
      keeps today's exact geometry; return `null` when even stride 2 cannot fit
- [ ] 2.3 Re-export `MAX_LABELS` from `stage-point.ts` so existing importers are unaffected
- [ ] 2.4 Add `label-atlas-plan.test.ts`, including the no-change lock
      `planLabelAtlas(573_696, 8192) === { width: 2048, height: 2241, stride: 8, reducedDetail: false }`
- [ ] 2.5 Add the table-driven invariant over `MTS × capacity`:
      `plan === null || (plan.width <= mts && plan.height <= mts && capacity * stride <= width * height)`

## 3. Clamp planned capacity

- [ ] 3.1 Give `planRendererCapacity` an optional fifth `maxCapacity` argument defaulting to
      `Number.POSITIVE_INFINITY`, floored at the snapped requirement so it can never starve a load
- [ ] 3.2 Rename the fourth parameter to `capacityGranularity` and rewrite the doc block: with a
      variable atlas width it is allocation granularity, not a texture-row constraint
- [ ] 3.3 Pass `MAX_POINTS_DIRECT_RENDER` from `expandCapacity`
- [ ] 3.4 Confirm all seven existing `capacity-planner.test.ts` cases pass **unchanged**
- [ ] 3.5 Add cases: `(950_000, 900_096, 1024, 256, 1_000_000) === 1_000_192`;
      `(573_649, 0, 1024, 256, 1_000_000) === 573_696`; `(1_500_000, 0, 1024, 256, 1_000_000) === 1_500_160`

## 4. Clamp the staged label count

- [ ] 4.1 Add `maxLabels: number` to `StagePointArrays` and make `labelColorData` nullable
- [ ] 4.2 `stagePointStyle`: write `Math.min(pointColors.length, target.maxLabels)` to `labelCounts`
      (today it writes `pointColors.length` unclamped while at most `MAX_LABELS` texels are filled)
- [ ] 4.3 Skip `fillLabelColorTexels` entirely when `labelColorData` is null
- [ ] 4.4 `buildStageArrays` supplies `maxLabels: this.labelAtlas?.stride ?? MAX_LABELS`
- [ ] 4.5 Tests: 12 colours at `maxLabels: 8` stages `labelCounts === 8`; `maxLabels: 4` stages 4 and
      writes only 4 texels; `labelColorData: null` does not throw and still writes counts

## 5. Fix and gate the fragment shader

- [ ] 5.1 Add `precision highp int;` after `precision highp float;` in `POINT_FRAGMENT_SHADER` —
      `flat in int v_pointIndex` and `globalIndex` are `mediump` today, undefined above 32,767
- [ ] 5.2 Declare `uniform int u_labelAtlasCapacity` and gate the pie branch on
      `v_labelCount > 1.5 && v_pointIndex < u_labelAtlasCapacity`
- [ ] 5.3 Clamp `count` to `float(u_maxLabels)` and `sliceIndex` to `count - 1.0`
      (`atan(+0, x<0)` is exactly `+PI`, so the normalised sweep reaches 1.0 on real fragments)
- [ ] 5.4 Add `labelAtlasCapacity` to `PointUniformLocations`, resolve it in `resolvePointLocations`,
      and push it in `bindPointDrawState`
- [ ] 5.5 Take `labelTextureHeight` explicitly in the draw params, replacing the
      `labelColorDataLength / 4 / width` derivation in `render-target.ts`
- [ ] 5.6 Extend `export-shaders.test.ts` to pin all four shader edits by text

## 6. Rework the live renderer

- [ ] 6.1 Probe `gl.MAX_TEXTURE_SIZE` in `ensureGL` right after `this.gl = gl`, falling back to 2048
      on a non-finite or non-positive result
- [ ] 6.2 Replace the `labelColorData` field with `labelAtlas: LabelAtlasPlan | null`,
      `labelColorData: Uint8Array | null`, `labelAtlasDisabled`, and a `degradeReported` reason latch
- [ ] 6.3 Clear all four in `resetRendererState` alongside the existing `labelTextureInitialized`
- [ ] 6.4 Delete the inline allocation from `expandCapacity`; null the plan and the data so
      `syncLabelAtlas` re-plans on the same pass
- [ ] 6.5 Add `syncLabelAtlas`, called at the top of `populateBuffers` after the `expandCapacity`
      block; re-plan only when the existing plan does not cover the current capacity
- [ ] 6.6 Add `uploadLabelAtlas`: `texImage2D` then one `getError`, set `labelTextureInitialized`
      only on `NO_ERROR`, and on failure disable the atlas and install the 1x1 placeholder
- [ ] 6.7 Add the buffer `getError` on the allocating path only, **before** any texture call; on
      error report, disable the atlas, unbind the VAO and return with `buffersInitialized` false
- [ ] 6.8 Hoist the six style-buffer uploads from `if (updateStyles)` to
      `if (updateStyles || needsReorder)` — the reorder branch rewrites them all
- [ ] 6.9 Pass `maxLabels`, `labelTextureWidth`, `labelTextureHeight` and `labelAtlasCapacity` from
      `renderPoints`, all defaulting safely when the plan is absent

## 7. Repair the export path

- [ ] 7.1 Probe the export context's own `MAX_TEXTURE_SIZE` after `getContext` — it cannot read the
      live renderer's cached value
- [ ] 7.2 Pass the live stride into `renderToCanvas`; export takes `min(ownPlan.stride, liveStride)`,
      and allocates no atlas at all when the live stride is null
- [ ] 7.3 Apply the same `getError` after the export `texImage2D`; on error use capacity 0 and flat
      marks, and still complete the export
- [ ] 7.4 `MAX_DIMENSION` becomes `Math.min(8192, exportMaxTextureSize)`; update the rejection
      message, which calls the constant "the browser limit" and is a lie below 8192 today
- [ ] 7.5 Delete the local `LABEL_TEXTURE_WIDTH` and the comment claiming reuse of the main
      renderer's arrays — the code allocates seven fresh ones

## 8. Surface degradation to the user

- [ ] 8.1 Add `scatter-plot.events.ts` with `RendererDegradedDetail` and its factory, mirroring
      `control-bar.events.ts`; export the type from `packages/core/src/index.ts`
- [ ] 8.2 Add an `onDegraded` renderer callback, wired beside `onContextLost`; the host dispatches
      `bubbles: true, composed: true`
- [ ] 8.3 Route `handleGammaFallback` through the same channel instead of console-only
- [ ] 8.4 Register in `apps/web/src/explore/runtime.ts`; map reason to copy in `notifications.ts`
      with a `dedupeKey` and a report action carrying the measured limit
- [ ] 8.5 Add `maxTextureSize` to `_collectPerfMetadata` in `webgl-render-perf.ts`

## 9. Mock-GL unit coverage

- [ ] 9.1 `webgl-renderer.label-atlas.test.ts`: `getParameter(MAX_TEXTURE_SIZE)` called once per
      `ensureGL` and never during `render()`
- [ ] 9.2 At `maxTextureSize: 8192`, Swiss-Prot-scale data calls `texImage2D` with `(2048, 2241)`
- [ ] 9.3 At `maxTextureSize: 2048`, height <= 2048 and `uniform1i(maxLabels)` receives 4
- [ ] 9.4 Failure is not latched: `glErrors: [0, INVALID_VALUE]` means no later `texSubImage2D`, a
      `(1,1)` placeholder follows, `labelAtlasCapacity` receives 0, and `onDegraded` fires once
      across five renders
- [ ] 9.5 A buffer allocation error leaves `buffersInitialized` false so the next populate
      reallocates
- [ ] 9.6 `invalidatePositionCache()` without `invalidateStyleCache()` on multi-label data issues a
      `texSubImage2D` — the upload hoist
- [ ] 9.7 `export-renderer.test.ts`: export probes its own limit, inherits the passed stride, and
      allocates nothing beyond the placeholder when the live stride is null
- [ ] 9.8 `point-locations.test.ts` / `render-target.test.ts`: the new uniform resolves and is
      pushed, and 0 is pushed when the plan is absent
- [ ] 9.9 `webgl-renderer.lifecycle.test.ts`: `deleteTexture` count unchanged — the texture object
      still exists, only its storage is conditional
- [ ] 9.10 Extend `label-texture-utils.test.ts` for strides 4 and 2, plus a straddling case pinning
      the JS byte offset against the shader's `(globalIndex % width, globalIndex / width)` at each
      supported width

## 10. Playwright — the only layer that proves it

- [ ] 10.1 Add `apps/web/tests/label-atlas-limit.spec.ts` to the default suite, no fixture, using
      `page.addInitScript` to override `WebGL2RenderingContext.prototype.getParameter` to report
      2048 for `MAX_TEXTURE_SIZE` (2048, not lower — below the spec floor collapses unrelated paths)
- [ ] 10.2 Assert no console error matches `/INVALID_VALUE|INVALID_OPERATION|texImage2D/` with a
      multi-label annotation selected; verify this **fails on the parent commit**
- [ ] 10.3 Assert the reduced-detail warning is visible and names the limit
- [ ] 10.4 Assert `readPixels` at a known multi-label point returns a legend palette colour, **not
      black** — the assertion no unit test can substitute for
- [ ] 10.5 Assert a single-label annotation under the same stub raises no warning and matches the
      unstubbed screenshot baseline
- [ ] 10.6 Add a stubbed second project run to `load-large-bundle.spec.ts` (opt-in), keeping its
      empty-console assertion; exercise a single -> multi -> single annotation switch at 573,649 points

## 11. Ship

- [ ] 11.1 `pnpm precommit`, `pnpm format:check`, `pnpm test` all green
- [ ] 11.2 `pnpm test:e2e` green, including the new spec; compare any red against the nightly's
      history on `main`, never against local passes
- [ ] 11.3 Confirm `openspec validate --strict` passes for this change
- [ ] 11.4 Reread `proposal.md` and `design.md` against the final diff, tick every task above
      including anything review added, then run `/opsx:archive` **on the branch** and let CI go green
      on that commit
- [ ] 11.5 Open the PR against `main` with `fix(core):` commits; merge or rebase — never squash
