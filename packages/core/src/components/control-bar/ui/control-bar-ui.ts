import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { controlBarStyles } from "./control-bar.styles";
import { ControlBarLogic } from "../lib/control-bar-logic";
import { ControlBarEventManager } from "../lib/control-bar-events";
import { ControlBarStateManager, type ControlBarState } from "../lib/control-bar-state";

/**
 * Pure UI component for the control bar
 * Handles only rendering and user interactions
 * All business logic is delegated to separate classes
 */
@customElement("protspace-control-bar")
export class ProtspaceControlBar extends LitElement {
  // Public properties
  @property({ type: Array }) projections: string[] = [];
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
  @property({ type: Boolean, attribute: "split-mode" })
  splitMode: boolean = false;
  @property({ type: Array, attribute: "split-history" })
  splitHistory: string[][] = [];

  // Configuration
  @property({ type: String, attribute: "scatterplot-selector" })
  scatterplotSelector: string = "protspace-scatterplot";
  @property({ type: Boolean, attribute: "auto-sync" })
  autoSync: boolean = true;

  // Internal state for UI only
  @state() private _selectionDisabled: boolean = false;
  @state() private _showExportMenu: boolean = false;
  @state() private _showFilterMenu: boolean = false;
  @state() private _openValueMenus: Record<string, boolean> = {};
  @state() private _featureValuesMap: Record<string, (string | null)[]> = {};
  @state() private _filterConfig: Record<string, { enabled: boolean; values: (string | null)[] }> = {};

  // Business logic and event management
  private _logic: ControlBarLogic;
  private _eventManager: ControlBarEventManager;
  private _stateManager: ControlBarStateManager;
  private _stateUnsubscribe?: () => void;

  // Document click handler
  private _onDocumentClick = (event: Event) => this._handleDocumentClick(event);

  static styles = controlBarStyles;

  constructor() {
    super();
    
    // Initialize business logic
    this._logic = new ControlBarLogic(this.scatterplotSelector);
    
    // Initialize state management
    this._stateManager = new ControlBarStateManager({
      projections: this.projections,
      features: this.features,
      selectedProjection: this.selectedProjection,
      selectedFeature: this.selectedFeature,
      projectionPlane: this.projectionPlane,
      selectionMode: this.selectionMode,
      selectedProteinsCount: this.selectedProteinsCount,
      splitMode: this.splitMode,
      splitHistory: this.splitHistory,
    });

    // Initialize event management
    this._eventManager = new ControlBarEventManager(this, {
      onDataChange: (data) => this._handleDataChange(data),
      onProteinSelection: (count) => this._handleProteinSelection(count),
      onDataSplit: (splitHistory, splitMode) => this._handleDataSplit(splitHistory, splitMode),
      onDataSplitReset: (splitHistory, splitMode) => this._handleDataSplitReset(splitHistory, splitMode),
      onAutoDisableSelection: (reason, dataSize) => this._handleAutoDisableSelection(reason, dataSize),
    });
  }

  async connectedCallback() {
    super.connectedCallback();
    
    // Set up document click listener
    document.addEventListener("click", this._onDocumentClick);

    // Subscribe to state changes
    this._stateUnsubscribe = this._stateManager.subscribe((state) => {
      this._syncStateToProperties(state);
    });

    if (this.autoSync) {
      await this._setupAutoSync();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    
    // Clean up
    document.removeEventListener("click", this._onDocumentClick);
    this._stateUnsubscribe?.();
    this._eventManager.cleanup();
    this._logic.destroy();
    this._stateManager.destroy();
  }

  /**
   * Set up auto-sync with scatterplot
   */
  private async _setupAutoSync() {
    const initialized = await this._logic.initialize();
    
    if (initialized) {
      const scatterplotElement = this._logic.getScatterplotElement();
      if (scatterplotElement) {
        this._eventManager.setupScatterplotListeners(scatterplotElement);
        
        // Initial sync
        setTimeout(() => {
          this._syncWithScatterplot();
        }, 50);
      }
    }
  }

  /**
   * Sync with scatterplot data and state
   */
  private _syncWithScatterplot() {
    const syncResult = this._logic.syncWithScatterplot();
    
    if (syncResult) {
      const { 
        data, 
        projectionsMeta, 
        projections, 
        features, 
        selectedProjection, 
        selectedFeature, 
        selectionMode, 
        selectedProteinsCount, 
        splitMode, 
        splitHistory 
      } = syncResult;

      // Update state manager
      this._stateManager.updateDataState({
        projections,
        projectionsMeta,
        features,
        featureValuesMap: this._logic.buildFeatureValuesMap(data),
      });

      // Update individual state
      this._stateManager.updateProjection(selectedProjection);
      this._stateManager.updateFeature(selectedFeature);
      this._stateManager.updateSelectionCount(selectedProteinsCount);
      this._stateManager.updateSplitState(splitMode, splitHistory);
      
      if (selectionMode !== this.selectionMode) {
        this._stateManager.toggleSelectionMode();
      }
    }
  }

  /**
   * Sync state manager state to component properties
   */
  private _syncStateToProperties(state: ControlBarState) {
    // Update public properties
    this.projections = state.projections;
    this.features = state.features;
    this.selectedProjection = state.selectedProjection;
    this.selectedFeature = state.selectedFeature;
    this.projectionPlane = state.projectionPlane;
    this.selectionMode = state.selectionMode;
    this.selectedProteinsCount = state.selectedProteinsCount;
    this.splitMode = state.splitMode;
    this.splitHistory = state.splitHistory;

    // Update internal UI state
    this._selectionDisabled = state.selectionDisabled;
    this._showExportMenu = state.showExportMenu;
    this._showFilterMenu = state.showFilterMenu;
    this._openValueMenus = state.openValueMenus;
    this._featureValuesMap = state.featureValuesMap;
    this._filterConfig = state.filterConfig;

    // Trigger re-render
    this.requestUpdate();
  }

  // Event Handlers
  private _handleProjectionChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const projection = target.value;

    // Determine projection plane
    const state = this._stateManager.getState();
    const meta = state.projectionsMeta.find(p => p.name === projection);
    const is3D = meta?.metadata?.dimension === 3;
    const nextPlane: 'xy' | 'xz' | 'yz' = is3D ? this.projectionPlane : 'xy';

    // Update state
    this._stateManager.updateProjection(projection, nextPlane);

    // Update scatterplot if auto-sync
    if (this.autoSync) {
      this._logic.updateProjection(projection, this.projections, nextPlane);
    }

    // Dispatch event
    this._eventManager.dispatchProjectionChange(projection);
  }

  private _handlePlaneChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const plane = target.value as 'xy' | 'xz' | 'yz';

    // Update state
    this._stateManager.updateProjectionPlane(plane);

    // Update scatterplot if auto-sync
    if (this.autoSync) {
      this._logic.updateProjectionPlane(plane);
    }

    // Dispatch event
    this._eventManager.dispatchProjectionPlaneChange(plane);
  }

  private _handleFeatureChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const feature = target.value;

    // Update state
    this._stateManager.updateFeature(feature);

    // Update scatterplot if auto-sync
    if (this.autoSync) {
      this._logic.updateFeature(feature);
    }

    // Dispatch event
    this._eventManager.dispatchFeatureChange(feature);
  }

  private _handleToggleSelectionMode() {
    // Update state
    const newMode = this._stateManager.toggleSelectionMode();

    // Update scatterplot if auto-sync
    if (this.autoSync) {
      this._logic.toggleSelectionMode(!newMode);
    }

    // Dispatch event
    this._eventManager.dispatchSelectionModeToggle(newMode);
  }

  private _handleClearSelections() {
    // Update state
    this._stateManager.updateSelectionCount(0);

    // Update scatterplot if auto-sync
    if (this.autoSync) {
      this._logic.clearSelections();
    }

    // Dispatch event
    this._eventManager.dispatchClearSelections();
  }

  private _handleSplitData() {
    // Update scatterplot if auto-sync
    if (this.autoSync) {
      this._logic.splitDataBySelection();
    }

    // Dispatch event
    this._eventManager.dispatchSplitData();
  }

  private _handleResetSplit() {
    // Update scatterplot if auto-sync
    if (this.autoSync) {
      this._logic.resetSplit();
    }

    // Update state
    this._stateManager.updateSplitState(false, []);
    this._stateManager.updateSelectionDisabled(false);

    // Dispatch event
    this._eventManager.dispatchResetSplit();
  }

  private _handleExport(type: "json" | "ids" | "png" | "pdf") {
    // Close menu
    this._stateManager.closeAllMenus();

    // Dispatch event
    this._eventManager.dispatchExport(type);
  }

  private _handleDocumentClick(event: Event) {
    if (!this.contains(event.target as Node)) {
      this._stateManager.closeAllMenus();
    }
  }

  // Data event handlers from scatterplot
  private _handleDataChange(data: any) {
    const { projectionsMeta, projections, features } = this._logic.extractOptionsFromData(data);
    
    this._stateManager.updateDataState({
      projections,
      projectionsMeta,
      features,
      featureValuesMap: this._logic.buildFeatureValuesMap(data),
    });
  }

  private _handleProteinSelection(count: number) {
    this._stateManager.updateSelectionCount(count);
  }

  private _handleDataSplit(splitHistory: string[][], splitMode: boolean) {
    this._stateManager.updateSplitState(splitMode, splitHistory);
  }

  private _handleDataSplitReset(splitHistory: string[][], splitMode: boolean) {
    this._stateManager.updateSplitState(splitMode, splitHistory);
    this._stateManager.updateSelectionDisabled(false);
  }

  private _handleAutoDisableSelection(reason: string, dataSize: number) {
    // Update state
    this._stateManager.updateSelectionDisabled(reason === "insufficient-data" && dataSize <= 1);

    // Dispatch notification event
    const message = reason === 'insufficient-data' 
      ? `Selection mode disabled: Only ${dataSize} point${dataSize !== 1 ? 's' : ''} remaining`
      : 'Selection mode disabled';
      
    this._eventManager.dispatchSelectionDisabledNotification(reason, dataSize, message);
  }

  // Filter-related handlers
  private _handleToggleFilterMenu() {
    this._stateManager.toggleFilterMenu();
  }

  private _handleToggleExportMenu() {
    this._stateManager.toggleExportMenu();
  }

  private _handleFilterToggle(feature: string, enabled: boolean) {
    this._stateManager.toggleFilter(feature, enabled);
  }

  private _handleToggleValueMenu(feature: string) {
    this._stateManager.toggleValueMenu(feature);
  }

  private _handleValueToggle(feature: string, value: string | null, checked: boolean) {
    this._stateManager.toggleFilterValue(feature, value, checked);
  }

  private _handleSelectAllValues(feature: string) {
    this._stateManager.selectAllFilterValues(feature);
  }

  private _handleClearAllValues(feature: string) {
    this._stateManager.clearAllFilterValues(feature);
  }

  private _handleApplyFilters() {
    const data = this._logic.getCurrentData();
    if (!data) return;

    const state = this._stateManager.getState();
    const filteredData = this._logic.applyFilters(data, state.filterConfig);
    
    if (filteredData) {
      const customFeature = "Custom";
      
      // Update scatterplot
      this._logic.updateScatterplotData(filteredData, customFeature);
      
      // Update state
      this._stateManager.updateFeature(customFeature);
      this._stateManager.saveAppliedFilterConfig();
      
      // Update local feature list
      this.features = Object.keys(filteredData.features || {});
      
      // Dispatch event
      this._eventManager.dispatchFeatureChange(customFeature);
      
      // Update UI
      this.updateComplete.then(() => {
        const featureSelect = this.renderRoot?.querySelector('#feature-select') as HTMLSelectElement | null;
        if (featureSelect && featureSelect.value !== customFeature) {
          featureSelect.value = customFeature;
        }
      });
    }

    this._stateManager.closeAllMenus();
  }

  render() {
    const state = this._stateManager.getState();
    
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
              @change=${this._handleProjectionChange}
            >
              ${this.projections.map(
                (projection) =>
                  html`<option value=${projection}>${projection}</option>`
              )}
            </select>
          </div>

          ${(() => {
            const meta = state.projectionsMeta.find(p => p.name === this.selectedProjection);
            const is3D = meta?.metadata?.dimension === 3;
            return is3D ? html`
              <div class="control-group">
                <label for="plane-select">Plane:</label>
                <select id="plane-select" .value=${this.projectionPlane} @change=${this._handlePlaneChange}>
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
              @change=${this._handleFeatureChange}
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
            ?disabled=${this._selectionDisabled}
            @click=${this._handleToggleSelectionMode}
            title=${this._selectionDisabled ? "Selection disabled: Insufficient data points" : "Select proteins by clicking or dragging to enclose multiple points"}
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
            @click=${this._handleClearSelections}
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

          <!-- Split data button -->
          <button
            ?disabled=${this.selectedProteinsCount === 0}
            @click=${this._handleSplitData}
            title="Split data to show only selected proteins"
          >
            <svg class="icon" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            Split
          </button>

          <!-- Reset split button -->
          ${this.splitMode
            ? html`
                <button
                  @click=${this._handleResetSplit}
                  title="Reset to original dataset"
                  class="active"
                >
                  <svg class="icon" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0V9a8.002 8.002 0 0115.356 2m-15.356-2L4 4m15.356 6l2.5-2.5"
                    />
                  </svg>
                  Reset
                </button>
              `
            : ""}

          <!-- Filter dropdown -->
          <div class="export-container">
            <button class=${this._showFilterMenu ? "active" : ""} @click=${this._handleToggleFilterMenu} title="Filter Options">
              <svg class="icon" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 5h18M6 12h12M10 19h4" />
              </svg>
              Filter
              <svg class="chevron-down" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            ${this._showFilterMenu ? this._renderFilterMenu(state) : ""}
          </div>

          <!-- Export dropdown -->
          <div class="export-container">
            <button @click=${this._handleToggleExportMenu} title="Export Options">
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

            ${this._showExportMenu ? this._renderExportMenu() : ""}
          </div>
        </div>
      </div>
    `;
  }

  private _renderFilterMenu(_state: ControlBarState) {
    return html`
      <div class="export-menu" style="width: 22rem; max-height: 22rem; overflow: auto;">
        <div style="padding: 0.5rem 0.75rem; font-weight: 600; color: var(--up-muted);"></div>
        <ul>
          ${this.features.map((feature) => {
            const cfg = this._filterConfig[feature] || { enabled: false, values: [] };
            const values = this._featureValuesMap[feature] || [];
            return html`
              <li style="padding: 0.25rem 0.75rem; display:flex; align-items:center; gap:0.5rem; position: relative;">
                <input type="checkbox" .checked=${cfg.enabled} @change=${(e: Event) => {
                  const target = e.target as HTMLInputElement;
                  this._handleFilterToggle(feature, target.checked);
                }} />
                <div class="filter-label" style="flex: 1; min-width: 7rem;">${feature}</div>
                <button ?disabled=${!cfg.enabled} @click=${() => this._handleToggleValueMenu(feature)} style="padding: 0.25rem 0.5rem; border: 1px solid var(--up-border); border-radius: 0.25rem;">
                  ${cfg.values && cfg.values.length > 0 ? `${cfg.values.length} selected` : 'Select values'}
                  <svg class="chevron-down" viewBox="0 0 24 24" style="vertical-align: middle;">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                ${this._openValueMenus[feature] && cfg.enabled ? this._renderValueMenu(feature, values, cfg) : ''}
              </li>`;
          })}
        </ul>
        <div style="display:flex; gap:8px; justify-content:flex-end; padding: 0.5rem 0.75rem;">
          <button @click=${() => this._stateManager.closeAllMenus()}>Cancel</button>
          <button @click=${this._handleApplyFilters} class="active">Apply</button>
        </div>
      </div>
    `;
  }

  private _renderValueMenu(feature: string, values: (string | null)[], cfg: { enabled: boolean; values: (string | null)[] }) {
    return html`
      <div class="export-menu" style="position:absolute; right:0; top: 2rem; width: 16rem; max-height: 14rem; overflow:auto;">
        <div style="display:flex; justify-content: space-between; gap: 0.5rem; padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--up-border);">
          <button @click=${() => this._handleSelectAllValues(feature)} style="padding: 0.25rem 0.5rem; border: 1px solid var(--up-border); border-radius: 0.25rem;">Select all</button>
          <button @click=${() => this._handleClearAllValues(feature)} style="padding: 0.25rem 0.5rem; border: 1px solid var(--up-border); border-radius: 0.25rem;">None</button>
        </div>
        <div style="padding: 0.25rem 0.25rem;">
          <label style="display:flex; align-items:center; gap: 0.5rem; padding: 0.25rem 0.5rem;">
            <input type="checkbox" .checked=${(cfg.values || []).includes(null)} @change=${(e: Event) => this._handleValueToggle(feature, null, (e.target as HTMLInputElement).checked)} />
            <span>N/A</span>
          </label>
          ${Array.from(new Set(values.filter(v => v !== null)))
            .map(v => html`
              <label style="display:flex; align-items:center; gap: 0.5rem; padding: 0.25rem 0.5rem;">
                <input type="checkbox" .checked=${(cfg.values || []).includes(String(v))} @change=${(e: Event) => this._handleValueToggle(feature, String(v), (e.target as HTMLInputElement).checked)} />
                <span>${String(v)}</span>
              </label>
            `)}
        </div>
        <div style="padding: 0.5rem 0.75rem; border-top: 1px solid var(--up-border); text-align: right;">
          <button @click=${() => this._handleToggleValueMenu(feature)} style="padding: 0.25rem 0.5rem; border: 1px solid var(--up-border); border-radius: 0.25rem;">Done</button>
        </div>
      </div>
    `;
  }

  private _renderExportMenu() {
    return html`
      <div class="export-menu">
        <ul>
          <li>
            <button @click=${() => this._handleExport("json")}>
              Export JSON
            </button>
          </li>
          <li>
            <button @click=${() => this._handleExport("ids")}>
              Export Protein IDs
            </button>
          </li>
          <li>
            <button @click=${() => this._handleExport("png")}>
              Export PNG
            </button>
          </li>
          <li>
            <button @click=${() => this._handleExport("pdf")}>
              Export PDF
            </button>
          </li>
        </ul>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "protspace-control-bar": ProtspaceControlBar;
  }
}
