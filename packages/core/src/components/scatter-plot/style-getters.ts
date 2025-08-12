import * as d3 from "d3";
import type { PlotDataPoint, VisualizationData } from "@protspace/utils";
import { getSymbolType } from "@protspace/utils";

export interface StyleConfig {
  selectedProteinIds: string[];
  highlightedProteinIds: string[];
  selectedFeature: string;
  hiddenFeatureValues: string[];
  otherFeatureValues: string[];
  useShapes?: boolean;
  sizes: {
    base: number;
    highlighted: number;
    selected: number;
  };
  opacities: {
    base: number;
    selected: number;
    faded: number;
  };
}

export function createStyleGetters(data: VisualizationData | null, styleConfig: StyleConfig) {
  const isNullishDisplay = (value: unknown): boolean => {
    return value === null || (typeof value === "string" && value.trim() === "");
  };

  const getPointSize = (point: PlotDataPoint): number => {
    if (styleConfig.selectedProteinIds.includes(point.id)) return styleConfig.sizes.selected;
    if (styleConfig.highlightedProteinIds.includes(point.id)) return styleConfig.sizes.highlighted;
    return styleConfig.sizes.base;
  };

  const getPointShape = (point: PlotDataPoint): d3.SymbolType => {
    if (styleConfig.useShapes === false) return d3.symbolCircle;
    if (!data || !styleConfig.selectedFeature) return d3.symbolCircle;
    const featureValue = point.featureValues[styleConfig.selectedFeature];
    // Treat all values that fall into the synthetic "Other" bucket as identical
    if (
      featureValue !== null &&
      styleConfig.otherFeatureValues.includes(featureValue)
    ) {
      return d3.symbolCircle;
    }
    if (isNullishDisplay(featureValue)) return d3.symbolCircle;
    const feature = data.features[styleConfig.selectedFeature];
    if (!feature || !feature.shapes) return d3.symbolCircle;
    const valueIndex = feature.values.indexOf(featureValue);
    if (valueIndex === -1) return d3.symbolCircle;
    const shapeName = feature.shapes[valueIndex];
    return getSymbolType(shapeName);
  };

  const getColor = (point: PlotDataPoint): string => {
    if (!data || !styleConfig.selectedFeature) return "#888888";
    const featureValue = point.featureValues[styleConfig.selectedFeature];
    const feature = data.features[styleConfig.selectedFeature];
    if (!feature) return "#888888";
    // All values categorized as "Other" share the same neutral color
    if (featureValue !== null && styleConfig.otherFeatureValues.includes(featureValue)) return "#888888";
    // For null/empty-string display category, try to use configured color if present
    if (isNullishDisplay(featureValue)) {
      const idxNullish = feature.values.findIndex(
        (v) => v === null || (typeof v === "string" && v.trim() === "")
      );
      if (idxNullish !== -1 && feature.colors[idxNullish]) {
        return feature.colors[idxNullish];
      }
      return "#888888";
    }
    const idx = feature.values.indexOf(featureValue);
    return feature.colors[idx] || "#888888";
  };

  const getOpacity = (point: PlotDataPoint): number => {
    const featureValue = point.featureValues[styleConfig.selectedFeature];
    if (isNullishDisplay(featureValue)) {
      if (
        styleConfig.hiddenFeatureValues.includes("null") ||
        styleConfig.hiddenFeatureValues.includes("")
      ) {
        return 0;
      }
    } else if (
      featureValue !== null &&
      styleConfig.hiddenFeatureValues.includes(featureValue)
    ) {
      return 0;
    }
    if (
      styleConfig.highlightedProteinIds.includes(point.id) ||
      styleConfig.selectedProteinIds.includes(point.id)
    ) {
      return styleConfig.opacities.selected;
    }
    if (
      styleConfig.selectedProteinIds.length > 0 &&
      !styleConfig.selectedProteinIds.includes(point.id)
    ) {
      return styleConfig.opacities.faded;
    }
    return styleConfig.opacities.base;
  };

  const getStrokeColor = (point: PlotDataPoint): string => {
    if (styleConfig.selectedProteinIds.includes(point.id))
      return "var(--protspace-selection-color, #FF5500)";
    if (styleConfig.highlightedProteinIds.includes(point.id))
      return "var(--protspace-highlight-color, #00A3E0)";
    return "var(--protspace-default-stroke, #333333)";
  };

  const getStrokeWidth = (point: PlotDataPoint): number => {
    if (styleConfig.selectedProteinIds.includes(point.id)) return 3;
    if (styleConfig.highlightedProteinIds.includes(point.id)) return 2;
    return 1;
  };

  return {
    getPointSize,
    getPointShape,
    getColor,
    getOpacity,
    getStrokeColor,
    getStrokeWidth,
  };
}


