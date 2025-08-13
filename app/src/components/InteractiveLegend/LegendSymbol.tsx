"use client";

import * as d3 from "d3";
import { LEGEND_DEFAULTS, SHAPE_MAPPING } from "./constants";

interface LegendSymbolProps {
  shape: string | null;
  color: string;
  size?: number;
  isSelected?: boolean;
}

export function LegendSymbol({ shape, color, size = LEGEND_DEFAULTS.symbolSize, isSelected = false }: LegendSymbolProps) {
  const halfSize = size / 2;

  const shapeKey = (shape || "circle").toLowerCase() as keyof typeof SHAPE_MAPPING;
  const symbolType = SHAPE_MAPPING[shapeKey] || d3.symbolCircle;

  const path = d3.symbol().type(symbolType).size(size * LEGEND_DEFAULTS.symbolSizeMultiplier)();

  const isOutlineOnly =
    shapeKey === "plus" || shapeKey === "asterisk" || String(shapeKey).includes("_stroke");

  const strokeWidth = isSelected ? 2 : 1;
  const strokeColor = isSelected ? "#3B82F6" : "#333";

  return (
    <svg width={size} height={size} className="inline-block">
      <g transform={`translate(${halfSize}, ${halfSize})`}>
        <path
          d={path || ""}
          fill={isOutlineOnly ? "none" : color}
          stroke={isOutlineOnly ? color : strokeColor}
          strokeWidth={isOutlineOnly ? 2 : strokeWidth}
        />
      </g>
    </svg>
  );
}


