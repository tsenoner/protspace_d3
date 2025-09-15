/**
 * Event management for the control bar component
 * Handles event dispatching, listening, and cleanup
 * Separates event concerns from UI and business logic
 */

export interface ControlBarEventHandlers {
  onDataChange?: (data: any) => void;
  onProteinSelection?: (selectedCount: number) => void;
  onDataSplit?: (splitHistory: string[][], splitMode: boolean) => void;
  onDataSplitReset?: (splitHistory: string[][], splitMode: boolean) => void;
  onAutoDisableSelection?: (reason: string, dataSize: number) => void;
}

export class ControlBarEventManager {
  private _scatterplotElement: Element | null = null;
  private _handlers: ControlBarEventHandlers = {};
  private _hostElement: Element;

  // Stable listeners for proper add/remove
  private _onDataChange = (event: Event) => this._handleDataChange(event);
  private _onProteinClick = () => this._handleProteinSelection();
  private _onDataSplit = (event: Event) => this._handleDataSplit(event);
  private _onDataSplitReset = (event: Event) => this._handleDataSplitReset(event);
  private _onAutoDisableSelection = (event: Event) => this._handleAutoDisableSelection(event);

  constructor(hostElement: Element, handlers: ControlBarEventHandlers = {}) {
    this._hostElement = hostElement;
    this._handlers = handlers;
  }

  /**
   * Set up event listeners on scatterplot element
   */
  setupScatterplotListeners(scatterplotElement: Element) {
    // Clean up existing listeners
    this.cleanup();
    
    this._scatterplotElement = scatterplotElement;

    // Listen for data changes
    this._scatterplotElement.addEventListener("data-change", this._onDataChange);

    // Listen for protein selection changes
    this._scatterplotElement.addEventListener("protein-click", this._onProteinClick);

    // Listen for data split events
    this._scatterplotElement.addEventListener("data-split", this._onDataSplit);
    this._scatterplotElement.addEventListener("data-split-reset", this._onDataSplitReset);

    // Listen for auto-disable selection
    this._scatterplotElement.addEventListener("auto-disable-selection", this._onAutoDisableSelection);
  }

  /**
   * Update event handlers
   */
  updateHandlers(handlers: ControlBarEventHandlers) {
    this._handlers = { ...this._handlers, ...handlers };
  }

  /**
   * Dispatch projection change event
   */
  dispatchProjectionChange(projection: string) {
    this._hostElement.dispatchEvent(new CustomEvent("projection-change", {
      detail: { projection },
      bubbles: true,
      composed: true,
    }));
  }

  /**
   * Dispatch projection plane change event
   */
  dispatchProjectionPlaneChange(plane: 'xy' | 'xz' | 'yz') {
    this._hostElement.dispatchEvent(new CustomEvent('projection-plane-change', {
      detail: { plane },
      bubbles: true,
      composed: true,
    }));
  }

  /**
   * Dispatch feature change event
   */
  dispatchFeatureChange(feature: string) {
    this._hostElement.dispatchEvent(new CustomEvent("feature-change", {
      detail: { feature },
      bubbles: true,
      composed: true,
    }));
  }

  /**
   * Dispatch selection mode toggle event
   */
  dispatchSelectionModeToggle(selectionMode: boolean) {
    this._hostElement.dispatchEvent(new CustomEvent("toggle-selection-mode", {
      detail: { selectionMode },
      bubbles: true,
      composed: true,
    }));
  }

  /**
   * Dispatch clear selections event
   */
  dispatchClearSelections() {
    this._hostElement.dispatchEvent(new CustomEvent("clear-selections", {
      detail: {},
      bubbles: true,
      composed: true,
    }));
  }

  /**
   * Dispatch split data event
   */
  dispatchSplitData() {
    this._hostElement.dispatchEvent(new CustomEvent("split-data", {
      detail: {},
      bubbles: true,
      composed: true,
    }));
  }

  /**
   * Dispatch reset split event
   */
  dispatchResetSplit() {
    this._hostElement.dispatchEvent(new CustomEvent("reset-split", {
      detail: {},
      bubbles: true,
      composed: true,
    }));
  }

  /**
   * Dispatch export event
   */
  dispatchExport(type: "json" | "ids" | "png" | "pdf") {
    this._hostElement.dispatchEvent(new CustomEvent("export", {
      detail: { type },
      bubbles: true,
      composed: true,
    }));
  }

  /**
   * Dispatch selection disabled notification event
   */
  dispatchSelectionDisabledNotification(reason: string, dataSize: number, message: string) {
    this._hostElement.dispatchEvent(new CustomEvent('selection-disabled-notification', {
      detail: { 
        reason, 
        dataSize, 
        message,
        type: 'warning' 
      },
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Handle data change event from scatterplot
   */
  private _handleDataChange(event: Event) {
    const customEvent = event as CustomEvent;
    const { data } = customEvent.detail || {};
    
    if (data && this._handlers.onDataChange) {
      this._handlers.onDataChange(data);
    }
  }

  /**
   * Handle protein selection event from scatterplot
   */
  private _handleProteinSelection() {
    if (!this._scatterplotElement || !("selectedProteinIds" in this._scatterplotElement)) {
      return;
    }

    const selectedIds = (this._scatterplotElement as any).selectedProteinIds || [];
    
    if (this._handlers.onProteinSelection) {
      this._handlers.onProteinSelection(selectedIds.length);
    }
  }

  /**
   * Handle data split event from scatterplot
   */
  private _handleDataSplit(event: Event) {
    const customEvent = event as CustomEvent;
    const { splitHistory, splitMode } = customEvent.detail;
    
    if (this._handlers.onDataSplit) {
      this._handlers.onDataSplit(splitHistory, splitMode);
    }
  }

  /**
   * Handle data split reset event from scatterplot
   */
  private _handleDataSplitReset(event: Event) {
    const customEvent = event as CustomEvent;
    const { splitHistory, splitMode } = customEvent.detail;
    
    if (this._handlers.onDataSplitReset) {
      this._handlers.onDataSplitReset(splitHistory, splitMode);
    }
  }

  /**
   * Handle auto-disable selection event from scatterplot
   */
  private _handleAutoDisableSelection(event: Event) {
    const customEvent = event as CustomEvent;
    const { reason, dataSize } = customEvent.detail;
    
    if (this._handlers.onAutoDisableSelection) {
      this._handlers.onAutoDisableSelection(reason, dataSize);
    }
  }

  /**
   * Clean up event listeners
   */
  cleanup() {
    if (this._scatterplotElement) {
      this._scatterplotElement.removeEventListener("data-change", this._onDataChange);
      this._scatterplotElement.removeEventListener("protein-click", this._onProteinClick);
      this._scatterplotElement.removeEventListener("data-split", this._onDataSplit);
      this._scatterplotElement.removeEventListener("data-split-reset", this._onDataSplitReset);
      this._scatterplotElement.removeEventListener("auto-disable-selection", this._onAutoDisableSelection);
      
      this._scatterplotElement = null;
    }
  }

  /**
   * Destroy event manager
   */
  destroy() {
    this.cleanup();
    this._handlers = {};
  }
}
