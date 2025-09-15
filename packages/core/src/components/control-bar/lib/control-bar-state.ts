/**
 * State management for the control bar component
 * Handles all state updates, validation, and persistence
 * Pure state logic without UI or DOM concerns
 */

export interface ControlBarState {
  // Basic properties
  projections: string[];
  projectionsMeta: Array<{ name: string; metadata?: { dimension?: 2 | 3 } }>;
  features: string[];
  selectedProjection: string;
  selectedFeature: string;
  projectionPlane: 'xy' | 'xz' | 'yz';
  selectionMode: boolean;
  selectedProteinsCount: number;
  splitMode: boolean;
  splitHistory: string[][];
  selectionDisabled: boolean;

  // UI state
  showExportMenu: boolean;
  showFilterMenu: boolean;
  openValueMenus: Record<string, boolean>;

  // Filter state
  featureValuesMap: Record<string, (string | null)[]>;
  filterConfig: Record<string, { enabled: boolean; values: (string | null)[] }>;
  lastAppliedFilterConfig: Record<string, { enabled: boolean; values: (string | null)[] }>;
}

export class ControlBarStateManager {
  private _state: ControlBarState;
  private _changeCallbacks: Array<(state: ControlBarState) => void> = [];

  constructor(initialState?: Partial<ControlBarState>) {
    this._state = {
      // Default state
      projections: [],
      projectionsMeta: [],
      features: [],
      selectedProjection: "",
      selectedFeature: "",
      projectionPlane: 'xy',
      selectionMode: false,
      selectedProteinsCount: 0,
      splitMode: false,
      splitHistory: [],
      selectionDisabled: false,
      showExportMenu: false,
      showFilterMenu: false,
      openValueMenus: {},
      featureValuesMap: {},
      filterConfig: {},
      lastAppliedFilterConfig: {},
      
      // Override with provided initial state
      ...initialState,
    };
  }

  /**
   * Get current state (readonly)
   */
  getState(): Readonly<ControlBarState> {
    return { ...this._state };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback: (state: ControlBarState) => void): () => void {
    this._changeCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this._changeCallbacks.indexOf(callback);
      if (index > -1) {
        this._changeCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Update state and notify subscribers
   */
  private _updateState(updates: Partial<ControlBarState>) {
    const oldState = { ...this._state };
    this._state = { ...this._state, ...updates };
    
    // Notify subscribers if state actually changed
    if (JSON.stringify(oldState) !== JSON.stringify(this._state)) {
      this._changeCallbacks.forEach(callback => {
        try {
          callback(this._state);
        } catch (error) {
          console.error('Error in state change callback:', error);
        }
      });
    }
  }

  /**
   * Update data-related state
   */
  updateDataState(data: {
    projections: string[];
    projectionsMeta: Array<{ name: string; metadata?: { dimension?: 2 | 3 } }>;
    features: string[];
    featureValuesMap: Record<string, (string | null)[]>;
  }) {
    // Validate selections against new data
    const validatedSelectedProjection = data.projections.includes(this._state.selectedProjection)
      ? this._state.selectedProjection
      : data.projections[0] || "";

    const validatedSelectedFeature = data.features.includes(this._state.selectedFeature)
      ? this._state.selectedFeature
      : data.features[0] || "";

    // Update filter config to include new features
    const nextFilterConfig = { ...this._state.filterConfig };
    data.features.forEach(feature => {
      if (!nextFilterConfig[feature]) {
        nextFilterConfig[feature] = { enabled: false, values: [] };
      }
    });

    this._updateState({
      projections: data.projections,
      projectionsMeta: data.projectionsMeta,
      features: data.features,
      selectedProjection: validatedSelectedProjection,
      selectedFeature: validatedSelectedFeature,
      featureValuesMap: data.featureValuesMap,
      filterConfig: nextFilterConfig,
    });
  }

  /**
   * Update projection selection
   */
  updateProjection(projection: string, projectionPlane?: 'xy' | 'xz' | 'yz') {
    if (!this._state.projections.includes(projection)) {
      console.warn(`Invalid projection: ${projection}`);
      return false;
    }

    const updates: Partial<ControlBarState> = { selectedProjection: projection };
    
    if (projectionPlane !== undefined) {
      updates.projectionPlane = projectionPlane;
    }

    this._updateState(updates);
    return true;
  }

  /**
   * Update projection plane
   */
  updateProjectionPlane(plane: 'xy' | 'xz' | 'yz') {
    this._updateState({ projectionPlane: plane });
  }

  /**
   * Update feature selection
   */
  updateFeature(feature: string) {
    if (!this._state.features.includes(feature)) {
      console.warn(`Invalid feature: ${feature}`);
      return false;
    }

    this._updateState({ selectedFeature: feature });
    return true;
  }

  /**
   * Toggle selection mode
   */
  toggleSelectionMode() {
    const newMode = !this._state.selectionMode;
    this._updateState({ selectionMode: newMode });
    return newMode;
  }

  /**
   * Update selection count
   */
  updateSelectionCount(count: number) {
    this._updateState({ selectedProteinsCount: Math.max(0, count) });
  }

  /**
   * Update split state
   */
  updateSplitState(splitMode: boolean, splitHistory: string[][]) {
    this._updateState({ 
      splitMode, 
      splitHistory: [...splitHistory],
      selectedProteinsCount: 0, // Reset selection count on split changes
    });
  }

  /**
   * Update selection disabled state
   */
  updateSelectionDisabled(disabled: boolean) {
    const updates: Partial<ControlBarState> = { selectionDisabled: disabled };
    
    // If disabling selection, also turn off selection mode
    if (disabled) {
      updates.selectionMode = false;
    }

    this._updateState(updates);
  }

  /**
   * Toggle export menu
   */
  toggleExportMenu() {
    this._updateState({ 
      showExportMenu: !this._state.showExportMenu,
      // Close other menus
      showFilterMenu: false,
      openValueMenus: {},
    });
  }

  /**
   * Toggle filter menu
   */
  toggleFilterMenu() {
    const opening = !this._state.showFilterMenu;
    
    const updates: Partial<ControlBarState> = {
      showFilterMenu: opening,
      showExportMenu: false, // Close export menu
    };

    // Restore last applied filter config when opening
    if (opening && Object.keys(this._state.lastAppliedFilterConfig).length > 0) {
      const merged = { ...this._state.filterConfig };
      Object.keys(this._state.lastAppliedFilterConfig).forEach(key => {
        const prev = merged[key] || { enabled: false, values: [] };
        const applied = this._state.lastAppliedFilterConfig[key];
        merged[key] = { ...prev, ...applied };
      });
      updates.filterConfig = merged;
      updates.openValueMenus = {};
    }

    this._updateState(updates);
  }

  /**
   * Close all menus
   */
  closeAllMenus() {
    this._updateState({
      showExportMenu: false,
      showFilterMenu: false,
      openValueMenus: {},
    });
  }

  /**
   * Toggle filter for feature
   */
  toggleFilter(feature: string, enabled: boolean) {
    const current = this._state.filterConfig[feature] || { enabled: false, values: [] };
    const newFilterConfig = { 
      ...this._state.filterConfig, 
      [feature]: { ...current, enabled } 
    };

    const updates: Partial<ControlBarState> = { filterConfig: newFilterConfig };

    // Close value menu if disabling
    if (!enabled) {
      updates.openValueMenus = { ...this._state.openValueMenus, [feature]: false };
    }

    this._updateState(updates);
  }

  /**
   * Toggle value menu for feature
   */
  toggleValueMenu(feature: string) {
    this._updateState({
      openValueMenus: { 
        ...this._state.openValueMenus, 
        [feature]: !this._state.openValueMenus[feature] 
      }
    });
  }

  /**
   * Toggle filter value
   */
  toggleFilterValue(feature: string, value: string | null, checked: boolean) {
    const current = this._state.filterConfig[feature] || { enabled: false, values: [] };
    const valueSet = new Set(current.values || []);
    
    if (checked) {
      valueSet.add(value);
    } else {
      valueSet.delete(value);
    }

    this._updateState({
      filterConfig: {
        ...this._state.filterConfig,
        [feature]: { ...current, values: Array.from(valueSet) }
      }
    });
  }

  /**
   * Select all values for feature
   */
  selectAllFilterValues(feature: string) {
    const allValues = this._state.featureValuesMap[feature] || [];
    const current = this._state.filterConfig[feature] || { enabled: false, values: [] };
    
    this._updateState({
      filterConfig: {
        ...this._state.filterConfig,
        [feature]: { ...current, values: Array.from(new Set(allValues)) }
      }
    });
  }

  /**
   * Clear all values for feature
   */
  clearAllFilterValues(feature: string) {
    const current = this._state.filterConfig[feature] || { enabled: false, values: [] };
    
    this._updateState({
      filterConfig: {
        ...this._state.filterConfig,
        [feature]: { ...current, values: [] }
      }
    });
  }

  /**
   * Save current filter config as last applied
   */
  saveAppliedFilterConfig() {
    this._updateState({
      lastAppliedFilterConfig: JSON.parse(JSON.stringify(this._state.filterConfig))
    });
  }

  /**
   * Reset state to defaults
   */
  reset() {
    this._updateState({
      selectedProjection: this._state.projections[0] || "",
      selectedFeature: this._state.features[0] || "",
      projectionPlane: 'xy',
      selectionMode: false,
      selectedProteinsCount: 0,
      splitMode: false,
      splitHistory: [],
      selectionDisabled: false,
      showExportMenu: false,
      showFilterMenu: false,
      openValueMenus: {},
      filterConfig: {},
      lastAppliedFilterConfig: {},
    });
  }

  /**
   * Destroy state manager
   */
  destroy() {
    this._changeCallbacks.length = 0;
  }
}
