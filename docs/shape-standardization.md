# Shape Standardization for ProtSpace

This document outlines the standardized shape definitions for all components in ProtSpace to ensure consistency in data visualization.

## Standard Shape Definitions

The following shapes should be consistently used across all components:

| Shape Name        | D3 Symbol            | Description              |
| ----------------- | -------------------- | ------------------------ |
| `circle`          | `d3.symbolCircle`    | Basic circle             |
| `square`          | `d3.symbolSquare`    | Filled square            |
| `square_stroke`   | `d3.symbolSquare2`   | Stroked square outline   |
| `triangle`        | `d3.symbolTriangle`  | Filled triangle          |
| `triangle_stroke` | `d3.symbolTriangle2` | Stroked triangle outline |
| `diamond`         | `d3.symbolDiamond`   | Filled diamond           |
| `diamond_stroke`  | `d3.symbolDiamond2`  | Stroked diamond outline  |
| `cross`           | `d3.symbolCross`     | Cross symbol             |
| `plus`            | `d3.symbolPlus`      | Plus symbol              |
| `star`            | `d3.symbolStar`      | Star symbol              |
| `asterisk`        | `d3.symbolAsterisk`  | Asterisk symbol          |
| `wye`             | `d3.symbolWye`       | Y-shaped symbol          |
| `times`           | `d3.symbolTimes`     | X-shaped symbol          |

## Implementation Guidelines

### D3.js Components

For D3.js-based components (like `ImprovedScatterplot.tsx`), use the following mapping:

```typescript
const SHAPE_MAPPING = {
  asterisk: d3.symbolAsterisk,
  circle: d3.symbolCircle,
  cross: d3.symbolCross,
  diamond: d3.symbolDiamond,
  diamond_stroke: d3.symbolDiamond2,
  plus: d3.symbolPlus,
  square: d3.symbolSquare,
  square_stroke: d3.symbolSquare2,
  star: d3.symbolStar,
  triangle: d3.symbolTriangle,
  triangle_stroke: d3.symbolTriangle2,
  wye: d3.symbolWye,
  times: d3.symbolTimes,
} as const;
```

### SVG Components

For SVG-based components (like `InteractiveLegend.tsx`), implement a `renderSymbol` function that creates the same visual appearance using SVG primitives.

### Web Components

For Lit-based web components, follow the same shape standards as D3.js components, using the same symbol mapping.

## Benefits of Standardization

1. **Visual Consistency**: Ensures the same shape names produce identical visuals across components
2. **Improved UX**: Users can recognize shape patterns consistently throughout the application
3. **Simplified Development**: Standardized naming conventions reduce confusion during development
4. **Easier Debugging**: Makes it easier to track shape rendering issues

## Implementation Notes

When implementing or updating components:

1. Always refer to the standard shape names listed in this document
2. Ensure shape rendering functions handle all standard shapes
3. Use the default shape (`circle`) as a fallback for any unknown shape names

By following these standards, we ensure that all ProtSpace components display protein data with consistent visual language.
