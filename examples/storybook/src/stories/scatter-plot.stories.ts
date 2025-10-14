/**
 * Storybook stories for the Scatterplot component
 * Demonstrates various configurations and interactions
 */

import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "lit";

import "@protspace/core";
import {
  generateMediumData,
  generateLargeData,
  generateDataWithNulls,
} from "./mock-data";

const meta: Meta = {
  title: "Components/Scatterplot",
  component: "protspace-scatterplot",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "High-performance canvas-based scatterplot component for visualizing protein data with support for zooming, panning, and interactive selections. Custom events are logged to the browser console.",
      },
    },
  },
  argTypes: {
    selectedProjectionIndex: {
      control: { type: "number", min: 0, max: 2 },
      description: "Index of the projection to display",
    },
    projectionPlane: {
      control: { type: "select" },
      options: ["xy", "xz", "yz"],
      description: "Which plane to display for 3D projections",
    },
    selectedFeature: {
      control: { type: "select" },
      options: ["family", "size", "organism"],
      description: "Feature to use for coloring points",
    },
    selectionMode: {
      control: { type: "boolean" },
      description: "Enable brush selection mode",
    },
    useCanvas: {
      control: { type: "boolean" },
      description: "Use canvas rendering (recommended for >100 points)",
    },
    useShapes: {
      control: { type: "boolean" },
      description: "Use different shapes for different feature values",
    },
  },
};

export default meta;
type Story = StoryObj;

/**
 * Interactive scatterplot with all features - hover, click, zoom, and pan
 */
export const Interactive: Story = {
  args: {
    data: generateMediumData(),
    selectedProjectionIndex: 0,
    selectedFeature: "family",
    useCanvas: true,
    selectionMode: false,
  },
  render: (args) => {
    const container = document.createElement('div');
    container.style.cssText = 'display: flex; flex-direction: column; gap: 1rem;';

    const plotContainer = document.createElement('div');
    plotContainer.style.cssText = 'width: 800px; height: 600px; border: 1px solid #ccc;';

    const plot = document.createElement('protspace-scatterplot');
    plot.data = args.data;
    plot.selectedProjectionIndex = args.selectedProjectionIndex;
    plot.selectedFeature = args.selectedFeature;
    plot.useCanvas = args.useCanvas;
    plot.selectionMode = args.selectionMode;

    // Attach event listeners to capture events in Actions panel
    plot.addEventListener('protein-hover', (e) => {console.log(e)});
    plot.addEventListener('protein-click', (e) => {console.log(e)});

    plotContainer.appendChild(plot);
 
    const info = document.createElement('div');
    info.style.cssText = 'padding: 1rem; background: #f0f0f0; border-radius: 4px;';
    info.innerHTML = `
      <strong>📊 Dataset:</strong> ${args.data.protein_ids.length} proteins, ${args.data.projections.length} projections<br />
      <strong>🖱️ Interactions:</strong> Hover for tooltips, click to select, scroll to zoom, drag to pan, double-click to reset<br />
      <strong>💡 Events:</strong> Check Actions panel below for event logs
    `;

    container.appendChild(plotContainer);
    container.appendChild(info);

    return container;
  },
};

/**
 * Large dataset (1000 proteins) demonstrating performance optimization
 */
export const LargeDataset: Story = {
  args: {
    data: generateLargeData(),
    selectedProjectionIndex: 0,
    selectedFeature: "family",
    useCanvas: true,
  },
  render: (args) => html`
    <div style="width: 800px; height: 600px; border: 1px solid #ccc;">
      <protspace-scatterplot
        .data=${args.data}
        .selectedProjectionIndex=${args.selectedProjectionIndex}
        .selectedFeature=${args.selectedFeature}
        .useCanvas=${args.useCanvas}
      ></protspace-scatterplot>
    </div>
    <div
      style="margin-top: 1rem; padding: 1rem; background: #fff3cd; border-radius: 4px; border-left: 4px solid #ffc107;"
    >
      <strong>⚡ Performance mode:</strong> Automatically uses canvas rendering
      for optimal performance with ${args.data.protein_ids.length} proteins
    </div>
  `,
};

/**
 * Multiple projections - compare UMAP, t-SNE, and PCA
 */
export const MultipleProjections: Story = {
  args: {
    data: generateLargeData(),
    selectedProjectionIndex: 0,
    selectedFeature: "family",
    useCanvas: true,
  },
  render: (args) => html`
    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;">
      ${args.data.projections.map(
        (proj: any, idx: number) => html`
            <div style="width: 100%; height: 100%; border: 1px solid #ccc; position: relative;">
              <h3 style="text-align: center; position: relative; z-index: 1;">
                ${proj.name}
              </h3>
              <protspace-scatterplot
                .data=${args.data}
                .selectedProjectionIndex=${idx}
                .selectedFeature=${args.selectedFeature}
                .useCanvas=${true}
              ></protspace-scatterplot>
            </div>

        `,
      )}
    </div>
    <div
      style="margin-top: 1rem; padding: 1rem; background: #e7f3ff; border-radius: 4px;"
    >
      <strong>💡 Tip:</strong> Different projection methods reveal different
      aspects of the data structure. UMAP preserves local structure, t-SNE
      emphasizes clusters, and PCA shows global variance.
    </div>
  `,
};

/**
 * Feature comparison - different coloring schemes
 */
export const FeatureComparison: Story = {
  args: {
    data: generateMediumData(),
    selectedProjectionIndex: 0,
  },
  render: (args) => html`
    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;">
      ${Object.keys(args.data.features).map(
        (feature) => html`
          <div>
            <h3 style="margin: 0 0 0.5rem 0; text-align: center;">
              Colored by: ${feature}
            </h3>
            <div style="width: 100%; height: 400px; border: 1px solid #ccc;">
              <protspace-scatterplot
                .data=${args.data}
                .selectedProjectionIndex=${args.selectedProjectionIndex}
                .selectedFeature=${feature}
                .useCanvas=${true}
              ></protspace-scatterplot>
            </div>
          </div>
        `,
      )}
    </div>
  `,
};

/**
 * With shapes enabled - uses different symbols for feature values
 */
export const WithShapes: Story = {
  args: {
    data: generateMediumData(),
    selectedProjectionIndex: 0,
    selectedFeature: "family",
    useShapes: true,
    useCanvas: true,
  },
  render: (args) => html`
    <div style="width: 800px; height: 600px; border: 1px solid #ccc;">
      <protspace-scatterplot
        .data=${args.data}
        .selectedProjectionIndex=${args.selectedProjectionIndex}
        .selectedFeature=${args.selectedFeature}
        .useShapes=${args.useShapes}
        .useCanvas=${args.useCanvas}
      ></protspace-scatterplot>
    </div>
    <div
      style="margin-top: 1rem; padding: 1rem; background: #f0f0f0; border-radius: 4px;"
    >
      <strong>Shapes enabled:</strong> Each feature value uses a different shape
      (circle, square, triangle, diamond, star) in addition to color
    </div>
  `,
};

/**
 * Brush selection mode - drag to select multiple points
 */
export const BrushSelection: Story = {
  args: {
    data: generateMediumData(),
    selectedProjectionIndex: 0,
    selectedFeature: "family",
    selectionMode: true,
    useCanvas: true,
  },
  render: (args) => {
    const container = document.createElement('div');
    container.style.cssText = 'display: flex; flex-direction: column; gap: 1rem;';

    const plotContainer = document.createElement('div');
    plotContainer.style.cssText = 'width: 800px; height: 600px; border: 1px solid #ccc;';

    const plot = document.createElement('protspace-scatterplot');
    plot.data = args.data;
    plot.selectedProjectionIndex = args.selectedProjectionIndex;
    plot.selectedFeature = args.selectedFeature;
    plot.selectionMode = args.selectionMode;
    plot.useCanvas = args.useCanvas;

    // Attach event listener to capture events in Actions panel
    plot.addEventListener('brush-selection', (e) => {console.log(e)});

    plotContainer.appendChild(plot);

    const info = document.createElement('div');
    info.style.cssText = 'padding: 1rem; background: #d1ecf1; border-radius: 4px; border-left: 4px solid #0c5460;';
    info.innerHTML = '<strong>Selection mode:</strong> Click and drag to select multiple points. Selected protein IDs will appear in the Actions panel below.';

    container.appendChild(plotContainer);
    container.appendChild(info);

    return container;
  },
};

/**
 * With null values - demonstrates N/A handling
 */
export const WithNullValues: Story = {
  args: {
    data: generateDataWithNulls(),
    selectedProjectionIndex: 0,
    selectedFeature: "status",
    useCanvas: true,
  },
  render: (args) => html`
    <div style="width: 800px; height: 600px; border: 1px solid #ccc;">
      <protspace-scatterplot
        .data=${args.data}
        .selectedProjectionIndex=${args.selectedProjectionIndex}
        .selectedFeature=${args.selectedFeature}
        .useCanvas=${args.useCanvas}
      ></protspace-scatterplot>
    </div>
    <div
      style="margin-top: 1rem; padding: 1rem; background: #f0f0f0; border-radius: 4px;"
    >
      <strong>Null handling:</strong> Points with null/missing values are shown
      in a neutral gray color and labeled as "N/A" in tooltips
    </div>
  `,
};

/**
 * Canvas vs SVG rendering comparison
 */
export const RenderingComparison: Story = {
  args: {
    data: generateMediumData(),
    selectedProjectionIndex: 0,
    selectedFeature: "family",
  },
  render: (args) => html`
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
      <div>
        <h3 style="margin: 0 0 0.5rem 0; text-align: center;">
          Canvas Rendering
        </h3>
        <div style="width: 100%; height: 400px; border: 1px solid #ccc;">
          <protspace-scatterplot
            .data=${args.data}
            .selectedProjectionIndex=${args.selectedProjectionIndex}
            .selectedFeature=${args.selectedFeature}
            .useCanvas=${true}
          ></protspace-scatterplot>
        </div>
        <div
          style="margin-top: 0.5rem; padding: 0.5rem; background: #d4edda; border-radius: 4px; font-size: 0.875rem;"
        >
          ✓ Recommended for &gt;100 points<br />
          ✓ Better performance<br />
          ✓ Smooth zooming
        </div>
      </div>
      <div>
        <h3 style="margin: 0 0 0.5rem 0; text-align: center;">SVG Rendering</h3>
        <div style="width: 100%; height: 400px; border: 1px solid #ccc;">
          <protspace-scatterplot
            .data=${args.data}
            .selectedProjectionIndex=${args.selectedProjectionIndex}
            .selectedFeature=${args.selectedFeature}
            .useCanvas=${false}
          ></protspace-scatterplot>
        </div>
        <div
          style="margin-top: 0.5rem; padding: 0.5rem; background: #fff3cd; border-radius: 4px; font-size: 0.875rem;"
        >
          ⚠ Only for small datasets<br />
          ⚠ May lag with many points<br />
          ✓ Vector graphics quality
        </div>
      </div>
    </div>
  `,
};

/**
 * Custom configuration - point sizes and opacity
 */
export const CustomConfiguration: Story = {
  args: {
    data: generateMediumData(),
    selectedProjectionIndex: 0,
    selectedFeature: "family",
    useCanvas: true,
    config: {
      pointSize: 120,
      highlightedPointSize: 180,
      selectedPointSize: 240,
      baseOpacity: 0.6,
      selectedOpacity: 1.0,
      fadedOpacity: 0.1,
    },
  },
  render: (args) => html`
    <div style="width: 800px; height: 600px; border: 1px solid #ccc;">
      <protspace-scatterplot
        .data=${args.data}
        .selectedProjectionIndex=${args.selectedProjectionIndex}
        .selectedFeature=${args.selectedFeature}
        .useCanvas=${args.useCanvas}
        .config=${args.config}
      ></protspace-scatterplot>
    </div>
    <div
      style="margin-top: 1rem; padding: 1rem; background: #f0f0f0; border-radius: 4px;"
    >
      <strong>Custom configuration:</strong> Larger points (120px base) with
      adjusted opacity for better visibility
    </div>
  `,
};

/**
 * Empty state
 */
export const EmptyState: Story = {
  args: {
    data: null,
  },
  render: (args) => html`
    <div style="width: 800px; height: 600px; border: 1px solid #ccc;">
      <protspace-scatterplot .data=${args.data}></protspace-scatterplot>
    </div>
  `,
};
