import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

interface Feature {
  values: string[];
  colors: string[];
  shapes: string[];
}

/**
 * Interactive legend component for the protein scatter plot
 * Displays feature values and allows toggling visibility
 */
@customElement('prot-interactive-legend')
export class ProtInteractiveLegend extends LitElement {
  // Properties definition
  static properties = {
    feature: { type: Object },
    featureName: { type: String },
    hiddenValues: { type: Array },
    collapsible: { type: Boolean },
    collapsed: { type: Boolean },
  };

  // Property defaults
  feature: Feature | null = null;
  featureName = '';
  hiddenValues: string[] = [];
  collapsible = true;
  collapsed = false;

  // Use Light DOM for Tailwind compatibility
  createRenderRoot() {
    return this;
  }

  // Private properties for internal state
  private draggedItem: HTMLElement | null = null;

  // Helper to get shape path for a given shape name
  private getShapePath(shapeName: string): string {
    const shapeMap: Record<string, string> = {
      circle: 'M-5,0 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0',
      square: 'M-4,-4 h8 v8 h-8 z',
      triangle: 'M0,-5 L5,4 L-5,4 z',
      diamond: 'M0,-5 L5,0 L0,5 L-5,0 z',
      plus: 'M-5,0 h10 M0,-5 v10',
      asterisk: 'M-5,0 h10 M-3.5,-3.5 L3.5,3.5 M-3.5,3.5 L3.5,-3.5',
      cross: 'M-3.5,-3.5 L3.5,3.5 M-3.5,3.5 L3.5,-3.5',
      wye: 'M0,-5 L1,-1 L5,0 L1,1 L0,5 L-1,1 L-5,0 L-1,-1 z',
      star: 'M0,-5 L1.5,-1.5 L5,-1 L2.5,1.5 L3,5 L0,3 L-3,5 L-2.5,1.5 L-5,-1 L-1.5,-1.5 z',
      times: 'M-3.5,-3.5 L3.5,3.5 M-3.5,3.5 L3.5,-3.5',
    };

    return shapeMap[shapeName] || shapeMap.circle;
  }

  toggleValue(value: string) {
    const isHidden = this.hiddenValues.includes(value);
    const detail = {
      featureName: this.featureName,
      value,
      hidden: !isHidden,
    };

    // Dispatch custom event
    this.dispatchEvent(
      new CustomEvent('toggle-value', {
        detail,
        bubbles: true,
        composed: true,
      })
    );
  }

  toggleCollapse() {
    this.collapsed = !this.collapsed;

    this.dispatchEvent(
      new CustomEvent('legend-collapse', {
        detail: { collapsed: this.collapsed },
        bubbles: true,
        composed: true,
      })
    );
  }

  // Handle drag and drop reordering
  private handleDragStart(e: DragEvent, index: number) {
    if (!e.dataTransfer) return;

    this.draggedItem = e.currentTarget as HTMLElement;
    e.dataTransfer.effectAllowed = 'move';

    // Set data for drag operation
    e.dataTransfer.setData('text/plain', index.toString());

    // Add styling to the dragged element
    if (this.draggedItem) {
      this.draggedItem.classList.add('dragging');
    }
  }

  private handleDragOver(e: DragEvent) {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'move';

    const target = e.currentTarget as HTMLElement;
    target.classList.add('drag-over');
  }

  private handleDragLeave(e: DragEvent) {
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('drag-over');
  }

  private handleDrop(e: DragEvent, dropIndex: number) {
    e.preventDefault();

    const dragIndex = parseInt(e.dataTransfer!.getData('text/plain'));

    if (dragIndex === dropIndex) return;

    // Create a copy of the feature values
    if (this.feature) {
      // Dispatch reorder event with the drag and drop indices
      this.dispatchEvent(
        new CustomEvent('reorder-values', {
          detail: {
            featureName: this.featureName,
            fromIndex: dragIndex,
            toIndex: dropIndex,
          },
          bubbles: true,
          composed: true,
        })
      );
    }

    // Clean up
    if (this.draggedItem) {
      this.draggedItem.classList.remove('dragging');
      this.draggedItem = null;
    }

    const target = e.currentTarget as HTMLElement;
    target.classList.remove('drag-over');
  }

  private handleDragEnd() {
    if (this.draggedItem) {
      this.draggedItem.classList.remove('dragging');
      this.draggedItem = null;
    }

    // Clear any remaining drag-over classes
    const items = this.querySelectorAll('.legend-item');
    items.forEach((item) => {
      (item as HTMLElement).classList.remove('drag-over');
    });
  }

  render() {
    if (!this.feature) {
      return html`<div class="text-sm text-gray-500">No feature selected</div>`;
    }

    return html`
      <div
        class="legend-container p-2 bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700"
      >
        <div class="legend-header flex justify-between items-center mb-2">
          <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300">${this.featureName}</h3>
          ${this.collapsible
            ? html`
                <button
                  @click=${this.toggleCollapse}
                  class="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
                >
                  <svg
                    class="w-4 h-4 text-gray-500 dark:text-gray-400 transform ${this.collapsed
                      ? 'rotate-0'
                      : 'rotate-180'}"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 9l-7 7-7-7"
                    ></path>
                  </svg>
                </button>
              `
            : null}
        </div>

        <div class="legend-content ${this.collapsed ? 'hidden' : 'block'}">
          <div class="legend-items grid gap-1">
            ${this.feature.values.map((value, index) => {
              const isHidden = this.hiddenValues.includes(value);
              const color = this.feature!.colors[index];
              const shape = this.feature!.shapes[index];
              const shapePath = this.getShapePath(shape);

              return html`
                <div
                  class="legend-item flex items-center p-1 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  draggable="true"
                  @dragstart=${(e: DragEvent) => this.handleDragStart(e, index)}
                  @dragover=${this.handleDragOver}
                  @dragleave=${this.handleDragLeave}
                  @drop=${(e: DragEvent) => this.handleDrop(e, index)}
                  @dragend=${this.handleDragEnd}
                  @click=${() => this.toggleValue(value)}
                >
                  <div class="flex-shrink-0 w-6 mr-2 flex items-center justify-center">
                    <svg width="18" height="18" viewBox="-7 -7 14 14">
                      <g
                        opacity=${isHidden ? '0.5' : '1'}
                        stroke="#333333"
                        stroke-width="1"
                        fill=${color}
                      >
                        <path d=${shapePath}></path>
                      </g>
                    </svg>
                  </div>
                  <div
                    class="text-sm ${isHidden
                      ? 'text-gray-400 line-through'
                      : 'text-gray-700 dark:text-gray-300'}"
                  >
                    ${value}
                  </div>
                </div>
              `;
            })}
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'prot-interactive-legend': ProtInteractiveLegend;
  }
}
