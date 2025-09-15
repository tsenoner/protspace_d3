import type { VisualizationData } from "@protspace/utils";
import type { ScatterplotElementLike } from "./types";

/**
 * Pure business logic for the control bar component
 * Handles data processing, state management, and scatterplot synchronization
 * No UI concerns - just data and logic
 */
export class ControlBarLogic {
  private _scatterplotElement: ScatterplotElementLike | null = null;
  private _scatterplotSelector: string;

  constructor(scatterplotSelector: string = "protspace-scatterplot") {
    this._scatterplotSelector = scatterplotSelector;
  }

  /**
   * Initialize connection to scatterplot element
   */
  async initialize(): Promise<boolean> {
    return new Promise((resolve) => {
      const trySetup = (attempts: number = 0) => {
        this._scatterplotElement = document.querySelector(
          this._scatterplotSelector
        ) as ScatterplotElementLike | null;

        if (this._scatterplotElement) {
          resolve(true);
        } else if (attempts < 10) {
          setTimeout(() => trySetup(attempts + 1), 100 + attempts * 50);
        } else {
          console.warn(
            "❌ Control bar could not find scatterplot element:",
            this._scatterplotSelector
          );
          resolve(false);
        }
      };
      trySetup();
    });
  }

  /**
   * Get current scatterplot element
   */
  getScatterplotElement(): ScatterplotElementLike | null {
    return this._scatterplotElement;
  }

  /**
   * Extract options from data
   */
  extractOptionsFromData(data: any) {
    const projectionsMeta = (data.projections as any) || [];
    const projections = projectionsMeta.map((p: any) => p.name) || [];
    const features = Object.keys(data.features || {});

    return {
      projectionsMeta,
      projections,
      features,
    };
  }

  /**
   * Get current data from scatterplot
   */
  getCurrentData(): VisualizationData | null | undefined {
    if (!this._scatterplotElement) return undefined;
    return this._scatterplotElement.getCurrentData?.();
  }

  /**
   * Sync state with scatterplot
   */
  syncWithScatterplot() {
    if (!this._scatterplotElement) return null;

    const scatterplot = this._scatterplotElement;
    const data = scatterplot.getCurrentData?.();
    
    if (!data) return null;

    const { projectionsMeta, projections, features } = this.extractOptionsFromData(data);

    // Get current state from scatterplot
    const selectedFeature = scatterplot.selectedFeature;
    const selectedProjectionIndex = scatterplot.selectedProjectionIndex;
    const selectionMode = Boolean(scatterplot.selectionMode);
    const selectedProteinIds = (scatterplot.selectedProteinIds as unknown[]) || [];
    const splitMode = scatterplot.isSplitMode?.() ?? false;
    const splitHistory = scatterplot.getSplitHistory?.() ?? [];

    // Determine selected projection
    let selectedProjection = "";
    if (
      typeof selectedProjectionIndex === "number" &&
      selectedProjectionIndex >= 0 &&
      selectedProjectionIndex < projections.length
    ) {
      selectedProjection = projections[selectedProjectionIndex];
    } else if (projections.length > 0) {
      selectedProjection = projections[0];
    }

    return {
      data,
      projectionsMeta,
      projections,
      features,
      selectedProjection,
      selectedFeature: selectedFeature && features.includes(selectedFeature) 
        ? selectedFeature 
        : features[0] || "",
      selectionMode,
      selectedProteinsCount: selectedProteinIds.length,
      splitMode,
      splitHistory,
    };
  }

  /**
   * Update scatterplot projection
   */
  updateProjection(projectionName: string, projections: string[], projectionPlane?: 'xy' | 'xz' | 'yz') {
    if (!this._scatterplotElement) return false;

    const projectionIndex = projections.findIndex(p => p === projectionName);
    if (projectionIndex === -1) return false;

    const scatterplot = this._scatterplotElement as any;
    if ("selectedProjectionIndex" in scatterplot) {
      scatterplot.selectedProjectionIndex = projectionIndex;
    }

    if (projectionPlane && "projectionPlane" in scatterplot) {
      scatterplot.projectionPlane = projectionPlane;
    }

    return true;
  }

  /**
   * Update scatterplot projection plane
   */
  updateProjectionPlane(plane: 'xy' | 'xz' | 'yz') {
    if (!this._scatterplotElement) return false;

    const scatterplot = this._scatterplotElement as any;
    if ("projectionPlane" in scatterplot) {
      scatterplot.projectionPlane = plane;
      return true;
    }

    return false;
  }

  /**
   * Update scatterplot feature
   */
  updateFeature(featureName: string) {
    if (!this._scatterplotElement) return false;

    const scatterplot = this._scatterplotElement as any;
    if ("selectedFeature" in scatterplot) {
      scatterplot.selectedFeature = featureName;
      return true;
    }

    return false;
  }

  /**
   * Toggle selection mode
   */
  toggleSelectionMode(currentMode: boolean) {
    if (!this._scatterplotElement) return false;

    const newMode = !currentMode;
    const scatterplot = this._scatterplotElement;
    
    if (scatterplot.selectionMode !== undefined) {
      scatterplot.selectionMode = newMode;
      return newMode;
    }

    return currentMode;
  }

  /**
   * Clear selections
   */
  clearSelections() {
    if (!this._scatterplotElement) return false;

    const scatterplot = this._scatterplotElement as any;
    if ("selectedProteinIds" in scatterplot) {
      scatterplot.selectedProteinIds = [];
      return true;
    }

    return false;
  }

  /**
   * Split data by selection
   */
  splitDataBySelection() {
    if (!this._scatterplotElement) return false;

    const scatterplot = this._scatterplotElement;
    scatterplot.splitDataBySelection?.();
    return true;
  }

  /**
   * Reset split
   */
  resetSplit() {
    if (!this._scatterplotElement) return false;

    const scatterplot = this._scatterplotElement;
    scatterplot.resetSplit?.();
    return true;
  }

  /**
   * Build feature values map for filtering
   */
  buildFeatureValuesMap(data: VisualizationData): Record<string, (string | null)[]> {
    try {
      const features = data.features || {};
      const map: Record<string, (string | null)[]> = {};
      
      Object.keys(features).forEach((k) => {
        const vals = features[k]?.values;
        if (Array.isArray(vals)) map[k] = vals;
      });
      
      return map;
    } catch (e) {
      return {};
    }
  }

  /**
   * Apply filters to create custom feature
   */
  applyFilters(
    data: VisualizationData,
    filterConfig: Record<string, { enabled: boolean; values: (string | null)[] }>
  ): VisualizationData | null {
    // Collect active filters
    const activeFilters = Object.entries(filterConfig)
      .filter(([, cfg]) => cfg.enabled && Array.isArray(cfg.values) && cfg.values.length > 0)
      .map(([feature, cfg]) => ({ feature, values: cfg.values as (string | null)[] }));

    if (activeFilters.length === 0) return null;

    // Compute membership for each protein
    const numProteins: number = Array.isArray(data.protein_ids) ? data.protein_ids.length : 0;
    const indices: number[] = new Array(numProteins);

    for (let i = 0; i < numProteins; i++) {
      let isMatch = true;
      for (const { feature, values } of activeFilters) {
        const featureIdxArr: number[] | undefined = data.feature_data?.[feature];
        const valuesArr: (string | null)[] | undefined = data.features?.[feature]?.values;
        if (!featureIdxArr || !valuesArr) { 
          isMatch = false; 
          break; 
        }
        const vi = featureIdxArr[i];
        const v = (vi != null && vi >= 0 && vi < valuesArr.length) ? valuesArr[vi] : null;
        if (!values.some((allowed) => allowed === v)) { 
          isMatch = false; 
          break; 
        }
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

    return { ...data, features: newFeatures, feature_data: newFeatureData };
  }

  /**
   * Update scatterplot with new data and feature
   */
  updateScatterplotData(data: VisualizationData, selectedFeature: string) {
    if (!this._scatterplotElement) return false;

    const scatterplot = this._scatterplotElement as any;
    scatterplot.data = data;
    
    if ("selectedFeature" in scatterplot) {
      scatterplot.selectedFeature = selectedFeature;
    }

    return true;
  }

  /**
   * Cleanup - remove references
   */
  destroy() {
    this._scatterplotElement = null;
  }
}
