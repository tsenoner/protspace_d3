import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { controlBarStyles } from "./control-bar.styles";
import type {
  DataChangeDetail,
  ProtspaceData,
  ScatterplotElementLike,
} from "./types";

@customElement("protspace-control-bar")
export class ProtspaceControlBar extends LitElement {
  @property({ type: Array }) projections: string[] = [];
  @state() private projectionsMeta: Array<{ name: string; metadata?: { dimension?: 2 | 3 } }> = [];
  @property({ type: Array }) features: string[] = [];
  @property({ type: String, attribute: "selected-projection" })
  selectedProjection: string = "";
  @property({ type: String, attribute: "selected-feature" })
  selectedFeature: string = "";
  @property({ type: String, attribute: "projection-plane" })
  projectionPlane: 'xy' | 'xz' | 'yz' = 'xy';
  @property({ type: Boolean, attribute: "selection-mode" })
  selectionMode: boolean = false;
  @property({ type: Number, attribute: "selected-proteins-count" })
  selectedProteinsCount: number = 0;

  // Auto-sync properties (optional, can be derived from events)
  @property({ type: String, attribute: "scatterplot-selector" })
  scatterplotSelector: string = "protspace-scatterplot";
  @property({ type: Boolean, attribute: "auto-sync" })
  autoSync: boolean = true;

  @state() private showExportMenu: boolean = false;
  @state() private showFilterMenu: boolean = false;
  @state() private featureValuesMap: Record<string, (string | null)[]> = {};
  @state() private filterConfig: Record<string, { enabled: boolean; value: string | null }> = {};
  @state() private lastAppliedFilterConfig: Record<string, { enabled: boolean; value: string | null }> = {};
  private _scatterplotElement: ScatterplotElementLike | null = null;

  // Stable listeners for proper add/remove
  private _onDocumentClick = (event: Event) => this.handleDocumentClick(event);
  private _onDataChange = (event: Event) => this._handleDataChange(event);
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

        // If projection is 3D, keep current plane; otherwise, reset to XY
        const meta = this.projectionsMeta.find(p => p.name === this.selectedProjection);
        const is3D = meta?.metadata?.dimension === 3;
        const nextPlane: 'xy' | 'xz' | 'yz' = is3D ? this.projectionPlane : 'xy';
        if ('projectionPlane' in this._scatterplotElement) {
          (this._scatterplotElement as any).projectionPlane = nextPlane;
        }
        this.projectionPlane = nextPlane;
      }
    }

    const customEvent = new CustomEvent("projection-change", {
      detail: { projection: target.value },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(customEvent);
  }

  private handlePlaneChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const plane = target.value as 'xy' | 'xz' | 'yz';
    if (this.autoSync && this._scatterplotElement && 'projectionPlane' in this._scatterplotElement) {
      (this._scatterplotElement as any).projectionPlane = plane;
      this.projectionPlane = plane;
    }
    const customEvent = new CustomEvent('projection-plane-change', {
      detail: { plane },
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
    this.showExportMenu = false;
  }

  private toggleExportMenu() {
    this.showExportMenu = !this.showExportMenu;
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

          ${(() => {
            const meta = this.projectionsMeta.find(p => p.name === this.selectedProjection);
            const is3D = meta?.metadata?.dimension === 3;
            return is3D ? html`
              <div class="control-group">
                <label for="plane-select">Plane:</label>
                <select id="plane-select" .value=${this.projectionPlane} @change=${this.handlePlaneChange}>
                  <option value="xy">XY</option>
                  <option value="xz">XZ</option>
                  <option value="yz">YZ</option>
                </select>
              </div>
            ` : null;
          })()}

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
            title="Select proteins by clicking or dragging to enclose multiple points"
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

          <!-- Filter dropdown -->
          <div class="export-container">
            <button class=${this.showFilterMenu ? "active" : ""} @click=${this.toggleFilterMenu} title="Filter Options">
              <svg class="icon" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 5h18M6 12h12M10 19h4" />
              </svg>
              Filter
              <svg class="chevron-down" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            ${this.showFilterMenu
              ? html`
                  <div class="export-menu" style="width: 22rem; max-height: 22rem; overflow: auto;">
                    <div style="padding: 0.5rem 0.75rem; font-weight: 600; color: var(--up-muted);"></div>
                    <ul>
                      ${this.features.map((feature) => {
                        const cfg = this.filterConfig[feature] || { enabled: false, value: null };
                        const values = this.featureValuesMap[feature] || [];
                        return html`
                          <li style="padding: 0.25rem 0.75rem; display:flex; align-items:center; gap:0.5rem;">
                            <input type="checkbox" .checked=${cfg.enabled} @change=${(e: Event) => {
                              const target = e.target as HTMLInputElement;
                              this.handleFilterToggle(feature, target.checked);
                            }} />
                            <div class="filter-label" style="flex: 1; min-width: 7rem;">${feature}</div>
                            <select id=${`filter-value-${feature}`} .value=${cfg.value === null ? "__NULL__" : (cfg.value ?? "")} 
                              ?disabled=${!cfg.enabled}
                              @change=${(e: Event) => {
                                const target = e.target as HTMLSelectElement;
                                this.handleFilterValueChange(feature, target.value);
                              }}
                            >
                              <option value="">-- select --</option>
                              <option value="__NULL__">N/A</option>
                              ${Array.from(new Set(values.filter(v => v !== null)))
                                .map(v => html`<option value=${String(v)}>${String(v)}</option>`)}
                            </select>
                          </li>`;
                      })}
                    </ul>
                    <div style="display:flex; gap:8px; justify-content:flex-end; padding: 0.5rem 0.75rem;">
                      <button @click=${() => { this.showFilterMenu = false; }}>Cancel</button>
                      <button @click=${this.applyFilters} class="active">Apply</button>
                    </div>
                  </div>
                `
              : ""}
          </div>

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
        "protein-click",
        this._onProteinClick
      );
    }
  }

  private handleDocumentClick(event: Event) {
    if (!this.contains(event.target as Node)) {
      this.showExportMenu = false;
      this.showFilterMenu = false;
    }
  }

  private _setupAutoSync() {
    // Find scatterplot element with retries
    const trySetup = (attempts: number = 0) => {
      this._scatterplotElement = document.querySelector(
        this.scatterplotSelector
      ) as ScatterplotElementLike | null;

      if (this._scatterplotElement) {

        // Listen for data changes
        this._scatterplotElement.addEventListener(
          "data-change",
          this._onDataChange
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

    this._updateOptionsFromData(data);
    // Update feature value options for filter UI
    try {
      const features = (data as any).features || {};
      const map: Record<string, (string | null)[]> = {};
      Object.keys(features).forEach((k) => {
        const vals = features[k]?.values as (string | null)[] | undefined;
        if (Array.isArray(vals)) map[k] = vals;
      });
      this.featureValuesMap = map;
      // Initialize filter config entries for new features (preserve existing selections)
      const nextConfig: typeof this.filterConfig = { ...this.filterConfig };
      Object.keys(map).forEach((k) => {
        if (!nextConfig[k]) nextConfig[k] = { enabled: false, value: null };
      });
      this.filterConfig = nextConfig;
    } catch (e) {
      // noop
    }
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
    this.projectionsMeta = (data.projections as any) || [];
    this.projections = this.projectionsMeta.map((p) => p.name) || [];
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

        // Extract projections and features
        this._updateOptionsFromData(data);
        
        // Build feature values map for filter UI
        try {
          const features = (data as any).features || {};
          const map: Record<string, (string | null)[]> = {};
          Object.keys(features).forEach((k) => {
            const vals = features[k]?.values as (string | null)[] | undefined;
            if (Array.isArray(vals)) map[k] = vals;
          });
          this.featureValuesMap = map;
          const nextConfig: typeof this.filterConfig = { ...this.filterConfig };
          Object.keys(map).forEach((k) => {
            if (!nextConfig[k]) nextConfig[k] = { enabled: false, value: null };
          });
          this.filterConfig = nextConfig;
        } catch (e) {
          // noop
        }

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

        

        this.requestUpdate();
      }
    }
  }

  private toggleFilterMenu() {
    const opening = !this.showFilterMenu;
    this.showFilterMenu = opening;
    if (opening) {
      // Restore last applied configuration if available
      if (this.lastAppliedFilterConfig && Object.keys(this.lastAppliedFilterConfig).length > 0) {
        const merged: typeof this.filterConfig = { ...this.filterConfig };
        for (const key of Object.keys(this.lastAppliedFilterConfig)) {
          const prev = merged[key] || { enabled: false, value: null };
          const applied = this.lastAppliedFilterConfig[key];
          merged[key] = { ...prev, ...applied };
        }
        this.filterConfig = merged;
        // Force select dropdowns to show restored values after render
        this.updateComplete.then(() => {
          for (const [feature, cfg] of Object.entries(this.filterConfig)) {
            const select = this.renderRoot?.querySelector(`#filter-value-${CSS.escape(feature)}`) as HTMLSelectElement | null;
            if (select) {
              const desired = cfg.value === null ? "__NULL__" : (cfg.value ?? "");
              if (select.value !== desired) select.value = desired;
            }
          }
        });
      }
    }
  }

  private handleFilterToggle(feature: string, enabled: boolean) {
    const current = this.filterConfig[feature] || { enabled: false, value: null };
    this.filterConfig = { ...this.filterConfig, [feature]: { ...current, enabled } };
  }

  private handleFilterValueChange(feature: string, value: string) {
    const parsed: string | null = value === "__NULL__" ? null : value;
    const current = this.filterConfig[feature] || { enabled: false, value: null };
    this.filterConfig = { ...this.filterConfig, [feature]: { ...current, value: parsed } };
  }

  private applyFilters() {
    if (!this._scatterplotElement || !("getCurrentData" in this._scatterplotElement)) {
      return;
    }
    const sp = this._scatterplotElement as any;
    const data = sp.getCurrentData?.();
    if (!data) return;

    // Collect active filters
    const activeFilters = Object.entries(this.filterConfig)
      .filter(([, cfg]) => cfg.enabled && (cfg.value !== undefined))
      .map(([feature, cfg]) => ({ feature, value: cfg.value as string | null }));

    if (activeFilters.length === 0) {
      this.showFilterMenu = false;
      return;
    }

    // Compute membership for each protein
    const numProteins: number = Array.isArray(data.protein_ids) ? data.protein_ids.length : 0;
    const indices: number[] = new Array(numProteins);

    for (let i = 0; i < numProteins; i++) {
      let isMatch = true;
      for (const { feature, value } of activeFilters) {
        const featureIdxArr: number[] | undefined = data.feature_data?.[feature];
        const valuesArr: (string | null)[] | undefined = data.features?.[feature]?.values;
        if (!featureIdxArr || !valuesArr) { isMatch = false; break; }
        const vi = featureIdxArr[i];
        const v = (vi != null && vi >= 0 && vi < valuesArr.length) ? valuesArr[vi] : null;
        if (v !== value) { isMatch = false; break; }
      }
      // 0 => Filtered Proteins, 1 => Other Proteins
      indices[i] = isMatch ? 0 : 1;
    }

    // Add or replace synthetic Custom feature
    const customName = "Custom";
    const newFeatures = { ...data.features };
    newFeatures[customName] = {
      values: ["Filtered Proteins", "Other Proteins"],
      colors: ["#00A35A", "#9AA0A6"],
      shapes: ["circle", "circle"],
    };
    const newFeatureData = { ...data.feature_data, [customName]: indices };

    const newData = { ...data, features: newFeatures, feature_data: newFeatureData };

    this.lastAppliedFilterConfig = JSON.parse(JSON.stringify(this.filterConfig));

    // Apply to scatterplot and select the Custom feature
    sp.data = newData;
    if ("selectedFeature" in sp) sp.selectedFeature = customName;
    this.features = Object.keys(newData.features || {});
    this.selectedFeature = customName;
    this.featureValuesMap = { ...this.featureValuesMap, [customName]: newFeatures[customName].values as unknown as (string | null)[] };
    this.updateComplete.then(() => {
      const featureSelect = this.renderRoot?.querySelector('#feature-select') as HTMLSelectElement | null;
      if (featureSelect && featureSelect.value !== customName) {
        featureSelect.value = customName;
      }
    });

    // Let listeners know the feature changed to Custom
    this.dispatchEvent(new CustomEvent("feature-change", {
      detail: { feature: customName },
      bubbles: true,
      composed: true,
    }));

    this.showFilterMenu = false;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "protspace-control-bar": ProtspaceControlBar;
  }
}
