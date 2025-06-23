"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { VisualizationData } from "@/components/Scatterplot/ImprovedScatterplot";

interface ProtspaceDataLoaderWebComponentProps {
  src?: string;
  autoLoad?: boolean;
  allowDrop?: boolean;
  columnMappings?: {
    proteinId?: string;
    projection_x?: string;
    projection_y?: string;
    projectionName?: string;
  };
  onDataLoaded?: (data: VisualizationData) => void;
  onDataError?: (error: string) => void;
  className?: string;
}

function ProtspaceDataLoaderWebComponentClient({
  src = "",
  autoLoad = false,
  allowDrop = true,
  columnMappings = {},
  onDataLoaded,
  onDataError,
  className = "",
}: ProtspaceDataLoaderWebComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const webComponentRef = useRef<HTMLElement | null>(null);
  const isInitializedRef = useRef(false);
  const onDataLoadedRef = useRef(onDataLoaded);
  const onDataErrorRef = useRef(onDataError);
  const instanceId = useRef(
    `data_loader_wc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
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
          "protspace-data-loader"
        ) as unknown as HTMLElement & {
          src?: string;
          autoLoad?: boolean;
          allowDrop?: boolean;
          columnMappings?: object;
        };

        // Double check container is empty before adding
        if (containerRef.current.children.length > 0) {
          containerRef.current.innerHTML = "";
        }

        webComponentRef.current = element;
        containerRef.current.appendChild(element);

        // Set up event listeners
        const handleDataLoaded = (event: Event) => {
          const customEvent = event as CustomEvent;
          if (onDataLoadedRef.current && customEvent.detail?.data) {
            onDataLoadedRef.current(customEvent.detail.data);
          }
        };

        const handleDataError = (event: Event) => {
          const customEvent = event as CustomEvent;
          if (onDataErrorRef.current && customEvent.detail?.error) {
            onDataErrorRef.current(customEvent.detail.error);
          }
        };

        element.addEventListener("data-loaded", handleDataLoaded);
        element.addEventListener("data-error", handleDataError);

        // Mark as initialized
        isInitializedRef.current = true;

        // Set initial properties after the element is created and attached
        setTimeout(() => {
          updateWebComponentProperties();
        }, 0);

        cleanup = () => {
          element.removeEventListener("data-loaded", handleDataLoaded);
          element.removeEventListener("data-error", handleDataError);
          if (containerRef.current?.contains(element)) {
            containerRef.current.removeChild(element);
          }
          webComponentRef.current = null;
          isInitializedRef.current = false;
        };
      } catch (error) {
        console.error(
          `[${instanceId.current}] Failed to load data loader web component:`,
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
      if ("src" in element) {
        element.src = src;
      }
      if ("autoLoad" in element) {
        element.autoLoad = autoLoad;
      }
      if ("allowDrop" in element) {
        element.allowDrop = allowDrop;
      }
      if ("columnMappings" in element) {
        element.columnMappings = columnMappings;
      }
    };

    initWebComponent();

    return cleanup;
  }, []);

  // Update callback refs when props change
  useEffect(() => {
    onDataLoadedRef.current = onDataLoaded;
    onDataErrorRef.current = onDataError;
  }, [onDataLoaded, onDataError]);

  // Update properties when they change
  useEffect(() => {
    const updateWebComponentProperties = () => {
      const element = webComponentRef.current;
      if (!element) {
        return;
      }

      // Update properties on the web component
      if ("src" in element) {
        element.src = src;
      }
      if ("autoLoad" in element) {
        element.autoLoad = autoLoad;
      }
      if ("allowDrop" in element) {
        element.allowDrop = allowDrop;
      }
      if ("columnMappings" in element) {
        element.columnMappings = columnMappings;
      }
    };

    if (isInitializedRef.current) {
      updateWebComponentProperties();
    }
  }, [src, autoLoad, allowDrop, columnMappings]);

  return (
    <div
      ref={containerRef}
      className={className}
      data-component-id={instanceId.current}
    />
  );
}

// Use dynamic import to avoid SSR issues
const ProtspaceDataLoaderWebComponent = dynamic(
  () => Promise.resolve(ProtspaceDataLoaderWebComponentClient),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">Loading data loader...</span>
      </div>
    ),
  }
);

export default ProtspaceDataLoaderWebComponent;
