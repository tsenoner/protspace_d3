"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as d3 from "d3";

// Types
export interface Feature {
  values: string[];
  colors: string[];
  shapes: string[];
}

export interface Projection {
  name: string;
  metadata?: Record<string, unknown>;
  data: [number, number][]; // Array of [x, y] coordinates
}

export interface VisualizationData {
  protein_ids: string[];
  projections: Projection[];
  features: Record<string, Feature>;
  feature_data: Record<string, number[]>;
}

interface PlotDataPoint {
  id: string;
  x: number;
  y: number;
  featureValues: Record<string, string | null>;
  originalIndex: number;
}

export interface ScatterplotProps {
  data: VisualizationData | null;
  width?: number;
  height?: number;
  selectedProjectionIndex: number;
  selectedFeature: string;
  highlightedProteinIds: string[];
  selectedProteinIds: string[];
  isolationMode: boolean;
  selectionMode: boolean;
  hiddenFeatureValues?: string[];
  baseOpacity?: number;
  selectedOpacity?: number;
  fadedOpacity?: number;
  className?: string;
  onProteinClick?: (proteinId: string) => void;
  onProteinHover?: (proteinId: string | null) => void;
  onViewStructure?: (proteinId: string | null) => void;
}

// Constants
const DEFAULT_CONFIG = {
  width: 800,
  height: 600,
  margin: { top: 40, right: 40, bottom: 40, left: 40 },
  baseOpacity: 0.8,
  selectedOpacity: 1.0,
  fadedOpacity: 0.2,
  pointSize: 80,
  highlightedPointSize: 120,
  selectedPointSize: 150,
  zoomExtent: [0.1, 10] as [number, number],
};

const DEFAULT_STYLES = {
  other: {
    color: "#888888",
    shape: d3.symbolCircle,
  },
  null: {
    color: "#888888",
    shape: d3.symbolCircle,
  },
};

const SHAPE_MAPPING = {
  asterisk: d3.symbolAsterisk,
  circle: d3.symbolCircle,
  cross: d3.symbolCross,
  diamond: d3.symbolDiamond,
  diamond_stroke: d3.symbolDiamond2,
  plus: d3.symbolPlus,
  square: d3.symbolSquare,
  square_stroke: d3.symbolSquare2,
  star: d3.symbolStar,
  triangle: d3.symbolTriangle,
  triangle_stroke: d3.symbolTriangle2,
  wye: d3.symbolWye,
  times: d3.symbolTimes,
} as const;

export default function ImprovedScatterplot({
  data,
  width = DEFAULT_CONFIG.width,
  height = DEFAULT_CONFIG.height,
  selectedProjectionIndex,
  selectedFeature,
  highlightedProteinIds = [],
  selectedProteinIds = [],
  isolationMode = false,
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
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const mainGroupRef = useRef<d3.Selection<
    SVGGElement,
    unknown,
    null,
    undefined
  > | null>(null);
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

  // Process protein data when inputs change - memoize to prevent unnecessary recalculations
  const plotData = useMemo(() => {
    if (!data || !data.projections[selectedProjectionIndex]) return [];

    const processedData: PlotDataPoint[] = data.protein_ids.map((id, index) => {
      // Get coordinates from selected projection
      const coordinates = data.projections[selectedProjectionIndex].data[
        index
      ] as [number, number];

      // Map feature values for this protein
      const featureValues: Record<string, string | null> = {};
      Object.keys(data.features).forEach((featureKey) => {
        const featureIndex = data.feature_data[featureKey][index];
        featureValues[featureKey] =
          data.features[featureKey].values[featureIndex] || null;
      });

      return {
        id,
        x: coordinates[0],
        y: coordinates[1],
        featureValues,
        originalIndex: index,
      };
    });

    // Filter data if in isolation mode
    return isolationMode
      ? processedData.filter((p) => selectedProteinIds.includes(p.id))
      : processedData;
  }, [data, selectedProjectionIndex, isolationMode, selectedProteinIds]);

  // Memoize scales to prevent recalculation when other props change
  const scales = useMemo(() => {
    if (plotData.length === 0) return null;

    // Create scales
    const xExtent = d3.extent(plotData, (d) => d.x) as [number, number];
    const yExtent = d3.extent(plotData, (d) => d.y) as [number, number];

    // Add padding to the ranges
    const xPadding = Math.abs(xExtent[1] - xExtent[0]) * 0.05;
    const yPadding = Math.abs(yExtent[1] - yExtent[0]) * 0.05;

    return {
      x: d3
        .scaleLinear()
        .domain([xExtent[0] - xPadding, xExtent[1] + xPadding])
        .range([
          DEFAULT_CONFIG.margin.left,
          width - DEFAULT_CONFIG.margin.right,
        ]),

      y: d3
        .scaleLinear()
        .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
        .range([
          height - DEFAULT_CONFIG.margin.bottom,
          DEFAULT_CONFIG.margin.top,
        ]),
    };
  }, [plotData, width, height]);

  // Callbacks remain mostly the same, but simplified
  const getColor = useCallback(
    (protein: PlotDataPoint) => {
      if (!data || !data.features[selectedFeature])
        return DEFAULT_STYLES.other.color;

      const featureValue = protein.featureValues[selectedFeature];
      if (featureValue === null) {
        // Find the index of null in the feature values array
        const nullIndex = data.features[selectedFeature].values.findIndex(
          (v) => v === null
        );
        // Use the feature-defined color for null if available, otherwise use default
        return nullIndex !== -1
          ? data.features[selectedFeature].colors[nullIndex]
          : DEFAULT_STYLES.null.color;
      }

      const valueIndex =
        data.features[selectedFeature].values.indexOf(featureValue);
      return valueIndex === -1
        ? DEFAULT_STYLES.other.color
        : data.features[selectedFeature].colors[valueIndex];
    },
    [data, selectedFeature]
  );

  const getShape = useCallback(
    (protein: PlotDataPoint) => {
      if (!data || !data.features[selectedFeature])
        return DEFAULT_STYLES.other.shape;

      const featureValue = protein.featureValues[selectedFeature];
      if (featureValue === null) {
        // Find the index of null in the feature values array
        const nullIndex = data.features[selectedFeature].values.findIndex(
          (v) => v === null
        );
        // Use the feature-defined shape for null if available, otherwise use default
        if (nullIndex !== -1) {
          const shapeName = data.features[selectedFeature].shapes[
            nullIndex
          ] as keyof typeof SHAPE_MAPPING;
          return SHAPE_MAPPING[shapeName] || DEFAULT_STYLES.null.shape;
        }
        return DEFAULT_STYLES.null.shape;
      }

      const valueIndex =
        data.features[selectedFeature].values.indexOf(featureValue);
      if (valueIndex === -1) return DEFAULT_STYLES.other.shape;

      const shapeName = data.features[selectedFeature].shapes[
        valueIndex
      ] as keyof typeof SHAPE_MAPPING;
      return SHAPE_MAPPING[shapeName] || DEFAULT_STYLES.other.shape;
    },
    [data, selectedFeature]
  );

  const getOpacity = useCallback(
    (protein: PlotDataPoint) => {
      // Get the feature value for this protein
      const featureValue = protein.featureValues[selectedFeature];

      // Check if this feature value is hidden
      // For null values, we check if "null" string is in hiddenFeatureValues
      if (
        (featureValue !== null && hiddenFeatureValues.includes(featureValue)) ||
        (featureValue === null && hiddenFeatureValues.includes("null"))
      ) {
        return 0;
      }

      if (
        highlightedProteinIds.includes(protein.id) ||
        selectedProteinIds.includes(protein.id)
      ) {
        return selectedOpacity;
      }

      if (
        selectedProteinIds.length > 0 &&
        !selectedProteinIds.includes(protein.id)
      ) {
        return fadedOpacity;
      }

      return baseOpacity;
    },
    [
      highlightedProteinIds,
      selectedProteinIds,
      baseOpacity,
      selectedOpacity,
      fadedOpacity,
      selectedFeature,
      hiddenFeatureValues,
    ]
  );

  // Get stroke width based on selection state
  const getStrokeWidth = useCallback(
    (protein: PlotDataPoint) => {
      if (selectedProteinIds.includes(protein.id)) {
        return 3; // Thicker border for selected proteins
      }
      if (highlightedProteinIds.includes(protein.id)) {
        return 2; // Medium border for highlighted proteins
      }
      return 1; // Default border width
    },
    [selectedProteinIds, highlightedProteinIds]
  );

  // Get stroke color based on selection state
  const getStrokeColor = useCallback(
    (protein: PlotDataPoint) => {
      if (selectedProteinIds.includes(protein.id)) {
        return "#FF5500"; // Orange-red border for selected proteins
      }
      if (highlightedProteinIds.includes(protein.id)) {
        return "#3B82F6"; // Blue border for highlighted proteins
      }
      return "#333333"; // Default dark gray border
    },
    [selectedProteinIds, highlightedProteinIds]
  );

  // Get size based on selection/highlight state
  const getSize = useCallback(
    (protein: PlotDataPoint) => {
      if (selectedProteinIds.includes(protein.id)) {
        return DEFAULT_CONFIG.selectedPointSize; // Largest for selected
      }
      if (highlightedProteinIds.includes(protein.id)) {
        return DEFAULT_CONFIG.highlightedPointSize; // Medium for highlighted
      }
      return DEFAULT_CONFIG.pointSize; // Default size
    },
    [highlightedProteinIds, selectedProteinIds]
  );

  // Initialize the SVG and zoom behavior only once
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);

    // Create the main container group once
    mainGroupRef.current = svg
      .append("g")
      .attr("class", "scatter-plot-container");

    // Create zoom behavior
    zoomRef.current = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent(DEFAULT_CONFIG.zoomExtent)
      .on("zoom", (event) => {
        if (mainGroupRef.current) {
          mainGroupRef.current.attr("transform", event.transform);
          setZoomTransform(event.transform);
        }
      });

    svg.call(zoomRef.current);

    // Create reset view button with improved visibility
    const resetButtonGroup = svg
      .append("g")
      .attr("class", "reset-view-button")
      .attr(
        "transform",
        `translate(${width - DEFAULT_CONFIG.margin.right - 60}, ${
          DEFAULT_CONFIG.margin.top + 10
        })`
      )
      .attr("cursor", "pointer")
      .on("click", () => {
        if (zoomRef.current) {
          svg
            .transition()
            .duration(750)
            .call(zoomRef.current.transform, d3.zoomIdentity);
        }
      });

    // Button background
    resetButtonGroup
      .append("rect")
      .attr("width", 40)
      .attr("height", 40)
      .attr("rx", 6)
      .attr("fill", "rgba(255,255,255,0.9)")
      .attr("stroke", "#aaa")
      .attr("stroke-width", 1)
      .attr("class", "hover:fill-gray-100");

    // Reset icon
    resetButtonGroup
      .append("g")
      .attr("fill", "none")
      .attr("stroke", "#666")
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

    // Add the arrow part
    resetButtonGroup
      .select("g")
      .append("path")
      .attr("d", "m4 1v4h-4")
      .attr("transform", "matrix(0 1 1 0 0 0) matrix(1 0 0 -1 0 6)")
      .attr("stroke-width", 1.2);

    // Text label
    resetButtonGroup
      .append("text")
      .attr("x", 20)
      .attr("y", 55)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("fill", "#666")
      .text("Reset View");

    // Reset zoom on unmount
    return () => {
      if (zoomRef.current) {
        svg.on(".zoom", null); // Remove zoom behavior
        zoomRef.current = null;
      }
      mainGroupRef.current = null;
      svg.selectAll("*").remove();
    };
  }, [width, height]); // Only recreate when dimensions change

  // Track projection changes
  useEffect(() => {
    // If projection changed, set transitioning state
    if (prevProjectionIndex.current !== selectedProjectionIndex) {
      setIsTransitioning(true);
      // Store new projection index
      prevProjectionIndex.current = selectedProjectionIndex;
    }
  }, [selectedProjectionIndex]);

  // Update points when data or visual properties change
  useEffect(() => {
    if (
      !svgRef.current ||
      !mainGroupRef.current ||
      !scales ||
      plotData.length === 0
    ) {
      setIsDataLoaded(false);
      return;
    }

    // Data is available for rendering
    setIsDataLoaded(true);

    // Transition duration - longer when switching projections
    const transitionDuration = isTransitioning ? 750 : 250;
    const t = d3.transition().duration(transitionDuration);
    const pointsGroup = mainGroupRef.current;

    // Wait for transition to complete before updating transitioning state
    if (isTransitioning) {
      setTimeout(() => setIsTransitioning(false), transitionDuration + 50);
    }

    // Efficient update pattern with D3's enter/update/exit pattern
    const points = pointsGroup
      .selectAll<SVGPathElement, PlotDataPoint>(".protein-point")
      .data(plotData, (d) => d.id); // Use protein ID as the key for stable updates

    // Remove exiting points with transition
    points.exit().transition(t).attr("opacity", 0).remove();

    // Add new points
    const enterPoints = points
      .enter()
      .append("path")
      .attr("class", "protein-point")
      .attr("d", (d) => d3.symbol().type(getShape(d)).size(getSize(d))())
      .attr("fill", (d) => getColor(d))
      .attr("stroke", (d) => getStrokeColor(d))
      .attr("stroke-width", (d) => getStrokeWidth(d))
      .attr("opacity", 0) // Start invisible for transition
      .attr("transform", (d) => `translate(${scales.x(d.x)}, ${scales.y(d.y)})`)
      .attr("cursor", "pointer")
      .attr("data-protein-id", (d) => d.id)
      .on("mouseover", (event, d) => {
        d3.select(event.currentTarget)
          .transition()
          .duration(100)
          .attr("stroke-width", getStrokeWidth(d) + 1);

        // Create a hover tooltip with protein info and a 3D view icon
        setTooltipData({
          x: event.pageX,
          y: event.pageY,
          protein: d,
        });

        if (onProteinHover) onProteinHover(d.id);
      })
      .on("mouseout", (event, d) => {
        d3.select(event.currentTarget)
          .transition()
          .duration(100)
          .attr("stroke-width", getStrokeWidth(d));

        setTooltipData(null);
        if (onProteinHover) onProteinHover(null);
      })
      .on("click", (event, d) => {
        // If Alt/Option key is pressed, show structure instead of selecting
        if (event.altKey && onViewStructure) {
          onViewStructure(d.id);
          return;
        }

        // If in selection mode, handle protein selection
        if (selectionMode && onProteinClick) {
          onProteinClick(d.id);

          // Animate the selection with a quick pulse effect
          d3.select(event.currentTarget)
            .transition()
            .duration(150)
            .attr("stroke-width", 5)
            .attr("stroke-opacity", 1)
            .transition()
            .duration(150)
            .attr("stroke-width", getStrokeWidth(d))
            .attr("stroke-opacity", 0.8);
        }
      })
      // Add right-click handler to view structure
      .on("contextmenu", (event, d) => {
        // Prevent browser context menu from appearing
        event.preventDefault();

        // View protein structure
        if (onViewStructure) {
          onViewStructure(d.id);
        }
      });

    // Fade in new points
    enterPoints.transition(t).attr("opacity", (d) => getOpacity(d));

    // Update existing points
    points
      .transition(t)
      .attr("d", (d) => d3.symbol().type(getShape(d)).size(getSize(d))())
      .attr("fill", (d) => getColor(d))
      .attr("opacity", (d) => getOpacity(d))
      .attr("stroke", (d) => getStrokeColor(d))
      .attr("stroke-width", (d) => getStrokeWidth(d))
      .attr(
        "transform",
        (d) => `translate(${scales.x(d.x)}, ${scales.y(d.y)})`
      );

    // Reset zoom if needed (but only if not already set)
    if (!zoomTransform && zoomRef.current) {
      d3.select(svgRef.current).call(
        zoomRef.current.transform,
        d3.zoomIdentity
      );
    }
  }, [
    plotData,
    scales,
    getColor,
    getShape,
    getOpacity,
    getSize,
    getStrokeWidth,
    getStrokeColor,
    selectionMode,
    zoomTransform,
    onProteinClick,
    onProteinHover,
    onViewStructure,
    hiddenFeatureValues,
    isTransitioning,
  ]);

  // Effect to automatically zoom to highlighted/selected proteins when they change
  useEffect(() => {
    // Don't auto-zoom at all - auto-zooming has been disabled as requested by the user
    // Just update the previous highlights reference for tracking purposes
    prevHighlighted.current = [...highlightedProteinIds];
  }, [highlightedProteinIds, selectedProteinIds]);

  return (
    <div className={`relative ${className}`}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="bg-white border rounded-md shadow-sm dark:bg-gray-900 dark:border-gray-800"
      />

      {/* 3D Structure Hint */}
      <div className="absolute bottom-2 right-2 z-10 px-2 py-1 bg-white bg-opacity-80 text-gray-700 text-xs rounded-md flex items-center shadow-sm dark:bg-gray-800 dark:bg-opacity-80 dark:text-gray-200">
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
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
        <span>Right-click protein to view 3D structure</span>
      </div>

      {/* Loading overlay */}
      {(!isDataLoaded || isTransitioning) && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 dark:bg-gray-900 dark:bg-opacity-70 z-10 rounded-md">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              {isTransitioning ? "Changing projection..." : "Loading data..."}
            </p>
          </div>
        </div>
      )}

      {/* Isolation mode indicator */}
      {isolationMode && selectedProteinIds.length > 0 && (
        <div className="absolute top-2 left-2 z-10 px-2 py-1 bg-blue-500 text-white text-xs rounded-md flex items-center">
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
            Isolation Mode: Showing {selectedProteinIds.length} proteins
          </span>
        </div>
      )}

      {/* Tooltip */}
      {tooltipData && (
        <div
          className="absolute z-10 p-2 bg-white rounded shadow-md border text-sm dark:bg-gray-800 dark:border-gray-700"
          style={{
            left: tooltipData.x + 10,
            top:
              tooltipData.y > height / 2
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
          <div className="text-xs mt-1 flex items-center text-gray-500">
            Right-click to view 3D structure
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
      )}
    </div>
  );
}
