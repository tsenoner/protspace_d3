"use client";

import { useEffect } from "react";
import type React from "react";
import * as d3 from "d3";
import { PlotDataPoint } from "../types";
import { COLORS } from "../constants";

type Factories = {
  getColor: (d: PlotDataPoint) => string;
  getShape: (d: PlotDataPoint) => d3.SymbolType;
  getOpacity: (d: PlotDataPoint) => number;
  getStrokeWidth: (d: PlotDataPoint) => number;
  getStrokeColor: (d: PlotDataPoint) => string;
  getSize: (d: PlotDataPoint) => number;
};

export function useRenderPoints(
  svgRef: React.RefObject<SVGSVGElement>,
  mainGroupRef: React.MutableRefObject<d3.Selection<SVGGElement, unknown, null, undefined> | null>,
  plotData: PlotDataPoint[],
  scales: { x: d3.ScaleLinear<number, number, never>; y: d3.ScaleLinear<number, number, never> } | null,
  factories: Factories,
  highlightedProteinIds: string[],
  selectedProteinIds: string[],
  selectionMode: boolean,
  zoomTransform: d3.ZoomTransform | null,
  setTooltipData: (data: { x: number; y: number; protein: PlotDataPoint } | null) => void,
  onProteinClick?: (id: string, event: React.MouseEvent) => void,
  onProteinHover?: (id: string | null) => void,
  onViewStructure?: (id: string) => void
) {
  useEffect(() => {
    if (!svgRef.current || !mainGroupRef.current || !scales || plotData.length === 0) return;

    const { getColor, getShape, getOpacity, getSize, getStrokeWidth, getStrokeColor } = factories;
    const t = d3.transition().duration(250);
    const pointsGroup = mainGroupRef.current;

    const points = pointsGroup
      .selectAll<SVGPathElement, PlotDataPoint>(".protein-point")
      .data(plotData, (d) => d.id);

    points.exit().transition(t).attr("opacity", 0).remove();

    const enterPoints = points
      .enter()
      .append("path")
      .attr("class", "protein-point")
      .attr("d", (d) => d3.symbol().type(getShape(d)).size(getSize(d))())
      .attr("fill", (d) => getColor(d))
      .attr("stroke", (d) => (highlightedProteinIds.includes(d.id) ? COLORS.SELECTION_RED : getStrokeColor(d)))
      .attr("stroke-width", (d) => (highlightedProteinIds.includes(d.id) ? 3 : getStrokeWidth(d)))
      .attr("opacity", 0)
      .attr("transform", (d) => `translate(${scales.x(d.x)}, ${scales.y(d.y)})`)
      .attr("cursor", "pointer")
      .attr("data-protein-id", (d) => d.id)
      .on("mouseover", (event, d) => {
        d3.select(event.currentTarget).transition().duration(100).attr("stroke-width", getStrokeWidth(d) + 1);
        setTooltipData({ x: event.pageX, y: event.pageY, protein: d });
        if (onProteinHover) onProteinHover(d.id);
      })
      .on("mouseout", (event, d) => {
        if (highlightedProteinIds.includes(d.id)) {
          d3.select(event.currentTarget).transition().duration(100).attr("stroke-width", 3);
        } else {
          d3.select(event.currentTarget).transition().duration(100).attr("stroke-width", getStrokeWidth(d));
        }
        setTooltipData(null);
        if (onProteinHover) onProteinHover(null);
      })
      .on("click", (event, d) => {
        if (event.altKey && onViewStructure) {
          onViewStructure(d.id);
          return;
        }

        const clicked = event.currentTarget as SVGPathElement;
        if (!selectionMode) {
          d3.select(clicked).attr("stroke", COLORS.SELECTION_RED).attr("stroke-width", 3).attr("stroke-opacity", 1);
        }

        if (onProteinClick) {
          const isSelected = selectedProteinIds.includes(d.id);
          const shouldToggle = event.ctrlKey || event.metaKey || event.shiftKey;
          const modifiedEvent = {
            ...event,
            ctrlKey: shouldToggle ? isSelected : true,
            metaKey: shouldToggle ? isSelected : true,
            shiftKey: shouldToggle ? isSelected : true,
          } as React.MouseEvent;
          onProteinClick(d.id, modifiedEvent);

          if (!selectionMode && onViewStructure) onViewStructure(d.id);

          if (shouldToggle && isSelected) {
            d3.select(clicked).attr("stroke-width", 1).attr("stroke", COLORS.STROKE_DARK_GRAY).attr("stroke-opacity", 1);
          } else if (!selectionMode) {
            d3.select(clicked).attr("stroke", COLORS.SELECTION_RED).attr("stroke-width", 3).attr("stroke-opacity", 1);
          }
        }

        if (!selectionMode) {
          setTimeout(() => {
            if (pointsGroup) {
              const point = pointsGroup.select(`[data-protein-id="${d.id}"]`);
              if (!point.empty()) {
                point.attr("stroke", COLORS.SELECTION_RED).attr("stroke-width", 3).attr("stroke-opacity", 1);
              }
            }
          }, 100);
        }
      })
      .on("contextmenu", (event, d) => {
        event.preventDefault();
        if (onViewStructure) onViewStructure(d.id);
      });

    enterPoints.transition(t).attr("opacity", (d) => getOpacity(d));

    const allPoints = pointsGroup.selectAll("[data-protein-id]");
    allPoints.classed("highlighted", false);
    if (highlightedProteinIds.length > 0) {
      const highlightedSelector = highlightedProteinIds.map((id) => `[data-protein-id="${id}"]`).join(", ");
      pointsGroup.selectAll(highlightedSelector).classed("highlighted", true);
    }

    points
      .transition(t)
      .attr("d", (d) => d3.symbol().type(getShape(d)).size(getSize(d))())
      .attr("fill", (d) => getColor(d))
      .attr("opacity", (d) => getOpacity(d))
      .attr("stroke", (d) => (highlightedProteinIds.includes(d.id) ? COLORS.SELECTION_RED : factories.getStrokeColor(d)))
      .attr("stroke-width", (d) => (highlightedProteinIds.includes(d.id) ? 3 : factories.getStrokeWidth(d)))
      .attr("transform", (d) => `translate(${scales.x(d.x)}, ${scales.y(d.y)})`);

    setTimeout(() => {
      const allPointsAfterTransition = pointsGroup.selectAll("[data-protein-id]");
      allPointsAfterTransition.classed("highlighted", false);
      if (highlightedProteinIds.length > 0) {
        const highlightedSelector = highlightedProteinIds.map((id) => `[data-protein-id="${id}"]`).join(", ");
        pointsGroup.selectAll(highlightedSelector).classed("highlighted", true);
      }
    }, 300);

    if (!zoomTransform) {
      // leave zoom state to other logic; no reset here
    }
  }, [svgRef, mainGroupRef, plotData, scales, factories, highlightedProteinIds, selectedProteinIds, selectionMode, zoomTransform, setTooltipData, onProteinClick, onProteinHover, onViewStructure]);
}


