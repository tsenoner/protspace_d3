/**
 * Control Bar Business Logic Library
 * 
 * This module contains all the business logic for the control bar component,
 * separated from UI concerns for better maintainability and testability.
 */

// Core business logic
export { ControlBarLogic } from './control-bar-logic';

// Event management
export { ControlBarEventManager } from './control-bar-events';
export type { ControlBarEventHandlers } from './control-bar-events';

// State management
export { ControlBarStateManager } from './control-bar-state';
export type { ControlBarState } from './control-bar-state';

// Types and interfaces
export type * from './types';
