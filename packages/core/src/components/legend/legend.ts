import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import * as d3 from "d3";
import { getSymbolType } from "@protspace/utils";
import type { VisualizationData } from "@protspace/utils";

// Types
export interface LegendItem {
  value: string | null;
  color: string;
  shape: string;
  count: number;
  isVisible: boolean;
  zOrder: number;
  extractedFromOther?: boolean;
}

export interface LegendClickEvent extends CustomEvent {
  detail: {
    value: string | null;
    action: "toggle" | "isolate" | "extract";
  };
}

// Default styles
const DEFAULT_STYLES = {
  other: {
    color: "#888888",
    shape: "circle",
  },
  null: {
    color: "#888888",
    shape: "circle",
  },
};

@customElement("protspace-legend")
export class ProtspaceLegend extends LitElement {
  static styles = css`
    :host {
      --legend-bg-color: #ffffff;
      --legend-border-color: #e1e5e9;
      --legend-text-color: #374151;
      --legend-secondary-text-color: #6b7280;
      --legend-hover-bg: #f9fafb;
      --legend-selected-border: #ef4444;
      --legend-extracted-border: #10b981;

      display: block;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
    }

    .legend-container {
      padding: 12px;
      border: 1px solid var(--legend-border-color);
      border-radius: 6px;
      background: var(--legend-bg-color);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .legend-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .legend-title {
      font-weight: 500;
      color: var(--legend-text-color);
      margin: 0;
    }

    .customize-button {
      background: none;
      border: none;
      color: var(--legend-secondary-text-color);
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .customize-button:hover {
      background: var(--legend-hover-bg);
    }

    .legend-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .legend-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      background: #f9fafb;
      border: 2px solid transparent;
    }

    .legend-item:hover {
      background: var(--legend-hover-bg);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .legend-item.invisible {
      opacity: 0.5;
      background: #f3f4f6;
    }

    .legend-item.selected {
      border-color: var(--legend-selected-border);
    }

    .legend-item.extracted {
      border-left: 4px solid var(--legend-extracted-border);
    }

    .legend-item-content {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .drag-handle {
      cursor: grab;
      padding: 4px;
      border-radius: 4px;
      color: #9ca3af;
    }

    .drag-handle:hover {
      background: #e5e7eb;
    }

    .legend-symbol {
      width: 16px;
      height: 16px;
    }

    .legend-label {
      color: var(--legend-text-color);
    }

    .view-button {
      background: none;
      border: none;
      color: #3b82f6;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      margin-left: 4px;
    }

    .view-button:hover {
      color: #2563eb;
    }

    .legend-count {
      color: var(--legend-secondary-text-color);
      font-size: 12px;
    }

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

    .modal {
      background: white;
      padding: 24px;
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
      max-width: 400px;
      width: 90%;
      max-height: 80vh;
      overflow: auto;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .modal-title {
      font-size: 18px;
      font-weight: 500;
      margin: 0;
    }

    .close-button {
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      color: var(--legend-secondary-text-color);
    }

    .modal-description {
      color: var(--legend-secondary-text-color);
      margin-bottom: 16px;
      font-size: 14px;
    }

    .other-items-list {
      border: 1px solid var(--legend-border-color);
      border-radius: 6px;
      max-height: 240px;
      overflow-y: auto;
      margin-bottom: 16px;
    }

    .other-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      border-bottom: 1px solid var(--legend-border-color);
    }

    .other-item:last-child {
      border-bottom: none;
    }

    .other-item:hover {
      background: var(--legend-hover-bg);
    }

    .other-item-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .other-item-count {
      color: var(--legend-secondary-text-color);
      font-size: 12px;
    }

    .extract-button {
      background: none;
      border: none;
      color: #3b82f6;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
    }

    .extract-button:hover {
      color: #2563eb;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
    }

    .cancel-button {
      background: #f3f4f6;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      color: var(--legend-text-color);
    }

    .cancel-button:hover {
      background: #e5e7eb;
    }
  `;

  // Properties
  @property({ type: Object }) data: VisualizationData | null = null;
  @property({ type: String }) selectedFeature = "";
  @property({ type: Array }) featureValues: (string | null)[] = [];
  @property({ type: Array }) proteinIds: string[] = [];
  @property({ type: Number }) maxVisibleValues = 10;
  @property({ type: Array }) selectedItems: string[] = [];
  @property({ type: Boolean }) isolationMode = false;
  @property({ type: Array }) splitHistory?: string[][];

  // State
  @state() private _legendItems: LegendItem[] = [];
  @state() private _otherItems: [string | null, number][] = [];
  @state() private _showOtherDialog = false;
  @state() private _draggedItem: string | null = null;

  // Drag state
  private _dragTimeout: number | null = null;

  // Current feature data
  private get _featureData() {
    if (!this.data || !this.selectedFeature) return null;
    return this.data.features[this.selectedFeature];
  }

  // Process data when properties change
  protected updated(changedProperties: Map<string | number | symbol, unknown>) {
    if (
      changedProperties.has("data") ||
      changedProperties.has("selectedFeature") ||
      changedProperties.has("featureValues") ||
      changedProperties.has("maxVisibleValues") ||
      changedProperties.has("isolationMode") ||
      changedProperties.has("splitHistory")
    ) {
      this._processLegendData();
    }
  }

  private _processLegendData() {
    if (
      !this._featureData ||
      !this.featureValues ||
      this.featureValues.length === 0
    ) {
      this._legendItems = [];
      return;
    }

    // Create frequency map
    const frequencyMap = new Map<string | null, number>();

    // Handle isolation mode filtering
    const filteredIndices = new Set<number>();
    if (
      this.isolationMode &&
      this.splitHistory &&
      this.splitHistory.length > 0 &&
      this.proteinIds
    ) {
      this.proteinIds.forEach((id, index) => {
        let isIncluded = this.splitHistory![0].includes(id);
        if (isIncluded && this.splitHistory!.length > 1) {
          for (let i = 1; i < this.splitHistory!.length; i++) {
            if (!this.splitHistory![i].includes(id)) {
              isIncluded = false;
              break;
            }
          }
        }
        if (isIncluded) {
          filteredIndices.add(index);
        }
      });
    }

    // Count frequencies
    if (
      this.isolationMode &&
      this.splitHistory &&
      this.splitHistory.length > 0
    ) {
      this.featureValues.forEach((value, index) => {
        if (filteredIndices.has(index)) {
          frequencyMap.set(value, (frequencyMap.get(value) || 0) + 1);
        }
      });
    } else {
      this.featureValues.forEach((value) => {
        frequencyMap.set(value, (frequencyMap.get(value) || 0) + 1);
      });
    }

    // Sort by frequency
    const sortedItems = Array.from(frequencyMap.entries()).sort(
      (a, b) => b[1] - a[1]
    );
    const filteredSortedItems = this.isolationMode
      ? sortedItems.filter(([value]) => frequencyMap.has(value))
      : sortedItems;

    // Take top items
    const topItems = filteredSortedItems.slice(0, this.maxVisibleValues);
    const nullEntry = filteredSortedItems.find(([value]) => value === null);

    // Get "Other" items
    const otherItemsArray = filteredSortedItems
      .slice(this.maxVisibleValues)
      .filter(([value]) => value !== null);

    this._otherItems = otherItemsArray;
    const otherCount = otherItemsArray.reduce(
      (sum, [, count]) => sum + count,
      0
    );

    // Create legend items
    const items: LegendItem[] = topItems.map(([value, count], index) => {
      const valueIndex =
        value !== null
          ? this._featureData!.values.indexOf(value)
          : this._featureData!.values.findIndex((v) => v === null);

      return {
        value,
        color:
          valueIndex !== -1
            ? this._featureData!.colors[valueIndex]
            : DEFAULT_STYLES.null.color,
        shape:
          valueIndex !== -1
            ? this._featureData!.shapes[valueIndex]
            : DEFAULT_STYLES.null.shape,
        count,
        isVisible: true,
        zOrder: index,
      };
    });

    // Add "Other" if needed
    if (otherCount > 0 && !this.isolationMode) {
      items.push({
        value: "Other",
        color: DEFAULT_STYLES.other.color,
        shape: DEFAULT_STYLES.other.shape,
        count: otherCount,
        isVisible: true,
        zOrder: items.length,
      });
    }

    // Add null if not already included
    if (nullEntry && !topItems.some(([value]) => value === null)) {
      const valueIndex = this._featureData!.values.findIndex((v) => v === null);
      items.push({
        value: null,
        color:
          valueIndex !== -1
            ? this._featureData!.colors[valueIndex]
            : DEFAULT_STYLES.null.color,
        shape:
          valueIndex !== -1
            ? this._featureData!.shapes[valueIndex]
            : DEFAULT_STYLES.null.shape,
        count: nullEntry[1],
        isVisible: true,
        zOrder: items.length,
      });
    }

    // Preserve extracted items
    const extractedItems = this._legendItems.filter(
      (item) => item.extractedFromOther
    );
    extractedItems.forEach((extractedItem) => {
      if (
        !items.some((item) => item.value === extractedItem.value) &&
        frequencyMap.has(extractedItem.value)
      ) {
        const itemFrequency = filteredSortedItems.find(
          ([value]) => value === extractedItem.value
        );
        if (itemFrequency) {
          items.push({
            ...extractedItem,
            count: itemFrequency[1],
            zOrder: items.length,
          });
        }
      }
    });

    this._legendItems = items;
  }

  private _renderSymbol(
    shape: string | null,
    color: string,
    size = 16,
    isSelected = false
  ) {
    const halfSize = size / 2;
    const shapeKey = (shape || "circle").toLowerCase();
    const symbolType = getSymbolType(shapeKey);
    const path = d3
      .symbol()
      .type(symbolType)
      .size(size * 8)();

    const isOutlineOnly =
      shapeKey === "plus" ||
      shapeKey === "asterisk" ||
      String(shapeKey).includes("_stroke");
    const strokeWidth = isSelected ? 2 : 1;
    const strokeColor = isSelected ? "#3B82F6" : "#333";

    return html`
      <svg class="legend-symbol" width="${size}" height="${size}">
        <g transform="translate(${halfSize}, ${halfSize})">
          <path
            d="${path || ""}"
            fill="${isOutlineOnly ? "none" : color}"
            stroke="${isOutlineOnly ? color : strokeColor}"
            stroke-width="${isOutlineOnly ? 2 : strokeWidth}"
          />
        </g>
      </svg>
    `;
  }

  private _handleItemClick(item: LegendItem) {
    // Update visibility
    this._legendItems = this._legendItems.map((i) =>
      i.value === item.value ? { ...i, isVisible: !i.isVisible } : i
    );

    // Dispatch event
    this.dispatchEvent(
      new CustomEvent("legend-item-click", {
        detail: { value: item.value, action: "toggle" },
        bubbles: true,
      }) as LegendClickEvent
    );
  }

  private _handleItemDoubleClick(item: LegendItem) {
    const visibleItems = this._legendItems.filter((i) => i.isVisible);
    const isOnlyVisible =
      visibleItems.length === 1 && visibleItems[0].value === item.value;

    if (isOnlyVisible) {
      // Show all
      this._legendItems = this._legendItems.map((i) => ({
        ...i,
        isVisible: true,
      }));
    } else {
      // Show only this item
      this._legendItems = this._legendItems.map((i) => ({
        ...i,
        isVisible: i.value === item.value,
      }));
    }

    // Dispatch event
    this.dispatchEvent(
      new CustomEvent("legend-item-click", {
        detail: { value: item.value, action: "isolate" },
        bubbles: true,
      }) as LegendClickEvent
    );
  }

  private _handleDragStart(item: LegendItem) {
    this._draggedItem = item.value;
    if (this._dragTimeout) clearTimeout(this._dragTimeout);
  }

  private _handleDragOver(item: LegendItem) {
    if (!this._draggedItem || this._draggedItem === item.value) return;

    if (this._dragTimeout) clearTimeout(this._dragTimeout);

    this._dragTimeout = window.setTimeout(() => {
      const draggedIdx = this._legendItems.findIndex(
        (i) => i.value === this._draggedItem
      );
      const targetIdx = this._legendItems.findIndex(
        (i) => i.value === item.value
      );

      if (draggedIdx === -1 || targetIdx === -1) return;

      const newItems = [...this._legendItems];
      const [movedItem] = newItems.splice(draggedIdx, 1);
      newItems.splice(targetIdx, 0, movedItem);

      this._legendItems = newItems.map((item, idx) => ({
        ...item,
        zOrder: idx,
      }));

      // Dispatch z-order change event
      const zOrderMap = this._legendItems.reduce((acc, item) => {
        if (item.value !== null && item.value !== "Other") {
          acc[item.value] = item.zOrder;
        }
        return acc;
      }, {} as Record<string, number>);

      this.dispatchEvent(
        new CustomEvent("legend-zorder-change", {
          detail: { zOrderMapping: zOrderMap },
          bubbles: true,
        })
      );
    }, 100);
  }

  private _handleDragEnd() {
    this._draggedItem = null;
    if (this._dragTimeout) {
      clearTimeout(this._dragTimeout);
      this._dragTimeout = null;
    }
  }

  private _handleExtractFromOther(value: string) {
    const itemToExtract = this._otherItems.find(([v]) => v === value);
    if (!itemToExtract || !this._featureData) return;

    const valueIndex = this._featureData.values.indexOf(value);
    const newItem: LegendItem = {
      value,
      color: valueIndex !== -1 ? this._featureData.colors[valueIndex] : "#888",
      shape:
        valueIndex !== -1 ? this._featureData.shapes[valueIndex] : "circle",
      count: itemToExtract[1],
      isVisible: true,
      zOrder: this._legendItems.length,
      extractedFromOther: true,
    };

    this._legendItems = [...this._legendItems, newItem];
    this._showOtherDialog = false;

    // Dispatch event
    this.dispatchEvent(
      new CustomEvent("legend-item-click", {
        detail: { value, action: "extract" },
        bubbles: true,
      }) as LegendClickEvent
    );
  }

  private _handleCustomizeClick() {
    this.dispatchEvent(
      new CustomEvent("legend-customize", {
        bubbles: true,
      })
    );
  }

  render() {
    if (!this._featureData) {
      return html`<div class="legend-container">No data available</div>`;
    }

    const sortedItems = [...this._legendItems].sort(
      (a, b) => a.zOrder - b.zOrder
    );

    return html`
      <div class="legend-container">
        <div class="legend-header">
          <h3 class="legend-title">${this.selectedFeature}</h3>
          <button
            class="customize-button"
            @click="${this._handleCustomizeClick}"
            title="Customize Legend"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
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

        <ul class="legend-list">
          ${sortedItems.map((item) => {
            const isSelected =
              (item.value === null &&
                this.selectedItems.includes("null") &&
                this.selectedItems.length > 0) ||
              (item.value !== null &&
                item.value !== "Other" &&
                this.selectedItems.includes(item.value));

            return html`
              <li
                class="legend-item ${!item.isVisible
                  ? "invisible"
                  : ""} ${isSelected
                  ? "selected"
                  : ""} ${item.extractedFromOther ? "extracted" : ""} ${this
                  ._draggedItem === item.value
                  ? "dragging"
                  : ""}"
                @click="${() => this._handleItemClick(item)}"
                @dblclick="${() => this._handleItemDoubleClick(item)}"
                draggable="true"
                @dragstart="${() => this._handleDragStart(item)}"
                @dragover="${() => this._handleDragOver(item)}"
                @dragend="${() => this._handleDragEnd()}"
              >
                <div class="legend-item-content">
                  <div class="drag-handle">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4 8h16M4 16h16"
                      />
                    </svg>
                  </div>
                  <div>
                    ${item.value === "Other" || !item.isVisible
                      ? this._renderSymbol(
                          "circle",
                          item.isVisible ? "#888" : "#ccc"
                        )
                      : this._renderSymbol(
                          item.shape,
                          item.color,
                          16,
                          isSelected
                        )}
                  </div>
                  <span class="legend-label">
                    ${item.value === null ? "N/A" : item.value}
                    ${item.value === "Other"
                      ? html`
                          <button
                            class="view-button"
                            @click="${(e: Event) => {
                              e.stopPropagation();
                              this._showOtherDialog = true;
                            }}"
                            title="Extract items from Other"
                          >
                            (view)
                          </button>
                        `
                      : ""}
                  </span>
                </div>
                <span class="legend-count">${item.count}</span>
              </li>
            `;
          })}
        </ul>
      </div>

      ${this._showOtherDialog
        ? html`
            <div
              class="modal-overlay"
              @click="${() => (this._showOtherDialog = false)}"
            >
              <div class="modal" @click="${(e: Event) => e.stopPropagation()}">
                <div class="modal-header">
                  <h3 class="modal-title">Extract from 'Other' category</h3>
                  <button
                    class="close-button"
                    @click="${() => (this._showOtherDialog = false)}"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
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

                <p class="modal-description">
                  Select items to extract from the 'Other' category. Extracted
                  items will appear individually in the legend.
                </p>

                <div class="other-items-list">
                  ${this._otherItems.map(
                    ([value, count]) => html`
                      <div class="other-item">
                        <div class="other-item-info">
                          <span>${value === null ? "N/A" : value}</span>
                          <span class="other-item-count">(${count})</span>
                        </div>
                        <button
                          class="extract-button"
                          @click="${() =>
                            value !== null &&
                            this._handleExtractFromOther(value)}"
                        >
                          Extract
                        </button>
                      </div>
                    `
                  )}
                </div>

                <div class="modal-footer">
                  <button
                    class="cancel-button"
                    @click="${() => (this._showOtherDialog = false)}"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          `
        : ""}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "protspace-legend": ProtspaceLegend;
  }
}
