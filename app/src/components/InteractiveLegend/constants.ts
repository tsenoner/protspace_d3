import * as d3 from "d3";

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

export const LEGEND_DEFAULTS = {
  symbolSize: 16,
  symbolSizeMultiplier: 8,
} as const;


