"use client";

import { useState } from "react";
import type { ExportType } from "./types";

interface ExportMenuProps {
  onExport: (type: ExportType) => void;
}

export function ExportMenu({ onExport }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        type="button"
        className="px-3 py-1 border border-gray-300 rounded-md flex items-center space-x-1 hover:bg-gray-100"
        title="Export Options"
        aria-haspopup="menu"
        aria-expanded={open}
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

      {open && (
        <div className="absolute z-10 right-0 mt-1 w-40 bg-white rounded-md shadow-lg border border-gray-200">
          <ul className="py-1" role="menu" aria-label="Export">
            {(
              ["json", "ids", "png", "svg", "pdf"] as const
            ).map((type) => (
              <li key={type} role="none">
                <button
                  onClick={() => {
                    onExport(type);
                    setOpen(false);
                  }}
                  type="button"
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  role="menuitem"
                >
                  {type === "json"
                    ? "Export JSON"
                    : type === "ids"
                    ? "Export Protein IDs"
                    : `Export ${type.toUpperCase()}`}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}


