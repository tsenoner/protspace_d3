## Context

`PlotInteractionController.applyZoom()` forwards every D3 transform through the scatterplot host's `onTransform` callback. The host deliberately stores `_transform` as a plain field because making the full transform reactive caused an unnecessary Lit update and WebGL render on every gesture frame (the F-48 invariant). The existing bottom-left `.plot-indicator` renders the visible point count and is already the established persistent status surface for the plot.

Issue #343 requires a visible signal specifically for zooming in. The current `zoomExtent` also permits zooming out, so the indicator must distinguish `k > 1` from both identity (`k === 1`) and zoomed-out (`k < 1`) views.

## Goals / Non-Goals

**Goals:**

- Show `Zoomed in` next to the existing point count while the active D3 scale is greater than `1`.
- Remove the marker once reset reaches identity.
- Preserve the non-reactive `_transform` performance invariant by scheduling Lit updates only when the boolean zoomed-in state changes.
- Cover the boundary in component tests and the real wheel/reset interaction in the Explore app.

**Non-Goals:**

- Add a new reset button, change the existing double-click reset gesture, or display a numeric zoom percentage.
- Show an indicator for panning at identity scale or for zooming out below identity.
- Refactor the interaction controller, point-count computation, or overlay layout.

## Decisions

### Reuse the existing point-count chip

The marker will render as `N points · Zoomed in` inside the existing bottom-left `.plot-indicator`. This avoids collisions with the top-right selection-mode indicator, the bottom-right numeric-recompute chip, and the bottom-center provenance status. A separate overlay was rejected because it would need new collision rules for no additional user value.

### Store only a reactive boolean boundary

The scatterplot will add a reactive `_isZoomedIn` boolean. The host callback will continue assigning every transform to the plain `_transform` field, then assign `t.k > 1` to the boolean. Lit's default change detection ignores equal boolean values, so it enqueues a render once when zoom crosses above identity and once when reset reaches identity, rather than once per D3 frame.

Keeping the boolean on the scatterplot host, rather than the interaction controller, preserves the controller's role as a generic transform dispatcher and keeps rendering state beside the template that consumes it.

### Verify both state propagation and user-visible behavior

A focused jsdom test will drive the real host bridge, assert the count and marker render as explicit presentation items, and observe actual plot rendering across the no-repeat-update boundary for additional `k > 1` transforms. A Playwright regression will wheel over the real Explore scatterplot, verify the complete `N points · Zoomed in` chip and its spacing, double-click reset, and assert the marker disappears.

## Risks / Trade-offs

- **Floating-point values during reset could keep the marker visible until the transition finishes** → This is intentional: the plot remains non-identity until D3 emits the final `k === 1` transform.
- **A marker appended to the count chip is less prominent than a dedicated badge** → The count chip is persistent, unobtrusive, and has no collision risk; the text remains visible throughout the zoomed state.
- **Reactive state could regress zoom performance if equal values enqueue updates** → Exercise consecutive same-side transforms and assert that no additional plot render runs.

## Migration Plan

No migration is required. The change is additive UI behavior with no public API or persisted state. Rollback consists of removing the boolean derivation and conditional template text.

## Open Questions

None. The count-chip presentation and non-interactive scope were approved before implementation.
