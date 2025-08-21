import * as d3 from "d3";
import { DEFAULT_CONFIG, DEFAULT_STYLES, SHAPE_MAPPING, COLORS } from "./constants";
import { CustomColoring, PlotDataPoint, VisualizationData } from "./types";

export function computePlotData(
  data: VisualizationData,
  selectedProjectionIndex: number,
  projectionPlane: 'xy' | 'xz' | 'yz' = 'xy'
): PlotDataPoint[] {
  if (!data || !data.projections[selectedProjectionIndex]) return [];

  const processedData: PlotDataPoint[] = data.protein_ids.map((id, index) => {
    const point = data.projections[selectedProjectionIndex].data[index];
    let x = Array.isArray(point) ? Number(point[0]) : 0;
    let y = Array.isArray(point) ? Number(point[1]) : 0;
    const z = Array.isArray(point) && point.length === 3 ? Number(point[2]) : undefined;
    if (z !== undefined && !Number.isNaN(z)) {
      if (projectionPlane === 'xz') {
        y = z;
      } else if (projectionPlane === 'yz') {
        x = Number(point[1]);
        y = z;
      }
    }

    const featureValues: Record<string, string | null> = {};
    Object.keys(data.features).forEach((featureKey) => {
      const featureIndex = data.feature_data[featureKey][index];
      featureValues[featureKey] =
        featureIndex !== undefined &&
        featureIndex !== null &&
        Array.isArray(data.features[featureKey].values) &&
        featureIndex >= 0 &&
        featureIndex < data.features[featureKey].values.length
          ? data.features[featureKey].values[featureIndex] || null
          : null;
    });

    const base: PlotDataPoint = {
      id,
      x,
      y,
      featureValues,
      originalIndex: index,
    };
    if (z !== undefined && !Number.isNaN(z)) base.z = z;
    return base;
  });

  return processedData;
}

export function buildScales(plotData: PlotDataPoint[], width: number, height: number) {
  if (plotData.length === 0) return null;

  const xExtent = d3.extent(plotData, (d) => d.x) as [number, number];
  const yExtent = d3.extent(plotData, (d) => d.y) as [number, number];

  const xPadding = Math.abs(xExtent[1] - xExtent[0]) * 0.05;
  const yPadding = Math.abs(yExtent[1] - yExtent[0]) * 0.05;

  return {
    x: d3
      .scaleLinear()
      .domain([xExtent[0] - xPadding, xExtent[1] + xPadding])
      .range([DEFAULT_CONFIG.margin.left, width - DEFAULT_CONFIG.margin.right]),
    y: d3
      .scaleLinear()
      .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
      .range([height - DEFAULT_CONFIG.margin.bottom, DEFAULT_CONFIG.margin.top]),
  } as const;
}

export function getColorFactory(
  data: VisualizationData | null,
  selectedFeature: string,
  options?: { otherFeatureValues?: string[]; customColoring?: CustomColoring }
) {
  const otherSet = new Set(options?.otherFeatureValues ?? []);
  const custom = options?.customColoring;
  return (protein: PlotDataPoint) => {
    if (!data) return DEFAULT_STYLES.other.color;

    // Custom coloring mode: binary classes by filter membership
    if (selectedFeature === "__custom__" && custom) {
      const { enabledByFeature, allowedValuesByFeature } = custom.filter;
      let passes = true;
      for (const f of Object.keys(enabledByFeature)) {
        if (!enabledByFeature[f]) continue;
        const value = protein.featureValues[f];
        const key = value === null ? "null" : String(value);
        const allowed = allowedValuesByFeature[f] || new Set<string>();
        if (!allowed.has(key)) {
          passes = false;
          break;
        }
      }
      return passes ? custom.customColors.filtered : custom.customColors.other;
    }

    if (!data.features[selectedFeature]) return DEFAULT_STYLES.other.color;

    const featureValue = protein.featureValues[selectedFeature];
    if (featureValue === null) {
      const values = data.features[selectedFeature].values;
      const nullIndex = values && Array.isArray(values) ? values.findIndex((v) => v === null) : -1;
      return nullIndex !== -1 &&
        data.features[selectedFeature].colors &&
        nullIndex in data.features[selectedFeature].colors
        ? data.features[selectedFeature].colors[nullIndex]
        : DEFAULT_STYLES.null.color;
    }

    // If this value currently belongs to the Other bucket, force gray color
    if (otherSet.has(String(featureValue))) {
      return DEFAULT_STYLES.other.color;
    }

    const valueIndex =
      data.features[selectedFeature].values && Array.isArray(data.features[selectedFeature].values)
        ? data.features[selectedFeature].values.indexOf(featureValue)
        : -1;
    return valueIndex === -1 ||
      !data.features[selectedFeature].colors ||
      !(valueIndex in data.features[selectedFeature].colors)
      ? DEFAULT_STYLES.other.color
      : data.features[selectedFeature].colors[valueIndex];
  };
}

export function getShapeFactory(
  data: VisualizationData | null,
  selectedFeature: string,
  options?: { otherFeatureValues?: string[]; useShapes?: boolean; customColoring?: CustomColoring }
) {
  const otherSet = new Set(options?.otherFeatureValues ?? []);
  const useShapes = options?.useShapes ?? true;
  return (protein: PlotDataPoint) => {
    if (!data) return DEFAULT_STYLES.other.shape;

    // Custom coloring: keep shapes simple (circle)
    if (selectedFeature === "__custom__" && options?.customColoring) {
      return DEFAULT_STYLES.other.shape;
    }

    if (!data.features[selectedFeature]) return DEFAULT_STYLES.other.shape;

    const featureValue = protein.featureValues[selectedFeature];
    if (!useShapes) return DEFAULT_STYLES.other.shape;
    if (featureValue === null) {
      const values = data.features[selectedFeature].values;
      const nullIndex = values && Array.isArray(values) ? values.findIndex((v) => v === null) : -1;
      if (
        nullIndex !== -1 &&
        data.features[selectedFeature].shapes &&
        nullIndex in data.features[selectedFeature].shapes
      ) {
        const shapeName = data.features[selectedFeature].shapes[nullIndex] as keyof typeof SHAPE_MAPPING;
        return SHAPE_MAPPING[shapeName] || DEFAULT_STYLES.null.shape;
      }
      return DEFAULT_STYLES.null.shape;
    }

    const valueIndex =
      data.features[selectedFeature].values && Array.isArray(data.features[selectedFeature].values)
        ? data.features[selectedFeature].values.indexOf(featureValue)
        : -1;
    if (valueIndex === -1 || !data.features[selectedFeature].shapes || !(valueIndex in data.features[selectedFeature].shapes))
      return DEFAULT_STYLES.other.shape;

    if (otherSet.has(String(featureValue))) {
      return DEFAULT_STYLES.other.shape;
    }

    const shapeName = data.features[selectedFeature].shapes[valueIndex] as keyof typeof SHAPE_MAPPING;
    return SHAPE_MAPPING[shapeName] || DEFAULT_STYLES.other.shape;
  };
}

export function getOpacityFactory(
  data: VisualizationData | null,
  selectedFeature: string,
  hiddenFeatureValues: string[],
  highlightedProteinIds: string[],
  selectedProteinIds: string[],
  selectionMode: boolean,
  baseOpacity: number,
  selectedOpacity: number,
  fadedOpacity: number,
  customColoring?: CustomColoring
) {
  // Determine if effectively all values are hidden.
  const allHidden = (() => {
    const hidden = new Set(hiddenFeatureValues);
    if (hidden.size === 0) return false;
    // Custom coloring case: both classes hidden
    if (selectedFeature === "__custom__" && customColoring) {
      return hidden.has("Filtered Proteins") && hidden.has("Other Proteins");
    }
    if (!data || !data.features[selectedFeature]) return false;
    const values = data.features[selectedFeature].values || [];
    if (!Array.isArray(values) || values.length === 0) return false;
    const normalizedKeys = values.map((v) => (v === null ? "null" : typeof v === "string" && v.trim() === "" ? "" : String(v)));
    return normalizedKeys.length > 0 && normalizedKeys.every((k) => hidden.has(k));
  })();

  return (protein: PlotDataPoint) => {
    // Custom coloring: map to class string first
    if (selectedFeature === "__custom__" && customColoring) {
      const { enabledByFeature, allowedValuesByFeature } = customColoring.filter;
      let passes = true;
      for (const f of Object.keys(enabledByFeature)) {
        if (!enabledByFeature[f]) continue;
        const value = protein.featureValues[f];
        const key = value === null ? "null" : String(value);
        const allowed = allowedValuesByFeature[f] || new Set<string>();
        if (!allowed.has(key)) {
          passes = false;
          break;
        }
      }
      const className = passes ? "Filtered Proteins" : "Other Proteins";
      if (!allHidden && hiddenFeatureValues.includes(className)) {
        return 0;
      }
      if (highlightedProteinIds.includes(protein.id)) return selectedOpacity;
      if (selectedProteinIds.length > 0 && selectedProteinIds.includes(protein.id)) return selectedOpacity;
      if (selectionMode && selectedProteinIds.length > 0 && !selectedProteinIds.includes(protein.id)) return fadedOpacity;
      return baseOpacity;
    }

    const featureValue = protein.featureValues[selectedFeature];
    // When all are hidden, bypass hidden filtering to show everything again
    if (!allHidden) {
      if ((featureValue !== null && hiddenFeatureValues.includes(featureValue)) || (featureValue === null && hiddenFeatureValues.includes("null"))) {
        return 0;
      }
    }

    if (highlightedProteinIds.includes(protein.id)) return selectedOpacity;

    if (selectedProteinIds.length > 0 && selectedProteinIds.includes(protein.id)) return selectedOpacity;

    if (selectionMode && selectedProteinIds.length > 0 && !selectedProteinIds.includes(protein.id)) return fadedOpacity;

    return baseOpacity;
  };
}

export function getStrokeWidthFactory(highlightedProteinIds: string[], selectedProteinIds: string[]) {
  return (protein: PlotDataPoint) => {
    if (highlightedProteinIds.includes(protein.id)) return 3;
    if (selectedProteinIds.includes(protein.id)) return 2;
    return 1;
  };
}

export function getStrokeColorFactory(highlightedProteinIds: string[], selectedProteinIds: string[]) {
  return (protein: PlotDataPoint) => {
    if (highlightedProteinIds.includes(protein.id)) return COLORS.SELECTION_RED;
    if (selectedProteinIds.includes(protein.id)) return COLORS.SELECTION_RED;
    return COLORS.STROKE_DARK_GRAY;
  };
}

export function getSizeFactory(highlightedProteinIds: string[], selectedProteinIds: string[]) {
  return (protein: PlotDataPoint) => {
    if (highlightedProteinIds.includes(protein.id)) return DEFAULT_CONFIG.highlightedPointSize;
    if (selectedProteinIds.includes(protein.id)) return DEFAULT_CONFIG.selectedPointSize;
    return DEFAULT_CONFIG.pointSize;
  };
}


