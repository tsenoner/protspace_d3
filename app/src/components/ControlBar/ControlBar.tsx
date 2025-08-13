"use client";

// no React types imported to avoid cross-version type mismatches
import { ControlBarProps } from "./types";
import { ProjectionSelect } from "./ProjectionSelect";
import { FeatureSelect } from "./FeatureSelect";
import { ModeToggleButton } from "./ModeToggleButton";
import { ExportMenu } from "./ExportMenu";

export function ControlBar({
  projections,
  features,
  selectedProjection,
  selectedFeature,
  selectionMode,
  isolationMode,
  selectedProteinsCount,
  onProjectionChange,
  onFeatureChange,
  onToggleSelectionMode,
  onToggleIsolationMode,
  onClearSelections,
  onExport,
}: ControlBarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-white border-b shadow-sm">
      <div className="flex items-center space-x-4">
        <ProjectionSelect
          projections={projections}
          selectedProjection={selectedProjection}
          onChange={onProjectionChange}
        />

        <FeatureSelect
          features={features}
          selectedFeature={selectedFeature}
          onChange={onFeatureChange}
        />
      </div>

      <div className="flex items-center space-x-2">
        <ModeToggleButton
          active={selectionMode}
          onClick={onToggleSelectionMode}
          title={
            isolationMode
              ? "Select proteins within the split view for further refinement"
              : "Select proteins by clicking or dragging to enclose multiple points"
          }
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
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
            <circle cx="8" cy="8" r="1.5" fill="currentColor" />
            <circle cx="12" cy="14" r="1.5" fill="currentColor" />
            <circle cx="16" cy="10" r="1.5" fill="currentColor" />
            <circle cx="7" cy="16" r="1.5" fill="currentColor" />
            <circle cx="17" cy="17" r="1.5" fill="currentColor" />
          </svg>
          <span>Select</span>
        </ModeToggleButton>

        <button
          onClick={onClearSelections}
          disabled={selectedProteinsCount === 0}
          type="button"
          className={`px-3 py-1 border border-gray-300 rounded-md flex items-center space-x-1 hover:bg-gray-100 ${
            selectedProteinsCount === 0 ? "opacity-50 cursor-not-allowed" : ""
          }`}
          title="Clear all selected proteins"
        >
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          <span>Clear</span>
        </button>

        <ModeToggleButton
          active={isolationMode}
          onClick={onToggleIsolationMode}
          disabled={!isolationMode && selectedProteinsCount === 0}
          title={
            isolationMode && selectedProteinsCount > 0
              ? "Split again to further refine view"
              : isolationMode && selectedProteinsCount === 0
              ? "Exit split mode and view all proteins"
              : selectedProteinsCount === 0
              ? "Select proteins first to split data"
              : "Split view to focus on selected proteins only"
          }
        >
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
              d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
            />
          </svg>
          <span>
            {isolationMode && selectedProteinsCount > 0
              ? "Split Again"
              : isolationMode && selectedProteinsCount === 0
              ? "Show All Data"
              : "Split Data"}
          </span>
        </ModeToggleButton>

        <ExportMenu onExport={onExport} />
      </div>
    </div>
  );
}
export default ControlBar;
