/**
 * Type-safe React wrappers for all ProtSpace web components
 * Generated using the wrapper factory to ensure consistency and reduce duplication
 */

import { createProtspaceWrapper } from "./createWebComponentWrapper";
import type {
  ProtspaceControlBarProps,
  ProtspaceControlBarEvents,
  ProtspaceScatterplotProps,
  ProtspaceScatterplotEvents,
  ProtspaceLegendProps,
  ProtspaceLegendEvents,
  ProtspaceStructureViewerProps,
  ProtspaceStructureViewerEvents,
  ProtspaceDataLoaderProps,
  ProtspaceDataLoaderEvents,
  ComponentPropsWithHandlers,
} from "../../types/protspace";

// Control Bar - with auto-sync enabled
export const ProtspaceControlBar = createProtspaceWrapper<
  ProtspaceControlBarProps,
  ProtspaceControlBarEvents
>("control-bar", true, "protspace-scatterplot") as React.ComponentType<
  ComponentPropsWithHandlers<
    ProtspaceControlBarProps,
    ProtspaceControlBarEvents
  > & {
    className?: string;
  }
>;

// Scatterplot - main visualization component
export const ProtspaceScatterplot = createProtspaceWrapper<
  ProtspaceScatterplotProps,
  ProtspaceScatterplotEvents
>("scatterplot") as React.ComponentType<
  ComponentPropsWithHandlers<
    ProtspaceScatterplotProps,
    ProtspaceScatterplotEvents
  > & {
    className?: string;
  }
>;

// Legend - with auto-sync enabled
export const ProtspaceLegend = createProtspaceWrapper<
  ProtspaceLegendProps,
  ProtspaceLegendEvents
>("legend", true, "protspace-scatterplot") as React.ComponentType<
  ComponentPropsWithHandlers<ProtspaceLegendProps, ProtspaceLegendEvents> & {
    className?: string;
  }
>;

// Structure Viewer - standalone component
export const ProtspaceStructureViewer = createProtspaceWrapper<
  ProtspaceStructureViewerProps,
  ProtspaceStructureViewerEvents
>("structure-viewer") as React.ComponentType<
  ComponentPropsWithHandlers<
    ProtspaceStructureViewerProps,
    ProtspaceStructureViewerEvents
  > & {
    className?: string;
  }
>;

// Data Loader - standalone component
export const ProtspaceDataLoader = createProtspaceWrapper<
  ProtspaceDataLoaderProps,
  ProtspaceDataLoaderEvents
>("data-loader") as React.ComponentType<
  ComponentPropsWithHandlers<
    ProtspaceDataLoaderProps,
    ProtspaceDataLoaderEvents
  > & {
    className?: string;
  }
>;

// Export legacy wrapper for backwards compatibility
export { default as ProtspaceControlBarWebComponent } from "./ProtspaceControlBarWebComponent";

// Export utilities
export {
  createProtspaceWrapper,
  createWebComponentWrapper,
} from "./createWebComponentWrapper";
export { default as GenericWebComponent } from "./GenericWebComponent";
