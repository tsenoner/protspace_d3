"use client";

import { useState } from "react";

interface LegendSettingsDialogProps {
  open: boolean;
  maxVisibleValues: number;
  includeOthers: boolean;
  includeShapes: boolean;
  shapeSize: number;
  onSave: (settings: {
    maxVisibleValues: number;
    includeOthers: boolean;
    includeShapes: boolean;
    shapeSize: number;
  }) => void;
  onClose: () => void;
}

export default function LegendSettingsDialog({
  open,
  maxVisibleValues,
  includeOthers,
  includeShapes,
  shapeSize,
  onSave,
  onClose,
}: LegendSettingsDialogProps) {
  if (!open) return null;

  const [localMax, setLocalMax] = useState<number>(maxVisibleValues);
  const [localIncludeOthers, setLocalIncludeOthers] = useState<boolean>(includeOthers);
  const [localIncludeShapes, setLocalIncludeShapes] = useState<boolean>(includeShapes);
  const [localShapeSize, setLocalShapeSize] = useState<number>(shapeSize);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75" onClick={onClose}>
      <div
        className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Legend settings</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="legend-max" className="block text-sm font-medium text-gray-700 mb-1">
              Max legend items
            </label>
            <input
              id="legend-max"
              type="number"
              min={1}
              value={localMax}
              onChange={(e) => {
                const parsed = parseInt(e.target.value, 10);
                if (!Number.isNaN(parsed) && parsed > 0) setLocalMax(parsed);
              }}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <label htmlFor="legend-shape-size" className="block text-sm font-medium text-gray-700 mb-1">
              Shape size
            </label>
            <input
              id="legend-shape-size"
              type="number"
              min={6}
              max={64}
              value={localShapeSize}
              onChange={(e) => {
                const parsed = parseInt(e.target.value, 10);
                if (!Number.isNaN(parsed) && parsed > 0) setLocalShapeSize(parsed);
              }}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={localIncludeOthers}
              onChange={(e) => {
                setLocalIncludeOthers(e.target.checked);
              }}
            />
            Show "Other" category
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={localIncludeShapes}
              onChange={(e) => {
                setLocalIncludeShapes(e.target.checked);
              }}
            />
            Include shapes
          </label>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded">
            Cancel
          </button>
          <button
            onClick={() =>
              onSave({
                maxVisibleValues: localMax,
                includeOthers: localIncludeOthers,
                includeShapes: localIncludeShapes,
                shapeSize: localShapeSize,
              })
            }
            className="bg-[color:var(--primary-600)] hover:bg-[color:var(--primary-700)] text-white px-4 py-2 rounded"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}


