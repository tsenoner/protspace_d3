"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import { DEFAULT_CONFIG, COLORS } from "./constants";
import {
  computePlotData,
  buildScales,
  getColorFactory,
  getShapeFactory,
  getOpacityFactory,
  getStrokeColorFactory,
  getStrokeWidthFactory,
  getSizeFactory,
} from "./utils";
import { PlotDataPoint, ScatterplotProps } from "./types";
import { useResponsiveDimensions } from "./hooks/useResponsiveDimensions";
import { useZoomSetup } from "./hooks/useZoomSetup";
import { useBrushSelection } from "./hooks/useBrushSelection";
import { useRenderPoints } from "./hooks/useRenderPoints";

export default function ImprovedScatterplot({
  data,
  width = DEFAULT_CONFIG.width,
  height = DEFAULT_CONFIG.height,
  selectedProjectionIndex,
  selectedFeature,
  highlightedProteinIds = [],
  selectedProteinIds = [],
  isolationMode = false,
  splitHistory,
  selectionMode = false,
  hiddenFeatureValues = [],
  baseOpacity = DEFAULT_CONFIG.baseOpacity,
  selectedOpacity = DEFAULT_CONFIG.selectedOpacity,
  fadedOpacity = DEFAULT_CONFIG.fadedOpacity,
  className = "",
  onProteinClick,
  onProteinHover,
  onViewStructure,
}: ScatterplotProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltipData, setTooltipData] = useState<{
    x: number;
    y: number;
    protein: PlotDataPoint;
  } | null>(null);
  const [zoomTransform, setZoomTransform] = useState<d3.ZoomTransform | null>(
    null
  );
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const prevProjectionIndex = useRef(selectedProjectionIndex);
  const prevHighlighted = useRef<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const { dimensions } = useResponsiveDimensions(containerRef, { width, height });

  // Process protein data when inputs change - memoize to prevent unnecessary recalculations
  const plotData = useMemo(() => {
    if (!data) return [] as PlotDataPoint[];
    return computePlotData(
      data,
      selectedProjectionIndex,
      isolationMode,
      splitHistory
    );
  }, [data, selectedProjectionIndex, isolationMode, splitHistory]);

  // Memoize scales to prevent recalculation when other props change
  const scales = useMemo(() => {
    return buildScales(plotData, dimensions.width, dimensions.height);
  }, [plotData, dimensions.width, dimensions.height]);

  // Factories for visual encodings
  const getColor = useMemo(
    () => getColorFactory(data, selectedFeature),
    [data, selectedFeature]
  );

  const getShape = useMemo(
    () => getShapeFactory(data, selectedFeature),
    [data, selectedFeature]
  );

  const getOpacity = useMemo(
    () =>
      getOpacityFactory(
        selectedFeature,
        hiddenFeatureValues,
        highlightedProteinIds,
        selectedProteinIds,
        selectionMode,
        baseOpacity,
        selectedOpacity,
        fadedOpacity
      ),
    [
      selectedFeature,
      hiddenFeatureValues,
      highlightedProteinIds,
      selectedProteinIds,
      selectionMode,
      baseOpacity,
      selectedOpacity,
      fadedOpacity,
    ]
  );

  const getStrokeWidth = useMemo(
    () => getStrokeWidthFactory(highlightedProteinIds, selectedProteinIds),
    [highlightedProteinIds, selectedProteinIds]
  );

  const getStrokeColor = useMemo(
    () => getStrokeColorFactory(highlightedProteinIds, selectedProteinIds),
    [highlightedProteinIds, selectedProteinIds]
  );

  const getSize = useMemo(
    () => getSizeFactory(highlightedProteinIds, selectedProteinIds),
    [highlightedProteinIds, selectedProteinIds]
  );

  // Initialize SVG, layers, and zoom via hook
  const { zoomRef, mainGroupRef, brushGroupRef } = useZoomSetup(
    svgRef,
    dimensions.width,
    dimensions.height
  );

  // Setup or remove brush based on selection mode via hook
  useBrushSelection(
    svgRef,
    brushGroupRef,
    zoomRef,
    selectionMode,
    plotData,
    scales,
    dimensions.width,
    dimensions.height,
    onProteinClick
  );

  // Track projection changes
  useEffect(() => {
    // If projection changed, set transitioning state
    if (prevProjectionIndex.current !== selectedProjectionIndex) {
      setIsTransitioning(true);
      // Store new projection index
      prevProjectionIndex.current = selectedProjectionIndex;
    }
  }, [selectedProjectionIndex]);

  // Render and update points via hook
  useEffect(() => {
    if (isTransitioning) {
      const timer = setTimeout(() => setIsTransitioning(false), 800);
      return () => clearTimeout(timer);
    }
  }, [isTransitioning]);

  useRenderPoints(
    svgRef,
    mainGroupRef,
    plotData,
    scales,
    {
    getColor,
    getShape,
    getOpacity,
    getStrokeWidth,
    getStrokeColor,
    getSize,
    },
    highlightedProteinIds,
    selectedProteinIds,
    selectionMode,
    zoomTransform,
    setTooltipData,
    onProteinClick,
    onProteinHover,
    onViewStructure
  );

  // Effect to automatically zoom to highlighted/selected proteins when they change
  useEffect(() => {
    // Don't auto-zoom at all - auto-zooming has been disabled as requested by the user
    // Just update the previous highlights reference for tracking purposes
    prevHighlighted.current = [...highlightedProteinIds];
  }, [highlightedProteinIds, selectedProteinIds]);

  // Track data readiness for loading overlay
  useEffect(() => {
    setIsDataLoaded(Boolean(scales && plotData.length > 0));
  }, [scales, plotData]);

  return (
    <div
      className={`relative ${className} h-full w-full overflow-hidden`}
      ref={containerRef}
    >
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className={`w-full h-full bg-white ${
          selectionMode ? "cursor-crosshair" : "cursor-grab"
        }`}
        style={{ display: "block", border: "none", margin: 0, padding: 0 }}
      />

      {/* Loading overlay */}
      {(!isDataLoaded || isTransitioning) && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 z-10">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="mt-2 text-gray-600">
              {isTransitioning ? "Changing projection..." : "Loading data..."}
            </p>
          </div>
        </div>
      )}

      {/* Isolation mode indicator */}
      {isolationMode && splitHistory && (
        <div className="absolute top-2 left-2 z-10 px-2 py-1 bg-primary text-white text-xs rounded-md flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          <span>
            Split Mode: Showing {plotData.length} proteins (
            {splitHistory.length} splits)
          </span>
        </div>
      )}

      {/* Selection Mode Indicator */}
      {selectionMode && (
        <div className="absolute top-2 right-2 z-10 px-2 py-1 bg-primary text-white text-xs rounded-md flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            {/* Outer rectangle (selection box) */}
            <rect
              x="3"
              y="3"
              width="18"
              height="18"
              rx="1"
              strokeWidth="1.5"
              stroke="currentColor"
              strokeDasharray="2 1"
              fill="none"
            />

            {/* Dots representing data points */}
            <circle cx="8" cy="8" r="1.5" fill="currentColor" />
            <circle cx="12" cy="14" r="1.5" fill="currentColor" />
            <circle cx="16" cy="10" r="1.5" fill="currentColor" />
            <circle cx="7" cy="16" r="1.5" fill="currentColor" />
            <circle cx="17" cy="17" r="1.5" fill="currentColor" />
          </svg>
          <span>Selection Mode: Drag to select proteins</span>
        </div>
      )}

      {/* Tooltip */}
      {tooltipData && (
        <div
          className="absolute z-10 p-2 bg-white rounded shadow-md border text-sm"
          style={{
            left: tooltipData.x + 10,
            top:
              tooltipData.y > dimensions.height / 2
                ? tooltipData.y - 120 // Position above when in bottom half
                : tooltipData.y + 10, // Position below when in top half
            pointerEvents: "none",
            transform: "translateY(-50%)", // Center vertically relative to the point
            maxWidth: "200px", // Limit width to prevent overflow
            wordWrap: "break-word", // Allow text to wrap
          }}
        >
          <div className="font-bold">{tooltipData.protein.id}</div>
          <div className="text-xs">
            {selectedFeature}:{" "}
            {tooltipData.protein.featureValues[selectedFeature] || "N/A"}
          </div>
          <div className="text-xs mt-1 text-gray-500">
            <div className="flex items-center mb-1">
              Click to add to selection
            </div>
            <div className="flex items-center mb-1">
              Ctrl+Click to toggle selection
            </div>
            <div className="flex items-center">
              Alt+Click to view 3D structure
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 ml-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
