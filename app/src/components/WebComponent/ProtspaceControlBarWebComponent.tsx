"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";

interface ProtspaceControlBarWebComponentProps {
  projections: string[];
  features: string[];
  selectedProjection: string;
  selectedFeature: string;
  selectionMode: boolean;
  isolationMode: boolean;
  selectedProteinsCount: number;
  onProjectionChange?: (projection: string) => void;
  onFeatureChange?: (feature: string) => void;
  onToggleSelectionMode?: () => void;
  onToggleIsolationMode?: () => void;
  onClearSelections?: () => void;
  onExport?: (type: "json" | "ids" | "png" | "svg" | "pdf") => void;
  className?: string;
}

function ProtspaceControlBarWebComponentClient({
  projections,
  features,
  selectedProjection,
  selectedFeature,
  selectionMode,
  isolationMode,
  selectedProteinsCount,
  onProjectionChange,
  onFeatureChange,
  onToggleSelectionMode,
  onToggleIsolationMode,
  onClearSelections,
  onExport,
  className = "",
}: ProtspaceControlBarWebComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const webComponentRef = useRef<HTMLElement | null>(null);
  const isInitializedRef = useRef(false);
  const onProjectionChangeRef = useRef(onProjectionChange);
  const onFeatureChangeRef = useRef(onFeatureChange);
  const onToggleSelectionModeRef = useRef(onToggleSelectionMode);
  const onToggleIsolationModeRef = useRef(onToggleIsolationMode);
  const onClearSelectionsRef = useRef(onClearSelections);
  const onExportRef = useRef(onExport);
  const instanceId = useRef(
    `control_bar_wc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
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
          "protspace-control-bar"
        ) as unknown as HTMLElement & {
          projections?: string[];
          features?: string[];
          selectedProjection?: string;
          selectedFeature?: string;
          selectionMode?: boolean;
          isolationMode?: boolean;
          selectedProteinsCount?: number;
        };

        // Double check container is empty before adding
        if (containerRef.current.children.length > 0) {
          containerRef.current.innerHTML = "";
        }

        webComponentRef.current = element;
        containerRef.current.appendChild(element);

        // Set up event listeners
        const handleProjectionChange = (event: Event) => {
          const customEvent = event as CustomEvent;
          if (onProjectionChangeRef.current && customEvent.detail) {
            onProjectionChangeRef.current(customEvent.detail.projection);
          }
        };

        const handleFeatureChange = (event: Event) => {
          const customEvent = event as CustomEvent;
          if (onFeatureChangeRef.current && customEvent.detail) {
            onFeatureChangeRef.current(customEvent.detail.feature);
          }
        };

        const handleToggleSelectionMode = () => {
          if (onToggleSelectionModeRef.current) {
            onToggleSelectionModeRef.current();
          }
        };

        const handleToggleIsolationMode = () => {
          if (onToggleIsolationModeRef.current) {
            onToggleIsolationModeRef.current();
          }
        };

        const handleClearSelections = () => {
          if (onClearSelectionsRef.current) {
            onClearSelectionsRef.current();
          }
        };

        const handleExport = (event: Event) => {
          const customEvent = event as CustomEvent;
          if (onExportRef.current && customEvent.detail) {
            onExportRef.current(customEvent.detail.type);
          }
        };

        element.addEventListener("projection-change", handleProjectionChange);
        element.addEventListener("feature-change", handleFeatureChange);
        element.addEventListener(
          "toggle-selection-mode",
          handleToggleSelectionMode
        );
        element.addEventListener(
          "toggle-isolation-mode",
          handleToggleIsolationMode
        );
        element.addEventListener("clear-selections", handleClearSelections);
        element.addEventListener("export", handleExport);

        // Mark as initialized
        isInitializedRef.current = true;

        // Set initial properties after the element is created and attached
        setTimeout(() => {
          updateWebComponentProperties();
        }, 0);

        cleanup = () => {
          element.removeEventListener(
            "projection-change",
            handleProjectionChange
          );
          element.removeEventListener("feature-change", handleFeatureChange);
          element.removeEventListener(
            "toggle-selection-mode",
            handleToggleSelectionMode
          );
          element.removeEventListener(
            "toggle-isolation-mode",
            handleToggleIsolationMode
          );
          element.removeEventListener(
            "clear-selections",
            handleClearSelections
          );
          element.removeEventListener("export", handleExport);
          if (containerRef.current?.contains(element)) {
            containerRef.current.removeChild(element);
          }
          webComponentRef.current = null;
          isInitializedRef.current = false;
        };
      } catch (error) {
        console.error(
          `[${instanceId.current}] Failed to load control bar web component:`,
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
      if ("projections" in element) {
        element.projections = projections;
      }
      if ("features" in element) {
        element.features = features;
      }
      if ("selectedProjection" in element) {
        element.selectedProjection = selectedProjection;
      }
      if ("selectedFeature" in element) {
        element.selectedFeature = selectedFeature;
      }
      if ("selectionMode" in element) {
        element.selectionMode = selectionMode;
      }
      if ("isolationMode" in element) {
        element.isolationMode = isolationMode;
      }
      if ("selectedProteinsCount" in element) {
        element.selectedProteinsCount = selectedProteinsCount;
      }
    };

    initWebComponent();

    return cleanup;
  }, []);

  // Update callback refs when props change
  useEffect(() => {
    onProjectionChangeRef.current = onProjectionChange;
    onFeatureChangeRef.current = onFeatureChange;
    onToggleSelectionModeRef.current = onToggleSelectionMode;
    onToggleIsolationModeRef.current = onToggleIsolationMode;
    onClearSelectionsRef.current = onClearSelections;
    onExportRef.current = onExport;
  }, [
    onProjectionChange,
    onFeatureChange,
    onToggleSelectionMode,
    onToggleIsolationMode,
    onClearSelections,
    onExport,
  ]);

  // Update properties when they change (but only if web component exists)
  useEffect(() => {
    const element = webComponentRef.current;
    if (!element) {
      return;
    }

    // Update properties on the web component
    if ("projections" in element) {
      element.projections = projections;
    }
    if ("features" in element) {
      element.features = features;
    }
    if ("selectedProjection" in element) {
      element.selectedProjection = selectedProjection;
    }
    if ("selectedFeature" in element) {
      element.selectedFeature = selectedFeature;
    }
    if ("selectionMode" in element) {
      element.selectionMode = selectionMode;
    }
    if ("isolationMode" in element) {
      element.isolationMode = isolationMode;
    }
    if ("selectedProteinsCount" in element) {
      element.selectedProteinsCount = selectedProteinsCount;
    }
  }, [
    projections,
    features,
    selectedProjection,
    selectedFeature,
    selectionMode,
    isolationMode,
    selectedProteinsCount,
  ]);

  return <div className={`${className}`} ref={containerRef} />;
}

// Export a dynamically imported version to avoid SSR issues
const ProtspaceControlBarWebComponent = dynamic(
  () => Promise.resolve(ProtspaceControlBarWebComponentClient),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse bg-gray-200 h-12 w-full rounded">
        Loading controls...
      </div>
    ),
  }
);

export default ProtspaceControlBarWebComponent;
