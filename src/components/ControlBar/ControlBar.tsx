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
  onExport: (type: "json" | "ids" | "png" | "svg") => void;
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
            className="py-1 px-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
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
          className={`px-3 py-1 rounded-md flex items-center space-x-1 ${
            selectionMode
              ? "bg-blue-500 text-white hover:bg-blue-600"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-700"
          }`}
          title="Toggle Selection Mode"
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
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <span>Select</span>
        </button>

        {/* Clear selections button */}
        <button
          onClick={onClearSelections}
          className="px-3 py-1 border border-gray-300 rounded-md flex items-center space-x-1 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
          title="Clear Selections"
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

        {/* Isolation mode toggle */}
        <button
          onClick={onToggleIsolationMode}
          disabled={selectedProteinsCount === 0}
          className={`px-3 py-1 rounded-md flex items-center space-x-1 ${
            isolationMode
              ? "bg-blue-500 text-white hover:bg-blue-600"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-700"
          } ${
            selectedProteinsCount === 0 ? "opacity-50 cursor-not-allowed" : ""
          }`}
          title={
            selectedProteinsCount === 0
              ? "Select proteins first"
              : "Toggle Isolation Mode"
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
          <span>Isolate</span>
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
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
