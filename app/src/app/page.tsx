"use client";
/* eslint-disable @typescript-eslint/no-unused-vars */

import ProtspaceControlBarWebComponent from "@/components/WebComponent/ProtspaceControlBarWebComponent";
import Header from "@/components/Header/Header";
// import InteractiveLegend from "@/components/InteractiveLegend/InteractiveLegend";
import { VisualizationData } from "@/components/Scatterplot/ImprovedScatterplot";
import StatusBar from "@/components/StatusBar/StatusBar";
import ProtspaceWebComponent, {
  type ProtspaceWebComponentRef,
} from "@/components/WebComponent/ProtspaceWebComponent";
import ProtspaceLegendWebComponent from "@/components/WebComponent/ProtspaceLegendWebComponent";
import ProtspaceStructureViewerWebComponent from "@/components/WebComponent/ProtspaceStructureViewerWebComponent";
import DataLoaderModal from "@/components/DataLoaderModal/DataLoaderModal";
import * as d3 from "d3";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Use dynamic import for the structure viewer to avoid SSR issues
const StructureViewer = dynamic(
  () => import("@/components/StructureViewer/StructureViewer"),
  { ssr: false }
);

export default function ProtSpaceApp() {
  // Application state
  const [visualizationData, setVisualizationData] =
    useState<VisualizationData | null>(null);
  const [selectedProjectionIndex, setSelectedProjectionIndex] = useState(0);
  const [selectedFeature, setSelectedFeature] = useState("");
  const [selectedProteinIds, setSelectedProteinIds] = useState<string[]>([]);
  const [highlightedProteinIds, setHighlightedProteinIds] = useState<string[]>(
    []
  );
  const [isolationMode, setIsolationMode] = useState(false);
  const [splitHistory, setSplitHistory] = useState<string[][]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [viewStructureId, setViewStructureId] = useState<string | null>(null);
  const [hiddenFeatureValues, setHiddenFeatureValues] = useState<string[]>([]);
  const [isDataLoaderOpen, setIsDataLoaderOpen] = useState(false);

  // Ref for the web component
  const webComponentRef = useRef<ProtspaceWebComponentRef>(null);

  // Load data when component mounts
  const loadData = async (dataPath?: string) => {
    try {
      interface RawFeatureItem {
        label: string | null;
        color: string;
        shape: string;
        visible: string;
      }

      interface RawFeature {
        other_visible: boolean;
        items: RawFeatureItem[];
      }

      interface RawData {
        protein_ids: string[];
        features: Record<string, RawFeature>;
        feature_data: Record<string, number[]>;
        projections: {
          name: string;
          metadata?: Record<string, unknown>;
          data: [number, number][];
        }[];
      }

      const rawData = (await d3.json(
        dataPath || "/data/example/basic.json"
      )) as RawData;

      // Transform the data to match the expected format
      const transformedData: VisualizationData = {
        protein_ids: rawData.protein_ids,
        projections: rawData.projections,
        feature_data: rawData.feature_data,
        features: {},
      };

      // Process each feature to extract values, colors, and shapes from items
      Object.keys(rawData.features).forEach((featureKey) => {
        const featureItems = rawData.features[featureKey].items;
        // Feature.values now supports string | null
        const values = featureItems.map((item) => item.label);
        const colors = featureItems.map((item) => item.color);
        const shapes = featureItems.map((item) => item.shape);

        transformedData.features[featureKey] = {
          values,
          colors,
          shapes,
        };
      });

      setVisualizationData(transformedData);

      // Initialize with first feature
      if (transformedData && transformedData.features) {
        const firstFeature = Object.keys(transformedData.features)[0];
        setSelectedFeature(firstFeature);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle protein selection
  const handleProteinClick = (proteinId: string, event?: CustomEvent) => {
    console.log(
      `🖱️ Protein clicked: ${proteinId}`,
      event?.detail?.modifierKeys
    );

    // When in non-selection mode, add the clicked protein to highlightedProteinIds immediately
    if (!selectionMode) {
      setHighlightedProteinIds([proteinId]);
    }

    // Standard selection behavior regardless of split state
    setSelectedProteinIds((prevIds) => {
      console.log(`📊 Current selectedProteinIds before:`, prevIds);

      // If the protein is already selected, deselect it
      if (prevIds.includes(proteinId)) {
        console.log(`❌ Deselecting protein: ${proteinId}`);
        // Also remove from highlighted if it's highlighted
        setHighlightedProteinIds((prev) =>
          prev.filter((id) => id !== proteinId)
        );
        // If this was the currently viewed structure, clear it
        if (viewStructureId === proteinId) {
          setViewStructureId(null);
        }
        const newSelection = prevIds.filter((id) => id !== proteinId);
        console.log(`🔄 New selection after deselect:`, newSelection);
        return newSelection;
      }

      // Check if we're in multi-selection mode
      const isMultiSelect =
        selectionMode ||
        event?.detail?.modifierKeys?.ctrl ||
        event?.detail?.modifierKeys?.meta ||
        event?.detail?.modifierKeys?.shift;

      let newSelection: string[];

      if (isMultiSelect) {
        // Multi-selection mode: add to existing selection
        newSelection = [...prevIds, proteinId];
        console.log(`✅ Added protein to selection (multi-mode): ${proteinId}`);
      } else {
        // Single selection mode: replace the selection
        newSelection = [proteinId];
        console.log(`✅ Selected protein (single mode): ${proteinId}`);

        // Only show structure for the selected protein when not in selection mode
        if (!selectionMode) {
          setViewStructureId(proteinId);
          // For single-click in non-selection mode, add to highlighted (red border)
          setHighlightedProteinIds([proteinId]);
        }
      }

      console.log(`🔄 New selection after click:`, newSelection);
      return newSelection;
    });
  };

  // Handle protein hover
  const handleProteinHover = () => {
    // Don't update highlighted proteins on hover
    // This ensures highlightedProteinIds only contains explicitly selected proteins
    return;
  };

  // Handle search
  const handleSearch = (query: string) => {
    if (!visualizationData || !query.trim()) return;

    // Exact match search first
    let searchResults = visualizationData.protein_ids.filter(
      (id) => id.toLowerCase() === query.toLowerCase()
    );

    // If no exact matches, try partial matches
    if (searchResults.length === 0) {
      searchResults = visualizationData.protein_ids.filter((id) =>
        id.toLowerCase().includes(query.toLowerCase())
      );
    }

    if (searchResults.length > 0) {
      // If exactly one result is found, select it
      if (searchResults.length === 1) {
        const matchedId = searchResults[0];
        // If not already selected, add to selections
        if (!selectedProteinIds.includes(matchedId)) {
          setSelectedProteinIds((prev) => [...prev, matchedId]);
          // Also update highlighted proteins
          setHighlightedProteinIds((prev) =>
            prev.includes(matchedId) ? prev : [...prev, matchedId]
          );
        }
        // Always show the structure for the matched protein
        setViewStructureId(matchedId);
      } else {
        // Multiple results found - add them all to highlighted proteins
        // but don't auto-select them, and avoid duplicates
        setHighlightedProteinIds((prev) => {
          // Convert to Set to ensure uniqueness
          const uniqueHighlights = new Set([...prev]);

          // Add new search results
          searchResults.forEach((id) => {
            uniqueHighlights.add(id);
          });

          // Convert back to array
          return Array.from(uniqueHighlights);
        });
      }
    } else {
    }
  };

  // Handle removal of highlighted/selected proteins
  const handleRemoveProtein = (proteinId: string) => {
    // Remove from highlighted proteins (ensuring no duplicates remain)
    setHighlightedProteinIds((prev) => [
      ...Array.from(new Set(prev.filter((id) => id !== proteinId))),
    ]);

    // Also remove from selected proteins (ensuring no duplicates remain)
    setSelectedProteinIds((prev) => [
      ...Array.from(new Set(prev.filter((id) => id !== proteinId))),
    ]);
  };

  // Handle showing all data, clearing isolation mode while preserving selections
  const handleShowAllData = () => {
    // Reset split state and go back to full dataset
    if (isolationMode) {
      setIsolationMode(false);
      setSplitHistory([]);
    }

    // Reset any hidden feature values to show all data
    setHiddenFeatureValues([]);
  };

  // Split the data to focus on selected proteins
  const handleToggleIsolationMode = () => {
    // Note: With auto-sync enabled, the control bar web component now handles
    // the split functionality directly. This function is mainly for React state updates
    // and any additional logic that auto-sync doesn't handle.

    // Clear selection after any split operation for clean state
    if (selectedProteinIds.length > 0) {
      setSelectedProteinIds([]);
    }

    // Reset hidden feature values when exiting split mode
    if (isolationMode && selectedProteinIds.length === 0) {
      setHiddenFeatureValues([]);
    }
  };

  // Handle split state changes from web component
  const handleSplitStateChange = (
    isolationMode: boolean,
    splitHistory: string[][],
    currentDataSize: number,
    selectedProteinsCount: number
  ) => {
    setIsolationMode(isolationMode);
    setSplitHistory(splitHistory);
    console.log(
      `Split state changed: ${isolationMode ? "ON" : "OFF"}, splits: ${
        splitHistory.length
      }, data size: ${currentDataSize}`
    );
  };

  // Handle data changes from web component
  const handleDataChange = (data: VisualizationData, isFiltered: boolean) => {
    console.log(
      `Data changed: ${isFiltered ? "Filtered" : "Full"} data, proteins: ${
        data.protein_ids.length
      }`
    );
  };

  // Handle protein selection from web component (brush selection)
  const handleProteinSelection = (
    proteinIds: string[],
    isMultiple: boolean
  ) => {
    console.log(
      `Protein selection from brush: ${proteinIds.length} proteins, multiple: ${isMultiple}`
    );
    if (isMultiple) {
      // For brush selection, add to existing selection
      setSelectedProteinIds((prev) => {
        const combinedIds = [...prev, ...proteinIds];
        const uniqueIds = Array.from(new Set(combinedIds));
        return uniqueIds;
      });
    } else {
      // For single selection, replace
      setSelectedProteinIds(proteinIds);
    }
  };

  // Handle session export/import
  const handleSaveSession = () => {
    if (!visualizationData) return;

    // Create a complete session data object that includes both the visualization data and the current state
    const sessionData = {
      // Visualization data (same structure as basic.json or Pla2g2.json)
      protein_ids: visualizationData.protein_ids,
      features: visualizationData.features,
      feature_data: visualizationData.feature_data,
      projections: visualizationData.projections,

      // Current state
      projectIndex: selectedProjectionIndex,
      feature: selectedFeature,
      selected: selectedProteinIds,
      highlighted: highlightedProteinIds,
      isolation: isolationMode,
      hidden: hiddenFeatureValues,
      selectionMode: selectionMode,
      viewStructureId: viewStructureId,
    };

    const dataStr = JSON.stringify(sessionData);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(
      dataStr
    )}`;

    const exportName = "protspace_session";
    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", `${exportName}.protspace`);
    linkElement.click();
  };

  // Handle loading a session
  const handleLoadSession = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".protspace,.json";

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const content = event.target?.result as string;
          const sessionData = JSON.parse(content);

          // Check if this is a session file or a data file
          if (sessionData.protein_ids && sessionData.features) {
            // This is a data file or a complete session file
            if (sessionData.projectIndex !== undefined) {
              // This is a complete session file, restore everything
              setVisualizationData({
                protein_ids: sessionData.protein_ids,
                features: sessionData.features,
                feature_data: sessionData.feature_data,
                projections: sessionData.projections,
              });

              // Restore all state
              setSelectedProjectionIndex(sessionData.projectIndex || 0);
              setSelectedFeature(sessionData.feature || "");
              setSelectedProteinIds([
                ...Array.from(
                  new Set((sessionData.selected || []) as string[])
                ),
              ]);
              setHighlightedProteinIds([
                ...Array.from(
                  new Set((sessionData.highlighted || []) as string[])
                ),
              ]);
              setIsolationMode(sessionData.isolation || false);
              setHiddenFeatureValues([
                ...Array.from(new Set((sessionData.hidden || []) as string[])),
              ]);
              setSelectionMode(sessionData.selectionMode || false);
              setViewStructureId(sessionData.viewStructureId || null);
            } else {
              // This is just a data file, load it as new data
              const dataUrl = URL.createObjectURL(file);
              await loadData(dataUrl);
              URL.revokeObjectURL(dataUrl);
            }
          } else {
            // This is an old session file format, try to load the data first
            const dataPath = sessionData.dataPath || "/data/example/basic.json";
            await loadData(dataPath);

            // Restore session state with deduplication
            setSelectedProjectionIndex(sessionData.projectIndex || 0);
            setSelectedFeature(sessionData.feature || "");
            setSelectedProteinIds([
              ...Array.from(new Set((sessionData.selected || []) as string[])),
            ]);
            setHighlightedProteinIds([
              ...Array.from(
                new Set((sessionData.highlighted || []) as string[])
              ),
            ]);
            setIsolationMode(sessionData.isolation || false);
            setHiddenFeatureValues([
              ...Array.from(new Set((sessionData.hidden || []) as string[])),
            ]);
          }
        } catch (error) {
          console.error("Error loading session:", error);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Handle sharing session
  const handleShareSession = () => {
    // Currently just an alias for save
    handleSaveSession();
  };

  // Handle opening data loader modal
  const handleOpenDataLoader = () => {
    setIsDataLoaderOpen(true);
  };

  // Handle Arrow data loading from the data loader component
  const handleArrowDataLoaded = (data: VisualizationData) => {
    console.log("Arrow data loaded:", data);

    // Set the new visualization data
    setVisualizationData(data);

    // Reset application state for new data
    setSelectedProjectionIndex(0);
    setSelectedProteinIds([]);
    setHighlightedProteinIds([]);
    setIsolationMode(false);
    setSplitHistory([]);
    setSelectionMode(false);
    setViewStructureId(null);
    setHiddenFeatureValues([]);

    // Initialize with first feature if available
    if (data && data.features) {
      const firstFeature = Object.keys(data.features)[0];
      setSelectedFeature(firstFeature);
    }
  };

  // Helper function to convert modern color formats to hex/rgb
  const convertModernColors = (element: Element) => {
    // Create a deep clone of the element for manipulation
    const clone = element.cloneNode(true) as HTMLElement;

    // Find all elements with styles
    const allElements = clone.querySelectorAll("*");

    // Process elements with potential color properties
    allElements.forEach((el) => {
      try {
        const computedStyles = window.getComputedStyle(el as HTMLElement);

        // Apply the computed RGB values directly to the element
        // We first check if the property exists to avoid errors
        const properties = [
          { name: "backgroundColor", style: "background-color" },
          { name: "color", style: "color" },
          { name: "borderColor", style: "border-color" },
          { name: "fill", style: "fill" },
          { name: "stroke", style: "stroke" },
        ];

        properties.forEach(({ name, style }) => {
          try {
            const value = computedStyles[
              name as keyof CSSStyleDeclaration
            ] as string;
            if (value && value !== "none" && value !== "transparent") {
              // Force RGB format by using a fallback if needed
              (el as HTMLElement).style.setProperty(style, value, "important");
            }
          } catch {
            // Skip if property cannot be applied
          }
        });

        // Remove any oklch or other modern color format values from inline styles
        const style = (el as HTMLElement).getAttribute("style");
        if (style) {
          const modernFormats = [
            /oklch\([^)]+\)/g,
            /lab\([^)]+\)/g,
            /lch\([^)]+\)/g,
            /color\([^)]+\)/g,
          ];

          let newStyle = style;
          modernFormats.forEach((format) => {
            newStyle = newStyle.replace(format, "");
          });

          if (newStyle !== style) {
            (el as HTMLElement).setAttribute("style", newStyle);
          }
        }
      } catch {
        // Silent error - continue with next element
      }
    });

    return clone;
  };

  // Handle export
  const handleExport = (type: "json" | "ids" | "png" | "svg" | "pdf") => {
    if (!visualizationData) return;

    switch (type) {
      case "json":
        // Export full data
        const dataStr = JSON.stringify(visualizationData);
        const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(
          dataStr
        )}`;
        const exportName = "protspace_data";
        const linkElement = document.createElement("a");
        linkElement.setAttribute("href", dataUri);
        linkElement.setAttribute("download", `${exportName}.json`);
        linkElement.click();
        break;

      case "ids":
        // Export selected protein IDs or all if none selected
        const ids =
          selectedProteinIds.length > 0
            ? selectedProteinIds
            : visualizationData.protein_ids;
        const idsStr = ids.join("\n");
        const idsUri = `data:text/plain;charset=utf-8,${encodeURIComponent(
          idsStr
        )}`;
        const linkElement2 = document.createElement("a");
        linkElement2.setAttribute("href", idsUri);
        linkElement2.setAttribute("download", "protein_ids.txt");
        linkElement2.click();
        break;

      case "png":
      case "pdf":
        // Get elements to export - updated to work with web components
        let svgElementForExport: SVGElement | null = null;

        // Try to find SVG element inside the web component
        const webComponentElement = document.querySelector(
          "protspace-scatterplot"
        );
        if (webComponentElement) {
          // First try to find in shadow DOM
          if (webComponentElement.shadowRoot) {
            svgElementForExport =
              webComponentElement.shadowRoot.querySelector("svg");
          }
          // If not found in shadow DOM, try regular DOM
          if (!svgElementForExport) {
            svgElementForExport = webComponentElement.querySelector("svg");
          }
        }

        // Fallback: try to find any SVG in the document
        if (!svgElementForExport) {
          svgElementForExport = document.querySelector("svg");
        }

        if (!svgElementForExport) {
          alert(
            "Could not find visualization element to export. Please ensure the visualization is loaded."
          );
          console.error("Export failed: No SVG element found");
          return;
        }

        // Create a clone of the SVG to modify for export
        const svgCloneForExport = svgElementForExport.cloneNode(
          true
        ) as SVGElement;
        const originalWidthForExport = svgElementForExport.clientWidth || 800;
        const originalHeightForExport = svgElementForExport.clientHeight || 600;

        // For higher quality: Set higher resolution for the export
        const scaleForExport = 2; // Double the resolution
        svgCloneForExport.setAttribute(
          "width",
          (originalWidthForExport * scaleForExport).toString()
        );
        svgCloneForExport.setAttribute(
          "height",
          (originalHeightForExport * scaleForExport).toString()
        );

        // Look for the main visualization group with multiple possible selectors
        const possibleSelectors = [
          ".scatter-plot-container",
          ".visualization-container",
          ".scatterplot-main",
          "g[class*='scatter']",
          "g[class*='plot']",
          "g[transform]",
        ];

        let mainGroupForExport: Element | null = null;
        for (const selector of possibleSelectors) {
          mainGroupForExport = svgCloneForExport.querySelector(selector);
          if (mainGroupForExport) break;
        }

        if (mainGroupForExport) {
          const currentTransform =
            mainGroupForExport.getAttribute("transform") || "";
          mainGroupForExport.setAttribute(
            "transform",
            `scale(${scaleForExport}) ${currentTransform}`
          );
        }

        // Remove any interactive elements or overlays
        const elementsToRemove = svgCloneForExport.querySelectorAll(
          ".absolute, .z-10, button, .reset-view-button, [class*='tooltip'], [class*='control'], [style*='cursor: pointer']"
        );
        elementsToRemove.forEach((el) => el.remove());

        // Convert SVG to string
        const svgStringData = new XMLSerializer().serializeToString(
          svgCloneForExport
        );

        // Create a canvas element
        const canvas = document.createElement("canvas");
        canvas.width = originalWidthForExport * scaleForExport;
        canvas.height = originalHeightForExport * scaleForExport;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          alert("Could not create canvas context for export.");
          return;
        }

        // Fill with white background
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Create an image from the SVG
        const img = new Image();

        // Create a Blob from the SVG string
        const svgBlob = new Blob([svgStringData], {
          type: "image/svg+xml;charset=utf-8",
        });
        const url = URL.createObjectURL(svgBlob);

        img.onload = async () => {
          // Draw the image on the canvas
          ctx.drawImage(img, 0, 0);

          // Function to draw the legend directly on the canvas
          const drawLegend = () => {
            if (
              !selectedFeature ||
              !visualizationData.features[selectedFeature]
            ) {
              return;
            }

            const featureData = visualizationData.features[selectedFeature];

            // Calculate legend area dimensions
            const legendPadding = 20;
            const legendItemHeight = 30;
            const legendWidth = 200;

            // Get all feature values and their corresponding colors and shapes
            const featureItems = [];

            // Extract unique feature values with their colors and shapes
            const featureValueMap = new Map();

            // Map each protein to its feature value, counting occurrences
            visualizationData.protein_ids.forEach((_, idx) => {
              const featureIdx =
                visualizationData.feature_data[selectedFeature][idx];
              const value = featureData.values[featureIdx];
              const color = featureData.colors[featureIdx];
              const shape = featureData.shapes[featureIdx];

              const valueKey = value === null ? "null" : value;

              if (!featureValueMap.has(valueKey)) {
                featureValueMap.set(valueKey, {
                  value,
                  color,
                  shape,
                  count: 1,
                });
              } else {
                featureValueMap.get(valueKey).count += 1;
              }
            });

            // Convert map to array and sort by count (descending)
            featureItems.push(
              ...Array.from(featureValueMap.values()).sort(
                (a, b) => b.count - a.count
              )
            );

            // Filter out hidden values and limit to 10 items
            const visibleFeatureItems = featureItems
              .filter((item) => {
                const valueStr = item.value === null ? "null" : item.value;
                return !hiddenFeatureValues.includes(valueStr);
              })
              .slice(0, 10);

            const legendHeight = Math.min(
              canvas.height,
              legendPadding * 2 +
                visibleFeatureItems.length * legendItemHeight +
                40 // Extra space for title
            );

            // Draw legend background
            ctx.fillStyle = "#f9f9f9";
            ctx.fillRect(
              canvas.width - legendWidth,
              0,
              legendWidth,
              legendHeight
            );

            // Draw border
            ctx.strokeStyle = "#ddd";
            ctx.lineWidth = 1;
            ctx.strokeRect(
              canvas.width - legendWidth,
              0,
              legendWidth,
              legendHeight
            );

            // Draw title
            ctx.font = "bold 16px Arial";
            ctx.fillStyle = "#333";
            ctx.textAlign = "center";
            ctx.fillText(
              selectedFeature,
              canvas.width - legendWidth / 2,
              legendPadding + 10
            );

            // Draw legend items
            ctx.font = "14px Arial";
            ctx.textAlign = "left";

            let y = legendPadding + 40;

            visibleFeatureItems.forEach((item) => {
              const { value, color, shape } = item;

              // Draw shape and color
              const symbolSize = 20;
              const symbolX =
                canvas.width - legendWidth + legendPadding + symbolSize;
              const symbolY = y;

              ctx.fillStyle = color;

              // Draw different shapes based on the shape property
              switch (shape) {
                case "circle":
                  ctx.beginPath();
                  ctx.arc(symbolX, symbolY, symbolSize / 2, 0, Math.PI * 2);
                  ctx.fill();
                  ctx.strokeStyle = "#333";
                  ctx.lineWidth = 1;
                  ctx.stroke();
                  break;
                case "square":
                  ctx.fillRect(
                    symbolX - symbolSize / 2,
                    symbolY - symbolSize / 2,
                    symbolSize,
                    symbolSize
                  );
                  ctx.strokeStyle = "#333";
                  ctx.lineWidth = 1;
                  ctx.strokeRect(
                    symbolX - symbolSize / 2,
                    symbolY - symbolSize / 2,
                    symbolSize,
                    symbolSize
                  );
                  break;
                case "triangle":
                  ctx.beginPath();
                  ctx.moveTo(symbolX, symbolY - symbolSize / 2);
                  ctx.lineTo(
                    symbolX - symbolSize / 2,
                    symbolY + symbolSize / 2
                  );
                  ctx.lineTo(
                    symbolX + symbolSize / 2,
                    symbolY + symbolSize / 2
                  );
                  ctx.closePath();
                  ctx.fill();
                  ctx.strokeStyle = "#333";
                  ctx.lineWidth = 1;
                  ctx.stroke();
                  break;
                case "diamond":
                  ctx.beginPath();
                  ctx.moveTo(symbolX, symbolY - symbolSize / 2);
                  ctx.lineTo(symbolX + symbolSize / 2, symbolY);
                  ctx.lineTo(symbolX, symbolY + symbolSize / 2);
                  ctx.lineTo(symbolX - symbolSize / 2, symbolY);
                  ctx.closePath();
                  ctx.fill();
                  ctx.strokeStyle = "#333";
                  ctx.lineWidth = 1;
                  ctx.stroke();
                  break;
                case "cross":
                  ctx.beginPath();
                  ctx.moveTo(
                    symbolX - symbolSize / 2,
                    symbolY - symbolSize / 2
                  );
                  ctx.lineTo(
                    symbolX + symbolSize / 2,
                    symbolY + symbolSize / 2
                  );
                  ctx.moveTo(
                    symbolX + symbolSize / 2,
                    symbolY - symbolSize / 2
                  );
                  ctx.lineTo(
                    symbolX - symbolSize / 2,
                    symbolY + symbolSize / 2
                  );
                  ctx.lineWidth = 3;
                  ctx.strokeStyle = color;
                  ctx.stroke();
                  break;
                case "star":
                  ctx.beginPath();
                  for (let j = 0; j < 5; j++) {
                    const x1 =
                      symbolX +
                      Math.cos((Math.PI * 2 * j) / 5) * (symbolSize / 2);
                    const y1 =
                      symbolY +
                      Math.sin((Math.PI * 2 * j) / 5) * (symbolSize / 2);
                    const x2 =
                      symbolX +
                      Math.cos((Math.PI * 2 * j + Math.PI) / 5) *
                        (symbolSize / 4);
                    const y2 =
                      symbolY +
                      Math.sin((Math.PI * 2 * j + Math.PI) / 5) *
                        (symbolSize / 4);
                    if (j === 0) ctx.moveTo(x1, y1);
                    else ctx.lineTo(x1, y1);
                    ctx.lineTo(x2, y2);
                  }
                  ctx.closePath();
                  ctx.fill();
                  break;
                default:
                  // Default to circle if shape not recognized
                  ctx.beginPath();
                  ctx.arc(symbolX, symbolY, symbolSize / 2, 0, Math.PI * 2);
                  ctx.fill();
              }

              // Add a count indicator
              ctx.fillStyle = "#666";
              ctx.textAlign = "right";
              ctx.fillText(
                item.count.toString(),
                canvas.width - legendPadding,
                symbolY + 5
              );

              // Draw text label
              ctx.fillStyle = "#333";
              ctx.textAlign = "left";
              ctx.fillText(
                value === null ? "N/A" : value.toString(),
                symbolX + symbolSize,
                symbolY + 5
              );

              // Move to next item
              y += legendItemHeight;
            });

            return legendHeight; // Return the height of the drawn legend
          };

          try {
            // Draw the legend on the canvas
            drawLegend();

            if (type === "png") {
              // Export as PNG
              const dataUrl = canvas.toDataURL("image/png");
              const link = document.createElement("a");
              link.href = dataUrl;
              link.download = "protspace_visualization.png";
              link.click();
            } else {
              // Export as PDF
              import("jspdf")
                .then((jsPdfModule) => {
                  const jsPDF = jsPdfModule.default || jsPdfModule;

                  // Create PDF with appropriate dimensions
                  const isLandscape = canvas.width > canvas.height;
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const pdf = new (jsPDF as any)({
                    orientation: isLandscape ? "landscape" : "portrait",
                    unit: "mm",
                  });

                  // Calculate the PDF page size (A4)
                  const pdfWidth = pdf.internal.pageSize.getWidth();
                  const pdfHeight = pdf.internal.pageSize.getHeight();

                  // Calculate the scaling ratio
                  const ratio = Math.min(
                    pdfWidth / canvas.width,
                    pdfHeight / canvas.height
                  );

                  // Add the image to the PDF
                  const imgData = canvas.toDataURL("image/png");
                  pdf.addImage(
                    imgData,
                    "PNG",
                    0,
                    0,
                    canvas.width * ratio,
                    canvas.height * ratio
                  );

                  // Save the PDF
                  pdf.save("protspace_visualization.pdf");
                })
                .catch((error) => {
                  console.error("Error generating PDF:", error);
                  alert("Could not generate PDF: " + error.message);
                });
            }
          } catch (error) {
            console.error("Error in export:", error);
            alert("Export failed: " + (error as Error).message);
          } finally {
            // Clean up
            URL.revokeObjectURL(url);
          }
        };

        img.onerror = () => {
          console.error("Failed to load SVG as image");
          URL.revokeObjectURL(url);
          alert("Failed to process the visualization for export.");
        };

        // Set the source to the Blob URL
        img.src = url;
        break;

      case "svg":
        // For SVG, export the full visualization with legend - updated for web components
        let svgElementForSvgExport: SVGElement | null = null;

        // Try to find SVG element inside the web component
        const webComponentElementForSvg = document.querySelector(
          "protspace-scatterplot"
        );
        if (webComponentElementForSvg) {
          // First try to find in shadow DOM
          if (webComponentElementForSvg.shadowRoot) {
            svgElementForSvgExport =
              webComponentElementForSvg.shadowRoot.querySelector("svg");
          }
          // If not found in shadow DOM, try regular DOM
          if (!svgElementForSvgExport) {
            svgElementForSvgExport =
              webComponentElementForSvg.querySelector("svg");
          }
        }

        // Fallback: try to find any SVG in the document
        if (!svgElementForSvgExport) {
          svgElementForSvgExport = document.querySelector("svg");
        }

        if (!svgElementForSvgExport) {
          alert(
            "Could not find visualization element to export. Please ensure the visualization is loaded."
          );
          console.error("SVG Export failed: No SVG element found");
          return;
        }

        // Create a clone of the SVG to modify for export
        const svgCloneForSvgExport = svgElementForSvgExport.cloneNode(
          true
        ) as SVGElement;
        const originalWidthForSvgExport =
          svgElementForSvgExport.clientWidth || 800;
        const originalHeightForSvgExport =
          svgElementForSvgExport.clientHeight || 600;

        // Set dimensions for the export SVG
        svgCloneForSvgExport.setAttribute(
          "width",
          originalWidthForSvgExport.toString()
        );
        svgCloneForSvgExport.setAttribute(
          "height",
          originalHeightForSvgExport.toString()
        );

        // Set a proper viewBox to ensure all content is visible
        svgCloneForSvgExport.setAttribute(
          "viewBox",
          `0 0 ${originalWidthForSvgExport} ${originalHeightForSvgExport}`
        );

        // Look for the main visualization group with multiple possible selectors
        const possibleSelectorsForSvg = [
          ".scatter-plot-container",
          ".visualization-container",
          ".scatterplot-main",
          "g[class*='scatter']",
          "g[class*='plot']",
          "g[transform]",
        ];

        let mainGroupForSvgExport: Element | null = null;
        for (const selector of possibleSelectorsForSvg) {
          mainGroupForSvgExport = svgCloneForSvgExport.querySelector(selector);
          if (mainGroupForSvgExport) break;
        }

        if (mainGroupForSvgExport) {
          // For SVG export, reset any transformations to show the original view
          // This ensures we capture the entire visualization
          mainGroupForSvgExport.removeAttribute("transform");
        }

        // Remove any interactive elements or overlays that shouldn't be in the export
        const overlaysForSvgExport = svgCloneForSvgExport.querySelectorAll(
          ".absolute, .z-10, button, .reset-view-button"
        );
        overlaysForSvgExport.forEach((overlay) => overlay.remove());

        // Also remove any tooltip or control elements
        const tooltipsForSvgExport = svgCloneForSvgExport.querySelectorAll(
          '[class*="tooltip"], [class*="control"]'
        );
        tooltipsForSvgExport.forEach((tooltip) => tooltip.remove());

        // Remove any elements with pointer events
        const interactiveElementsForSvgExport =
          svgCloneForSvgExport.querySelectorAll('[style*="cursor: pointer"]');
        interactiveElementsForSvgExport.forEach((el) => {
          (el as SVGElement).style.cursor = "default";
        });

        // Create a combined SVG with both visualization and legend
        const combinedSvg = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "svg"
        );

        // Add legend width to the combined SVG
        const legendWidth = 200;
        const combinedWidth = originalWidthForSvgExport + legendWidth;

        // Default height is the visualization height
        const originalHeight = originalHeightForSvgExport;

        combinedSvg.setAttribute("width", combinedWidth.toString());
        combinedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");

        // Add the original visualization to the combined SVG
        Array.from(svgCloneForSvgExport.childNodes).forEach((node) => {
          combinedSvg.appendChild(node.cloneNode(true));
        });

        // Now add the legend to the SVG
        if (selectedFeature && visualizationData.features[selectedFeature]) {
          const featureData = visualizationData.features[selectedFeature];
          const legendPadding = 20;
          const legendItemHeight = 30;

          // Extract unique feature values with their colors and shapes
          const featureValueMap = new Map();

          // Map each protein to its feature value, counting occurrences
          visualizationData.protein_ids.forEach((_, idx) => {
            const featureIdx =
              visualizationData.feature_data[selectedFeature][idx];
            const value = featureData.values[featureIdx];
            const color = featureData.colors[featureIdx];
            const shape = featureData.shapes[featureIdx];

            const valueKey = value === null ? "null" : value;

            if (!featureValueMap.has(valueKey)) {
              featureValueMap.set(valueKey, {
                value,
                color,
                shape,
                count: 1,
              });
            } else {
              featureValueMap.get(valueKey).count += 1;
            }
          });

          // Convert map to array and sort by count (descending)
          const featureItems = Array.from(featureValueMap.values()).sort(
            (a, b) => b.count - a.count
          );

          // Filter out hidden values and limit to 10 items
          const visibleFeatureItems = featureItems
            .filter((item) => {
              const valueStr = item.value === null ? "null" : item.value;
              return !hiddenFeatureValues.includes(valueStr);
            })
            .slice(0, 10);

          // Calculate legend height based on number of items
          const legendTitleHeight = 40; // Space for the title
          const legendHeight =
            legendPadding * 2 + // Top and bottom padding
            legendTitleHeight + // Title space
            visibleFeatureItems.length * legendItemHeight; // Space for items

          // Create a group for the legend
          const legendGroup = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "g"
          );
          legendGroup.setAttribute(
            "transform",
            `translate(${originalWidthForSvgExport}, 0)`
          );

          // No background rectangle for the legend (removed)

          // Add title
          const titleText = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "text"
          );
          titleText.setAttribute("x", (legendWidth / 2).toString());
          titleText.setAttribute("y", (legendPadding + 10).toString());
          titleText.setAttribute("text-anchor", "middle");
          titleText.setAttribute("font-weight", "bold");
          titleText.setAttribute("font-size", "16px");
          titleText.setAttribute("fill", "#333");
          titleText.textContent = selectedFeature;
          legendGroup.appendChild(titleText);

          // Add legend items
          let y = legendPadding + 40;

          visibleFeatureItems.forEach((item) => {
            const { value, color, shape, count } = item;

            // Create a group for this legend item
            const itemGroup = document.createElementNS(
              "http://www.w3.org/2000/svg",
              "g"
            );

            // Add the shape
            const symbolSize = 20;
            const symbolX = legendPadding + symbolSize;
            const symbolY = y;

            let symbolElement;

            // Draw different shapes based on the shape property
            switch (shape) {
              case "circle":
                symbolElement = document.createElementNS(
                  "http://www.w3.org/2000/svg",
                  "circle"
                );
                symbolElement.setAttribute("cx", symbolX.toString());
                symbolElement.setAttribute("cy", symbolY.toString());
                symbolElement.setAttribute("r", (symbolSize / 2).toString());
                break;
              case "square":
                symbolElement = document.createElementNS(
                  "http://www.w3.org/2000/svg",
                  "rect"
                );
                symbolElement.setAttribute(
                  "x",
                  (symbolX - symbolSize / 2).toString()
                );
                symbolElement.setAttribute(
                  "y",
                  (symbolY - symbolSize / 2).toString()
                );
                symbolElement.setAttribute("width", symbolSize.toString());
                symbolElement.setAttribute("height", symbolSize.toString());
                break;
              case "triangle":
                symbolElement = document.createElementNS(
                  "http://www.w3.org/2000/svg",
                  "polygon"
                );
                symbolElement.setAttribute(
                  "points",
                  `${symbolX},${symbolY - symbolSize / 2} ${
                    symbolX - symbolSize / 2
                  },${symbolY + symbolSize / 2} ${symbolX + symbolSize / 2},${
                    symbolY + symbolSize / 2
                  }`
                );
                break;
              case "diamond":
                symbolElement = document.createElementNS(
                  "http://www.w3.org/2000/svg",
                  "polygon"
                );
                symbolElement.setAttribute(
                  "points",
                  `${symbolX},${symbolY - symbolSize / 2} ${
                    symbolX + symbolSize / 2
                  },${symbolY} ${symbolX},${symbolY + symbolSize / 2} ${
                    symbolX - symbolSize / 2
                  },${symbolY}`
                );
                break;
              case "cross":
                symbolElement = document.createElementNS(
                  "http://www.w3.org/2000/svg",
                  "path"
                );
                symbolElement.setAttribute(
                  "d",
                  `M${symbolX - symbolSize / 2},${symbolY - symbolSize / 2} L${
                    symbolX + symbolSize / 2
                  },${symbolY + symbolSize / 2} M${symbolX + symbolSize / 2},${
                    symbolY - symbolSize / 2
                  } L${symbolX - symbolSize / 2},${symbolY + symbolSize / 2}`
                );
                symbolElement.setAttribute("fill", "none");
                symbolElement.setAttribute("stroke", color);
                symbolElement.setAttribute("stroke-width", "3");
                itemGroup.appendChild(symbolElement);

                // Skip the rest of the styling for cross as it's different
                y += legendItemHeight;

                // Add value label
                const valueText = document.createElementNS(
                  "http://www.w3.org/2000/svg",
                  "text"
                );
                valueText.setAttribute("x", (symbolX + symbolSize).toString());
                valueText.setAttribute("y", (symbolY + 5).toString());
                valueText.setAttribute("font-size", "14px");
                valueText.setAttribute("fill", "#333");
                valueText.textContent =
                  value === null ? "N/A" : value.toString();
                itemGroup.appendChild(valueText);

                // Add count
                const countText = document.createElementNS(
                  "http://www.w3.org/2000/svg",
                  "text"
                );
                countText.setAttribute(
                  "x",
                  (legendWidth - legendPadding).toString()
                );
                countText.setAttribute("y", (symbolY + 5).toString());
                countText.setAttribute("text-anchor", "end");
                countText.setAttribute("font-size", "14px");
                countText.setAttribute("fill", "#666");
                countText.textContent = count.toString();
                itemGroup.appendChild(countText);

                legendGroup.appendChild(itemGroup);
                return;
              default:
                // Default to circle
                symbolElement = document.createElementNS(
                  "http://www.w3.org/2000/svg",
                  "circle"
                );
                symbolElement.setAttribute("cx", symbolX.toString());
                symbolElement.setAttribute("cy", symbolY.toString());
                symbolElement.setAttribute("r", (symbolSize / 2).toString());
            }

            // Style the symbol (except for cross which is handled above)
            symbolElement.setAttribute("fill", color);
            symbolElement.setAttribute("stroke", "#333");
            symbolElement.setAttribute("stroke-width", "1");
            itemGroup.appendChild(symbolElement);

            // Add value label
            const valueText = document.createElementNS(
              "http://www.w3.org/2000/svg",
              "text"
            );
            valueText.setAttribute("x", (symbolX + symbolSize).toString());
            valueText.setAttribute("y", (symbolY + 5).toString());
            valueText.setAttribute("font-size", "14px");
            valueText.setAttribute("fill", "#333");
            valueText.textContent = value === null ? "N/A" : value.toString();
            itemGroup.appendChild(valueText);

            // Add count
            const countText = document.createElementNS(
              "http://www.w3.org/2000/svg",
              "text"
            );
            countText.setAttribute(
              "x",
              (legendWidth - legendPadding).toString()
            );
            countText.setAttribute("y", (symbolY + 5).toString());
            countText.setAttribute("text-anchor", "end");
            countText.setAttribute("font-size", "14px");
            countText.setAttribute("fill", "#666");
            countText.textContent = count.toString();
            itemGroup.appendChild(countText);

            legendGroup.appendChild(itemGroup);
            y += legendItemHeight;
          });

          combinedSvg.appendChild(legendGroup);

          // Update the SVG height and viewBox based on the calculated legend height
          // Use whichever is taller: the visualization or the legend
          const combinedHeight = Math.max(originalHeight, legendHeight);
          combinedSvg.setAttribute("height", combinedHeight.toString());
          combinedSvg.setAttribute(
            "viewBox",
            `0 0 ${combinedWidth} ${combinedHeight}`
          );
        } else {
          // If there's no legend, just use the original height
          combinedSvg.setAttribute("height", originalHeight.toString());
          combinedSvg.setAttribute(
            "viewBox",
            `0 0 ${combinedWidth} ${originalHeight}`
          );
        }

        // Export the combined SVG
        const svgDataForSvgExport = new XMLSerializer().serializeToString(
          combinedSvg
        );
        const svgBlobForSvgExport = new Blob([svgDataForSvgExport], {
          type: "image/svg+xml;charset=utf-8",
        });
        const svgUrlForSvgExport = URL.createObjectURL(svgBlobForSvgExport);

        const linkForSvgExport = document.createElement("a");
        linkForSvgExport.href = svgUrlForSvgExport;
        linkForSvgExport.download = "protspace_visualization.svg";
        linkForSvgExport.click();

        // Cleanup
        setTimeout(() => {
          URL.revokeObjectURL(svgUrlForSvgExport);
        }, 100);
        break;
    }
  };

  // Toggle feature value visibility
  const handleToggleVisibility = useCallback((value: string | null) => {
    // Convert null to "null" string for consistent handling in the hiddenFeatureValues array
    const valueToToggle = value === null ? "null" : value;

    // Use setTimeout to move the state update outside of the render cycle
    setTimeout(() => {
      setHiddenFeatureValues((prev) => {
        // Toggle the value in the hidden list
        if (prev.includes(valueToToggle)) {
          return prev.filter((v) => v !== valueToToggle);
        } else {
          return [...prev, valueToToggle];
        }
      });
    }, 0);
  }, []);

  // Handle extracting values from the "Other" category
  const handleExtractFromOther = (value: string) => {
    console.log(`Extracted value from Other category: ${value}`);
    // Handle the extraction logic here
    // This would update the visualization to show this specific value
  };

  // Handle updating z-order of legend items
  const handleSetZOrder = (zOrderMapping: Record<string, number>) => {
    console.log("Z-order mapping updated:", zOrderMapping);
    // Handle z-order changes here
    // This would update the layering of elements in the visualization
  };

  // Open legend customization dialog
  const handleOpenCustomization = () => {
    console.log("Opening legend customization");
    // For now, we're just using alert, but this would open a modal dialog
    alert("Legend customization would open a modal dialog here.");
  };

  // Stats for status bar
  const totalProteins = visualizationData?.protein_ids.length || 0;

  // Calculate displayed proteins based on split history
  const displayedProteins = useMemo(() => {
    if (!isolationMode || !splitHistory || splitHistory.length === 0) {
      return totalProteins;
    }

    // If in split mode, count how many proteins pass all split filters
    if (!visualizationData) return 0;

    const proteinIds = visualizationData.protein_ids;
    // Start with all proteins from first split
    const displayedIds = new Set(splitHistory[0]);

    // For each subsequent split, filter to only include proteins that match all splits
    if (splitHistory.length > 1) {
      for (let i = 1; i < splitHistory.length; i++) {
        const currentSplit = splitHistory[i];
        // Keep only proteins that are in the current split AND were in previous splits
        Array.from(displayedIds).forEach((id) => {
          if (!currentSplit.includes(id)) {
            displayedIds.delete(id);
          }
        });
      }
    }

    return displayedIds.size;
  }, [isolationMode, splitHistory, totalProteins, visualizationData]);

  const projectionName =
    visualizationData?.projections[selectedProjectionIndex]?.name || "";

  // Create the selected feature items set based on selectedProteinIds
  const selectedFeatureItemsSet = useMemo(() => {
    if (!selectedProteinIds.length || !visualizationData || !selectedFeature)
      return new Set<string>();

    const result = new Set<string>();

    // Only add values for proteins that are explicitly selected
    selectedProteinIds.forEach((id) => {
      const index = visualizationData.protein_ids.indexOf(id);
      if (index !== -1) {
        const featureValue =
          visualizationData.feature_data[selectedFeature][index];
        const value =
          visualizationData.features[selectedFeature].values[featureValue];

        if (value !== null) {
          result.add(value);
        } else if (selectedProteinIds.length > 0) {
          // Only add "null" if we have at least one selected protein and it has a null value
          // This ensures N/A only shows as selected when actually selected
          result.add("null");
        }
      }
    });

    return result;
  }, [selectedProteinIds, visualizationData, selectedFeature]);

  return (
    <main className="flex min-h-screen flex-col">
      {/* Header */}
      <Header
        onSearch={handleSearch}
        onSaveSession={handleSaveSession}
        onLoadSession={handleLoadSession}
        onLoadData={handleOpenDataLoader}
        highlightedProteins={highlightedProteinIds}
        onRemoveHighlight={handleRemoveProtein}
        availableProteinIds={visualizationData?.protein_ids || []}
        selectedProteins={selectedProteinIds}
      />

      {/* Control Bar */}
      {visualizationData ? (
        <ProtspaceControlBarWebComponent
          projections={
            visualizationData
              ? visualizationData.projections.map((p) => p.name)
              : []
          }
          selectedProjection={projectionName}
          onProjectionChange={(name) => {
            const index =
              visualizationData?.projections.findIndex(
                (p) => p.name === name
              ) || 0;
            setSelectedProjectionIndex(index);
          }}
          features={
            visualizationData ? Object.keys(visualizationData.features) : []
          }
          selectedFeature={selectedFeature}
          onFeatureChange={setSelectedFeature}
          selectionMode={selectionMode}
          onToggleSelectionMode={() => setSelectionMode(!selectionMode)}
          isolationMode={isolationMode}
          onToggleIsolationMode={handleToggleIsolationMode}
          selectedProteinsCount={selectedProteinIds.length}
          onExport={handleExport}
          onClearSelections={() => {
            // Note: With auto-sync enabled, the control bar web component clears
            // selections directly. We just update React state here.
            setSelectedProteinIds([]);
            setHighlightedProteinIds([]);
          }}
        />
      ) : (
        <div className="flex items-center justify-between px-4 py-2 bg-white border-b shadow-sm dark:bg-gray-900 dark:border-gray-800 min-h-[3rem]">
          <div className="flex items-center space-x-4">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
              <div className="h-8 bg-gray-200 rounded w-32"></div>
            </div>
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-20 mb-1"></div>
              <div className="h-8 bg-gray-200 rounded w-28"></div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
            <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
            <div className="animate-pulse bg-gray-200 h-8 w-24 rounded"></div>
            <div className="animate-pulse bg-gray-200 h-8 w-20 rounded"></div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main Visualization Area */}
        <div className="flex-grow h-full overflow-hidden p-0">
          {visualizationData ? (
            <ProtspaceWebComponent
              ref={webComponentRef}
              data={visualizationData}
              selectedProjectionIndex={selectedProjectionIndex}
              selectedFeature={selectedFeature}
              highlightedProteinIds={highlightedProteinIds}
              selectedProteinIds={selectedProteinIds}
              isolationMode={isolationMode}
              splitHistory={splitHistory}
              selectionMode={selectionMode}
              hiddenFeatureValues={hiddenFeatureValues}
              onProteinClick={handleProteinClick}
              onProteinHover={handleProteinHover}
              onSplitStateChange={handleSplitStateChange}
              onDataChange={handleDataChange}
              onProteinSelection={handleProteinSelection}
              className="w-full h-full"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p>Loading data...</p>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="w-96 bg-gray-50 dark:bg-gray-800 p-4 overflow-auto flex flex-col">
          {/* Legend */}
          {visualizationData && selectedFeature && (
            <ProtspaceLegendWebComponent
              data={visualizationData}
              selectedFeature={selectedFeature}
              featureValues={visualizationData.protein_ids.map((id, index) => {
                // Get the feature index for this protein
                const featureIndex =
                  visualizationData.feature_data[selectedFeature][index];
                // Return the actual feature value
                return visualizationData.features[selectedFeature].values[
                  featureIndex
                ];
              })}
              proteinIds={visualizationData.protein_ids}
              onLegendItemClick={(value, action) => {
                if (action === "toggle") {
                  handleToggleVisibility(value);
                } else if (action === "isolate") {
                  // Handle isolation logic for double-click
                  handleToggleVisibility(value);
                } else if (action === "extract") {
                  handleExtractFromOther(value as string);
                }
              }}
              onLegendZOrderChange={handleSetZOrder}
              onLegendCustomize={handleOpenCustomization}
              selectedItems={Array.from(selectedFeatureItemsSet)}
              className="w-full lg:w-auto"
              isolationMode={isolationMode}
              splitHistory={splitHistory}
            />
          )}

          {/* 3D Structure Viewer - Always render container but conditionally show content */}
          {selectedProteinIds.length > 0 && (
            <ProtspaceStructureViewerWebComponent
              proteinId={viewStructureId}
              title="AlphaFold2 Structure"
              showCloseButton={true}
              height="320px"
              onStructureLoad={(proteinId, status, error) => {
                console.log(`Structure ${proteinId}: ${status}`, error);
              }}
              onClose={() => setViewStructureId(null)}
              className="mt-4"
            />
          )}
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar
        totalProteins={totalProteins}
        displayedProteins={displayedProteins}
        selectedProteins={selectedProteinIds.length}
        projectionName={projectionName}
      />

      {/* Data Loader Modal */}
      <DataLoaderModal
        isOpen={isDataLoaderOpen}
        onClose={() => setIsDataLoaderOpen(false)}
        onDataLoaded={handleArrowDataLoaded}
      />
    </main>
  );
}
