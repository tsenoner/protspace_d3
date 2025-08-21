"use client";

import { OtherItemsDialogProps } from "./types";

export function OtherItemsDialog({ otherItems, onExtractItem, onClose }: OtherItemsDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Extract from &apos;Other&apos; category</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Select items to extract from the &apos;Other&apos; category. Extracted items will appear individually in the legend.
          </p>
        </div>

        <ul className="divide-y divide-gray-200 mb-4 max-h-60 overflow-y-auto">
          {otherItems.map(([value, count]) => (
            <li
              key={value === null ? "null" : value}
              className="py-2 flex justify-between items-center hover:bg-gray-50 px-2 rounded"
            >
              <div className="flex items-center">
                <span>{value === null ? "N/A" : value}</span>
                <span className="ml-2 text-xs text-gray-500">({count})</span>
              </div>
              <button
                onClick={() => value !== null && onExtractItem(value)}
                className="text-[color:var(--primary-600)] hover:text-[color:var(--primary-700)] text-sm font-medium"
              >
                Extract
              </button>
            </li>
          ))}
        </ul>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default OtherItemsDialog;


