"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import type { VisualizationData } from "@protspace/utils";

interface ProtspaceLegendWebComponentProps {
  data: VisualizationData | null;
  selectedFeature?: string;
  featureValues?: (string | null)[];
  proteinIds?: string[];
  maxVisibleValues?: number;
  selectedItems?: string[];
  isolationMode?: boolean;
  splitHistory?: string[][];
  onLegendItemClick?: (
    value: string | null,
    action: "toggle" | "isolate" | "extract"
  ) => void;
  onLegendZOrderChange?: (zOrderMapping: Record<string, number>) => void;
  onLegendCustomize?: () => void;
  className?: string;
}

function ProtspaceLegendWebComponentClient({
  data,
  selectedFeature = "",
  featureValues = [],
  proteinIds = [],
  maxVisibleValues = 10,
  selectedItems = [],
  isolationMode = false,
  splitHistory,
  onLegendItemClick,
  onLegendZOrderChange,
  onLegendCustomize,
  className = "",
}: ProtspaceLegendWebComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const webComponentRef = useRef<HTMLElement | null>(null);
  const isInitializedRef = useRef(false);
  const onLegendItemClickRef = useRef(onLegendItemClick);
  const onLegendZOrderChangeRef = useRef(onLegendZOrderChange);
  const onLegendCustomizeRef = useRef(onLegendCustomize);
  const instanceId = useRef(
    `legend_wc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
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
          "protspace-legend"
        ) as unknown as HTMLElement & {
          data?: VisualizationData | null;
          selectedFeature?: string;
          featureValues?: (string | null)[];
          proteinIds?: string[];
          maxVisibleValues?: number;
          selectedItems?: string[];
          isolationMode?: boolean;
          splitHistory?: string[][];
        };

        // Double check container is empty before adding
        if (containerRef.current.children.length > 0) {
          containerRef.current.innerHTML = "";
        }

        webComponentRef.current = element;
        containerRef.current.appendChild(element);

        // Set up event listeners
        const handleLegendItemClick = (event: Event) => {
          const customEvent = event as CustomEvent;
          if (onLegendItemClickRef.current && customEvent.detail) {
            onLegendItemClickRef.current(
              customEvent.detail.value,
              customEvent.detail.action
            );
          }
        };

        const handleLegendZOrderChange = (event: Event) => {
          const customEvent = event as CustomEvent;
          if (onLegendZOrderChangeRef.current && customEvent.detail) {
            onLegendZOrderChangeRef.current(customEvent.detail.zOrderMapping);
          }
        };

        const handleLegendCustomize = () => {
          if (onLegendCustomizeRef.current) {
            onLegendCustomizeRef.current();
          }
        };

        element.addEventListener("legend-item-click", handleLegendItemClick);
        element.addEventListener(
          "legend-zorder-change",
          handleLegendZOrderChange
        );
        element.addEventListener("legend-customize", handleLegendCustomize);

        // Mark as initialized
        isInitializedRef.current = true;

        // Set initial properties after the element is created and attached
        setTimeout(() => {
          updateWebComponentProperties();
        }, 0);

        cleanup = () => {
          element.removeEventListener(
            "legend-item-click",
            handleLegendItemClick
          );
          element.removeEventListener(
            "legend-zorder-change",
            handleLegendZOrderChange
          );
          element.removeEventListener(
            "legend-customize",
            handleLegendCustomize
          );
          if (containerRef.current?.contains(element)) {
            containerRef.current.removeChild(element);
          }
          webComponentRef.current = null;
          isInitializedRef.current = false;
        };
      } catch (error) {
        console.error(
          `[${instanceId.current}] Failed to load legend web component:`,
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
      if ("selectedFeature" in element) {
        element.selectedFeature = selectedFeature;
      }
      if ("featureValues" in element) {
        element.featureValues = featureValues;
      }
      if ("proteinIds" in element) {
        element.proteinIds = proteinIds;
      }
      if ("maxVisibleValues" in element) {
        element.maxVisibleValues = maxVisibleValues;
      }
      if ("selectedItems" in element) {
        element.selectedItems = selectedItems;
      }
      if ("isolationMode" in element) {
        element.isolationMode = isolationMode;
      }
      if ("splitHistory" in element) {
        element.splitHistory = splitHistory;
      }
    };

    initWebComponent();

    return cleanup;
  }, []);

  // Update callback refs when props change
  useEffect(() => {
    onLegendItemClickRef.current = onLegendItemClick;
    onLegendZOrderChangeRef.current = onLegendZOrderChange;
    onLegendCustomizeRef.current = onLegendCustomize;
  }, [onLegendItemClick, onLegendZOrderChange, onLegendCustomize]);

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
    if ("selectedFeature" in element) {
      element.selectedFeature = selectedFeature;
    }
    if ("featureValues" in element) {
      element.featureValues = featureValues;
    }
    if ("proteinIds" in element) {
      element.proteinIds = proteinIds;
    }
    if ("maxVisibleValues" in element) {
      element.maxVisibleValues = maxVisibleValues;
    }
    if ("selectedItems" in element) {
      element.selectedItems = selectedItems;
    }
    if ("isolationMode" in element) {
      element.isolationMode = isolationMode;
    }
    if ("splitHistory" in element) {
      element.splitHistory = splitHistory;
    }
  }, [
    data,
    selectedFeature,
    featureValues,
    proteinIds,
    maxVisibleValues,
    selectedItems,
    isolationMode,
    splitHistory,
  ]);

  return <div className={`${className}`} ref={containerRef} />;
}

// Export a dynamically imported version to avoid SSR issues
const ProtspaceLegendWebComponent = dynamic(
  () => Promise.resolve(ProtspaceLegendWebComponentClient),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse bg-gray-200 h-32 w-full rounded">
        Loading legend...
      </div>
    ),
  }
);

export default ProtspaceLegendWebComponent;
