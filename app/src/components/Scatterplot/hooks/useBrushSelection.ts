"use client";

import { useEffect, useMemo } from "react";
import * as d3 from "d3";
import { DEFAULT_CONFIG, COLORS } from "../constants";
import { PlotDataPoint } from "../types";

export function useBrushSelection(
  svgRef: React.RefObject<SVGSVGElement>,
  brushGroupRef: React.MutableRefObject<d3.Selection<SVGGElement, unknown, null, undefined> | null>,
  zoomRef: React.MutableRefObject<d3.ZoomBehavior<SVGSVGElement, unknown> | null>,
  selectionMode: boolean,
  plotData: PlotDataPoint[],
  scales: { x: d3.ScaleLinear<number, number, never>; y: d3.ScaleLinear<number, number, never> } | null,
  width: number,
  height: number,
  onProteinClick?: (id: string, event: React.MouseEvent) => void
) {
  useEffect(() => {
    if (!svgRef.current || !brushGroupRef.current || !scales) return;

    const svg = d3.select(svgRef.current);
    brushGroupRef.current.selectAll("*").remove();

    if (selectionMode) {
      if (zoomRef.current) svg.on(".zoom", null);

      const brush = d3
        .brush()
        .extent([
          [DEFAULT_CONFIG.margin.left, DEFAULT_CONFIG.margin.top],
          [width - DEFAULT_CONFIG.margin.right, height - DEFAULT_CONFIG.margin.bottom],
        ])
        .on("start", () => svg.classed("brushing", true))
        .on("end", (event) => {
          svg.classed("brushing", false);
          if (!event.selection) return;

          const [[x0, y0], [x1, y1]] = event.selection as [[number, number], [number, number]];
          if (plotData.length && scales) {
            const selectedIds: string[] = [];
            plotData.forEach((d) => {
              const px = scales.x(d.x);
              const py = scales.y(d.y);
              if (px >= x0 && px <= x1 && py >= y0 && py <= y1) selectedIds.push(d.id);
            });
            if (selectedIds.length > 0 && onProteinClick) {
              const isAdditive = event.sourceEvent && (event.sourceEvent.ctrlKey || event.sourceEvent.metaKey);
              selectedIds.forEach((id) => {
                const syntheticEvent = {
                  ctrlKey: isAdditive || selectedIds.length > 1,
                  metaKey: isAdditive || selectedIds.length > 1,
                  shiftKey: isAdditive || selectedIds.length > 1,
                } as React.MouseEvent;
                onProteinClick(id, syntheticEvent);
              });
            }
            brushGroupRef.current?.call(brush.move as any, null);
          }
        });

      brushGroupRef.current.call(brush as any);
    } else {
      if (zoomRef.current) {
        svg.call(zoomRef.current);
        // Ensure double-click resets view instead of zooming
        svg.on("dblclick.zoom", null);
        svg.on("dblclick.reset", (event: MouseEvent) => {
          event.preventDefault();
          if (zoomRef.current) {
            svg.transition().duration(750).call(zoomRef.current.transform, d3.zoomIdentity);
          }
        });
      }
    }

    const style = document.createElement("style");
    style.innerHTML = `
      .brushing .overlay { cursor: crosshair !important; }
      .brush .selection { stroke: ${COLORS.BRUSH_STROKE}; stroke-width: 2px; fill: ${COLORS.BRUSH_FILL}; stroke-dasharray: none; }
      .brush .handle { display: none; }
      .protein-point.highlighted { stroke: ${COLORS.SELECTION_RED} !important; stroke-width: 3 !important; stroke-opacity: 1 !important; }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, [svgRef, brushGroupRef, zoomRef, selectionMode, plotData, scales, width, height, onProteinClick]);
}


