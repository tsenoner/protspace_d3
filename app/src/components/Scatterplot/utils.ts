import * as d3 from "d3";
import { DEFAULT_CONFIG, DEFAULT_STYLES, SHAPE_MAPPING, COLORS } from "./constants";
import { PlotDataPoint, VisualizationData } from "./types";

export function computePlotData(
  data: VisualizationData,
  selectedProjectionIndex: number,
  isolationMode: boolean,
  splitHistory?: string[][]
): PlotDataPoint[] {
  if (!data || !data.projections[selectedProjectionIndex]) return [];

  const processedData: PlotDataPoint[] = data.protein_ids.map((id, index) => {
    const point = data.projections[selectedProjectionIndex].data[index];
    const x = Array.isArray(point) ? Number(point[0]) : 0;
    const y = Array.isArray(point) ? Number(point[1]) : 0;

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

    return {
      id,
      x,
      y,
      featureValues,
      originalIndex: index,
    };
  });

  if (isolationMode && splitHistory && splitHistory.length > 0) {
    let filteredData = processedData.filter((p) => splitHistory[0].includes(p.id));
    if (splitHistory.length > 1) {
      for (let i = 1; i < splitHistory.length; i++) {
        const splitIds = splitHistory[i];
        filteredData = filteredData.filter((p) => splitIds.includes(p.id));
      }
    }
    return filteredData;
  }

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

export function getColorFactory(data: VisualizationData | null, selectedFeature: string) {
  return (protein: PlotDataPoint) => {
    if (!data || !data.features[selectedFeature]) return DEFAULT_STYLES.other.color;

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

export function getShapeFactory(data: VisualizationData | null, selectedFeature: string) {
  return (protein: PlotDataPoint) => {
    if (!data || !data.features[selectedFeature]) return DEFAULT_STYLES.other.shape;

    const featureValue = protein.featureValues[selectedFeature];
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

    const shapeName = data.features[selectedFeature].shapes[valueIndex] as keyof typeof SHAPE_MAPPING;
    return SHAPE_MAPPING[shapeName] || DEFAULT_STYLES.other.shape;
  };
}

export function getOpacityFactory(
  selectedFeature: string,
  hiddenFeatureValues: string[],
  highlightedProteinIds: string[],
  selectedProteinIds: string[],
  selectionMode: boolean,
  baseOpacity: number,
  selectedOpacity: number,
  fadedOpacity: number
) {
  return (protein: PlotDataPoint) => {
    const featureValue = protein.featureValues[selectedFeature];
    if ((featureValue !== null && hiddenFeatureValues.includes(featureValue)) || (featureValue === null && hiddenFeatureValues.includes("null"))) {
      return 0;
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


