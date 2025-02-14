import Ajv from "ajv";
import * as d3 from "d3";

// ============================================================================
// Constants and Configuration
// ============================================================================

const PLOT_CONFIG = {
  width: 800,
  height: 600,
  margin: { top: 20, right: 20, bottom: 20, left: 20 }
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
};

const svg = d3.select("#scatterplot")
    .attr("width", PLOT_CONFIG.width)
    .attr("height", PLOT_CONFIG.height);


// Load both the schema and data files
Promise.all([
  d3.json("../data/schema.json"),
  d3.json("../data/example.json")
])
  .then(([schema, data]) => {
    if (!validateData(schema, data)) return;

    initializeDropdowns(data);
    setupEventListeners();
    updatePlot();

    // ============================================================================
    // Data Validation
    // ============================================================================

    function validateData(schema, data) {
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

    // ============================================================================
    // UI Setup and Event Handling
    // ============================================================================

    function initializeDropdowns(data) {
      // Populate projection dropdown
      const projSelect = d3.select("#projectionSelect");
      data.projections.forEach((proj, i) => {
        projSelect.append("option").attr("value", i).text(proj.name);
      });

      // Populate feature dropdowns
      const features = data.feature_keys;
      const featureSelect = d3.select("#featureSelect");

      features.forEach((feature) => {
        featureSelect.append("option").attr("value", feature).text(feature);
      });
    }

    function setupEventListeners() {
      d3.select("#projectionSelect").on("change", updatePlot);
      d3.select("#featureSelect").on("change", updatePlot);
    }

    // ============================================================================
    // Visualization Logic
    // ============================================================================

    function updatePlot() {
      const selections = getCurrentSelections();
      const plotData = preparePlotData(selections.projection);
      const scales = createScales(plotData);

      renderPlot(plotData, scales, selections);
    }

    function getCurrentSelections() {
      const projIndex = +d3.select("#projectionSelect").property("value");
      return {
        projection: data.projections[projIndex],
        feature: d3.select("#featureSelect").property("value"),
      };
    }

    function preparePlotData(projection) {
      return projection.protein_ids.map((id, i) => ({
        id: id,
        x: projection.coordinates[i][0],
        y: projection.coordinates[i][1],
        features: mapFeatures(id)
      }));
    }

    function mapFeatures(proteinId) {
      const features = {};
      const protArray = data.protein_data[proteinId];

      data.feature_keys.forEach((key, idx) => {
        const index = protArray[idx];
        features[key] = index !== null && index !== undefined
          ? data.feature_values[key][index]
          : null;
      });

      return features;
    }

    function createScales(plotData) {
      const xExtent = d3.extent(plotData, d => d.x);
      const yExtent = d3.extent(plotData, d => d.y);

      return {
        x: d3.scaleLinear()
          .domain(xExtent)
          .range([PLOT_CONFIG.margin.left, PLOT_CONFIG.width - PLOT_CONFIG.margin.right]),
        y: d3.scaleLinear()
          .domain(yExtent)
          .range([PLOT_CONFIG.height - PLOT_CONFIG.margin.bottom, PLOT_CONFIG.margin.top])
      };
    }

    function getStyleForFeature(feature, value) {
      if (!data.visualization_state?.styles?.[feature]?.[value]) {
        return null;
      }
      return data.visualization_state.styles[feature][value];
    }

    function renderPlot(plotData, scales, selections) {
      const svg = d3.select("#scatterplot");
      svg.selectAll("*").remove();

      svg.selectAll("path")
        .data(plotData)
        .enter()
        .append("path")
        .attr("d", d => {
          const style = getStyleForFeature(selections.feature, d.features[selections.feature]);
          const shapeName = style?.marker || "circle";
          const symbolType = SHAPE_MAPPING[shapeName] || d3.symbolCircle;
          return d3.symbol().type(symbolType).size(64)();
        })
        .attr("transform", d => `translate(${scales.x(d.x)}, ${scales.y(d.y)})`)
        .attr("fill", d => {
          const style = getStyleForFeature(selections.feature, d.features[selections.feature]);
          return style?.color || "#000";
        })
        .attr("stroke", "#333")
        .attr("stroke-width", 1);
    }

    // ============================================================================
    // Utility Functions
    // ============================================================================

    function displayError(message) {
      d3.select("#error").text(message);
    }

    function clearError() {
      d3.select("#error").text("");
    }
  })
  .catch((error) => {
    displayError("Error loading JSON data: " + error);
    console.error("Error loading JSON:", error);
  });