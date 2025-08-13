"use client";
/* eslint-disable @typescript-eslint/no-unused-vars */

import ControlBar from "@/components/ControlBar/ControlBar";
import { Header } from "@/components/Header";
import InteractiveLegend from "@/components/InteractiveLegend/InteractiveLegend";
import Scatterplot from "@/components/Scatterplot/Scatterplot";
import StatusBar from "@/components/StatusBar/StatusBar";
import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { DEFAULT_CONFIG as SCATTER_DEFAULTS } from "@/components/Scatterplot/constants";
import { useProtspace } from "./hooks/useProtspace";
import { useExport } from "./hooks/useExport";

// Use dynamic import for the structure viewer to avoid SSR issues
const StructureViewer = dynamic(
  () => import("@/components/StructureViewer/StructureViewer"),
  { ssr: false }
);

export default function ProtSpaceApp() {
  const {
    visualizationData,
    selectedProjectionIndex,
    selectedFeature,
    selectedProteinIds,
    highlightedProteinIds,
    isolationMode,
    splitHistory,
    selectionMode,
    viewStructureId,
    hiddenFeatureValues,
    setSelectedProjectionIndex,
    setSelectedFeature,
    setSelectedProteinIds,
    setHighlightedProteinIds,
    setSelectionMode,
    setViewStructureId,
    handleProteinClick,
    handleProteinHover,
    handleSearch,
    handleRemoveProtein,
    handleToggleIsolationMode,
    handleToggleVisibility,
    handleExtractFromOther,
    handleSetZOrder,
    handleOpenCustomization,
    setOtherLegendValues,
    setUseShapes,
    handleImportData,
    otherLegendValues,
    useShapes,
    totalProteins,
    displayedProteins,
    projectionName,
    selectedFeatureItemsSet,
  } = useProtspace();

  // Ref for the legend component
  const legendRef = useRef<{ downloadAsImage: () => Promise<void> }>(null);

  // Point size state controlled from legend settings
  const [pointSizes, setPointSizes] = useState({
    pointSize: SCATTER_DEFAULTS.pointSize,
    highlightedPointSize: SCATTER_DEFAULTS.highlightedPointSize,
    selectedPointSize: SCATTER_DEFAULTS.selectedPointSize,
  });

  // Export handler
  const { handleExport: onExport } = useExport({
    visualizationData,
    selectedFeature,
    selectedProteinIds,
    hiddenFeatureValues,
  });
 

  // legend handlers come from useProtspace

  // derived moved into hook

  return (
    <main className="flex h-screen flex-col">
      {/* Header */}
      <Header
        onSearch={handleSearch}
        onRemoveHighlight={handleRemoveProtein}
        availableProteinIds={visualizationData?.protein_ids || []}
        selectedProteins={selectedProteinIds}
        onDataImported={handleImportData}
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
        onToggleIsolationMode={handleToggleIsolationMode}
        selectedProteinsCount={selectedProteinIds.length}
        onExport={onExport}
        onClearSelections={() => {
          setSelectedProteinIds([]);
          setHighlightedProteinIds([]);
        }}
      />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main Visualization Area */}
        <div className="flex-grow h-full overflow-hidden p-0">
          {visualizationData ? (
            <Scatterplot
              data={visualizationData}
              selectedProjectionIndex={selectedProjectionIndex}
              selectedFeature={selectedFeature}
              selectedProteinIds={selectedProteinIds}
              highlightedProteinIds={highlightedProteinIds}
              isolationMode={isolationMode}
              splitHistory={splitHistory}
              selectionMode={selectionMode}
              hiddenFeatureValues={hiddenFeatureValues}
              otherFeatureValues={otherLegendValues}
              useShapes={useShapes}
              pointSize={pointSizes.pointSize}
              highlightedPointSize={pointSizes.highlightedPointSize}
              selectedPointSize={pointSizes.selectedPointSize}
              onProteinClick={handleProteinClick}
              onProteinHover={handleProteinHover}
              onViewStructure={setViewStructureId}
              className="w-full h-full"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p>Loading data...</p>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
      <div className="w-96 bg-gray-50 p-4 overflow-auto flex flex-col">
          {/* Legend */}
          {visualizationData && selectedFeature && (
            // @ts-expect-error React 19 types widening for ForwardRefExoticComponent
            <InteractiveLegend
              featureData={{
                name: selectedFeature,
                values: visualizationData.features[selectedFeature].values,
                colors: visualizationData.features[selectedFeature].colors,
                shapes: visualizationData.features[selectedFeature].shapes,
              }}
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
              hiddenFeatureValues={hiddenFeatureValues}
              onToggleVisibility={handleToggleVisibility}
              onExtractFromOther={handleExtractFromOther}
              onSetZOrder={handleSetZOrder}
              onOpenCustomization={handleOpenCustomization}
              onOtherValuesChange={setOtherLegendValues}
              onUseShapesChange={setUseShapes}
              onPointSizesChange={({ pointSize, highlightedPointSize, selectedPointSize }) => {
                setPointSizes({ pointSize, highlightedPointSize, selectedPointSize });
              }}
              selectedItems={Array.from(selectedFeatureItemsSet)}
              className="w-full lg:w-auto"
              isolationMode={isolationMode}
              splitHistory={splitHistory}
              ref={legendRef}
            />
          )}

          {/* 3D Structure Viewer - Always render container but conditionally show content */}
          {selectedProteinIds.length > 0 && (
            <StructureViewer
              proteinId={viewStructureId}
              title="AlphaFold2 Structure"
              onClose={() => setViewStructureId(null)}
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
    </main>
  );
}
