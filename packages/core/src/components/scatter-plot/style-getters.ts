import * as d3 from "d3";
import type { PlotDataPoint, VisualizationData } from "@protspace/utils";
import { getSymbolType } from "@protspace/utils";

export interface StyleConfig {
  selectedProteinIds: string[];
  highlightedProteinIds: string[];
  selectedFeature: string;
  hiddenFeatureValues: string[];
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
  const getPointSize = (point: PlotDataPoint): number => {
    if (styleConfig.selectedProteinIds.includes(point.id)) return styleConfig.sizes.selected;
    if (styleConfig.highlightedProteinIds.includes(point.id)) return styleConfig.sizes.highlighted;
    return styleConfig.sizes.base;
  };

  const getPointShape = (point: PlotDataPoint): d3.SymbolType => {
    if (!data || !styleConfig.selectedFeature) return d3.symbolCircle;
    const featureValue = point.featureValues[styleConfig.selectedFeature];
    if (featureValue === null) return d3.symbolCircle;
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
    if (featureValue === null) return "#888888";
    const feature = data.features[styleConfig.selectedFeature];
    return feature.colors[feature.values.indexOf(featureValue)] || "#888888";
  };

  const getOpacity = (point: PlotDataPoint): number => {
    const featureValue = point.featureValues[styleConfig.selectedFeature];
    if (
      (featureValue !== null && styleConfig.hiddenFeatureValues.includes(featureValue)) ||
      (featureValue === null && styleConfig.hiddenFeatureValues.includes("null"))
    )
      return 0;
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
      return "var(--protspace-highlight-color, #3B82F6)";
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


