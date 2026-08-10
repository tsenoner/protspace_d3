# Documentation Images

This folder contains screenshots and animations for the ProtSpace Explore documentation.

## Generating Images

Run `pnpm docs:images` to automatically generate all images. This command:

1. Captures static screenshots (PNG) via `docs:screenshots`
2. Records animations (WebM) via `docs:animations`
3. Converts videos to GIFs via `docs:gifs`

You can also run these commands individually if needed.

## Static Screenshots

### Interface Overview (`index.md`)

- `interface-overview.png` - Full page layout
- `scatterplot-example.png` - Scatterplot with colored proteins
- `legend-panel.png` - Legend panel
- `structure-viewer.png` - 3D structure viewer

### Control Bar (`control-bar.md`)

- `control-bar-annotated.png` - Full control bar with numbered annotations (1-9)
- `control-bar-projection.png` - Projection dropdown
- `control-bar-annotation.png` - Annotation dropdown
- `control-bar-export.png` - Export menu

### Transferred Annotations (`eat.md`)

- `eat-legend-section.png` - The `Predicted (transferred)` legend block
- `eat-annotation-badge.png` - The `EAT` badge in the annotation dropdown

## Animated GIFs

### Scatterplot (`scatterplot.md`)

- `zoom.gif` - Zooming and panning
- `select-single.gif` - Single protein selection
- `select-box.gif` - Box selection
- `duplicate-badges.gif` - Duplicate count badge: spiderfy and per-point selection

### Legend (`legend.md`)

- `legend-toggle.gif` - Toggling category visibility
- `legend-reorder.gif` - Reordering labels
- `legend-others.gif` - Expanding/collapsing Others group

### Transferred Annotations (`eat.md`)

- `eat-connectors.gif` - Provenance connectors: one source line, then a fan-out
- `eat-reliability.gif` - Raising the reliability threshold hides low-confidence predictions

The EAT captures are the only ones that do not use the app's built-in demo dataset. They load
`apps/web/public/data/venom_eat_stats.parquetbundle` through the real file input, because the demo
dataset carries no `*__pred_*` columns. They live in `capture-eat-static.spec.ts` and
`capture-eat-animations.spec.ts` with shared setup in `eat-helpers.ts`.

## Shared Images

These images are used in multiple documentation pages:

- `control-bar-annotated.png` - `index.md`, `control-bar.md`
- `control-bar-export.png` - `control-bar.md`, `exporting.md`
- `structure-viewer.png` - `index.md`, `structures.md`
- `eat-annotation-badge.png` - `eat.md`, `control-bar.md`
