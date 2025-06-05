import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import * as d3 from "d3";
import { getSymbolType } from "@protspace/utils";

interface LegendItem {
  value: string | null;
  color: string;
  shape: string;
  count: number;
  isVisible: boolean;
}

@customElement("protspace-legend")
export class ProtspaceLegend extends LitElement {
  static styles = css`
    :host {
      --legend-bg: #ffffff;
      --legend-border: #e1e5e9;
      --legend-border-radius: 8px;
      --legend-padding: 1rem;
      --legend-item-padding: 0.5rem;
      --legend-item-gap: 0.5rem;
      --legend-text-color: #374151;
      --legend-text-secondary: #6b7280;
      --legend-hover-bg: #f3f4f6;
      --legend-hidden-bg: #f9fafb;
      --legend-hidden-opacity: 0.5;

      display: block;
      background: var(--legend-bg);
      border: 1px solid var(--legend-border);
      border-radius: var(--legend-border-radius);
      padding: var(--legend-padding);
      max-width: 300px;
    }

    .legend-title {
      font-weight: 600;
      font-size: 1.125rem;
      margin-bottom: 0.75rem;
      color: var(--legend-text-color);
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
      border-radius: 0.375rem;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }

    .legend-item:hover {
      background: var(--legend-hover-bg);
    }

    .legend-item.hidden {
      opacity: var(--legend-hidden-opacity);
      background: var(--legend-hidden-bg);
    }

    .legend-item-content {
      display: flex;
      align-items: center;
      gap: 0.75rem;
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

    .legend-count {
      font-size: 0.75rem;
      color: var(--legend-text-secondary);
      font-weight: 500;
    }

    .legend-empty {
      text-align: center;
      color: var(--legend-text-secondary);
      font-style: italic;
      padding: 1rem 0;
    }
  `;

  @property({ type: String }) featureName = "";
  @property({ type: Object }) featureData = { values: [], colors: [], shapes: [] };
  @property({ type: Array }) featureValues: (string | null)[] = [];
  @property({ type: Array }) hiddenValues: string[] = [];
  @property({ type: Number }) maxItems = 10;

  @state() private legendItems: LegendItem[] = [];

  updated(changedProperties: Map<string, unknown>) {
    if (
      changedProperties.has("featureData") ||
      changedProperties.has("featureValues") ||
      changedProperties.has("hiddenValues")
    ) {
      this.updateLegendItems();
    }
  }

  private updateLegendItems() {
    if (!this.featureData || !this.featureValues || this.featureValues.length === 0) {
      this.legendItems = [];
      return;
    }

    // Count frequencies of feature values
    const frequencyMap = new Map<string | null, number>();
    this.featureValues.forEach((value) => {
      frequencyMap.set(value, (frequencyMap.get(value) || 0) + 1);
    });

    // Create legend items for each unique value that appears in the data
    const items: LegendItem[] = [];
    
    this.featureData.values.forEach((value, index) => {
      const count = frequencyMap.get(value);
      if (count && count > 0) {
        const valueKey = value === null ? "null" : value;
        const isVisible = !this.hiddenValues.includes(valueKey);
        
        items.push({
          value,
          color: this.featureData.colors[index] || "#888888",
          shape: this.featureData.shapes[index] || "circle",
          count,
          isVisible,
        });
      }
    });

    // Sort by count (descending) and limit items
    this.legendItems = items
      .sort((a, b) => b.count - a.count)
      .slice(0, this.maxItems);
  }

  private renderSymbol(shape: string, color: string, isVisible: boolean) {
    const size = 16;
    const halfSize = size / 2;

    const symbolType = getSymbolType(shape);
    const path = d3.symbol().type(symbolType).size(size * 8)();

    return html`
      <svg width="${size}" height="${size}" class="legend-symbol">
        <g transform="translate(${halfSize}, ${halfSize})">
          <path
            d="${path}"
            fill="${isVisible ? color : '#ccc'}"
            stroke="#333"
            stroke-width="1"
            opacity="${isVisible ? 1 : 0.5}"
          />
        </g>
      </svg>
    `;
  }

  private handleItemClick(value: string | null) {
    // Dispatch custom event for toggle visibility
    this.dispatchEvent(
      new CustomEvent("legend-item-click", {
        detail: { value },
        bubbles: true,
      })
    );
  }

  render() {
    return html`
      <div class="legend-container">
        <h3 class="legend-title">${this.featureName || "Legend"}</h3>
        
        ${this.legendItems.length > 0
          ? html`
              <div class="legend-items">
                ${this.legendItems.map((item) => html`
                  <div
                    class="legend-item ${item.isVisible ? '' : 'hidden'}"
                    @click=${() => this.handleItemClick(item.value)}
                  >
                    <div class="legend-item-content">
                      ${this.renderSymbol(item.shape, item.color, item.isVisible)}
                      <span class="legend-text">
                        ${item.value === null ? "N/A" : item.value}
                      </span>
                    </div>
                    <span class="legend-count">${item.count}</span>
                  </div>
                `)}
              </div>
            `
          : html`
              <div class="legend-empty">
                No data available
              </div>
            `}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "protspace-legend": ProtspaceLegend;
  }
}