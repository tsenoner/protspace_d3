"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { PlotDataPoint } from "../types";

export function useSpatialIndex(
  plotData: PlotDataPoint[],
  scales: { x: d3.ScaleLinear<number, number>; y: d3.ScaleLinear<number, number> } | null
) {
  const quadtreeRef = useRef<d3.Quadtree<PlotDataPoint> | null>(null);

  useEffect(() => {
    if (!scales || plotData.length === 0) {
      quadtreeRef.current = null;
      return;
    }
    // Build quadtree in pre-zoom screen coordinates
    quadtreeRef.current = d3
      .quadtree<PlotDataPoint>()
      .x((d) => scales.x(d.x))
      .y((d) => scales.y(d.y))
      .addAll(plotData);
  }, [plotData, scales]);

  function findNearest(screenX: number, screenY: number, radius: number): PlotDataPoint | undefined {
    if (!quadtreeRef.current) return undefined;
    return quadtreeRef.current.find(screenX, screenY, radius) || undefined;
  }

  return { findNearest } as const;
}


