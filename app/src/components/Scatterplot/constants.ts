import * as d3 from "d3";

// Visualization constants used across the Scatterplot implementation
export const DEFAULT_CONFIG = {
  width: 1100,
  height: 600,
  margin: { top: 40, right: 40, bottom: 40, left: 40 },
  baseOpacity: 0.8,
  selectedOpacity: 1.0,
  fadedOpacity: 0.2,
  pointSize: 80,
  highlightedPointSize: 120,
  selectedPointSize: 150,
  zoomExtent: [0.1, 10] as [number, number],
  canvasResolutionScale: 2,
};

export const COLORS = {
  // Selection and highlighting
  SELECTION_RED: "#fa2c37",

  // Default colors
  DEFAULT_GRAY: "#888888",
  STROKE_DARK_GRAY: "#333333",

  // UI colors
  BUTTON_BORDER: "#aaa",
  BUTTON_TEXT: "#666",

  // Brush colors
  BRUSH_STROKE: "#fa2c37",
  BRUSH_FILL: "rgba(59, 130, 246, 0.15)",

  // Background colors
  BUTTON_BG: "rgba(255,255,255,0.9)",
} as const;

export const DEFAULT_STYLES = {
  other: {
    color: COLORS.DEFAULT_GRAY,
    shape: d3.symbolCircle,
  },
  null: {
    color: COLORS.DEFAULT_GRAY,
    shape: d3.symbolCircle,
  },
};

export const SHAPE_MAPPING = {
  asterisk: d3.symbolAsterisk,
  circle: d3.symbolCircle,
  cross: d3.symbolCross,
  diamond: d3.symbolDiamond,
  plus: d3.symbolPlus,
  square: d3.symbolSquare,
  star: d3.symbolStar,
  triangle: d3.symbolTriangle,
  wye: d3.symbolWye,
  times: d3.symbolTimes,
} as const;


