"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import type { VisualizationData, ScatterplotConfig } from "@protspace/utils";

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
  className?: string;
}

function ProtspaceWebComponentClient({
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
  className = "",
}: ProtspaceWebComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const webComponentRef = useRef<HTMLElement | null>(null);
  const isInitializedRef = useRef(false);
  const onProteinClickRef = useRef(onProteinClick);
  const onProteinHoverRef = useRef(onProteinHover);
  const instanceId = useRef(
    `wc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );

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

        element.addEventListener("protein-click", handleProteinClick);
        element.addEventListener("protein-hover", handleProteinHover);

        // Mark as initialized
        isInitializedRef.current = true;

        // **IMPORTANT**: Set initial properties after the element is created and attached
        setTimeout(() => {
          updateWebComponentProperties();
        }, 0);

        cleanup = () => {
          element.removeEventListener("protein-click", handleProteinClick);
          element.removeEventListener("protein-hover", handleProteinHover);
          if (containerRef.current?.contains(element)) {
            containerRef.current.removeChild(element);
          }
          webComponentRef.current = null;
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
  }, [onProteinClick, onProteinHover]);

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

  return <div className={`${className}`} ref={containerRef} />;
}

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
