"use client";

import { useState } from "react";

interface ControlBarProps {
  projections: string[];
  features: string[];
  selectedProjection: string;
  selectedFeature: string;
  selectionMode: boolean;
  isolationMode: boolean;
  selectedProteinsCount: number;
  onProjectionChange: (projection: string) => void;
  onFeatureChange: (feature: string) => void;
  onToggleSelectionMode: () => void;
  onToggleIsolationMode: () => void;
  onClearSelections: () => void;
  onExport: (type: "json" | "ids" | "png" | "svg" | "pdf") => void;
}

export default function ControlBar({
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
  const [showExportMenu, setShowExportMenu] = useState(false);

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-white border-b shadow-sm dark:bg-gray-900 dark:border-gray-800">
      {/* Left side controls */}
      <div className="flex items-center space-x-4">
        {/* Projection selection */}
        <div className="flex items-center space-x-2">
          <label
            htmlFor="projection-select"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Projection:
          </label>
          <select
            id="projection-select"
            value={selectedProjection}
            onChange={(e) => onProjectionChange(e.target.value)}
            className="py-1 px-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
          >
            {projections.map((projection) => (
              <option key={projection} value={projection}>
                {projection}
              </option>
            ))}
          </select>
        </div>

        {/* Feature selection */}
        <div className="flex items-center space-x-2">
          <label
            htmlFor="feature-select"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Color by:
          </label>
          <select
            id="feature-select"
            value={selectedFeature}
            onChange={(e) => onFeatureChange(e.target.value)}
            className="py-1.5 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-600"
          >
            {features.map((feature) => (
              <option key={feature} value={feature}>
                {feature}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right side controls */}
      <div className="flex items-center space-x-2">
        {/* Selection mode toggle */}
        <button
          onClick={onToggleSelectionMode}
          disabled={false}
          className={`px-3 py-1 rounded-md flex items-center space-x-1 ${
            selectionMode
              ? "bg-blue-500 text-white hover:bg-blue-600"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-700"
          }`}
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
          <span>Select</span>
        </button>

        {/* Clear selections button */}
        <button
          onClick={onClearSelections}
          disabled={selectedProteinsCount === 0}
          className={`px-3 py-1 border border-gray-300 rounded-md flex items-center space-x-1 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 ${
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

        {/* Split mode toggle (formerly Isolation mode) */}
        <button
          onClick={onToggleIsolationMode}
          disabled={!isolationMode && selectedProteinsCount === 0}
          className={`px-3 py-1 rounded-md flex items-center space-x-1 ${
            isolationMode
              ? "bg-blue-500 text-white hover:bg-blue-600"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-700"
          } ${
            !isolationMode && selectedProteinsCount === 0
              ? "opacity-50 cursor-not-allowed"
              : ""
          }`}
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
        </button>

        {/* Export dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="px-3 py-1 border border-gray-300 rounded-md flex items-center space-x-1 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
            title="Export Options"
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
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <span>Export</span>
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
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {showExportMenu && (
            <div className="absolute z-10 right-0 mt-1 w-40 bg-white rounded-md shadow-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
              <ul className="py-1">
                <li>
                  <button
                    onClick={() => {
                      onExport("json");
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    Export JSON
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      onExport("ids");
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    Export Protein IDs
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      onExport("png");
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    Export PNG
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      onExport("svg");
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    Export SVG
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      onExport("pdf");
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    Export PDF
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
