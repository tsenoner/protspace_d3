import { html, TemplateResult } from "lit";
import * as d3 from "d3";
import type { LegendItem } from "./types";
import { SHAPE_MAPPING, LEGEND_DEFAULTS, LEGEND_STYLES } from "./config";

/**
 * Utility class for rendering legend components
 */
export class LegendRenderer {
  /**
   * Render a symbol using D3 shapes for consistency with scatterplot
   */
  static renderSymbol(
    shape: string | null,
    color: string,
    size = LEGEND_DEFAULTS.symbolSize,
    isSelected = false
  ): TemplateResult {
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
      .size(size * LEGEND_DEFAULTS.symbolSizeMultiplier)();

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

  /**
   * Render the legend header with title and customize button
   */
  static renderHeader(title: string, onCustomize: () => void): TemplateResult {
    return html`
      <div class="legend-header">
        <h3 class="legend-title">${title}</h3>
        <button class="customize-button" @click=${onCustomize}>
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

  /**
   * Render the main legend content or empty state
   */
  static renderLegendContent(
    sortedLegendItems: LegendItem[],
    renderItemCallback: (item: LegendItem) => TemplateResult
  ): TemplateResult {
    if (sortedLegendItems.length === 0) {
      return html`<div class="legend-empty">No data available</div>`;
    }

    return html`
      <div class="legend-items">
        ${sortedLegendItems.map((item) => renderItemCallback(item))}
      </div>
    `;
  }

  /**
   * Render the drag handle icon
   */
  static renderDragHandle(): TemplateResult {
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

  /**
   * Render the item symbol (either "Other" default or feature-specific symbol)
   */
  static renderItemSymbol(
    item: LegendItem,
    isItemSelected: boolean
  ): TemplateResult {
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

  /**
   * Render the item text label
   */
  static renderItemText(item: LegendItem): TemplateResult {
    const isEmptyString =
      typeof item.value === "string" && item.value.trim() === "";
    const displayText =
      item.value === null || isEmptyString ? "N\\A" : item.value;
    return html`<span class="legend-text">${displayText}</span>`;
  }

  /**
   * Render item actions (like "view" button for "Other" category)
   */
  static renderItemActions(
    item: LegendItem,
    onViewOther: (e: Event) => void
  ): TemplateResult {
    if (item.value !== "Other") {
      return html``;
    }

    return html`
      <button
        class="view-button"
        @click=${onViewOther}
        title="Extract items from Other"
      >
        (view)
      </button>
    `;
  }

  /**
   * Render a complete legend item
   */
  static renderLegendItem(
    item: LegendItem,
    itemClasses: string,
    isItemSelected: boolean,
    eventHandlers: {
      onClick: () => void;
      onDoubleClick: () => void;
      onDragStart: () => void;
      onDragOver: () => void;
      onDragEnd: () => void;
      onViewOther: (e: Event) => void;
    }
  ): TemplateResult {
    return html`
      <div
        class="${itemClasses}"
        @click=${eventHandlers.onClick}
        @dblclick=${eventHandlers.onDoubleClick}
        draggable="true"
        @dragstart=${eventHandlers.onDragStart}
        @dragover=${eventHandlers.onDragOver}
        @dragend=${eventHandlers.onDragEnd}
      >
        <div class="legend-item-content">
          ${this.renderDragHandle()}
          ${this.renderItemSymbol(item, isItemSelected)}
          ${this.renderItemText(item)}
          ${this.renderItemActions(item, eventHandlers.onViewOther)}
        </div>
        <span class="legend-count">${item.count}</span>
      </div>
    `;
  }
}
