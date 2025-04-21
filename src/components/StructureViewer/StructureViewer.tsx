"use client";

import { useEffect, useRef, useState } from "react";

interface StructureViewerProps {
  proteinId: string | null;
  onClose?: () => void;
  title?: string;
}

// Define the Molstar type for TypeScript
declare global {
  interface Window {
    molstar: {
      Viewer: {
        create: (
          target: string | HTMLElement,
          options?: {
            layoutIsExpanded?: boolean;
            layoutShowControls?: boolean;
            layoutShowRemoteState?: boolean;
            layoutShowSequence?: boolean;
            layoutShowLog?: boolean;
            layoutShowLeftPanel?: boolean;
            viewportShowExpand?: boolean;
            viewportShowSelectionMode?: boolean;
            viewportShowAnimation?: boolean;
            pdbProvider?: string;
            emdbProvider?: string;
          }
        ) => Promise<{
          loadPdb: (pdbId: string) => Promise<void>;
          loadStructureFromUrl: (
            url: string,
            format?: string,
            options?: Record<string, unknown>
          ) => Promise<void>;
          dispose: () => void;
        }>;
      };
    };
  }
}

export default function StructureViewer({
  proteinId,
  onClose,
  title = "Protein Structure",
}: StructureViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!proteinId || !viewerRef.current) return;

    const formattedId = proteinId.split(".")[0]; // Remove version numbers if any

    // Load the Molstar viewer via CDN
    const loadScript = () => {
      return new Promise<void>((resolve, reject) => {
        if (document.getElementById("molstar-script")) {
          resolve();
          return;
        }

        const script = document.createElement("script");
        script.id = "molstar-script";
        script.src =
          "https://cdn.jsdelivr.net/npm/molstar@3.44.0/build/viewer/molstar.js";
        script.async = true;
        script.onload = () => resolve();
        script.onerror = reject;
        document.head.appendChild(script);
      });
    };

    const loadStyles = () => {
      return new Promise<void>((resolve, reject) => {
        if (document.getElementById("molstar-style")) {
          resolve();
          return;
        }

        const link = document.createElement("link");
        link.id = "molstar-style";
        link.rel = "stylesheet";
        link.href =
          "https://cdn.jsdelivr.net/npm/molstar@3.44.0/build/viewer/molstar.css";
        link.onload = () => resolve();
        link.onerror = reject;
        document.head.appendChild(link);
      });
    };

    const initViewer = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load required resources
        await Promise.all([loadScript(), loadStyles()]);

        // Create a new viewer instance
        const viewer = await window.molstar?.Viewer.create(viewerRef.current!, {
          layoutIsExpanded: false,
          layoutShowControls: false,
          layoutShowRemoteState: false,
          layoutShowSequence: false,
          layoutShowLog: false,
          layoutShowLeftPanel: false,
          viewportShowExpand: false,
          viewportShowSelectionMode: false,
          viewportShowAnimation: false,
        });

        // Try loading from AlphaFold
        try {
          const alphafoldUrl = `https://alphafold.ebi.ac.uk/files/AF-${formattedId}-F1-model_v4.pdb`;

          await viewer?.loadStructureFromUrl(alphafoldUrl, "pdb");
          setIsLoading(false);
        } catch (alphafoldError) {
          console.error("Error loading AlphaFold structure:", alphafoldError);

          // Try PDB as fallback
          try {
            await viewer?.loadPdb(formattedId);
            setIsLoading(false);
          } catch (pdbError) {
            console.error("Error loading structure:", pdbError);
            setError("Failed to load protein structure");
            setIsLoading(false);
          }
        }
      } catch (error) {
        console.error("Error initializing structure viewer:", error);
        setError(`Failed to load structure: ${(error as Error).message}`);
        setIsLoading(false);
      }
    };

    initViewer();

    return () => {
      // Clean up viewer
      if (viewerRef.current) {
        viewerRef.current.innerHTML = "";
      }
    };
  }, [proteinId]);

  if (!proteinId) return null;

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-md shadow-sm mt-4">
      <div className="flex justify-between items-center p-3 border-b dark:border-gray-700">
        <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">
          {title}
          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
            {proteinId}
          </span>
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
          >
            X
          </button>
        )}
      </div>
      <div className="w-full h-80 relative border-0 rounded-b-md">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 dark:bg-gray-800 dark:bg-opacity-75">
            <div className="text-center">
              <svg
                className="animate-spin h-10 w-10 mb-2 mx-auto text-blue-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <p>Loading protein structure...</p>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-800">
            <div className="text-center text-red-500 p-4">
              <p className="font-medium">{error}</p>
              <p className="mt-2 text-sm">
                The structure data could not be loaded. This protein may not
                have an available structure in AlphaFold or PDB.
              </p>
            </div>
          </div>
        )}
        <div ref={viewerRef} className="w-full h-full" />
      </div>
      <div className="p-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-b-md">
        <p>
          <strong>Tip:</strong> Left-click and drag to rotate. Right-click and
          drag to move. Scroll to zoom.
        </p>
      </div>
    </div>
  );
}
