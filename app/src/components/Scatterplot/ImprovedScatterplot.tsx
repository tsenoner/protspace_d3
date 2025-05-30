"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as d3 from "d3";

// Types
export interface Feature {
  values: (string | null)[];
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
  splitHistory?: string[][];
  selectionMode: boolean;
  hiddenFeatureValues?: string[];
  baseOpacity?: number;
  selectedOpacity?: number;
  fadedOpacity?: number;
  className?: string;
  onProteinClick?: (proteinId: string, event?: React.MouseEvent) => void;
  onProteinHover?: (proteinId: string | null) => void;
  onViewStructure?: (proteinId: string | null) => void;
}

// Constants
const DEFAULT_CONFIG = {
  width: 1100,
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

// Color constants
const COLORS = {
  // Selection and highlighting
  SELECTION_RED: "#fa2c37",

  // Default colors
  DEFAULT_GRAY: "#888888",
  STROKE_DARK_GRAY: "#333333",

  // UI colors
  BUTTON_BORDER: "#aaa",
  BUTTON_TEXT: "#666",

  // Brush colors
  BRUSH_STROKE: "#fa2c37",
  BRUSH_FILL: "rgba(59, 130, 246, 0.15)",

  // Background colors
  BUTTON_BG: "rgba(255,255,255,0.9)",
} as const;

const DEFAULT_STYLES = {
  other: {
    color: COLORS.DEFAULT_GRAY,
    shape: d3.symbolCircle,
  },
  null: {
    color: COLORS.DEFAULT_GRAY,
    shape: d3.symbolCircle,
  },
};

const SHAPE_MAPPING = {
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
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const mainGroupRef = useRef<d3.Selection<
    SVGGElement,
    unknown,
    null,
    undefined
  > | null>(null);
  const brushRef = useRef<d3.BrushBehavior<unknown> | null>(null);
  const brushGroupRef = useRef<d3.Selection<
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width, height });

  // Add ResizeObserver to make the component responsive
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({
            width: Math.max(width, 300), // Minimum width
            height: Math.max(height, 200), // Minimum height
          });
        }
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

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
          featureIndex !== undefined &&
          featureIndex !== null &&
          Array.isArray(data.features[featureKey].values) &&
          featureIndex >= 0 &&
          featureIndex < data.features[featureKey].values.length
            ? data.features[featureKey].values[featureIndex] || null
            : null;
      });

      return {
        id,
        x: coordinates[0],
        y: coordinates[1],
        featureValues,
        originalIndex: index,
      };
    });

    // Filter data based on split history when in isolation mode
    if (isolationMode && splitHistory && splitHistory.length > 0) {
      // For the first split, get all the selected proteins
      let filteredData = processedData.filter((p) =>
        splitHistory[0].includes(p.id)
      );

      // For each subsequent split, further filter the remaining proteins
      if (splitHistory.length > 1) {
        // Apply each split operation in sequence (they work as progressive filters)
        for (let i = 1; i < splitHistory.length; i++) {
          // Get the IDs from the current split
          const splitIds = splitHistory[i];
          // Filter the data to only include proteins that match this split
          filteredData = filteredData.filter((p) => splitIds.includes(p.id));
        }
      }

      return filteredData;
    }

    return processedData;
  }, [data, selectedProjectionIndex, isolationMode, splitHistory]);

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
          dimensions.width - DEFAULT_CONFIG.margin.right,
        ]),

      y: d3
        .scaleLinear()
        .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
        .range([
          dimensions.height - DEFAULT_CONFIG.margin.bottom,
          DEFAULT_CONFIG.margin.top,
        ]),
    };
  }, [plotData, dimensions.width, dimensions.height]);

  // Callbacks remain mostly the same, but simplified
  const getColor = useCallback(
    (protein: PlotDataPoint) => {
      if (!data || !data.features[selectedFeature])
        return DEFAULT_STYLES.other.color;

      const featureValue = protein.featureValues[selectedFeature];
      if (featureValue === null) {
        // Find the index of null in the feature values array
        const values = data.features[selectedFeature].values;
        const nullIndex =
          values && Array.isArray(values)
            ? values.findIndex((v) => v === null)
            : -1;
        // Use the feature-defined color for null if available, otherwise use default
        return nullIndex !== -1 &&
          data.features[selectedFeature].colors &&
          nullIndex in data.features[selectedFeature].colors
          ? data.features[selectedFeature].colors[nullIndex]
          : DEFAULT_STYLES.null.color;
      }

      const valueIndex =
        data.features[selectedFeature].values &&
        Array.isArray(data.features[selectedFeature].values)
          ? data.features[selectedFeature].values.indexOf(featureValue)
          : -1;
      return valueIndex === -1 ||
        !data.features[selectedFeature].colors ||
        !(valueIndex in data.features[selectedFeature].colors)
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
        const values = data.features[selectedFeature].values;
        const nullIndex =
          values && Array.isArray(values)
            ? values.findIndex((v) => v === null)
            : -1;
        // Use the feature-defined shape for null if available, otherwise use default
        if (
          nullIndex !== -1 &&
          data.features[selectedFeature].shapes &&
          nullIndex in data.features[selectedFeature].shapes
        ) {
          const shapeName = data.features[selectedFeature].shapes[
            nullIndex
          ] as keyof typeof SHAPE_MAPPING;
          return SHAPE_MAPPING[shapeName] || DEFAULT_STYLES.null.shape;
        }
        return DEFAULT_STYLES.null.shape;
      }

      const valueIndex =
        data.features[selectedFeature].values &&
        Array.isArray(data.features[selectedFeature].values)
          ? data.features[selectedFeature].values.indexOf(featureValue)
          : -1;
      if (
        valueIndex === -1 ||
        !data.features[selectedFeature].shapes ||
        !(valueIndex in data.features[selectedFeature].shapes)
      )
        return DEFAULT_STYLES.other.shape;

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

      // Highlighted items should have full opacity
      if (highlightedProteinIds.includes(protein.id)) {
        return selectedOpacity;
      }

      // If we have selected items and this item is among them, show with full opacity
      if (
        selectedProteinIds.length > 0 &&
        selectedProteinIds.includes(protein.id)
      ) {
        return selectedOpacity;
      }

      // Only apply reduced opacity for unselected items when in selection mode
      if (
        selectionMode &&
        selectedProteinIds.length > 0 &&
        !selectedProteinIds.includes(protein.id)
      ) {
        return fadedOpacity;
      }

      // Default opacity for normal state
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
      selectionMode,
    ]
  );

  // Get stroke width based on selection state
  const getStrokeWidth = useCallback(
    (protein: PlotDataPoint) => {
      if (highlightedProteinIds.includes(protein.id)) {
        return 3; // Thicker border for highlighted proteins
      }
      if (selectedProteinIds.includes(protein.id)) {
        return 2; // Medium border for selected proteins
      }
      return 1; // Default border width - always ensure proteins have a border
    },
    [selectedProteinIds, highlightedProteinIds]
  );

  // Get stroke color based on selection state
  const getStrokeColor = useCallback(
    (protein: PlotDataPoint) => {
      if (highlightedProteinIds.includes(protein.id)) {
        return COLORS.SELECTION_RED;
      }
      if (selectedProteinIds.includes(protein.id)) {
        return COLORS.SELECTION_RED;
      }
      return COLORS.STROKE_DARK_GRAY;
    },
    [selectedProteinIds, highlightedProteinIds]
  );

  // Get size based on selection/highlight state
  const getSize = useCallback(
    (protein: PlotDataPoint) => {
      if (highlightedProteinIds.includes(protein.id)) {
        return DEFAULT_CONFIG.highlightedPointSize; // Medium for highlighted
      }
      if (selectedProteinIds.includes(protein.id)) {
        return DEFAULT_CONFIG.selectedPointSize; // Largest for selected
      }
      return DEFAULT_CONFIG.pointSize; // Default size
    },
    [highlightedProteinIds, selectedProteinIds]
  );

  // Initialize the SVG and zoom behavior only once
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);

    // Clear any existing content
    svg.selectAll("*").remove();

    // Create the main container group once
    mainGroupRef.current = svg
      .append("g")
      .attr("class", "scatter-plot-container");

    // Create a separate group for the brush
    brushGroupRef.current = svg.append("g").attr("class", "brush-container");

    // Create zoom behavior
    zoomRef.current = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent(DEFAULT_CONFIG.zoomExtent)
      .on("zoom", (event) => {
        if (mainGroupRef.current) {
          mainGroupRef.current.attr("transform", event.transform);
          // Also transform the brush group
          if (brushGroupRef.current) {
            brushGroupRef.current.attr("transform", event.transform);
          }
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
        `translate(${dimensions.width - DEFAULT_CONFIG.margin.right - 60}, ${
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
      .attr("fill", COLORS.BUTTON_BG)
      .attr("stroke", COLORS.BUTTON_BORDER)
      .attr("stroke-width", 1)
      .attr("class", "hover:fill-gray-100");

    // Reset icon
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
      .attr("fill", COLORS.BUTTON_TEXT)
      .text("Reset View");

    // Reset zoom on unmount
    return () => {
      if (zoomRef.current) {
        svg.on(".zoom", null); // Remove zoom behavior
        zoomRef.current = null;
      }
      if (brushRef.current) {
        svg.on(".brush", null); // Remove brush behavior
        brushRef.current = null;
      }
      mainGroupRef.current = null;
      brushGroupRef.current = null;
      svg.selectAll("*").remove();
    };
  }, [dimensions.width, dimensions.height]); // Only recreate when dimensions change

  // Setup or remove brush based on selection mode
  useEffect(() => {
    if (!svgRef.current || !brushGroupRef.current || !scales) return;

    const svg = d3.select(svgRef.current);

    // Clear any existing brush
    brushGroupRef.current.selectAll("*").remove();

    if (selectionMode) {
      // Disable zoom behavior temporarily when in selection mode to prevent camera movement
      if (zoomRef.current) {
        svg.on(".zoom", null);
      }

      // Create brush behavior
      brushRef.current = d3
        .brush()
        .extent([
          [DEFAULT_CONFIG.margin.left, DEFAULT_CONFIG.margin.top],
          [
            dimensions.width - DEFAULT_CONFIG.margin.right,
            dimensions.height - DEFAULT_CONFIG.margin.bottom,
          ],
        ])
        .on("start", () => {
          // Set a CSS class on the SVG to change the cursor style globally
          svg.classed("brushing", true);
        })
        .on("end", (event) => {
          // Remove the brushing class
          svg.classed("brushing", false);

          // Only handle selection if the brush area is not empty
          if (!event.selection) {
            // Don't re-enable zoom here - only re-enable when exiting selection mode
            return;
          }

          // Get selection bounds
          const [[x0, y0], [x1, y1]] = event.selection as [
            [number, number],
            [number, number]
          ];

          // Find proteins within the brushed area
          if (plotData.length && scales) {
            const selectedIds: string[] = [];

            plotData.forEach((d) => {
              const pointX = scales.x(d.x);
              const pointY = scales.y(d.y);

              if (
                pointX >= x0 &&
                pointX <= x1 &&
                pointY >= y0 &&
                pointY <= y1
              ) {
                selectedIds.push(d.id);
              }
            });

            // Batch select proteins
            if (selectedIds.length > 0 && onProteinClick) {
              // Use Ctrl key modifier to add to existing selection
              const isAdditive =
                event.sourceEvent &&
                (event.sourceEvent.ctrlKey || event.sourceEvent.metaKey);

              // For each selected protein, trigger the selection handler
              selectedIds.forEach((id) => {
                // Create a synthetic event with the modifier key state
                const syntheticEvent = {
                  ctrlKey: isAdditive || selectedIds.length > 1, // Always multi-select when multiple proteins are selected
                  metaKey: isAdditive || selectedIds.length > 1,
                  shiftKey: isAdditive || selectedIds.length > 1,
                } as React.MouseEvent;

                onProteinClick(id, syntheticEvent);
              });

              // Don't trigger structure viewer in selection mode
              // We're already in selection mode, so no need to check
            }

            // Reset brush after selection
            if (brushRef.current && brushGroupRef.current) {
              brushGroupRef.current.call(brushRef.current.move, null);
            }
          }

          // Don't re-enable zoom here - only re-enable when exiting selection mode
        });

      // Apply brush to the brush group
      brushGroupRef.current.call(brushRef.current);
    } else {
      // Re-enable zoom when not in selection mode
      if (zoomRef.current) {
        svg.call(zoomRef.current);
      }

      // Disable brush if not in selection mode
      brushRef.current = null;
    }

    // Add CSS to handle cursor changes and highlighted styles
    const style = document.createElement("style");
    style.innerHTML = `
      .brushing .overlay {
        cursor: crosshair !important;
      }
      
      .brush .selection {
        stroke: ${COLORS.BRUSH_STROKE};
        stroke-width: 2px;
        fill: ${COLORS.BRUSH_FILL};
        stroke-dasharray: none;
      }
      
      .brush .handle {
        display: none;
      }
      
      .protein-point.highlighted {
        stroke: ${COLORS.SELECTION_RED} !important;
        stroke-width: 3 !important;
        stroke-opacity: 1 !important;
      }
    `;
    document.head.appendChild(style);

    // Clean up
    return () => {
      document.head.removeChild(style);
    };
  }, [
    selectionMode,
    plotData,
    scales,
    dimensions.width,
    dimensions.height,
    onProteinClick,
  ]);

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
    // Don't skip rendering in isolation mode - that was causing the issue

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
      .attr("stroke", (d) => {
        // Directly check if highlighted
        if (highlightedProteinIds.includes(d.id)) {
          return COLORS.SELECTION_RED; // Red for highlighted
        }
        return getStrokeColor(d);
      })
      .attr("stroke-width", (d) => {
        // Directly check if highlighted
        if (highlightedProteinIds.includes(d.id)) {
          return 3; // Thicker for highlighted
        }
        return getStrokeWidth(d);
      })
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
        // On mouseout, reset to appropriate stroke width but keep the red color for highlighted items
        if (highlightedProteinIds.includes(d.id)) {
          d3.select(event.currentTarget)
            .transition()
            .duration(100)
            .attr("stroke-width", 3);
        } else {
          d3.select(event.currentTarget)
            .transition()
            .duration(100)
            .attr("stroke-width", getStrokeWidth(d));
        }

        setTooltipData(null);
        if (onProteinHover) onProteinHover(null);
      })
      .on("click", (event, d) => {
        // If Alt/Option key is pressed, show structure instead of selecting
        if (event.altKey && onViewStructure) {
          onViewStructure(d.id);
          return;
        }

        // Get the clicked element
        const clickedElement = event.currentTarget;

        // FORCEFULLY apply red border with no transition when not in selection mode
        if (!selectionMode) {
          // Direct styling with no transition
          d3.select(clickedElement)
            .attr("stroke", COLORS.SELECTION_RED)
            .attr("stroke-width", 3)
            .attr("stroke-opacity", 1);
        }

        // Handle protein selection - whether in selection mode or not
        if (onProteinClick) {
          // Always use additive selection by default (like search/highlighting behavior)
          // Only deselect if using modifier key to toggle selection
          const isSelected = selectedProteinIds.includes(d.id);
          const shouldToggle = event.ctrlKey || event.metaKey || event.shiftKey;

          // Create a modified event that forces additive selection behavior by default
          const modifiedEvent = {
            ...event,
            // If already selected AND modifier key pressed, allow deselection
            // Otherwise always force additive (true)
            ctrlKey: shouldToggle ? isSelected : true,
            metaKey: shouldToggle ? isSelected : true,
            shiftKey: shouldToggle ? isSelected : true,
          } as React.MouseEvent;

          // Pass the modified event to the handler
          onProteinClick(d.id, modifiedEvent);

          // Only show structure if not in selection mode
          if (!selectionMode && onViewStructure) {
            onViewStructure(d.id);
          }

          // Handle styling based on selection state
          if (shouldToggle && isSelected) {
            // Deselection animation - transition back to normal border
            d3.select(clickedElement)
              .attr("stroke-width", 1)
              .attr("stroke", COLORS.STROKE_DARK_GRAY)
              .attr("stroke-opacity", 1);
          } else if (!selectionMode) {
            // Force red border for non-selection mode
            d3.select(clickedElement)
              .attr("stroke", COLORS.SELECTION_RED)
              .attr("stroke-width", 3)
              .attr("stroke-opacity", 1);
          }
        }

        // Add a safety timeout to reapply the red border
        if (!selectionMode) {
          setTimeout(() => {
            if (mainGroupRef.current) {
              const point = mainGroupRef.current.select(
                `[data-protein-id="${d.id}"]`
              );
              if (!point.empty()) {
                point
                  .attr("stroke", COLORS.SELECTION_RED)
                  .attr("stroke-width", 3)
                  .attr("stroke-opacity", 1);
              }
            }
          }, 100);
        }
      })
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

    // Batch update highlighted proteins using CSS classes
    const allPoints = pointsGroup.selectAll("[data-protein-id]");

    // Remove highlight class from all points first
    allPoints.classed("highlighted", false);

    // Add highlight class to highlighted proteins in a single operation
    if (highlightedProteinIds.length > 0) {
      const highlightedSelector = highlightedProteinIds
        .map((id) => `[data-protein-id="${id}"]`)
        .join(", ");
      pointsGroup.selectAll(highlightedSelector).classed("highlighted", true);
    }

    // Update existing points
    points
      .transition(t)
      .attr("d", (d) => d3.symbol().type(getShape(d)).size(getSize(d))())
      .attr("fill", (d) => getColor(d))
      .attr("opacity", (d) => getOpacity(d))
      .attr("stroke", (d) => {
        // Override getStrokeColor for highlighted points
        if (highlightedProteinIds.includes(d.id)) {
          return COLORS.SELECTION_RED;
        }
        return getStrokeColor(d);
      })
      .attr("stroke-width", (d) => {
        // Override getStrokeWidth for highlighted points
        if (highlightedProteinIds.includes(d.id)) {
          return 3; // Thicker for highlighted
        }
        return getStrokeWidth(d);
      })
      .attr(
        "transform",
        (d) => `translate(${scales.x(d.x)}, ${scales.y(d.y)})`
      );

    // Apply CSS class updates after transition completes
    setTimeout(() => {
      const allPointsAfterTransition =
        pointsGroup.selectAll("[data-protein-id]");

      // Remove highlight class from all points
      allPointsAfterTransition.classed("highlighted", false);

      // Add highlight class to currently highlighted proteins
      if (highlightedProteinIds.length > 0) {
        const highlightedSelector = highlightedProteinIds
          .map((id) => `[data-protein-id="${id}"]`)
          .join(", ");
        pointsGroup.selectAll(highlightedSelector).classed("highlighted", true);
      }
    }, transitionDuration + 50);

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
    selectedProteinIds,
    highlightedProteinIds,
    isolationMode,
  ]);

  // Effect to automatically zoom to highlighted/selected proteins when they change
  useEffect(() => {
    // Don't auto-zoom at all - auto-zooming has been disabled as requested by the user
    // Just update the previous highlights reference for tracking purposes
    prevHighlighted.current = [...highlightedProteinIds];
  }, [highlightedProteinIds, selectedProteinIds]);

  return (
    <div
      className={`relative ${className} h-full w-full overflow-hidden`}
      ref={containerRef}
    >
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className={`w-full h-full bg-white dark:bg-gray-900 ${
          selectionMode ? "cursor-crosshair" : "cursor-grab"
        }`}
        style={{ display: "block", border: "none", margin: 0, padding: 0 }}
      />

      {/* Loading overlay */}
      {(!isDataLoaded || isTransitioning) && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 dark:bg-gray-900 dark:bg-opacity-70 z-10">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              {isTransitioning ? "Changing projection..." : "Loading data..."}
            </p>
          </div>
        </div>
      )}

      {/* Isolation mode indicator */}
      {isolationMode && splitHistory && (
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
            Split Mode: Showing {plotData.length} proteins (
            {splitHistory.length} splits)
          </span>
        </div>
      )}

      {/* Selection Mode Indicator */}
      {selectionMode && (
        <div className="absolute top-2 right-2 z-10 px-2 py-1 bg-blue-500 text-white text-xs rounded-md flex items-center">
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
          className="absolute z-10 p-2 bg-white rounded shadow-md border text-sm dark:bg-gray-800 dark:border-gray-700"
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
