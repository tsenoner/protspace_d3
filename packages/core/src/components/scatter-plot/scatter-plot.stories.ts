/**
 * Storybook stories for the Scatterplot component
 * Demonstrates various configurations and interactions
 */

import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "lit";
import "./scatter-plot";
import {
  MINIMAL_DATA,
  generateMediumData,
  generateLargeData,
  generateDataWithNulls,
} from "../../stories/mock-data";

const meta: Meta = {
  title: "Components/Scatterplot",
  component: "protspace-scatterplot",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "High-performance canvas-based scatterplot component for visualizing protein data with support for zooming, panning, and interactive selections.",
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
 * Basic scatterplot with minimal data
 */
export const Basic: Story = {
  args: {
    data: MINIMAL_DATA,
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
  `,
};

/**
 * Medium dataset with 100 proteins showing realistic clustering
 */
export const MediumDataset: Story = {
  args: {
    data: generateMediumData(),
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
      style="margin-top: 1rem; padding: 1rem; background: #f0f0f0; border-radius: 4px;"
    >
      <strong>Dataset info:</strong> ${args.data.protein_ids.length} proteins,
      ${args.data.projections.length} projections,
      ${Object.keys(args.data.features).length} features
    </div>
  `,
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
        (proj, idx) => html`
          <div>
            <h3 style="margin: 0 0 0.5rem 0; text-align: center;">
              ${proj.name}
            </h3>
            <div style="width: 100%; height: 400px; border: 1px solid #ccc;">
              <protspace-scatterplot
                .data=${args.data}
                .selectedProjectionIndex=${idx}
                .selectedFeature=${args.selectedFeature}
                .useCanvas=${true}
              ></protspace-scatterplot>
            </div>
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
    data: generateLargeData(),
    selectedProjectionIndex: 0,
  },
  render: (args) => html`
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
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
 * Selection mode - brush to select multiple points
 */
export const SelectionMode: Story = {
  args: {
    data: generateMediumData(),
    selectedProjectionIndex: 0,
    selectedFeature: "family",
    selectionMode: true,
    useCanvas: true,
  },
  render: (args) => html`
    <div style="width: 800px; height: 600px; border: 1px solid #ccc;">
      <protspace-scatterplot
        .data=${args.data}
        .selectedProjectionIndex=${args.selectedProjectionIndex}
        .selectedFeature=${args.selectedFeature}
        .selectionMode=${args.selectionMode}
        .useCanvas=${args.useCanvas}
        @brush-selection=${(e: CustomEvent) => {
          console.log("Selected proteins:", e.detail.proteinIds);
        }}
      ></protspace-scatterplot>
    </div>
    <div
      style="margin-top: 1rem; padding: 1rem; background: #d1ecf1; border-radius: 4px; border-left: 4px solid #0c5460;"
    >
      <strong>Selection mode enabled:</strong> Click and drag to select multiple
      points. Check the Actions panel to see selection events.
    </div>
  `,
};

/**
 * Interactive tooltips - hover to see protein information
 */
export const InteractiveTooltips: Story = {
  args: {
    data: generateMediumData(),
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
        @protein-hover=${(e: CustomEvent) => {
          if (e.detail.proteinId) {
            console.log("Hovering:", e.detail.proteinId);
          }
        }}
        @protein-click=${(e: CustomEvent) => {
          console.log("Clicked:", e.detail.proteinId);
        }}
      ></protspace-scatterplot>
    </div>
    <div
      style="margin-top: 1rem; padding: 1rem; background: #f0f0f0; border-radius: 4px;"
    >
      <strong>💡 Try this:</strong> Hover over points to see tooltips. Click
      points to select them. Check the Actions panel to see hover and click
      events.
    </div>
  `,
};

/**
 * Zoom and pan - double-click to reset
 */
export const ZoomAndPan: Story = {
  args: {
    data: generateMediumData(),
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
      style="margin-top: 1rem; padding: 1rem; background: #f0f0f0; border-radius: 4px;"
    >
      <strong>🖱️ Controls:</strong>
      <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
        <li>Scroll to zoom in/out</li>
        <li>Click and drag to pan</li>
        <li>Double-click to reset zoom</li>
      </ul>
    </div>
  `,
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
