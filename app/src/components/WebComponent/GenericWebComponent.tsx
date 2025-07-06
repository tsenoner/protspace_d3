"use client";

import { useEffect, useRef, ReactNode } from "react";
import dynamic from "next/dynamic";

interface GenericWebComponentProps {
  tagName: string;
  properties?: Record<string, any>;
  attributes?: Record<string, string>;
  eventHandlers?: Record<string, (event: Event) => void>;
  className?: string;
  children?: ReactNode;
  loadingComponent?: ReactNode;
  errorComponent?: ReactNode;
  autoSync?: boolean;
  syncTarget?: string;
}

function GenericWebComponentClient({
  tagName,
  properties = {},
  attributes = {},
  eventHandlers = {},
  className = "",
  children,
  autoSync = false,
  syncTarget,
}: GenericWebComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const webComponentRef = useRef<HTMLElement | null>(null);
  const isInitializedRef = useRef(false);
  const instanceId = useRef(
    `wc_${tagName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );

  // Initialize web component
  useEffect(() => {
    if (isInitializedRef.current && webComponentRef.current) {
      return;
    }

    if (containerRef.current) {
      containerRef.current.innerHTML = "";
    }

    webComponentRef.current = null;
    isInitializedRef.current = false;

    let cleanup: (() => void) | undefined;

    const initWebComponent = async () => {
      try {
        // Dynamically import the web component to register it
        await import("@protspace/core");

        if (!containerRef.current || isInitializedRef.current) {
          return;
        }

        // Create the web component element
        const element = document.createElement(tagName) as HTMLElement;

        // Set attributes
        Object.entries(attributes).forEach(([key, value]) => {
          element.setAttribute(key, value);
        });

        // Set auto-sync if enabled
        if (autoSync) {
          element.setAttribute("auto-sync", "true");
          if (syncTarget) {
            element.setAttribute("scatterplot-selector", syncTarget);
          }
        }

        // Clear container and add element
        if (containerRef.current.children.length > 0) {
          containerRef.current.innerHTML = "";
        }

        webComponentRef.current = element;
        containerRef.current.appendChild(element);

        // Set up event listeners
        const eventListeners: Array<[string, (event: Event) => void]> = [];
        Object.entries(eventHandlers).forEach(([eventName, handler]) => {
          element.addEventListener(eventName, handler);
          eventListeners.push([eventName, handler]);
        });

        isInitializedRef.current = true;

        // Set initial properties
        setTimeout(() => {
          updateWebComponentProperties();
        }, 0);

        cleanup = () => {
          eventListeners.forEach(([eventName, handler]) => {
            element.removeEventListener(eventName, handler);
          });
          if (containerRef.current?.contains(element)) {
            containerRef.current.removeChild(element);
          }
          webComponentRef.current = null;
          isInitializedRef.current = false;
        };
      } catch (error) {
        console.error(
          `[${instanceId.current}] Failed to load web component ${tagName}:`,
          error
        );
        isInitializedRef.current = false;
      }
    };

    const updateWebComponentProperties = () => {
      const element = webComponentRef.current;
      if (!element) return;

      // Update properties dynamically
      Object.entries(properties).forEach(([key, value]) => {
        if (key in element) {
          (element as any)[key] = value;
        }
      });
    };

    initWebComponent();
    return cleanup;
  }, [tagName, autoSync, syncTarget]);

  // Update properties when they change
  useEffect(() => {
    const element = webComponentRef.current;
    if (!element) return;

    Object.entries(properties).forEach(([key, value]) => {
      if (key in element) {
        (element as any)[key] = value;
      }
    });
  }, [properties]);

  return (
    <div className={className} ref={containerRef}>
      {children}
    </div>
  );
}

// Export a dynamically imported version to avoid SSR issues
const GenericWebComponent = dynamic(
  () => Promise.resolve(GenericWebComponentClient),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse bg-gray-200 h-12 w-full rounded">
        Loading component...
      </div>
    ),
  }
);

export default GenericWebComponent;
