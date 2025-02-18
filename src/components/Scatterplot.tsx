'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import Ajv from 'ajv';
import styles from './Scatterplot.module.css';

// Types
interface Feature {
  values: string[];
  colors: string[];
  shapes: string[];
}

interface Projection {
  data: [number, number][];  // Array of [x, y] coordinates
  name: string;
}

interface VisualizationData {
  protein_ids: string[];
  projections: Projection[];
  features: Record<string, Feature>;
  feature_data: Record<string, (number | null)[]>;
}

interface PlotDataPoint {
  id: string;
  x: number;
  y: number;
  features: Record<string, string | null>;
}

interface StyleForFeature {
  color: string;
  marker: string;
}

// Move constants outside component
const PLOT_CONFIG = {
  width: 800,
  height: 600,
  margin: { top: 40, right: 40, bottom: 40, left: 40 },
  viewBox: "0 0 800 600"
};

const SHAPE_MAPPING = {
  asterisk: d3.symbolAsterisk,
  circle: d3.symbolCircle,
  cross: d3.symbolCross,
  diamond: d3.symbolDiamond,
  diamond_stroke: d3.symbolDiamond2,
  plus: d3.symbolPlus,
  square: d3.symbolSquare,
  square_stroke: d3.symbolSquare2,
  star: d3.symbolStar,
  triangle: d3.symbolTriangle,
  triangle_stroke: d3.symbolTriangle2,
  wye: d3.symbolWye,
  times: d3.symbolTimes,
} as const;

export default function Scatterplot() {
  const svgRef = useRef<SVGSVGElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const projectionSelectRef = useRef<HTMLSelectElement>(null);
  const featureSelectRef = useRef<HTMLSelectElement>(null);
  const [visualizationData, setVisualizationData] = useState<VisualizationData | null>(null);

  useEffect(() => {
    // Load data when component mounts
    Promise.all([
      d3.json("/data/schema.json") as Promise<object>,
      d3.json("/data/example.json") as Promise<VisualizationData>
    ])
      .then(([schema, data]) => {
        if (!validateData(schema, data)) return;
        initializeVisualization(data);
      })
      .catch((error) => {
        displayError("Error loading JSON data: " + error);
        console.error("Error loading JSON:", error);
      });
  }, []);

  // Initialize visualization with data
  function initializeVisualization(data: VisualizationData) {
    initializeDropdowns(data);
    setVisualizationData(data);
  }

  // Set up initial dropdown options
  function initializeDropdowns(data: VisualizationData) {
    if (!projectionSelectRef.current || !featureSelectRef.current) return;

    // Clear existing options
    projectionSelectRef.current.innerHTML = '';
    featureSelectRef.current.innerHTML = '';

    // Add feature options
    Object.keys(data.features).forEach((feature) => {
      const option = document.createElement('option');
      option.value = feature;
      option.text = feature;
      featureSelectRef.current?.appendChild(option);
    });

    // Add projection options
    data.projections.forEach((projection, index) => {
      const option = document.createElement('option');
      option.value = index.toString();
      option.text = projection.name;
      projectionSelectRef.current?.appendChild(option);
    });
  }

  // Data validation
  function validateData(schema: object, data: unknown): data is VisualizationData {
    const ajv = new Ajv({ allErrors: true });
    const validate = ajv.compile(schema);

    const valid = validate(data);
    if (!valid) {
      const errorMessage = "Schema validation errors: " + ajv.errorsText(validate.errors);
      displayError(errorMessage);
      console.error("Validation errors:", validate.errors);
      return false;
    }

    clearError();
    return true;
  }

  // Get current dropdown selections
  function getCurrentSelections() {
    if (!visualizationData || !projectionSelectRef.current || !featureSelectRef.current) return null;

    const projIndex = +projectionSelectRef.current.value;
    return {
      projection: visualizationData.projections[projIndex],
      feature: featureSelectRef.current.value,
    };
  }

  // Prepare data for plotting
  function preparePlotData(projection: Projection): PlotDataPoint[] {
    if (!visualizationData) return [];
    return visualizationData.protein_ids.map((id, i) => ({
      id,
      x: projection.data[i][0],
      y: projection.data[i][1],
      features: mapFeatures(id, i)
    }));
  }

  // Map features for each data point
  function mapFeatures(proteinId: string, index: number): Record<string, string | null> {
    if (!visualizationData) return {};
    const features: Record<string, string | null> = {};

    Object.keys(visualizationData.features).forEach(featureKey => {
      const featureIndex = visualizationData.feature_data[featureKey][index];
      features[featureKey] = featureIndex !== null && featureIndex !== undefined
        ? visualizationData.features[featureKey].values[featureIndex]
        : null;
    });

    return features;
  }

  // Create scales for the plot
  function createScales(plotData: PlotDataPoint[]) {
    const xExtent = d3.extent(plotData, d => d.x);
    const yExtent = d3.extent(plotData, d => d.y);

    return {
      x: d3.scaleLinear()
        .domain(xExtent as [number, number])
        .range([PLOT_CONFIG.margin.left, PLOT_CONFIG.width - PLOT_CONFIG.margin.right]),
      y: d3.scaleLinear()
        .domain(yExtent as [number, number])
        .range([PLOT_CONFIG.height - PLOT_CONFIG.margin.bottom, PLOT_CONFIG.margin.top])
    };
  }

  // Get style for a feature value
  function getStyleForFeature(feature: string, value: string | null): StyleForFeature | null {
    if (!value || !visualizationData?.features[feature]) return null;

    const featureConfig = visualizationData.features[feature];
    const valueIndex = featureConfig.values.indexOf(value);

    if (valueIndex === -1) return null;

    return {
      color: featureConfig.colors[valueIndex],
      marker: featureConfig.shapes[valueIndex]
    };
  }

  // Update the plot
  function updatePlot() {
    if (!svgRef.current || !visualizationData) return;

    const selections = getCurrentSelections();
    if (!selections) return;

    const plotData = preparePlotData(selections.projection);
    const scales = createScales(plotData);

    // Clear existing plot
    d3.select(svgRef.current).selectAll("*").remove();

    // Create new plot
    d3.select(svgRef.current)
      .selectAll<SVGPathElement, PlotDataPoint>("path")
      .data(plotData)
      .enter()
      .append("path")
      .attr("d", d => {
        const style = getStyleForFeature(selections.feature, d.features[selections.feature]);
        const shapeName = style?.marker || "circle";
        const symbolType = SHAPE_MAPPING[shapeName as keyof typeof SHAPE_MAPPING] || d3.symbolCircle;
        return d3.symbol().type(symbolType).size(200)();
      })
      .attr("transform", d => `translate(${scales.x(d.x)}, ${scales.y(d.y)})`)
      .attr("fill", d => {
        const style = getStyleForFeature(selections.feature, d.features[selections.feature]);
        return style?.color || "#000";
      })
      .attr("stroke", "#333")
      .attr("stroke-width", 1);
  }

  // Error handling
  function displayError(message: string) {
    if (errorRef.current) {
      errorRef.current.textContent = message;
    }
  }

  function clearError() {
    if (errorRef.current) {
      errorRef.current.textContent = "";
    }
  }

  // Effect to handle visualization data changes
  useEffect(() => {
    if (visualizationData) {
      // Ensure the dropdowns have values selected
      if (projectionSelectRef.current && !projectionSelectRef.current.value) {
        projectionSelectRef.current.value = "0";
      }
      if (featureSelectRef.current && !featureSelectRef.current.value) {
        featureSelectRef.current.value = Object.keys(visualizationData.features)[0];
      }
      updatePlot();
    }
  }, [visualizationData]);

  return (
    <div className={styles.container}>
      <div className={styles.controlsContainer}>
        <select
          ref={projectionSelectRef}
          className={styles.select}
          onChange={updatePlot}
        >
          {/* Projection options will be populated programmatically */}
        </select>
        <select
          ref={featureSelectRef}
          className={styles.select}
          onChange={updatePlot}
        >
          {/* Feature options will be populated programmatically */}
        </select>
      </div>
      <div ref={errorRef} className={styles.errorMessage}></div>
      <svg
        ref={svgRef}
        width={PLOT_CONFIG.width}
        height={PLOT_CONFIG.height}
        viewBox={PLOT_CONFIG.viewBox}
        className={styles.scatterplot}
      />
    </div>
  );
}