import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { controlBarStyles } from "./control-bar.styles";
import type {
  DataChangeDetail,
  ProtspaceData,
  ScatterplotElementLike,
  SplitStateChangeDetail,
} from "./types";

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
  private _scatterplotElement: ScatterplotElementLike | null = null;

  // Stable listeners for proper add/remove
  private _onDocumentClick = (event: Event) => this.handleDocumentClick(event);
  private _onDataChange = (event: Event) => this._handleDataChange(event);
  private _onSplitStateChange = (event: Event) =>
    this._handleSplitStateChange(event);
  private _onProteinClick = (event: Event) => this._handleProteinSelection(event);

  static styles = controlBarStyles;

  private handleProjectionChange(event: Event) {
    const target = event.target as HTMLSelectElement;
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

    const customEvent = new CustomEvent("projection-change", {
      detail: { projection: target.value },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(customEvent);
  }

  private handleFeatureChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    // If auto-sync is enabled, directly update the scatterplot
    if (this.autoSync && this._scatterplotElement) {
      if ("selectedFeature" in this._scatterplotElement) {
        (this._scatterplotElement as any).selectedFeature = target.value;
        this.selectedFeature = target.value;
      }
    }

    const customEvent = new CustomEvent("feature-change", {
      detail: { feature: target.value },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(customEvent);
  }

  private handleToggleSelectionMode() {
    // Compute and set the new selection mode locally first
    const newSelectionMode = !this.selectionMode;
    this.selectionMode = newSelectionMode;

    // If auto-sync is enabled, update the scatterplot BEFORE notifying listeners
    if (this.autoSync && this._scatterplotElement && "selectionMode" in this._scatterplotElement) {
      (this._scatterplotElement as any).selectionMode = newSelectionMode;
    }

    // Now dispatch the event with the updated state so listeners read the correct value
    const customEvent = new CustomEvent("toggle-selection-mode", {
      detail: { selectionMode: newSelectionMode },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(customEvent);
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
    document.addEventListener("click", this._onDocumentClick);

    if (this.autoSync) {
      this._setupAutoSync();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener("click", this._onDocumentClick);

    if (this._scatterplotElement) {
      this._scatterplotElement.removeEventListener(
        "data-change",
        this._onDataChange
      );
      this._scatterplotElement.removeEventListener(
        "split-state-change",
        this._onSplitStateChange
      );
      this._scatterplotElement.removeEventListener(
        "protein-click",
        this._onProteinClick
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
      ) as ScatterplotElementLike | null;

      if (this._scatterplotElement) {
        console.log(
          "🔗 Control bar connected to scatterplot:",
          this.scatterplotSelector
        );

        // Listen for data changes
        this._scatterplotElement.addEventListener(
          "data-change",
          this._onDataChange
        );
        this._scatterplotElement.addEventListener(
          "split-state-change",
          this._onSplitStateChange
        );

        // Listen for protein selection changes
        this._scatterplotElement.addEventListener(
          "protein-click",
          this._onProteinClick
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
    const { data } = (event as CustomEvent<DataChangeDetail>).detail || {};
    if (!data) return;

    console.log("🔄 Control bar handling data change:", data);
    this._updateOptionsFromData(data);
    this.requestUpdate();
  }

  private _handleSplitStateChange(event: Event) {
    const { isolationMode, selectedProteinsCount } = (
      event as CustomEvent<SplitStateChangeDetail>
    ).detail;

    this.isolationMode = isolationMode;
    this.selectedProteinsCount = selectedProteinsCount;
    this.requestUpdate();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private _handleProteinSelection(_event: Event) {
    // Update selected proteins count when proteins are selected/deselected
    if (
      this._scatterplotElement &&
      "selectedProteinIds" in this._scatterplotElement
    ) {
      const selectedIds =
        (this._scatterplotElement as ScatterplotElementLike).selectedProteinIds || [];
      this.selectedProteinsCount = selectedIds.length;
      this.requestUpdate();
    }
  }

  private _updateOptionsFromData(data: ProtspaceData) {
    // Update projections and features
    this.projections = data.projections?.map((p) => p.name) || [];
    this.features = Object.keys(data.features || {});

    // Default selections if invalid
    if (
      !this.selectedProjection ||
      !this.projections.includes(this.selectedProjection)
    ) {
      this.selectedProjection = this.projections[0] || "";
    }
    if (!this.selectedFeature || !this.features.includes(this.selectedFeature)) {
      this.selectedFeature = this.features[0] || "";
    }

    console.log("✅ Control bar updated with:", {
      projections: this.projections,
      features: this.features,
      selectedProjection: this.selectedProjection,
      selectedFeature: this.selectedFeature,
    });
  }

  private _syncWithScatterplot() {
    if (
      this._scatterplotElement &&
      "getCurrentData" in this._scatterplotElement
    ) {
      const scatterplot = this._scatterplotElement as ScatterplotElementLike;
      let data: ProtspaceData | undefined;
      if (typeof scatterplot.getCurrentData === "function") {
        data = scatterplot.getCurrentData();
      }

      if (data) {
        console.log("🔗 Syncing control bar with scatterplot data:", data);

        // Extract projections and features
        this._updateOptionsFromData(data);
        console.log("📊 Synced features:", this.features);

        // Sync current values from scatterplot
        if (
          "selectedFeature" in scatterplot &&
          typeof scatterplot.selectedFeature !== "undefined"
        ) {
          // Only use the scatterplot's selected feature if it's still available
          const scatterplotFeature = scatterplot.selectedFeature as
            | string
            | undefined;
          if (
            scatterplotFeature &&
            this.features.includes(scatterplotFeature)
          ) {
            this.selectedFeature = scatterplotFeature;
          } else {
            this.selectedFeature = this.features[0] || "";
          }
        }

        if ("selectedProjectionIndex" in scatterplot) {
          const projIndex = scatterplot.selectedProjectionIndex as number | undefined;
          if (
            typeof projIndex === "number" &&
            projIndex >= 0 &&
            projIndex < this.projections.length
          ) {
            this.selectedProjection = this.projections[projIndex];
          }
        }

        if ("selectionMode" in scatterplot) {
          this.selectionMode = Boolean(scatterplot.selectionMode);
        }

        if ("selectedProteinIds" in scatterplot) {
          this.selectedProteinsCount = (
            (scatterplot.selectedProteinIds as unknown[]) || []
          ).length;
        }

        // Set defaults if not already set
        if (!this.selectedProjection && this.projections.length > 0) {
          this.selectedProjection = this.projections[0];
        }
        if (!this.selectedFeature && this.features.length > 0) {
          this.selectedFeature = this.features[0];
        }

        console.log("✅ Sync completed with:", {
          projections: this.projections,
          features: this.features,
          selectedProjection: this.selectedProjection,
          selectedFeature: this.selectedFeature,
        });

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
