"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { DEFAULT_CONFIG } from "../constants";

export function useZoomSetup(
  svgRef: React.RefObject<SVGSVGElement>,
  width: number,
  height: number,
  onZoom?: (transform: d3.ZoomTransform) => void
) {
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const mainGroupRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const brushGroupRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    mainGroupRef.current = svg.append("g").attr("class", "scatter-plot-container");
    brushGroupRef.current = svg.append("g").attr("class", "brush-container");

    zoomRef.current = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent(DEFAULT_CONFIG.zoomExtent)
      .on("zoom", (event) => {
        if (mainGroupRef.current) {
          mainGroupRef.current.attr("transform", event.transform);
          if (brushGroupRef.current) brushGroupRef.current.attr("transform", event.transform);
        }
        if (onZoom) onZoom(event.transform);
      });

    svg.call(zoomRef.current);

    // Ensure double-click resets the view instead of zooming
    const applyDoubleClickReset = () => {
      svg.on("dblclick.zoom", null);
      svg.on("dblclick.reset", (event: MouseEvent) => {
        event.preventDefault();
        if (zoomRef.current) {
          svg.transition().duration(750).call(zoomRef.current.transform, d3.zoomIdentity);
        }
      });
    };
    applyDoubleClickReset();

    return () => {
      if (zoomRef.current) {
        svg.on(".zoom", null);
        zoomRef.current = null;
      }
      // Remove custom double-click reset handler
      svg.on("dblclick.reset", null);
      mainGroupRef.current = null;
      brushGroupRef.current = null;
      svg.selectAll("*").remove();
    };
  }, [svgRef, width, height]);

  return { zoomRef, mainGroupRef, brushGroupRef } as const;
}


