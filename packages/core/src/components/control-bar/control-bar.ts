import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";

@customElement("protspace-control-bar")
export class ProtspaceControlBar extends LitElement {
  @property({ type: Array }) projections: string[] = [];
  @property({ type: Array }) features: string[] = [];
  @property({ type: String, attribute: "selected-projection" })
  selectedProjection: string = "";
  @property({ type: String, attribute: "selected-feature" })
  selectedFeature: string = "";
  @property({ type: Boolean, attribute: "selection-mode" })
  selectionMode: boolean = false;
  @property({ type: Boolean, attribute: "isolation-mode" })
  isolationMode: boolean = false;
  @property({ type: Number, attribute: "selected-proteins-count" })
  selectedProteinsCount: number = 0;

  // Auto-sync properties (optional, can be derived from events)
  @property({ type: String, attribute: "scatterplot-selector" })
  scatterplotSelector: string = "protspace-scatterplot";
  @property({ type: Boolean, attribute: "auto-sync" })
  autoSync: boolean = true;

  @state() private showExportMenu: boolean = false;
  private _scatterplotElement: Element | null = null;

  static styles = css`
    :host {
      display: block;
      font-family: system-ui, -apple-system, sans-serif;
    }

    .control-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 1rem;
      background: white;
      border-bottom: 1px solid #e5e7eb;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .left-controls {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .right-controls {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .control-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    label {
      font-size: 0.875rem;
      font-weight: 500;
      color: #374151;
    }

    select {
      padding: 0.25rem 0.5rem;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      background: white;
      font-size: 0.875rem;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }

    select:focus {
      outline: none;
      ring: 2px;
      ring-color: #3b82f6;
      border-color: #3b82f6;
    }

    button {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      background: white;
      color: #374151;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    button:hover {
      background: #f9fafb;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    button.active {
      background: #3b82f6;
      color: white;
      border-color: #3b82f6;
    }

    button.active:hover {
      background: #2563eb;
    }

    .icon {
      width: 1rem;
      height: 1rem;
      stroke: currentColor;
      fill: none;
      stroke-width: 1.5;
    }

    .export-container {
      position: relative;
    }

    .export-menu {
      position: absolute;
      right: 0;
      top: 100%;
      margin-top: 0.25rem;
      width: 10rem;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 0.375rem;
      box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
      z-index: 50;
    }

    .export-menu ul {
      list-style: none;
      margin: 0;
      padding: 0.25rem 0;
    }

    .export-menu button {
      width: 100%;
      text-align: left;
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 0;
      background: none;
      font-size: 0.875rem;
    }

    .export-menu button:hover {
      background: #f9fafb;
    }

    .chevron-down {
      width: 1rem;
      height: 1rem;
      margin-left: 0.25rem;
    }

    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      .control-bar {
        background: #1f2937;
        border-color: #374151;
      }

      label {
        color: #d1d5db;
      }

      select {
        background: #374151;
        border-color: #4b5563;
        color: #f9fafb;
      }

      button {
        background: #374151;
        border-color: #4b5563;
        color: #d1d5db;
      }

      button:hover {
        background: #4b5563;
      }

      .export-menu {
        background: #374151;
        border-color: #4b5563;
      }

      .export-menu button:hover {
        background: #4b5563;
      }
    }
  `;

  private handleProjectionChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const customEvent = new CustomEvent("projection-change", {
      detail: { projection: target.value },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(customEvent);

    // If auto-sync is enabled, directly update the scatterplot
    if (this.autoSync && this._scatterplotElement) {
      const projectionIndex = this.projections.findIndex(
        (p) => p === target.value
      );
      if (
        projectionIndex !== -1 &&
        "selectedProjectionIndex" in this._scatterplotElement
      ) {
        (this._scatterplotElement as any).selectedProjectionIndex =
          projectionIndex;
        this.selectedProjection = target.value;
      }
    }
  }

  private handleFeatureChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const customEvent = new CustomEvent("feature-change", {
      detail: { feature: target.value },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(customEvent);

    // If auto-sync is enabled, directly update the scatterplot
    if (this.autoSync && this._scatterplotElement) {
      if ("selectedFeature" in this._scatterplotElement) {
        (this._scatterplotElement as any).selectedFeature = target.value;
        this.selectedFeature = target.value;
      }
    }
  }

  private handleToggleSelectionMode() {
    const customEvent = new CustomEvent("toggle-selection-mode", {
      detail: {},
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(customEvent);

    // If auto-sync is enabled, directly update the scatterplot
    if (this.autoSync && this._scatterplotElement) {
      this.selectionMode = !this.selectionMode;
      if ("selectionMode" in this._scatterplotElement) {
        (this._scatterplotElement as any).selectionMode = this.selectionMode;
      }
    }
  }

  private handleToggleIsolationMode() {
    const customEvent = new CustomEvent("toggle-isolation-mode", {
      detail: {},
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(customEvent);

    // If auto-sync is enabled, handle isolation mode directly
    if (this.autoSync && this._scatterplotElement) {
      const scatterplot = this._scatterplotElement as any;

      if (!scatterplot.isInSplitMode?.() && this.selectedProteinsCount > 0) {
        // Enter split mode with selected proteins
        if (scatterplot.enterSplitMode && scatterplot.selectedProteinIds) {
          scatterplot.enterSplitMode(scatterplot.selectedProteinIds);
        }
      } else if (
        scatterplot.isInSplitMode?.() &&
        this.selectedProteinsCount > 0
      ) {
        // Create nested split
        if (scatterplot.createNestedSplit && scatterplot.selectedProteinIds) {
          scatterplot.createNestedSplit(scatterplot.selectedProteinIds);
        }
      } else {
        // Exit split mode
        if (scatterplot.exitSplitMode) {
          scatterplot.exitSplitMode();
        }
      }
    }
  }

  private handleClearSelections() {
    const customEvent = new CustomEvent("clear-selections", {
      detail: {},
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(customEvent);

    // If auto-sync is enabled, directly clear selections in scatterplot
    if (this.autoSync && this._scatterplotElement) {
      if ("selectedProteinIds" in this._scatterplotElement) {
        (this._scatterplotElement as any).selectedProteinIds = [];
        this.selectedProteinsCount = 0;
      }
    }
  }

  private handleExport(type: "json" | "ids" | "png" | "svg" | "pdf") {
    const customEvent = new CustomEvent("export", {
      detail: { type },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(customEvent);

    // If auto-sync is enabled, directly call export methods on scatterplot
    if (this.autoSync && this._scatterplotElement) {
      const scatterplot = this._scatterplotElement as any;

      try {
        // Import export utils dynamically
        import("@protspace/utils")
          .then(({ exportUtils }) => {
            switch (type) {
              case "json":
                exportUtils.exportJSON(scatterplot);
                break;
              case "ids":
                exportUtils.exportProteinIds(
                  scatterplot,
                  scatterplot.selectedProteinIds
                );
                break;
              case "png":
                exportUtils.exportPNG(scatterplot);
                break;
              case "svg":
                exportUtils.exportSVG(scatterplot);
                break;
              case "pdf":
                exportUtils.exportPDF(scatterplot);
                break;
              default:
                console.error(`Unknown export type: ${type}`);
            }
          })
          .catch((error) => {
            console.error("Failed to load export utils:", error);
          });
      } catch (error) {
        console.error(`Export failed for type ${type}:`, error);
      }
    }

    this.showExportMenu = false;
  }

  private toggleExportMenu() {
    this.showExportMenu = !this.showExportMenu;
  }

  private getIsolationModeTitle(): string {
    if (this.isolationMode && this.selectedProteinsCount > 0) {
      return "Split again to further refine view";
    } else if (this.isolationMode && this.selectedProteinsCount === 0) {
      return "Exit split mode and view all proteins";
    } else if (this.selectedProteinsCount === 0) {
      return "Select proteins first to split data";
    } else {
      return "Split view to focus on selected proteins only";
    }
  }

  private getIsolationModeText(): string {
    if (this.isolationMode && this.selectedProteinsCount > 0) {
      return "Split Again";
    } else if (this.isolationMode && this.selectedProteinsCount === 0) {
      return "Show All Data";
    } else {
      return "Split Data";
    }
  }

  render() {
    return html`
      <div class="control-bar">
        <!-- Left side controls -->
        <div class="left-controls">
          <!-- Projection selection -->
          <div class="control-group">
            <label for="projection-select">Projection:</label>
            <select
              id="projection-select"
              .value=${this.selectedProjection}
              @change=${this.handleProjectionChange}
            >
              ${this.projections.map(
                (projection) =>
                  html`<option value=${projection}>${projection}</option>`
              )}
            </select>
          </div>

          <!-- Feature selection -->
          <div class="control-group">
            <label for="feature-select">Color by:</label>
            <select
              id="feature-select"
              .value=${this.selectedFeature}
              @change=${this.handleFeatureChange}
            >
              ${this.features.map(
                (feature) => html`<option value=${feature}>${feature}</option>`
              )}
            </select>
          </div>
        </div>

        <!-- Right side controls -->
        <div class="right-controls">
          <!-- Selection mode toggle -->
          <button
            class=${this.selectionMode ? "active" : ""}
            @click=${this.handleToggleSelectionMode}
            title=${this.isolationMode
              ? "Select proteins within the split view for further refinement"
              : "Select proteins by clicking or dragging to enclose multiple points"}
          >
            <svg class="icon" viewBox="0 0 24 24">
              <rect
                x="3"
                y="3"
                width="18"
                height="18"
                rx="1"
                stroke="currentColor"
                stroke-dasharray="2 1"
                fill="none"
              />
              <circle cx="8" cy="8" r="1.5" fill="currentColor" />
              <circle cx="12" cy="14" r="1.5" fill="currentColor" />
              <circle cx="16" cy="10" r="1.5" fill="currentColor" />
              <circle cx="7" cy="16" r="1.5" fill="currentColor" />
              <circle cx="17" cy="17" r="1.5" fill="currentColor" />
            </svg>
            Select
          </button>

          <!-- Clear selections button -->
          <button
            ?disabled=${this.selectedProteinsCount === 0}
            @click=${this.handleClearSelections}
            title="Clear all selected proteins"
          >
            <svg class="icon" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            Clear
          </button>

          <!-- Split mode toggle -->
          <button
            class=${this.isolationMode ? "active" : ""}
            ?disabled=${!this.isolationMode && this.selectedProteinsCount === 0}
            @click=${this.handleToggleIsolationMode}
            title=${this.getIsolationModeTitle()}
          >
            <svg class="icon" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
              />
            </svg>
            ${this.getIsolationModeText()}
          </button>

          <!-- Export dropdown -->
          <div class="export-container">
            <button @click=${this.toggleExportMenu} title="Export Options">
              <svg class="icon" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Export
              <svg class="chevron-down" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            ${this.showExportMenu
              ? html`
                  <div class="export-menu">
                    <ul>
                      <li>
                        <button @click=${() => this.handleExport("json")}>
                          Export JSON
                        </button>
                      </li>
                      <li>
                        <button @click=${() => this.handleExport("ids")}>
                          Export Protein IDs
                        </button>
                      </li>
                      <li>
                        <button @click=${() => this.handleExport("png")}>
                          Export PNG
                        </button>
                      </li>
                      <li>
                        <button @click=${() => this.handleExport("svg")}>
                          Export SVG
                        </button>
                      </li>
                      <li>
                        <button @click=${() => this.handleExport("pdf")}>
                          Export PDF
                        </button>
                      </li>
                    </ul>
                  </div>
                `
              : ""}
          </div>
        </div>
      </div>
    `;
  }

  // Close export menu when clicking outside
  connectedCallback() {
    super.connectedCallback();
    document.addEventListener("click", this.handleDocumentClick.bind(this));

    if (this.autoSync) {
      this._setupAutoSync();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener("click", this.handleDocumentClick.bind(this));

    if (this._scatterplotElement) {
      this._scatterplotElement.removeEventListener(
        "data-change",
        this._handleDataChange.bind(this)
      );
      this._scatterplotElement.removeEventListener(
        "split-state-change",
        this._handleSplitStateChange.bind(this)
      );
      this._scatterplotElement.removeEventListener(
        "protein-click",
        this._handleProteinSelection.bind(this)
      );
    }
  }

  private handleDocumentClick(event: Event) {
    if (!this.contains(event.target as Node)) {
      this.showExportMenu = false;
    }
  }

  private _setupAutoSync() {
    // Find scatterplot element with retries
    const trySetup = (attempts: number = 0) => {
      this._scatterplotElement = document.querySelector(
        this.scatterplotSelector
      );

      if (this._scatterplotElement) {
        console.log(
          "🔗 Control bar connected to scatterplot:",
          this.scatterplotSelector
        );

        // Listen for data changes
        this._scatterplotElement.addEventListener(
          "data-change",
          this._handleDataChange.bind(this)
        );
        this._scatterplotElement.addEventListener(
          "split-state-change",
          this._handleSplitStateChange.bind(this)
        );

        // Listen for protein selection changes
        this._scatterplotElement.addEventListener(
          "protein-click",
          this._handleProteinSelection.bind(this)
        );

        // Initial sync after a short delay to ensure scatterplot is ready
        setTimeout(() => {
          this._syncWithScatterplot();
        }, 50);
      } else if (attempts < 10) {
        // Retry up to 10 times with increasing delay
        setTimeout(() => trySetup(attempts + 1), 100 + attempts * 50);
      } else {
        console.warn(
          "❌ Control bar could not find scatterplot element:",
          this.scatterplotSelector
        );
      }
    };

    trySetup();
  }

  private _handleDataChange(event: Event) {
    const customEvent = event as CustomEvent;
    const { data } = customEvent.detail;

    if (data) {
      // Auto-update projections and features
      this.projections =
        data.projections?.map((p: { name: string }) => p.name) || [];
      this.features = Object.keys(data.features || {});

      // Set defaults if not already set
      if (!this.selectedProjection && this.projections.length > 0) {
        this.selectedProjection = this.projections[0];
      }
      if (!this.selectedFeature && this.features.length > 0) {
        this.selectedFeature = this.features[0];
      }

      this.requestUpdate();
    }
  }

  private _handleSplitStateChange(event: Event) {
    const customEvent = event as CustomEvent;
    const { isolationMode, selectedProteinsCount } = customEvent.detail;

    this.isolationMode = isolationMode;
    this.selectedProteinsCount = selectedProteinsCount;
    this.requestUpdate();
  }

  private _handleProteinSelection(_event: Event) {
    // Update selected proteins count when proteins are selected/deselected
    if (
      this._scatterplotElement &&
      "selectedProteinIds" in this._scatterplotElement
    ) {
      const selectedIds =
        (this._scatterplotElement as any).selectedProteinIds || [];
      this.selectedProteinsCount = selectedIds.length;
      this.requestUpdate();
    }
  }

  private _syncWithScatterplot() {
    if (
      this._scatterplotElement &&
      "getCurrentData" in this._scatterplotElement
    ) {
      const scatterplot = this._scatterplotElement as any;
      const data = scatterplot.getCurrentData();

      if (data) {
        this.projections =
          data.projections?.map((p: { name: string }) => p.name) || [];
        this.features = Object.keys(data.features || {});

        // Sync current values from scatterplot
        if ("selectedFeature" in scatterplot) {
          this.selectedFeature =
            scatterplot.selectedFeature || this.features[0] || "";
        }
        if (
          "selectedProjectionIndex" in scatterplot &&
          "selectedProjectionIndex" in scatterplot
        ) {
          const projIndex = scatterplot.selectedProjectionIndex;
          if (projIndex >= 0 && projIndex < this.projections.length) {
            this.selectedProjection = this.projections[projIndex];
          }
        }
        if ("selectionMode" in scatterplot) {
          this.selectionMode = scatterplot.selectionMode || false;
        }
        if ("selectedProteinIds" in scatterplot) {
          this.selectedProteinsCount = (
            scatterplot.selectedProteinIds || []
          ).length;
        }

        // Set defaults if not already set
        if (!this.selectedProjection && this.projections.length > 0) {
          this.selectedProjection = this.projections[0];
        }
        if (!this.selectedFeature && this.features.length > 0) {
          this.selectedFeature = this.features[0];
        }

        this.requestUpdate();
      }
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "protspace-control-bar": ProtspaceControlBar;
  }
}
