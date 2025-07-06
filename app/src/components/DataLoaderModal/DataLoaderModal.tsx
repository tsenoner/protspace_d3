"use client";

import { useState } from "react";
import ProtspaceDataLoaderWebComponent from "@/components/WebComponent/ProtspaceDataLoaderWebComponent";
import { VisualizationData } from "@/components/Scatterplot/ImprovedScatterplot";

interface DataLoaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataLoaded: (data: VisualizationData) => void;
}

export default function DataLoaderModal({
  isOpen,
  onClose,
  onDataLoaded,
}: DataLoaderModalProps) {
  const [error, setError] = useState<string | null>(null);

  const handleDataLoaded = (data: VisualizationData) => {
    console.log("Data loaded in modal:", data);
    onDataLoaded(data);
    onClose();
  };

  const handleDataError = (errorMessage: string) => {
    console.error("Data loading error:", errorMessage);
    setError(errorMessage);
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Load Apache Arrow Data
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Upload protein data in Apache Arrow format (.arrow, .parquet,
              .feather)
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex">
                <svg
                  className="w-5 h-5 text-red-400 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Data Loading Error
                  </h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          <ProtspaceDataLoaderWebComponent
            allowDrop={true}
            onDataLoaded={handleDataLoaded}
            onDataError={handleDataError}
            className="w-full"
          />

          {/* Help Text */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-medium text-blue-800 mb-2">
              Required Data Format
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>
                • <strong>Protein ID column:</strong> `&apos;protein_id&apos;`,
                `&apos;id&apos;`, `&apos;uniprot&apos;`, etc.
              </li>
              <li>
                • <strong>X coordinates:</strong> `&apos;x&apos;`,
                `&apos;umap_1&apos;`, `&apos;pc1&apos;`, `&apos;tsne_1&apos;`,
                etc.
              </li>
              <li>
                • <strong>Y coordinates:</strong> `&apos;y&apos;`,
                `&apos;umap_2&apos;`, `&apos;pc2&apos;`, `&apos;tsne_2&apos;`,
                etc.
              </li>
              <li>
                • <strong>Optional:</strong> Additional categorical columns for
                features
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
