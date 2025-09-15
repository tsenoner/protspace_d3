
/**
 * Control Bar Component
 * 
 * Clean architecture with proper separation of concerns:
 * - lib/: Business logic, state management, events (pure TypeScript)
 * - ui/: UI components and styles (LitElement)
 */

// Main UI component (backward compatible)
export { ProtspaceControlBar } from "./ui";

// Business logic library (for advanced usage)
export * from "./lib";

// UI utilities (for theming/customization)
export { controlBarStyles } from "./ui";
