"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { COLORS, DEFAULT_CONFIG } from "../constants";

export function useZoomSetup(
  svgRef: React.RefObject<SVGSVGElement>,
  width: number,
  height: number
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
      });

    svg.call(zoomRef.current);

    const resetButtonGroup = svg
      .append("g")
      .attr("class", "reset-view-button")
      .attr(
        "transform",
        `translate(${width - DEFAULT_CONFIG.margin.right - 60}, ${DEFAULT_CONFIG.margin.top + 10})`
      )
      .attr("cursor", "pointer")
      .on("click", () => {
        if (zoomRef.current) {
          svg.transition().duration(750).call(zoomRef.current.transform, d3.zoomIdentity);
        }
      });

    resetButtonGroup
      .append("rect")
      .attr("width", 40)
      .attr("height", 40)
      .attr("rx", 6)
      .attr("fill", COLORS.BUTTON_BG)
      .attr("stroke", COLORS.BUTTON_BORDER)
      .attr("stroke-width", 1)
      .attr("class", "hover:fill-gray-100");

    resetButtonGroup
      .append("g")
      .attr("fill", "none")
      .attr("stroke", COLORS.BUTTON_TEXT)
      .attr("stroke-linecap", "round")
      .attr("stroke-linejoin", "round")
      .attr("transform", "translate(12, 10) scale(1.2)")
      .append("path")
      .attr(
        "d",
        "m3.98652376 1.07807068c-2.38377179 1.38514556-3.98652376 3.96636605-3.98652376 6.92192932 0 4.418278 3.581722 8 8 8s8-3.581722 8-8-3.581722-8-8-8"
      )
      .attr("transform", "matrix(0 1 1 0 0 0)")
      .attr("stroke-width", 1.2);

    resetButtonGroup
      .select("g")
      .append("path")
      .attr("d", "m4 1v4h-4")
      .attr("transform", "matrix(0 1 1 0 0 0) matrix(1 0 0 -1 0 6)")
      .attr("stroke-width", 1.2);

    resetButtonGroup
      .append("text")
      .attr("x", 20)
      .attr("y", 55)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("fill", COLORS.BUTTON_TEXT)
      .text("Reset View");

    return () => {
      if (zoomRef.current) {
        svg.on(".zoom", null);
        zoomRef.current = null;
      }
      mainGroupRef.current = null;
      brushGroupRef.current = null;
      svg.selectAll("*").remove();
    };
  }, [svgRef, width, height]);

  return { zoomRef, mainGroupRef, brushGroupRef } as const;
}


