"use client";

import type { SessionButtonsProps } from "./types";
import {
  readFileOptimized,
  isParquetBundle,
  extractRowsFromParquetBundle,
  convertParquetToVisualizationDataOptimized,
} from "@protspace/core";

export function SessionButtons({
  onDataImported,
}: SessionButtonsProps) {
  const handleImportClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".parquetbundle";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const arrayBuffer = await readFileOptimized(file);
        // Only accept .parquetbundle; guard just in case
        if (!(file.name.endsWith(".parquetbundle") || isParquetBundle(arrayBuffer))) {
          alert("Please select a .parquetbundle file");
          return;
        }
        const rows = await extractRowsFromParquetBundle(arrayBuffer, {
          disableInspection: file.size > 50 * 1024 * 1024,
        });
        const data = await convertParquetToVisualizationDataOptimized(rows);
        onDataImported(data);
      } catch (err) {
        console.error("Failed to import data:", err);
        alert("Failed to import data. See console for details.");
      }
    };
    input.click();
  };
  return (
    <>
      <button
        onClick={handleImportClick}
        className="p-2 text-white hover:bg-[#0d3159] cursor-pointer rounded-lg transition-colors duration-200"
        title="Import Data (.parquetbundle)"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v12m0 0l-3-3m3 3l3-3M4 20h16" />
        </svg>
      </button>
    </>
  );
}


