import * as d3 from "d3";
import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";

// Import types and configuration
import { LEGEND_DEFAULTS, LEGEND_STYLES, SHAPE_MAPPING } from "./config";
import { LegendDataProcessor } from "./legend-data-processor";
import type {
  LegendDataInput,
  LegendFeatureData,
  LegendItem,
  OtherItem,
  ScatterplotElement,
} from "./types";

@customElement("protspace-legend")
export class ProtspaceLegend extends LitElement {
  static styles = css`
    :host {
      --legend-bg: #ffffff;
      --legend-bg-dark: #1f2937;
      --legend-border: #e1e5e9;
      --legend-border-dark: #374151;
      --legend-border-radius: 8px;
      --legend-padding: 0.75rem;
      --legend-item-padding: 0.625rem;
      --legend-item-gap: 0.5rem;
      --legend-text-color: #374151;
      --legend-text-color-dark: #f9fafb;
      --legend-text-secondary: #6b7280;
      --legend-text-secondary-dark: #9ca3af;
      --legend-hover-bg: #f3f4f6;
      --legend-hover-bg-dark: #374151;
      --legend-hidden-bg: #f9fafb;
      --legend-hidden-bg-dark: #374151;
      --legend-hidden-opacity: 0.5;
      --legend-active-bg: #dbeafe;
      --legend-active-bg-dark: #1e3a8a;
      --legend-drag-bg: #eff6ff;
      --legend-drag-bg-dark: #1e3a8a;
      --legend-selected-ring: #ef4444;
      --legend-extracted-border: #10b981;

      display: block;
      background: var(--legend-bg);
      border: 1px solid var(--legend-border);
      border-radius: var(--legend-border-radius);
      padding: var(--legend-padding) !important;
      max-width: 320px;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1),
        0 1px 2px 0 rgba(0, 0, 0, 0.06);
      user-select: none;
    }

    @media (prefers-color-scheme: dark) {
      :host {
        background: var(--legend-bg-dark);
        border-color: var(--legend-border-dark);
      }
    }

    .legend-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .legend-title {
      font-weight: 500;
      font-size: 1rem;
      color: var(--legend-text-color);
    }

    @media (prefers-color-scheme: dark) {
      .legend-title {
        color: var(--legend-text-color-dark);
      }
    }

    .customize-button {
      background: none;
      border: none;
      color: var(--legend-text-secondary);
      cursor: pointer;
      padding: 0.25rem;
      border-radius: 0.25rem;
      transition: color 0.2s ease;
    }

    .customize-button:hover {
      color: var(--legend-text-color);
    }

    @media (prefers-color-scheme: dark) {
      .customize-button {
        color: var(--legend-text-secondary-dark);
      }
      .customize-button:hover {
        color: var(--legend-text-color-dark);
      }
    }

    .legend-items {
      display: flex;
      flex-direction: column;
      gap: var(--legend-item-gap);
    }

    .legend-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--legend-item-padding);
      border-radius: 0.5rem;
      cursor: pointer;
      transition: all 0.2s ease;
      background: var(--legend-hover-bg);
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      position: relative;
    }

    .legend-item:hover {
      background: var(--legend-hover-bg);
      box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.1);
    }

    .legend-item:active {
      background: var(--legend-active-bg);
    }

    .legend-item.hidden {
      opacity: var(--legend-hidden-opacity);
      background: var(--legend-hidden-bg);
    }

    .legend-item.dragging {
      background: var(--legend-drag-bg);
      transform: scale(1.02);
      box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.15);
    }

    .legend-item.selected {
      box-shadow: 0 0 0 2px var(--legend-selected-ring);
    }

    .legend-item.extracted {
      border-left: 4px solid var(--legend-extracted-border);
    }

    @media (prefers-color-scheme: dark) {
      .legend-item {
        background: var(--legend-hover-bg-dark);
      }
      .legend-item:hover {
        background: var(--legend-hover-bg-dark);
      }
      .legend-item:active {
        background: var(--legend-active-bg-dark);
      }
      .legend-item.hidden {
        background: var(--legend-hidden-bg-dark);
      }
      .legend-item.dragging {
        background: var(--legend-drag-bg-dark);
      }
    }

    .legend-item-content {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .drag-handle {
      display: flex;
      align-items: center;
      padding: 0.25rem;
      border-radius: 0.25rem;
      cursor: grab;
      color: var(--legend-text-secondary);
    }

    .drag-handle:active {
      cursor: grabbing;
    }

    @media (prefers-color-scheme: dark) {
      .drag-handle {
        color: var(--legend-text-secondary-dark);
      }
    }

    .legend-symbol {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .legend-text {
      font-size: 0.875rem;
      color: var(--legend-text-color);
    }

    @media (prefers-color-scheme: dark) {
      .legend-text {
        color: var(--legend-text-color-dark);
      }
    }

    .view-button {
      background: none;
      border: none;
      color: #3b82f6;
      cursor: pointer;
      font-size: 0.75rem;
      font-weight: 500;
      margin-left: 0.25rem;
      padding: 0.125rem 0.25rem;
      border-radius: 0.25rem;
      transition: color 0.2s ease;
    }

    .view-button:hover {
      color: #2563eb;
    }

    .legend-count {
      font-size: 0.875rem;
      color: var(--legend-text-secondary);
      font-weight: 500;
    }

    @media (prefers-color-scheme: dark) {
      .legend-count {
        color: var(--legend-text-secondary-dark);
      }
    }

    .legend-empty {
      text-align: center;
      color: var(--legend-text-secondary);
      font-style: italic;
      padding: 1rem 0;
    }

    @media (prefers-color-scheme: dark) {
      .legend-empty {
        color: var(--legend-text-secondary-dark);
      }
    }

    /* Modal styles */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background: var(--legend-bg);
      padding: 1.5rem;
      border-radius: 0.5rem;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
        0 10px 10px -5px rgba(0, 0, 0, 0.04);
      max-width: 24rem;
      width: 100%;
      max-height: 80vh;
      overflow: auto;
    }

    @media (prefers-color-scheme: dark) {
      .modal-content {
        background: var(--legend-bg-dark);
      }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .modal-title {
      font-size: 1.125rem;
      font-weight: 500;
      color: var(--legend-text-color);
    }

    @media (prefers-color-scheme: dark) {
      .modal-title {
        color: var(--legend-text-color-dark);
      }
    }

    .close-button {
      background: none;
      border: none;
      color: var(--legend-text-secondary);
      cursor: pointer;
      padding: 0.25rem;
      border-radius: 0.25rem;
      transition: color 0.2s ease;
    }

    .close-button:hover {
      color: var(--legend-text-color);
    }

    @media (prefers-color-scheme: dark) {
      .close-button {
        color: var(--legend-text-secondary-dark);
      }
      .close-button:hover {
        color: var(--legend-text-color-dark);
      }
    }

    .modal-description {
      font-size: 0.875rem;
      color: var(--legend-text-secondary);
      margin-bottom: 1rem;
    }

    @media (prefers-color-scheme: dark) {
      .modal-description {
        color: var(--legend-text-secondary-dark);
      }
    }

    .other-items-list {
      border: 1px solid var(--legend-border);
      border-radius: 0.375rem;
      margin-bottom: 1rem;
      max-height: 15rem;
      overflow-y: auto;
    }

    @media (prefers-color-scheme: dark) {
      .other-items-list {
        border-color: var(--legend-border-dark);
      }
    }

    .other-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem;
      border-bottom: 1px solid var(--legend-border);
      transition: background-color 0.2s ease;
    }

    .other-item:last-child {
      border-bottom: none;
    }

    .other-item:hover {
      background: var(--legend-hover-bg);
    }

    @media (prefers-color-scheme: dark) {
      .other-item {
        border-color: var(--legend-border-dark);
      }
      .other-item:hover {
        background: var(--legend-hover-bg-dark);
      }
    }

    .other-item-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .other-item-name {
      color: var(--legend-text-color);
    }

    .other-item-count {
      font-size: 0.75rem;
      color: var(--legend-text-secondary);
    }

    @media (prefers-color-scheme: dark) {
      .other-item-name {
        color: var(--legend-text-color-dark);
      }
      .other-item-count {
        color: var(--legend-text-secondary-dark);
      }
    }

    .extract-button {
      background: none;
      border: none;
      color: #3b82f6;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      transition: color 0.2s ease;
    }

    .extract-button:hover {
      color: #2563eb;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
    }

    .modal-close-button {
      background: var(--legend-hover-bg);
      border: none;
      color: var(--legend-text-color);
      cursor: pointer;
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      font-weight: 500;
      transition: background-color 0.2s ease;
    }

    .modal-close-button:hover {
      background: var(--legend-hidden-bg);
    }

    @media (prefers-color-scheme: dark) {
      .modal-close-button {
        background: var(--legend-hover-bg-dark);
        color: var(--legend-text-color-dark);
      }
      .modal-close-button:hover {
        background: var(--legend-hidden-bg-dark);
      }
    }
  `;

  @property({ type: String }) featureName = "";
  @property({ type: Object }) featureData: LegendFeatureData = {
    name: "",
    values: [] as (string | null)[],
    colors: [] as string[],
    shapes: [] as string[],
  };
  @property({ type: Array }) featureValues: (string | null)[] = [];
  @property({ type: Array }) proteinIds: string[] = [];
  @property({ type: Number }) maxVisibleValues =
    LEGEND_DEFAULTS.maxVisibleValues;
  @property({ type: Array }) selectedItems: string[] = [];
  @property({ type: Boolean }) isolationMode = false;
  @property({ type: Array }) splitHistory: string[][] = [];

  // Additional properties for wrapper compatibility
  @property({ type: Object }) data: LegendDataInput | null = null;
  @property({ type: String }) selectedFeature = "";

  @state() private legendItems: LegendItem[] = [];
  @state() private otherItems: OtherItem[] = [];
  @state() private showOtherDialog = false;
  @state() private draggedItem: string | null = null;
  @state() private dragTimeout: number | null = null;

  // Auto-sync properties
  @property({ type: String, attribute: "scatterplot-selector" })
  scatterplotSelector: string = LEGEND_DEFAULTS.scatterplotSelector;
  @property({ type: Boolean, attribute: "auto-sync" })
  autoSync: boolean = true;
  @property({ type: Boolean, attribute: "auto-hide" })
  autoHide: boolean = true; // Automatically hide values in scatterplot

  @state() private _hiddenValues: string[] = [];
  @state() private _scatterplotElement: Element | null = null;

  updated(changedProperties: Map<string, unknown>) {
    // If data or selectedFeature changed, update featureData
    if (
      changedProperties.has("data") ||
      changedProperties.has("selectedFeature")
    ) {
      this._updateFeatureDataFromData();
    }

    if (
      changedProperties.has("data") ||
      changedProperties.has("selectedFeature") ||
      changedProperties.has("featureValues") ||
      changedProperties.has("proteinIds") ||
      changedProperties.has("maxVisibleValues")
    ) {
      this.updateLegendItems();
    }
  }

  connectedCallback() {
    super.connectedCallback();

    if (this.autoSync) {
      this._setupAutoSync();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    if (this._scatterplotElement) {
      this._scatterplotElement.removeEventListener(
        "data-change",
        this._handleDataChange.bind(this)
      );
      this._scatterplotElement.removeEventListener(
        "feature-change",
        this._handleFeatureChange.bind(this)
      );
    }
  }

  private _setupAutoSync() {
    // Find scatterplot element
    setTimeout(() => {
      this._scatterplotElement = document.querySelector(
        this.scatterplotSelector
      );
      if (this._scatterplotElement) {
        // Listen for data and feature changes
        this._scatterplotElement.addEventListener(
          "data-change",
          this._handleDataChange.bind(this)
        );

        // Listen for feature changes from control bar
        const controlBar = document.querySelector("protspace-control-bar");
        if (controlBar) {
          controlBar.addEventListener(
            "feature-change",
            this._handleFeatureChange.bind(this)
          );
        }

        // Initial sync
        this._syncWithScatterplot();
      }
    }, LEGEND_DEFAULTS.autoSyncDelay);
  }

  private _handleDataChange(event: Event) {
    const customEvent = event as CustomEvent;
    const { data } = customEvent.detail;

    if (data) {
      this.data = { features: data.features };
      this._updateFromScatterplotData();
    }
  }

  private _updateFromScatterplotData(): void {
    if (
      !this._scatterplotElement ||
      !("getCurrentData" in this._scatterplotElement)
    ) {
      return;
    }

    const currentData = (
      this._scatterplotElement as ScatterplotElement
    ).getCurrentData();
    const selectedFeature = (this._scatterplotElement as ScatterplotElement)
      .selectedFeature;

    if (!currentData || !selectedFeature) {
      return;
    }

    this.selectedFeature = selectedFeature;
    this._updateFeatureData(currentData, selectedFeature);
    this._updateFeatureValues(currentData, selectedFeature);
    this.proteinIds = currentData.protein_ids;
  }

  private _updateFeatureData(currentData: any, selectedFeature: string): void {
    this.featureData = {
      name: selectedFeature,
      values: currentData.features[selectedFeature].values,
      colors: currentData.features[selectedFeature].colors,
      shapes: currentData.features[selectedFeature].shapes,
    };
  }

  private _updateFeatureValues(
    currentData: any,
    selectedFeature: string
  ): void {
    // Extract feature values for current data
    const featureValues = currentData.protein_ids.map(
      (_: string, index: number) => {
        const featureIdx = currentData.feature_data[selectedFeature][index];
        return currentData.features[selectedFeature].values[featureIdx];
      }
    );

    this.featureValues = featureValues;
  }

  private _handleFeatureChange(event: Event) {
    const customEvent = event as CustomEvent;
    const { feature } = customEvent.detail;

    this.selectedFeature = feature;

    // Clear hidden values when feature changes
    this._hiddenValues = [];
    if (
      this.autoHide &&
      this._scatterplotElement &&
      "hiddenFeatureValues" in this._scatterplotElement
    ) {
      (this._scatterplotElement as ScatterplotElement).hiddenFeatureValues = [];
    }

    // Update feature values for new feature
    this._syncWithScatterplot();
  }

  private _updateFeatureDataFromData() {
    // Update featureData from data property when available
    if (this.data && this.data.features && this.selectedFeature) {
      const featureInfo = this.data.features[this.selectedFeature];
      if (featureInfo) {
        this.featureData = {
          name: this.selectedFeature,
          values: featureInfo.values,
          colors: featureInfo.colors,
          shapes: featureInfo.shapes,
        };
      }
    }
  }

  private _syncWithScatterplot() {
    if (
      !this._scatterplotElement ||
      !("getCurrentData" in this._scatterplotElement)
    ) {
      return;
    }

    const currentData = (
      this._scatterplotElement as ScatterplotElement
    ).getCurrentData();
    const selectedFeature = (this._scatterplotElement as ScatterplotElement)
      .selectedFeature;

    if (!currentData || !selectedFeature) {
      return;
    }

    this.data = { features: currentData.features };
    this.selectedFeature = selectedFeature;
    this._updateFeatureData(currentData, selectedFeature);
    this._updateFeatureValues(currentData, selectedFeature);
    this.proteinIds = currentData.protein_ids;
  }

  private updateLegendItems() {
    if (
      !this.featureData ||
      !this.featureValues ||
      this.featureValues.length === 0
    ) {
      this.legendItems = [];
      return;
    }

    // Use the data processor to handle all legend item processing
    const { legendItems, otherItems } = LegendDataProcessor.processLegendItems(
      this.featureData,
      this.featureValues,
      this.proteinIds,
      this.maxVisibleValues,
      this.isolationMode,
      this.splitHistory,
      this.legendItems
    );

    // Set items state
    this.legendItems = legendItems;
    this.otherItems = otherItems;
  }

  // Symbol rendering function using D3 symbols for consistency with scatterplot
  private renderSymbol(
    shape: string | null,
    color: string,
    size = LEGEND_DEFAULTS.symbolSize,
    isSelected = false
  ) {
    const halfSize = size / 2;

    // Safely handle null or undefined shape
    const shapeKey = (
      shape || "circle"
    ).toLowerCase() as keyof typeof SHAPE_MAPPING;

    // Get the D3 symbol type (default to circle if not found)
    const symbolType = SHAPE_MAPPING[shapeKey] || d3.symbolCircle;

    // Generate the SVG path using D3
    const path = d3
      .symbol()
      .type(symbolType)
      .size(size * LEGEND_DEFAULTS.symbolSizeMultiplier)(); // Size multiplier to make it fit well in the legend

    // Some symbol types should be rendered as outlines only
    const isOutlineOnly = LEGEND_STYLES.outlineShapes.has(shapeKey);

    // Determine stroke width based on selection state
    const strokeWidth = isSelected
      ? LEGEND_STYLES.strokeWidth.selected
      : LEGEND_STYLES.strokeWidth.default;

    // Determine stroke color based on selection state
    const strokeColor = isSelected
      ? LEGEND_STYLES.colors.selectedStroke
      : LEGEND_STYLES.colors.defaultStroke;

    // Ensure we have a valid color
    const validColor = color || LEGEND_STYLES.colors.fallback;

    return html`
      <svg width="${size}" height="${size}" class="legend-symbol">
        <g transform="translate(${halfSize}, ${halfSize})">
          <path
            d="${path}"
            fill="${isOutlineOnly ? "none" : validColor}"
            stroke="${isOutlineOnly ? validColor : strokeColor}"
            stroke-width="${isOutlineOnly
              ? LEGEND_STYLES.strokeWidth.outline
              : strokeWidth}"
          />
        </g>
      </svg>
    `;
  }

  private handleItemClick(value: string | null) {
    const valueKey = value === null ? "null" : value;

    // Toggle hidden state internally
    if (this._hiddenValues.includes(valueKey)) {
      this._hiddenValues = this._hiddenValues.filter((v) => v !== valueKey);
    } else {
      this._hiddenValues = [...this._hiddenValues, valueKey];
    }

    // Update scatterplot if auto-hide is enabled
    if (
      this.autoHide &&
      this._scatterplotElement &&
      "hiddenFeatureValues" in this._scatterplotElement
    ) {
      (this._scatterplotElement as ScatterplotElement).hiddenFeatureValues = [
        ...this._hiddenValues,
      ];
    }

    // Update legend items visibility
    this.legendItems = this.legendItems.map((item) => ({
      ...item,
      isVisible: !this._hiddenValues.includes(
        item.value === null ? "null" : item.value!
      ),
    }));

    // Dispatch event for external listeners
    this.dispatchEvent(
      new CustomEvent("legend-item-click", {
        detail: { value, action: "toggle" },
        bubbles: true,
        composed: true,
      })
    );

    this.requestUpdate();
  }

  // Handle item double-click (show only this or show all)
  private handleItemDoubleClick(value: string | null) {
    // Get the clicked item
    const clickedItem = this.legendItems.find((item) => item.value === value);
    if (!clickedItem) return;

    // Check if it's the only visible item
    const visibleItems = this.legendItems.filter((item) => item.isVisible);
    const isOnlyVisible =
      visibleItems.length === 1 && visibleItems[0].value === value;

    // Case 1: It's the only visible item - show all
    if (isOnlyVisible) {
      this.legendItems = this.legendItems.map((item) => ({
        ...item,
        isVisible: true,
      }));
    }
    // Case 2: Show only this item
    else {
      this.legendItems = this.legendItems.map((item) => ({
        ...item,
        isVisible: item.value === value,
      }));
    }

    // Dispatch "isolate" action for double click
    this.dispatchEvent(
      new CustomEvent("legend-item-click", {
        detail: { value, action: "isolate" },
        bubbles: true,
      })
    );

    this.requestUpdate();
  }

  // Simple drag and drop implementation
  private handleDragStart(item: LegendItem) {
    this.draggedItem = item.value;

    // Clear any existing timeout
    if (this.dragTimeout) {
      clearTimeout(this.dragTimeout);
    }
  }

  // Handle element drag over
  private handleDragOver(item: LegendItem) {
    if (!this.draggedItem || this.draggedItem === item.value) return;

    // Use a debounced approach to prevent too many re-renders
    if (this.dragTimeout) {
      clearTimeout(this.dragTimeout);
    }

    this.dragTimeout = window.setTimeout(() => {
      this._performDragReorder(item);
    }, LEGEND_DEFAULTS.dragTimeout);
  }

  private _performDragReorder(targetItem: LegendItem): void {
    // Find the indices
    const draggedIdx = this.legendItems.findIndex(
      (i) => i.value === this.draggedItem
    );
    const targetIdx = this.legendItems.findIndex(
      (i) => i.value === targetItem.value
    );

    if (draggedIdx === -1 || targetIdx === -1) return;

    // Create a new array with the item moved
    const newItems = [...this.legendItems];
    const [movedItem] = newItems.splice(draggedIdx, 1);
    newItems.splice(targetIdx, 0, movedItem);

    // Update z-order
    this.legendItems = newItems.map((item, idx) => ({
      ...item,
      zOrder: idx,
    }));

    // Notify parent of z-order change
    this._dispatchZOrderChange();
    this.requestUpdate();
  }

  private _dispatchZOrderChange(): void {
    const zOrderMap: Record<string, number> = {};
    this.legendItems.forEach((legendItem) => {
      if (legendItem.value !== null && legendItem.value !== "Other") {
        zOrderMap[legendItem.value] = legendItem.zOrder;
      }
    });

    this.dispatchEvent(
      new CustomEvent("legend-zorder-change", {
        detail: { zOrderMapping: zOrderMap },
        bubbles: true,
      })
    );
  }

  private handleDragEnd() {
    this.draggedItem = null;

    // Clear timeout if any
    if (this.dragTimeout) {
      clearTimeout(this.dragTimeout);
      this.dragTimeout = null;
    }
  }

  // Handle extract from Other
  private handleExtractFromOther(value: string) {
    // Find this item in otherItems
    const itemToExtract = this.otherItems.find((item) => item.value === value);
    if (!itemToExtract) return;

    // Find the valueIndex for color and shape
    const valueIndex = this.featureData.values.indexOf(value);

    // Create a new legend item
    const newItem: LegendItem = {
      value,
      color: valueIndex !== -1 ? this.featureData.colors[valueIndex] : "#888",
      shape: valueIndex !== -1 ? this.featureData.shapes[valueIndex] : "circle",
      count: itemToExtract.count,
      isVisible: true,
      zOrder: this.legendItems.length,
      extractedFromOther: true,
    };

    // Add to the legend items
    this.legendItems = [...this.legendItems, newItem];

    // Close the dialog
    this.showOtherDialog = false;

    // Notify parent with "extract" action
    this.dispatchEvent(
      new CustomEvent("legend-item-click", {
        detail: { value, action: "extract" },
        bubbles: true,
      })
    );

    this.requestUpdate();
  }

  private handleCustomize() {
    this.dispatchEvent(
      new CustomEvent("legend-customize", {
        bubbles: true,
      })
    );
  }

  private renderOtherDialog() {
    if (!this.showOtherDialog) return html``;

    return html`
      <div class="modal-overlay" @click=${() => (this.showOtherDialog = false)}>
        <div class="modal-content" @click=${(e: Event) => e.stopPropagation()}>
          <div class="modal-header">
            <h3 class="modal-title">Extract from 'Other' category</h3>
            <button
              class="close-button"
              @click=${() => (this.showOtherDialog = false)}
            >
              <svg
                width="24"
                height="24"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div class="modal-description">
            Select items to extract from the 'Other' category. Extracted items
            will appear individually in the legend.
          </div>

          <div class="other-items-list">
            ${this.otherItems.map(
              (item) => html`
                <div class="other-item">
                  <div class="other-item-info">
                    <span class="other-item-name">
                      ${item.value === null ? "N/A" : item.value}
                    </span>
                    <span class="other-item-count">(${item.count})</span>
                  </div>
                  <button
                    class="extract-button"
                    @click=${() => {
                      if (item.value !== null) {
                        this.handleExtractFromOther(item.value);
                      }
                    }}
                  >
                    Extract
                  </button>
                </div>
              `
            )}
          </div>

          <div class="modal-footer">
            <button
              class="modal-close-button"
              @click=${() => (this.showOtherDialog = false)}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    `;
  }

  async downloadAsImage() {
    // This would need to be implemented with a library like html2canvas
    // For now, dispatch an event that the parent can handle
    this.dispatchEvent(
      new CustomEvent("legend-download", {
        bubbles: true,
      })
    );
  }

  render() {
    const sortedLegendItems = [...this.legendItems].sort(
      (a, b) => a.zOrder - b.zOrder
    );

    return html`
      <div class="legend-container">
        ${this._renderHeader()} ${this._renderLegendContent(sortedLegendItems)}
      </div>
      ${this.renderOtherDialog()}
    `;
  }

  private _renderHeader() {
    return html`
      <div class="legend-header">
        <h3 class="legend-title">
          ${this.featureData.name || this.featureName || "Legend"}
        </h3>
        <button class="customize-button" @click=${this.handleCustomize}>
          <svg
            width="20"
            height="20"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
      </div>
    `;
  }

  private _renderLegendContent(sortedLegendItems: LegendItem[]) {
    if (sortedLegendItems.length === 0) {
      return html`<div class="legend-empty">No data available</div>`;
    }

    return html`
      <div class="legend-items">
        ${sortedLegendItems.map((item) => this._renderLegendItem(item))}
      </div>
    `;
  }

  private _renderLegendItem(item: LegendItem) {
    const isItemSelected = this._isItemSelected(item);
    const itemClasses = this._getItemClasses(item, isItemSelected);

    return html`
      <div
        class="${itemClasses}"
        @click=${() => this.handleItemClick(item.value)}
        @dblclick=${() => this.handleItemDoubleClick(item.value)}
        draggable="true"
        @dragstart=${() => this.handleDragStart(item)}
        @dragover=${() => this.handleDragOver(item)}
        @dragend=${() => this.handleDragEnd()}
      >
        <div class="legend-item-content">
          ${this._renderDragHandle()}
          ${this._renderItemSymbol(item, isItemSelected)}
          ${this._renderItemText(item)} ${this._renderItemActions(item)}
        </div>
        <span class="legend-count">${item.count}</span>
      </div>
    `;
  }

  private _isItemSelected(item: LegendItem): boolean {
    return (
      (item.value === null &&
        this.selectedItems.includes("null") &&
        this.selectedItems.length > 0) ||
      (item.value !== null &&
        item.value !== "Other" &&
        this.selectedItems.includes(item.value))
    );
  }

  private _getItemClasses(item: LegendItem, isItemSelected: boolean): string {
    const classes = ["legend-item"];

    if (!item.isVisible) classes.push("hidden");
    if (this.draggedItem === item.value && item.value !== null)
      classes.push("dragging");
    if (isItemSelected) classes.push("selected");
    if (item.extractedFromOther) classes.push("extracted");

    return classes.join(" ");
  }

  private _renderDragHandle() {
    return html`
      <div class="drag-handle">
        <svg
          width="16"
          height="16"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          @mousedown=${(e: Event) => e.stopPropagation()}
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 8h16M4 16h16"
          />
        </svg>
      </div>
    `;
  }

  private _renderItemSymbol(item: LegendItem, isItemSelected: boolean) {
    return html`
      <div class="mr-2">
        ${item.value === "Other"
          ? this.renderSymbol("circle", "#888")
          : this.renderSymbol(
              item.shape,
              item.color,
              LEGEND_DEFAULTS.symbolSize,
              isItemSelected
            )}
      </div>
    `;
  }

  private _renderItemText(item: LegendItem) {
    const displayText = item.value === null ? "N/A" : item.value;

    return html` <span class="legend-text">${displayText}</span> `;
  }

  private _renderItemActions(item: LegendItem) {
    if (item.value !== "Other") {
      return html``;
    }

    return html`
      <button
        class="view-button"
        @click=${(e: Event) => {
          e.stopPropagation();
          this.showOtherDialog = true;
        }}
        title="Extract items from Other"
      >
        (view)
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "protspace-legend": ProtspaceLegend;
  }
}
