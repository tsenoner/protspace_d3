"use client";

import { createProtspaceWrapper } from "./createWebComponentWrapper";
import type {
  ProtspaceControlBarProps,
  ProtspaceControlBarEvents,
  ComponentPropsWithHandlers,
} from "../../types/protspace";

// Create the wrapper component using the factory
const ProtspaceControlBarWebComponent = createProtspaceWrapper<
  ProtspaceControlBarProps,
  ProtspaceControlBarEvents
>("control-bar", true, "protspace-scatterplot");

// Export with proper typing
export default ProtspaceControlBarWebComponent as React.ComponentType<
  ComponentPropsWithHandlers<
    ProtspaceControlBarProps,
    ProtspaceControlBarEvents
  > & {
    className?: string;
  }
>;
