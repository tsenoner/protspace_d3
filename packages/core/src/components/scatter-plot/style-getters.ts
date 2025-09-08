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
  // Normalize values: null and empty-string map to simple string keys
  const normalizeToKey = (value: unknown): string => {
    if (value === null) return "null";
    if (typeof value === "string" && value.trim() === "") return "";
    return String(value);
  };

  // Precompute fast lookup structures
  const selectedIdsSet = new Set(styleConfig.selectedProteinIds);
  const highlightedIdsSet = new Set(styleConfig.highlightedProteinIds);
  const hiddenKeysSet = new Set(styleConfig.hiddenFeatureValues.map((v) => normalizeToKey(v)));
  const otherValuesSet = new Set(styleConfig.otherFeatureValues);

  // Precompute value -> color and value -> shape for the selected feature
  const feature = data && styleConfig.selectedFeature
    ? data.features[styleConfig.selectedFeature]
    : undefined;
  const valueToColor = new Map<string, string>();
  const valueToShape = new Map<string, d3.SymbolType>();
  let nullishConfiguredColor: string | null = null;

  if (feature && Array.isArray(feature.values)) {
    for (let i = 0; i < feature.values.length; i++) {
      const v = feature.values[i];
      const k = normalizeToKey(v);
      const color = feature.colors?.[i];
      if (color) valueToColor.set(k, color);
      if (styleConfig.useShapes && feature.shapes && feature.shapes[i]) {
        valueToShape.set(k, getSymbolType(feature.shapes[i]));
      }
      if ((v === null || (typeof v === "string" && v.trim() === "")) && color) {
        nullishConfiguredColor = color;
      }
    }
  }
  const isNullishDisplay = (value: unknown): boolean => {
    return value === null || (typeof value === "string" && value.trim() === "");
  };

  // Detect if the user has effectively hidden all values for the selected feature
  // In that case, we ignore the hidden filter to avoid rendering an empty plot.
  const computeAllHidden = (): boolean => {
    if (!data || !styleConfig.selectedFeature) return false;
    const feature = data.features[styleConfig.selectedFeature];
    if (!feature || !Array.isArray(feature.values)) return false;
    const hidden = new Set(styleConfig.hiddenFeatureValues);
    if (hidden.size === 0) return false;
    const normalizedKeys = feature.values.map((v) =>
      v === null ? "null" : typeof v === "string" && v.trim() === "" ? "" : (v as string)
    );
    return normalizedKeys.length > 0 && normalizedKeys.every((k) => hidden.has(k));
  };

  const allHidden = computeAllHidden();

  const getPointSize = (point: PlotDataPoint): number => {
    if (selectedIdsSet.has(point.id)) return styleConfig.sizes.selected;
    if (highlightedIdsSet.has(point.id)) return styleConfig.sizes.highlighted;
    return styleConfig.sizes.base;
  };

  const getPointShape = (point: PlotDataPoint): d3.SymbolType => {
    if (styleConfig.useShapes === false) return d3.symbolCircle;
    if (!data || !styleConfig.selectedFeature) return d3.symbolCircle;
    const featureValue = point.featureValues[styleConfig.selectedFeature];
    if (featureValue !== null && otherValuesSet.has(featureValue)) return d3.symbolCircle;
    if (isNullishDisplay(featureValue)) return d3.symbolCircle;
    const k = normalizeToKey(featureValue);
    return valueToShape.get(k) ?? d3.symbolCircle;
  };

  const getColor = (point: PlotDataPoint): string => {
    if (!data || !styleConfig.selectedFeature) return "#888888";
    const featureValue = point.featureValues[styleConfig.selectedFeature];
    if (featureValue !== null && otherValuesSet.has(featureValue)) return "#888888";
    if (isNullishDisplay(featureValue)) return nullishConfiguredColor ?? "#888888";
    const k = normalizeToKey(featureValue);
    return valueToColor.get(k) ?? "#888888";
  };

  const getOpacity = (point: PlotDataPoint): number => {
    const featureValue = point.featureValues[styleConfig.selectedFeature];
    if (!allHidden) {
      const key = normalizeToKey(featureValue);
      if (hiddenKeysSet.has(key)) return 0;
    }
    if (highlightedIdsSet.has(point.id) || selectedIdsSet.has(point.id)) {
      return styleConfig.opacities.selected;
    }
    if (selectedIdsSet.size > 0 && !selectedIdsSet.has(point.id)) {
      return styleConfig.opacities.faded;
    }
    return styleConfig.opacities.base;
  };

  const getStrokeColor = (point: PlotDataPoint): string => {
    if (selectedIdsSet.has(point.id)) return "var(--protspace-selection-color, #FF5500)";
    if (highlightedIdsSet.has(point.id)) return "var(--protspace-highlight-color, #00A3E0)";
    return "var(--protspace-default-stroke, #333333)";
  };

  const getStrokeWidth = (point: PlotDataPoint): number => {
    if (selectedIdsSet.has(point.id)) return 3;
    if (highlightedIdsSet.has(point.id)) return 2;
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


