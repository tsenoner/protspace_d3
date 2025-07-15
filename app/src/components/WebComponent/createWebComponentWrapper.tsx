"use client";

import { useMemo } from "react";
import GenericWebComponent from "./GenericWebComponent";
import type { EventHandlerMap } from "../../types/protspace";

/**
 * Creates a type-safe React wrapper for a web component
 * @param tagName - The HTML tag name of the web component
 * @param defaultAutoSync - Whether to enable auto-sync by default
 * @param defaultSyncTarget - Default sync target selector
 */
export function createWebComponentWrapper<TProps, TEvents>(
  tagName: string,
  defaultAutoSync: boolean = false,
  defaultSyncTarget?: string
) {
  type ReactProps = TProps & {
    className?: string;
    autoSync?: boolean;
    syncTarget?: string;
  } & {
    [K in keyof TEvents as `on${Capitalize<
      string & K
    >}`]?: EventHandlerMap<TEvents>[K];
  };

  return function WebComponentWrapper(props: ReactProps) {
    const {
      className,
      autoSync = defaultAutoSync,
      syncTarget = defaultSyncTarget,
      ...restProps
    } = props;

    // Separate event handlers from regular properties
    const { properties, eventHandlers } = useMemo(() => {
      const properties: Record<string, any> = {};
      const eventHandlers: Record<string, (event: Event) => void> = {};

      Object.entries(restProps).forEach(([key, value]) => {
        if (key.startsWith("on") && typeof value === "function") {
          // Convert onEventName to event-name
          const eventName = key
            .slice(2) // Remove 'on' prefix
            .replace(/([A-Z])/g, "-$1") // Convert camelCase to kebab-case
            .toLowerCase();

          eventHandlers[eventName] = value as (event: Event) => void;
        } else {
          properties[key] = value;
        }
      });

      return { properties, eventHandlers };
    }, [restProps]);

    return (
      <GenericWebComponent
        tagName={tagName}
        properties={properties}
        eventHandlers={eventHandlers}
        className={className}
        autoSync={autoSync}
        syncTarget={syncTarget}
      />
    );
  };
}

// Convenience function for creating ProtSpace component wrappers
export function createProtspaceWrapper<TProps, TEvents>(
  componentName: string,
  autoSync: boolean = false,
  syncTarget?: string
) {
  return createWebComponentWrapper<TProps, TEvents>(
    `protspace-${componentName}`,
    autoSync,
    syncTarget
  );
}
