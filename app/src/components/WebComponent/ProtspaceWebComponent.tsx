"use client";

import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import dynamic from "next/dynamic";
import type { VisualizationData, ScatterplotConfig } from "@protspace/utils";

export interface ProtspaceWebComponentRef {
  enterSplitMode: (selectedIds: string[]) => void;
  createNestedSplit: (selectedIds: string[]) => void;
  exitSplitMode: () => void;
  isInSplitMode: () => boolean;
  getCurrentData: () => VisualizationData | null;
  resetZoom: () => void;
}

interface ProtspaceWebComponentProps {
  data: VisualizationData | null;
  config?: Partial<ScatterplotConfig>;
  selectedProjectionIndex?: number;
  selectedFeature?: string;
  highlightedProteinIds?: string[];
  selectedProteinIds?: string[];
  isolationMode?: boolean;
  splitHistory?: string[][];
  selectionMode?: boolean;
  hiddenFeatureValues?: string[];
  onProteinClick?: (proteinId: string, event?: CustomEvent) => void;
  onProteinHover?: (proteinId: string | null) => void;
  onSplitStateChange?: (
    isolationMode: boolean,
    splitHistory: string[][],
    currentDataSize: number,
    selectedProteinsCount: number
  ) => void;
  onDataChange?: (data: VisualizationData, isFiltered: boolean) => void;
  onProteinSelection?: (proteinIds: string[], isMultiple: boolean) => void;
  className?: string;
}

const ProtspaceWebComponentClient = forwardRef<
  ProtspaceWebComponentRef,
  ProtspaceWebComponentProps
>(
  (
    {
      data,
      config = {},
      selectedProjectionIndex = 0,
      selectedFeature = "",
      highlightedProteinIds = [],
      selectedProteinIds = [],
      isolationMode = false,
      splitHistory,
      selectionMode = false,
      hiddenFeatureValues = [],
      onProteinClick,
      onProteinHover,
      onSplitStateChange,
      onDataChange,
      onProteinSelection,
      className = "",
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const webComponentRef = useRef<HTMLElement | null>(null);
    const isInitializedRef = useRef(false);
    const onProteinClickRef = useRef(onProteinClick);
    const onProteinHoverRef = useRef(onProteinHover);
    const onSplitStateChangeRef = useRef(onSplitStateChange);
    const onDataChangeRef = useRef(onDataChange);
    const onProteinSelectionRef = useRef(onProteinSelection);
    const instanceId = useRef(
      `wc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    );

    // Expose web component methods
    const webComponentMethods = useRef<{
      enterSplitMode: (selectedIds: string[]) => void;
      createNestedSplit: (selectedIds: string[]) => void;
      exitSplitMode: () => void;
      isInSplitMode: () => boolean;
      getCurrentData: () => VisualizationData | null;
      resetZoom: () => void;
    } | null>(null);

    // Initialize web component
    useEffect(() => {
      // Prevent re-initialization if already initialized
      if (isInitializedRef.current && webComponentRef.current) {
        return;
      }

      // Clean up any existing component first
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }

      // Reset refs
      webComponentRef.current = null;
      isInitializedRef.current = false;

      let cleanup: (() => void) | undefined;

      const initWebComponent = async () => {
        try {
          // Dynamically import the web component to register it
          await import("@protspace/core");

          if (!containerRef.current) {
            return;
          }

          // Double check we haven't been cleaned up during async operation
          if (isInitializedRef.current) {
            return;
          }

          // Create the web component element
          const element = document.createElement(
            "protspace-scatterplot"
          ) as HTMLElement & {
            data?: VisualizationData | null;
            config?: Partial<ScatterplotConfig>;
            selectedProjectionIndex?: number;
            selectedFeature?: string;
            highlightedProteinIds?: string[];
            selectedProteinIds?: string[];
            isolationMode?: boolean;
            splitHistory?: string[][];
            selectionMode?: boolean;
            hiddenFeatureValues?: string[];
          };

          // Double check container is empty before adding
          if (containerRef.current.children.length > 0) {
            containerRef.current.innerHTML = "";
          }

          webComponentRef.current = element;
          containerRef.current.appendChild(element);

          // Set up event listeners
          const handleProteinClick = (event: Event) => {
            const customEvent = event as CustomEvent;
            if (onProteinClickRef.current && customEvent.detail) {
              onProteinClickRef.current(
                customEvent.detail.proteinId,
                customEvent
              );
            }
          };

          const handleProteinHover = (event: Event) => {
            const customEvent = event as CustomEvent;
            if (onProteinHoverRef.current && customEvent.detail) {
              onProteinHoverRef.current(customEvent.detail.proteinId);
            }
          };

          const handleSplitStateChange = (event: Event) => {
            const customEvent = event as CustomEvent;
            if (onSplitStateChangeRef.current && customEvent.detail) {
              const {
                isolationMode,
                splitHistory,
                currentDataSize,
                selectedProteinsCount,
              } = customEvent.detail;
              onSplitStateChangeRef.current(
                isolationMode,
                splitHistory,
                currentDataSize,
                selectedProteinsCount
              );
            }
          };

          const handleDataChange = (event: Event) => {
            const customEvent = event as CustomEvent;
            if (onDataChangeRef.current && customEvent.detail) {
              const { data, isFiltered } = customEvent.detail;
              onDataChangeRef.current(data, isFiltered);
            }
          };

          const handleProteinSelection = (event: Event) => {
            const customEvent = event as CustomEvent;
            if (onProteinSelectionRef.current && customEvent.detail) {
              const { proteinIds, isMultiple } = customEvent.detail;
              onProteinSelectionRef.current(proteinIds, isMultiple);
            }
          };

          element.addEventListener("protein-click", handleProteinClick);
          element.addEventListener("protein-hover", handleProteinHover);
          element.addEventListener(
            "split-state-change",
            handleSplitStateChange
          );
          element.addEventListener("data-change", handleDataChange);
          element.addEventListener("protein-selection", handleProteinSelection);

          // Expose web component methods
          webComponentMethods.current = {
            enterSplitMode: (selectedIds: string[]) => {
              if (
                "enterSplitMode" in element &&
                typeof element.enterSplitMode === "function"
              ) {
                element.enterSplitMode(selectedIds);
              }
            },
            createNestedSplit: (selectedIds: string[]) => {
              if (
                "createNestedSplit" in element &&
                typeof element.createNestedSplit === "function"
              ) {
                element.createNestedSplit(selectedIds);
              }
            },
            exitSplitMode: () => {
              if (
                "exitSplitMode" in element &&
                typeof element.exitSplitMode === "function"
              ) {
                element.exitSplitMode();
              }
            },
            isInSplitMode: () => {
              if (
                "isInSplitMode" in element &&
                typeof element.isInSplitMode === "function"
              ) {
                return element.isInSplitMode();
              }
              return false;
            },
            getCurrentData: () => {
              if (
                "getCurrentData" in element &&
                typeof element.getCurrentData === "function"
              ) {
                return element.getCurrentData();
              }
              return null;
            },
            resetZoom: () => {
              if (
                "resetZoom" in element &&
                typeof element.resetZoom === "function"
              ) {
                element.resetZoom();
              }
            },
          };

          // Mark as initialized
          isInitializedRef.current = true;

          // **IMPORTANT**: Set initial properties after the element is created and attached
          setTimeout(() => {
            updateWebComponentProperties();
          }, 0);

          cleanup = () => {
            element.removeEventListener("protein-click", handleProteinClick);
            element.removeEventListener("protein-hover", handleProteinHover);
            element.removeEventListener(
              "split-state-change",
              handleSplitStateChange
            );
            element.removeEventListener("data-change", handleDataChange);
            element.removeEventListener(
              "protein-selection",
              handleProteinSelection
            );
            if (containerRef.current?.contains(element)) {
              containerRef.current.removeChild(element);
            }
            webComponentRef.current = null;
            webComponentMethods.current = null;
            isInitializedRef.current = false;
          };
        } catch (error) {
          console.error(
            `[${instanceId.current}] Failed to load web component:`,
            error
          );
          isInitializedRef.current = false;
        }
      };

      const updateWebComponentProperties = () => {
        const element = webComponentRef.current;
        if (!element) {
          return;
        }

        // Update properties on the web component
        if ("data" in element) {
          element.data = data;
        }
        if ("config" in element) element.config = config;
        if ("selectedProjectionIndex" in element)
          element.selectedProjectionIndex = selectedProjectionIndex;
        if ("selectedFeature" in element) {
          element.selectedFeature = selectedFeature;
        }
        if ("highlightedProteinIds" in element)
          element.highlightedProteinIds = highlightedProteinIds;
        if ("selectedProteinIds" in element)
          element.selectedProteinIds = selectedProteinIds;
        if ("isolationMode" in element) element.isolationMode = isolationMode;
        if ("splitHistory" in element) element.splitHistory = splitHistory;
        if ("selectionMode" in element) element.selectionMode = selectionMode;
        if ("hiddenFeatureValues" in element)
          element.hiddenFeatureValues = hiddenFeatureValues;
      };

      initWebComponent();

      return cleanup;
    }, []);

    // Update callback refs when props change
    useEffect(() => {
      onProteinClickRef.current = onProteinClick;
      onProteinHoverRef.current = onProteinHover;
      onSplitStateChangeRef.current = onSplitStateChange;
      onDataChangeRef.current = onDataChange;
      onProteinSelectionRef.current = onProteinSelection;
    }, [
      onProteinClick,
      onProteinHover,
      onSplitStateChange,
      onDataChange,
      onProteinSelection,
    ]);

    // Update properties when they change (but only if web component exists)
    useEffect(() => {
      const element = webComponentRef.current;
      if (!element) {
        return;
      }

      // Update properties on the web component
      if ("data" in element) {
        element.data = data;
      }
      if ("config" in element) element.config = config;
      if ("selectedProjectionIndex" in element)
        element.selectedProjectionIndex = selectedProjectionIndex;
      if ("selectedFeature" in element) {
        element.selectedFeature = selectedFeature;
      }
      if ("highlightedProteinIds" in element)
        element.highlightedProteinIds = highlightedProteinIds;
      if ("selectedProteinIds" in element)
        element.selectedProteinIds = selectedProteinIds;
      if ("isolationMode" in element) element.isolationMode = isolationMode;
      if ("splitHistory" in element) element.splitHistory = splitHistory;
      if ("selectionMode" in element) element.selectionMode = selectionMode;
      if ("hiddenFeatureValues" in element)
        element.hiddenFeatureValues = hiddenFeatureValues;
    }, [
      data,
      config,
      selectedProjectionIndex,
      selectedFeature,
      highlightedProteinIds,
      selectedProteinIds,
      isolationMode,
      splitHistory,
      selectionMode,
      hiddenFeatureValues,
    ]);

    useImperativeHandle(ref, () => ({
      enterSplitMode: (selectedIds: string[]) => {
        if (webComponentMethods.current) {
          webComponentMethods.current.enterSplitMode(selectedIds);
        }
      },
      createNestedSplit: (selectedIds: string[]) => {
        if (webComponentMethods.current) {
          webComponentMethods.current.createNestedSplit(selectedIds);
        }
      },
      exitSplitMode: () => {
        if (webComponentMethods.current) {
          webComponentMethods.current.exitSplitMode();
        }
      },
      isInSplitMode: () => {
        if (webComponentMethods.current) {
          return webComponentMethods.current.isInSplitMode();
        }
        return false;
      },
      getCurrentData: () => {
        if (webComponentMethods.current) {
          return webComponentMethods.current.getCurrentData();
        }
        return null;
      },
      resetZoom: () => {
        if (webComponentMethods.current) {
          webComponentMethods.current.resetZoom();
        }
      },
    }));

    return <div className={`${className}`} ref={containerRef} />;
  }
);

ProtspaceWebComponentClient.displayName = "ProtspaceWebComponentClient";

// Export a dynamically imported version to avoid SSR issues
const ProtspaceWebComponent = dynamic(
  () => Promise.resolve(ProtspaceWebComponentClient),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse bg-gray-200 h-96 w-full rounded">
        Loading web component...
      </div>
    ),
  }
);

export default ProtspaceWebComponent;
