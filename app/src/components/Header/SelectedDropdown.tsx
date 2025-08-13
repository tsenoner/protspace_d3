"use client";

import { useState } from "react";
import type { SelectedDropdownProps } from "./types";

export function SelectedDropdown({
  selectedProteins,
  onRemoveHighlight,
}: SelectedDropdownProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  const disabled = selectedProteins.length === 0;

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown((prev) => !prev)}
        disabled={disabled}
        className={`px-3 py-1.5 border border-gray-300 rounded-lg flex items-center space-x-1 bg-white text-gray-800 ${
          disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-100 transition-colors duration-200"
        }`}
      >
        <span>Selected ({selectedProteins.length})</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={showDropdown ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"}
          />
        </svg>
      </button>

      {showDropdown && !disabled && (
        <div className="absolute z-10 right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200">
          <ul className="py-1 max-h-48 overflow-y-auto">
            {Array.from(new Set(selectedProteins)).map((protein) => (
              <li
                key={protein}
                className="px-4 py-2 cursor-pointer flex items-center justify-between text-gray-700 hover:bg-gray-100"
              >
                <span className="truncate">{protein}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveHighlight(protein);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
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
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}


