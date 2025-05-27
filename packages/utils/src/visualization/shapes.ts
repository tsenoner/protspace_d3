import * as d3 from 'd3';
import type { PointShape } from '../types.js';

export const SHAPE_MAPPING: Record<PointShape, d3.SymbolType> = {
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

export function getSymbolType(shape: string): d3.SymbolType {
  return SHAPE_MAPPING[shape as PointShape] || d3.symbolCircle;
}
