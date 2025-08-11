import * as d3 from "d3";

/**
 * Legend configuration constants
 */

// Define the same SHAPE_MAPPING as in ImprovedScatterplot.tsx for consistency
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

// Default styles for special cases
export const DEFAULT_STYLES = {
  other: {
    color: "#888888",
    shape: "circle",
  },
  null: {
    color: "#888888",
    shape: "circle",
  },
} as const;

/**
 * Legend component default configuration
 */
export const LEGEND_DEFAULTS = {
  maxVisibleValues: 10,
  symbolSize: 6,
  symbolSizeMultiplier: 8, // For D3 symbol size calculation
  dragTimeout: 100,
  scatterplotSelector: "protspace-scatterplot",
  autoSyncDelay: 100,
  includeOthers: true,
  includeShapes: false,
} as const;

/**
 * Legend styling constants
 */
export const LEGEND_STYLES = {
  strokeWidth: {
    default: 1,
    selected: 2,
    outline: 2,
  },
  colors: {
    defaultStroke: "#394150",
    selectedStroke: "#00A3E0",
    fallback: "#888888",
  },
  outlineShapes: new Set(["plus", "asterisk", "cross", "times"]),
} as const;
