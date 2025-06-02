"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";

interface ProtspaceStructureViewerWebComponentProps {
  proteinId: string | null;
  title?: string;
  showHeader?: boolean;
  showCloseButton?: boolean;
  showTips?: boolean;
  height?: string;
  onStructureLoad?: (
    proteinId: string,
    status: "loading" | "loaded" | "error",
    error?: string
  ) => void;
  onClose?: () => void;
  className?: string;
}

function ProtspaceStructureViewerWebComponentClient({
  proteinId,
  title = "AlphaFold2 Structure",
  showHeader = true,
  showCloseButton = false,
  showTips = true,
  height = "400px",
  onStructureLoad,
  onClose,
  className = "",
}: ProtspaceStructureViewerWebComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const webComponentRef = useRef<HTMLElement | null>(null);
  const isInitializedRef = useRef(false);
  const onStructureLoadRef = useRef(onStructureLoad);
  const onCloseRef = useRef(onClose);
  const instanceId = useRef(
    `structure_wc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
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
          "protspace-structure-viewer"
        ) as unknown as HTMLElement & {
          proteinId?: string | null;
          title?: string;
          showHeader?: boolean;
          showCloseButton?: boolean;
          showTips?: boolean;
          height?: string;
        };

        // Double check container is empty before adding
        if (containerRef.current.children.length > 0) {
          containerRef.current.innerHTML = "";
        }

        webComponentRef.current = element;
        containerRef.current.appendChild(element);

        // Set up event listeners
        const handleStructureLoad = (event: Event) => {
          const customEvent = event as CustomEvent;
          if (onStructureLoadRef.current && customEvent.detail) {
            onStructureLoadRef.current(
              customEvent.detail.proteinId,
              customEvent.detail.status,
              customEvent.detail.error
            );
          }
        };

        const handleClose = () => {
          if (onCloseRef.current) {
            onCloseRef.current();
          }
        };

        element.addEventListener("structure-load", handleStructureLoad);
        element.addEventListener("close", handleClose);

        // Mark as initialized
        isInitializedRef.current = true;

        // Set initial properties after the element is created and attached
        setTimeout(() => {
          updateWebComponentProperties();
        }, 0);

        cleanup = () => {
          element.removeEventListener("structure-load", handleStructureLoad);
          element.removeEventListener("close", handleClose);
          if (containerRef.current?.contains(element)) {
            containerRef.current.removeChild(element);
          }
          webComponentRef.current = null;
          isInitializedRef.current = false;
        };
      } catch (error) {
        console.error(
          `[${instanceId.current}] Failed to load structure viewer web component:`,
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
      if ("proteinId" in element) {
        element.proteinId = proteinId;
      }
      if ("title" in element) {
        element.title = title;
      }
      if ("showHeader" in element) {
        element.showHeader = showHeader;
      }
      if ("showCloseButton" in element) {
        element.showCloseButton = showCloseButton;
      }
      if ("showTips" in element) {
        element.showTips = showTips;
      }
      if ("height" in element) {
        element.height = height;
      }
    };

    initWebComponent();

    return cleanup;
  }, []);

  // Update callback refs when props change
  useEffect(() => {
    onStructureLoadRef.current = onStructureLoad;
    onCloseRef.current = onClose;
  }, [onStructureLoad, onClose]);

  // Update properties when they change (but only if web component exists)
  useEffect(() => {
    const element = webComponentRef.current;
    if (!element) {
      return;
    }

    // Update properties on the web component
    if ("proteinId" in element) {
      element.proteinId = proteinId;
    }
    if ("title" in element) {
      element.title = title;
    }
    if ("showHeader" in element) {
      element.showHeader = showHeader;
    }
    if ("showCloseButton" in element) {
      element.showCloseButton = showCloseButton;
    }
    if ("showTips" in element) {
      element.showTips = showTips;
    }
    if ("height" in element) {
      element.height = height;
    }
  }, [proteinId, title, showHeader, showCloseButton, showTips, height]);

  return <div className={`${className}`} ref={containerRef} />;
}

// Export a dynamically imported version to avoid SSR issues
const ProtspaceStructureViewerWebComponent = dynamic(
  () => Promise.resolve(ProtspaceStructureViewerWebComponentClient),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse bg-gray-200 h-96 w-full rounded">
        Loading structure viewer...
      </div>
    ),
  }
);

export default ProtspaceStructureViewerWebComponent;
