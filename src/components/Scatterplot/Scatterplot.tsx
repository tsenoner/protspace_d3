"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import Ajv from "ajv";
import styles from "./Scatterplot.module.css";

// Types
interface Feature {
  values: string[];
  colors: string[];
  shapes: string[];
}

interface Projection {
  data: [number, number][]; // Array of [x, y] coordinates
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
  viewBox: "0 0 800 600",
};

const SHAPE_MAPPING = {
  asterisk: d3.symbolAsterisk,
  circle: d3.symbolCircle,
  cross: d3.symbolCross,
  diamond: d3.symbolDiamond,
  plus: d3.symbolPlus,
  square: d3.symbolSquare,
  star: d3.symbolStar,
  triangle: d3.symbolTriangle,
  wye: d3.symbolWye,
  times: d3.symbolTimes,
} as const;

export default function Scatterplot() {
  const svgRef = useRef<SVGSVGElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const projectionSelectRef = useRef<HTMLSelectElement>(null);
  const featureSelectRef = useRef<HTMLSelectElement>(null);
  const [visualizationData, setVisualizationData] =
    useState<VisualizationData | null>(null);

  // Add state for selected values
  const [selectedProjection, setSelectedProjection] = useState(0);
  const [selectedFeature, setSelectedFeature] = useState("");

  // Move these functions inside useEffect to avoid dependency issues
  useEffect(() => {
    function validateData(
      schema: object,
      data: unknown
    ): data is VisualizationData {
      const ajv = new Ajv({ allErrors: true });
      const validate = ajv.compile(schema);

      const valid = validate(data);
      if (!valid) {
        const errorMessage =
          "Schema validation errors: " + ajv.errorsText(validate.errors);
        displayError(errorMessage);
        console.error("Validation errors:", validate.errors);
        return false;
      }

      clearError();
      return true;
    }

    function initializeVisualization(data: VisualizationData) {
      initializeDropdowns(data);
      // Set initial feature selection
      setSelectedFeature(Object.keys(data.features)[0]);
      setVisualizationData(data);
    }

    // Load data when component mounts
    Promise.all([
      d3.json("/data/schema.json") as Promise<object>,
      d3.json("/data/example.json") as Promise<VisualizationData>,
    ])
      .then(([schema, data]) => {
        if (!validateData(schema, data)) return;
        initializeVisualization(data);
      })
      .catch((error) => {
        displayError("Error loading JSON data: " + error);
        console.error("Error loading JSON:", error);
      });
  }, []); // Empty dependency array since all dependencies are now inside

  // Set up initial dropdown options
  function initializeDropdowns(data: VisualizationData) {
    if (!projectionSelectRef.current || !featureSelectRef.current) return;

    // Clear existing options
    projectionSelectRef.current.innerHTML = "";
    featureSelectRef.current.innerHTML = "";

    // Add feature options
    Object.keys(data.features).forEach((feature) => {
      const option = document.createElement("option");
      option.value = feature;
      option.text = feature;
      featureSelectRef.current?.appendChild(option);
    });

    // Add projection options
    data.projections.forEach((projection, index) => {
      const option = document.createElement("option");
      option.value = index.toString();
      option.text = projection.name;
      projectionSelectRef.current?.appendChild(option);
    });
  }

  // Create scales for the plot
  function createScales(plotData: PlotDataPoint[]) {
    const xExtent = d3.extent(plotData, (d) => d.x);
    const yExtent = d3.extent(plotData, (d) => d.y);

    return {
      x: d3
        .scaleLinear()
        .domain(xExtent as [number, number])
        .range([
          PLOT_CONFIG.margin.left,
          PLOT_CONFIG.width - PLOT_CONFIG.margin.right,
        ]),
      y: d3
        .scaleLinear()
        .domain(yExtent as [number, number])
        .range([
          PLOT_CONFIG.height - PLOT_CONFIG.margin.bottom,
          PLOT_CONFIG.margin.top,
        ]),
    };
  }

  // Update plot when data or selections change
  useEffect(() => {
    if (!visualizationData || !svgRef.current) return;

    // We can now assert that visualizationData is not null
    const data = visualizationData; // Create a non-null reference

    // Helper functions moved inside to properly handle dependencies
    function preparePlotData(projection: Projection): PlotDataPoint[] {
      return data.protein_ids.map((id, i) => ({
        id,
        x: projection.data[i][0],
        y: projection.data[i][1],
        features: mapFeatures(id, i),
      }));
    }

    function mapFeatures(
      proteinId: string,
      index: number
    ): Record<string, string | null> {
      const features: Record<string, string | null> = {};

      Object.keys(data.features).forEach((featureKey) => {
        const featureIndex = data.feature_data[featureKey][index];
        features[featureKey] =
          featureIndex !== null && featureIndex !== undefined
            ? data.features[featureKey].values[featureIndex]
            : null;
      });

      return features;
    }

    function getStyleForFeature(
      feature: string,
      value: string | null
    ): StyleForFeature | null {
      if (!value || !data.features[feature]) return null;

      const featureConfig = data.features[feature];
      const valueIndex = featureConfig.values.indexOf(value);

      if (valueIndex === -1) return null;

      return {
        color: featureConfig.colors[valueIndex],
        marker: featureConfig.shapes[valueIndex],
      };
    }

    const plotData = preparePlotData(data.projections[selectedProjection]);
    const scales = createScales(plotData);

    // Clear existing plot
    d3.select(svgRef.current).selectAll("*").remove();

    // Create new plot
    d3.select(svgRef.current)
      .selectAll<SVGPathElement, PlotDataPoint>("path")
      .data(plotData)
      .enter()
      .append("path")
      .attr("d", (d) => {
        const style = getStyleForFeature(
          selectedFeature,
          d.features[selectedFeature]
        );
        const shapeName = style?.marker || "circle";
        const symbolType =
          SHAPE_MAPPING[shapeName as keyof typeof SHAPE_MAPPING] ||
          d3.symbolCircle;
        return d3.symbol().type(symbolType).size(200)();
      })
      .attr("transform", (d) => `translate(${scales.x(d.x)}, ${scales.y(d.y)})`)
      .attr("fill", (d) => {
        const style = getStyleForFeature(
          selectedFeature,
          d.features[selectedFeature]
        );
        return style?.color || "#000";
      })
      .attr("stroke", "#333")
      .attr("stroke-width", 1);
  }, [visualizationData, selectedProjection, selectedFeature]);

  // Handle selection changes
  const handleProjectionChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setSelectedProjection(Number(event.target.value));
  };

  const handleFeatureChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedFeature(event.target.value);
  };

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

  return (
    <div className={styles.container}>
      <div className={styles.controlsContainer}>
        <select
          ref={projectionSelectRef}
          className={styles.select}
          onChange={handleProjectionChange}
          value={selectedProjection}
        >
          {/* Projection options will be populated programmatically */}
        </select>
        <select
          ref={featureSelectRef}
          className={styles.select}
          onChange={handleFeatureChange}
          value={selectedFeature}
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
