"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Header from "@/components/Header/Header";
import ControlBar from "@/components/ControlBar/ControlBar";
import ImprovedScatterplot from "@/components/Scatterplot/ImprovedScatterplot";
import InteractiveLegend from "@/components/InteractiveLegend/InteractiveLegend";
import StatusBar from "@/components/StatusBar/StatusBar";
import { VisualizationData } from "@/components/Scatterplot/ImprovedScatterplot";
import * as d3 from "d3";
import dynamic from "next/dynamic";

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
  const [selectionMode, setSelectionMode] = useState(true);
  const [viewStructureId, setViewStructureId] = useState<string | null>(null);
  const [hiddenFeatureValues, setHiddenFeatureValues] = useState<string[]>([]);

  // Debug function to log the protein ID before setting it
  const setAndLogViewStructureId = (id: string | null) => {
    if (id === null) {
      setViewStructureId(null);
      return;
    }

    console.log("Setting viewStructureId for AlphaFold:", id);
    // Check if it's likely a UniProt ID (typical format is alphanumeric, often starts with a letter followed by numbers)
    const uniprotPattern = /^[A-Z0-9]{6,10}$/i;
    if (!uniprotPattern.test(id)) {
      console.warn("Protein ID may not be in UniProt format:", id);
    }
    setViewStructureId(id);
  };

  // Load data when component mounts
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = (await d3.json("/data/example.json")) as VisualizationData;
        setVisualizationData(data);

        // Initialize with first feature
        if (data && data.features) {
          setSelectedFeature(Object.keys(data.features)[0]);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };

    loadData();
  }, []);

  // Handle protein selection
  const handleProteinClick = (proteinId: string) => {
    setSelectedProteinIds((prevSelected) => {
      // If already selected, remove it
      if (prevSelected.includes(proteinId)) {
        // Also remove from highlighted proteins
        setHighlightedProteinIds((prev) =>
          prev.filter((id) => id !== proteinId)
        );
        return prevSelected.filter((id) => id !== proteinId);
      }
      // Otherwise add it
      // Also add to highlighted proteins if not already there
      setHighlightedProteinIds((prev) =>
        prev.includes(proteinId) ? prev : [...prev, proteinId]
      );
      return [...prevSelected, proteinId];
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
          return [...uniqueHighlights];
        });
      }
    } else {
      // No matches found - provide visual feedback
      console.log(`No proteins found matching "${query}"`);
      // Could add a toast notification here
    }
  };

  // Handle removal of highlighted/selected proteins
  const handleRemoveProtein = (proteinId: string) => {
    // Remove from highlighted proteins (ensuring no duplicates remain)
    setHighlightedProteinIds((prev) => [
      ...new Set(prev.filter((id) => id !== proteinId)),
    ]);

    // Also remove from selected proteins (ensuring no duplicates remain)
    setSelectedProteinIds((prev) => [
      ...new Set(prev.filter((id) => id !== proteinId)),
    ]);
  };

  // Handle session export/import
  const handleSaveSession = () => {
    if (!visualizationData) return;

    const sessionData = {
      projectIndex: selectedProjectionIndex,
      feature: selectedFeature,
      selected: selectedProteinIds,
      highlighted: highlightedProteinIds,
      isolation: isolationMode,
      hidden: hiddenFeatureValues,
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
    input.accept = ".protspace,application/json";

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const sessionData = JSON.parse(event.target?.result as string);

          // Restore session state with deduplication
          setSelectedProjectionIndex(sessionData.projectIndex || 0);
          setSelectedFeature(sessionData.feature || "");

          // Ensure unique arrays for proteins with proper type casting
          const selected = Array.isArray(sessionData.selected)
            ? ([
                ...new Set(
                  sessionData.selected.filter(
                    (id: unknown) => typeof id === "string"
                  )
                ),
              ] as string[])
            : [];

          const highlighted = Array.isArray(sessionData.highlighted)
            ? ([
                ...new Set(
                  sessionData.highlighted.filter(
                    (id: unknown) => typeof id === "string"
                  )
                ),
              ] as string[])
            : [];

          setSelectedProteinIds(selected);
          setHighlightedProteinIds(highlighted);

          setIsolationMode(sessionData.isolation || false);
          setHiddenFeatureValues(sessionData.hidden || []);
        } catch (error) {
          console.error("Error parsing session file:", error);
          alert("Failed to load session file. The file may be corrupted.");
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

  // Handle export
  const handleExport = (type: "json" | "ids" | "png" | "svg") => {
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
      case "svg":
        // These would require more complex implementation for export
        alert(`${type.toUpperCase()} export is not yet implemented.`);
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
  const displayedProteins = isolationMode
    ? selectedProteinIds.length
    : totalProteins;
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

    // Remove debug logs
    // console.log("Selected feature items set:", Array.from(result));
    // console.log("Includes null?", result.has("null"));

    return result;
  }, [selectedProteinIds, visualizationData, selectedFeature]);

  // Compute the feature values for the selected feature
  const selectedFeatureValues = useMemo(() => {
    if (!visualizationData || !selectedFeature) return [];
    return visualizationData.features[selectedFeature].values;
  }, [visualizationData, selectedFeature]);

  return (
    <main className="flex min-h-screen flex-col">
      {/* Header */}
      <Header
        onSearch={handleSearch}
        onSaveSession={handleSaveSession}
        onLoadSession={handleLoadSession}
        onShareSession={handleShareSession}
        highlightedProteins={highlightedProteinIds}
        onRemoveHighlight={handleRemoveProtein}
        availableProteinIds={visualizationData?.protein_ids || []}
      />

      {/* Control Bar */}
      <ControlBar
        projections={
          visualizationData
            ? visualizationData.projections.map((p) => p.name)
            : []
        }
        selectedProjection={projectionName}
        onProjectionChange={(name) => {
          const index =
            visualizationData?.projections.findIndex((p) => p.name === name) ||
            0;
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
        onToggleIsolationMode={() => setIsolationMode(!isolationMode)}
        selectedProteinsCount={selectedProteinIds.length}
        onExport={handleExport}
        onClearSelections={() => {
          setSelectedProteinIds([]);
          setHighlightedProteinIds([]);
        }}
      />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main Visualization Area */}
        <div className="flex-grow">
          {visualizationData ? (
            <ImprovedScatterplot
              data={visualizationData}
              selectedProjectionIndex={selectedProjectionIndex}
              selectedFeature={selectedFeature}
              selectedProteinIds={selectedProteinIds}
              highlightedProteinIds={highlightedProteinIds}
              isolationMode={isolationMode}
              selectionMode={selectionMode}
              hiddenFeatureValues={hiddenFeatureValues}
              onProteinClick={handleProteinClick}
              onProteinHover={handleProteinHover}
              onViewStructure={setAndLogViewStructureId}
              className="w-full h-full"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p>Loading data...</p>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="w-80 bg-gray-50 dark:bg-gray-800 p-4 overflow-auto flex flex-col">
          {/* Legend */}
          {visualizationData && selectedFeature && (
            <InteractiveLegend
              featureData={{
                name: selectedFeature,
                values: visualizationData.features[selectedFeature].values,
                colors: visualizationData.features[selectedFeature].values.map(
                  (_, i) => d3.schemeCategory10[i % 10]
                ),
                shapes: visualizationData.features[selectedFeature].values.map(
                  () => "circle"
                ),
              }}
              featureValues={selectedFeatureValues}
              onToggleVisibility={handleToggleVisibility}
              onExtractFromOther={handleExtractFromOther}
              onSetZOrder={handleSetZOrder}
              onOpenCustomization={handleOpenCustomization}
              selectedItems={Array.from(selectedFeatureItemsSet)}
              className="w-full lg:w-auto"
            />
          )}

          {/* 3D Structure Viewer */}
          {viewStructureId && (
            <div className="h-80 bg-white dark:bg-gray-700 rounded-md shadow-sm overflow-hidden">
              <StructureViewer
                proteinId={viewStructureId}
                onClose={() => setViewStructureId(null)}
              />
            </div>
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
    </main>
  );
}
