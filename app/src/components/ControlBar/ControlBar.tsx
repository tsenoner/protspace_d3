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
  selectedProteinsCount,
  onProjectionChange,
  onFeatureChange,
  onToggleSelectionMode,
  onClearSelections,
  onExport,
  onOpenFilter,
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
          title={"Select proteins by clicking or dragging to enclose multiple points"}
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
          onClick={onOpenFilter}
          type="button"
          className={"px-3 py-1 border border-gray-300 rounded-md flex items-center space-x-1 hover:bg-gray-100"}
          title="Open filter configuration"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 mr-1"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h18M6 12h12M10 19h4" />
          </svg>
          <span>Filter</span>
        </button>

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

        

        <ExportMenu onExport={onExport} />
      </div>
    </div>
  );
}
export default ControlBar;
