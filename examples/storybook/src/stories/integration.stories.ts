/**
 * Integration stories demonstrating scatterplot and legend interactions
 * Shows how components work together with auto-sync and manual coordination
 */

import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "lit";
import "@protspace/core";
import {
  generateMediumData,
  generateLargeData,
  generateManyFeaturesData,
  generateDataWithNulls,
  generateOverlappingData,
} from "./mock-data";

const meta: Meta = {
  title: "Integration/Scatterplot + Legend",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Integration stories showing how the scatterplot and legend components work together with synchronized interactions.",
      },
    },
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj;

/**
 * Basic integration with auto-sync enabled
 */
export const BasicIntegration: Story = {
  render: () => {
    const data = generateMediumData();
    const featureValues = data.protein_ids.map(
      (_, i) => data.features.family.values[data.feature_data.family[i]],
    );

    return html`
      <div style="padding: 2rem; background: #f5f5f5; min-height: 100vh;">
        <div
          style="display: grid; grid-template-columns: 1fr 320px; gap: 1rem; align-items: start;"
        >
          <div
            style="border: 1px solid #ccc; border-radius: 8px; overflow: hidden; background: white;"
          >
            <protspace-scatterplot
              id="basic-plot"
              .data=${data}
              .selectedProjectionIndex=${0}
              .selectedFeature=${"family"}
              .useCanvas=${true}
              style="display: block; height: 600px;"
            ></protspace-scatterplot>
          </div>
          <div
            style="border: 1px solid #ccc; border-radius: 8px; overflow: hidden; background: white;"
          >
            <protspace-legend
              .data=${{ features: data.features }}
              .selectedFeature=${"family"}
              .featureValues=${featureValues}
              .proteinIds=${data.protein_ids}
              .autoSync=${true}
              .autoHide=${true}
              scatterplot-selector="#basic-plot"
            ></protspace-legend>
          </div>
        </div>
        <div
          style="margin-top: 1rem; padding: 1rem; background: #d1ecf1; border-radius: 4px; border-left: 4px solid #0c5460;"
        >
          <strong>💡 Auto-sync enabled:</strong> The legend automatically syncs
          with the scatterplot. Try clicking legend items to hide/show points!
        </div>
      </div>
    `;
  },
};

/**
 * Click legend items to hide/show points
 */
export const ClickToHide: Story = {
  render: () => {
    const data = generateMediumData();
    const featureValues = data.protein_ids.map(
      (_, i) => data.features.family.values[data.feature_data.family[i]],
    );

    return html`
      <div style="padding: 2rem; background: #f5f5f5; min-height: 100vh;">
        <div
          style="display: grid; grid-template-columns: 1fr 320px; gap: 1rem; align-items: start;"
        >
          <div
            style="border: 1px solid #ccc; border-radius: 8px; overflow: hidden; background: white;"
          >
            <protspace-scatterplot
              id="hide-show-plot"
              .data=${data}
              .selectedProjectionIndex=${0}
              .selectedFeature=${"family"}
              .useCanvas=${true}
              style="display: block; height: 600px;"
            ></protspace-scatterplot>
          </div>
          <div
            style="border: 1px solid #ccc; border-radius: 8px; overflow: hidden; background: white;"
          >
            <protspace-legend
              .data=${{ features: data.features }}
              .selectedFeature=${"family"}
              .featureValues=${featureValues}
              .proteinIds=${data.protein_ids}
              .autoSync=${true}
              .autoHide=${true}
              scatterplot-selector="#hide-show-plot"
            ></protspace-legend>
          </div>
        </div>
        <div
          style="margin-top: 1rem; padding: 1rem; background: #d1ecf1; border-radius: 4px; border-left: 4px solid #0c5460;"
        >
          <strong>🎨 Try this:</strong>
          <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
            <li>
              <strong>Single click:</strong> Toggle visibility of a category
            </li>
            <li>
              <strong>Double click:</strong> Isolate a single category (or show
              all if already isolated)
            </li>
            <li>
              <strong>Watch:</strong> Points fade in/out in the scatterplot
            </li>
          </ul>
        </div>
      </div>
    `;
  },
};

/**
 * Drag to reorder legend items and change z-order
 */
export const DragToReorder: Story = {
  render: () => {
    const data = generateOverlappingData();
    const featureValues = data.protein_ids.map(
      (_, i) => data.features.family.values[data.feature_data.family[i]],
    );

    return html`
      <div style="padding: 2rem; background: #f5f5f5; min-height: 100vh;">
        <div
          style="display: grid; grid-template-columns: 1fr 320px; gap: 1rem; align-items: start;"
        >
          <div
            style="border: 1px solid #ccc; border-radius: 8px; overflow: hidden; background: white;"
          >
            <protspace-scatterplot
              id="zorder-plot"
              .data=${data}
              .selectedProjectionIndex=${0}
              .selectedFeature=${"family"}
              .useCanvas=${true}
              .config=${{ pointSize: 150 }}
              style="display: block; height: 600px;"
            ></protspace-scatterplot>
          </div>
          <div
            style="border: 1px solid #ccc; border-radius: 8px; overflow: hidden; background: white;"
          >
            <protspace-legend
              .data=${{ features: data.features }}
              .selectedFeature=${"family"}
              .featureValues=${featureValues}
              .proteinIds=${data.protein_ids}
              .autoSync=${true}
              .autoHide=${true}
              scatterplot-selector="#zorder-plot"
            ></protspace-legend>
          </div>
        </div>
        <div
          style="margin-top: 1rem; padding: 1rem; background: #fff3cd; border-radius: 4px; border-left: 4px solid #ffc107;"
        >
          <strong>🎨 Z-order demonstration:</strong>
          <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
            <li>
              <strong>Perfect overlap:</strong> The same 50 points are plotted
              THREE times (Kinase, Protease, Receptor)
            </li>
            <li>
              <strong>All points stack exactly on top of each other</strong> -
              only the top layer is visible
            </li>
            <li>
              <strong>Drag legend items</strong> to change z-order - watch the
              entire plot change color!
            </li>
            <li>
              <strong>Rule:</strong> Top of legend = bottom layer (drawn first),
              Bottom of legend = top layer (drawn last, visible)
            </li>
          </ul>
        </div>
      </div>
    `;
  },
};

/**
 * Handle "Other" category with many features
 */
export const OtherCategoryIntegration: Story = {
  render: () => {
    const data = generateManyFeaturesData();
    const featureValues = data.protein_ids.map(
      (_, i) => data.features.family.values[data.feature_data.family[i]],
    );

    return html`
      <div style="padding: 2rem; background: #f5f5f5; min-height: 100vh;">
        <div
          style="display: grid; grid-template-columns: 1fr 320px; gap: 1rem; align-items: start;"
        >
          <div
            style="border: 1px solid #ccc; border-radius: 8px; overflow: hidden; background: white;"
          >
            <protspace-scatterplot
              id="other-plot"
              .data=${data}
              .selectedProjectionIndex=${0}
              .selectedFeature=${"family"}
              .useCanvas=${true}
              style="display: block; height: 600px;"
            ></protspace-scatterplot>
          </div>
          <div
            style="border: 1px solid #ccc; border-radius: 8px; overflow: hidden; background: white;"
          >
            <protspace-legend
              .data=${{ features: data.features }}
              .selectedFeature=${"family"}
              .featureValues=${featureValues}
              .proteinIds=${data.protein_ids}
              .maxVisibleValues=${8}
              .includeOthers=${true}
              .autoSync=${true}
              .autoHide=${true}
              scatterplot-selector="#other-plot"
            ></protspace-legend>
          </div>
        </div>
        <div
          style="margin-top: 1rem; padding: 1rem; background: #d1ecf1; border-radius: 4px; border-left: 4px solid #0c5460;"
        >
          <strong>📦 "Other" category:</strong>
          <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
            <li>Less common families are grouped into "Other"</li>
            <li>Click "(view)" to see all grouped items</li>
            <li>Extract items to show them individually</li>
            <li>Scatterplot colors match the grouped categories</li>
          </ul>
        </div>
      </div>
    `;
  },
};

/**
 * With shapes enabled for better differentiation
 */
export const WithShapes: Story = {
  render: () => {
    const data = generateMediumData();
    const featureValues = data.protein_ids.map(
      (_, i) => data.features.family.values[data.feature_data.family[i]],
    );

    return html`
      <div style="padding: 2rem; background: #f5f5f5; min-height: 100vh;">
        <div
          style="display: grid; grid-template-columns: 1fr 320px; gap: 1rem; align-items: start;"
        >
          <div
            style="border: 1px solid #ccc; border-radius: 8px; overflow: hidden; background: white;"
          >
            <protspace-scatterplot
              id="shapes-plot"
              .data=${data}
              .selectedProjectionIndex=${0}
              .selectedFeature=${"family"}
              .useShapes=${true}
              .useCanvas=${true}
              style="display: block; height: 600px;"
            ></protspace-scatterplot>
          </div>
          <div
            style="border: 1px solid #ccc; border-radius: 8px; overflow: hidden; background: white;"
          >
            <protspace-legend
              .data=${{ features: data.features }}
              .selectedFeature=${"family"}
              .featureValues=${featureValues}
              .proteinIds=${data.protein_ids}
              .includeShapes=${true}
              .autoSync=${true}
              .autoHide=${true}
              scatterplot-selector="#shapes-plot"
            ></protspace-legend>
          </div>
        </div>
        <div
          style="margin-top: 1rem; padding: 1rem; background: #f0f0f0; border-radius: 4px;"
        >
          <strong>🔷 Shapes enabled:</strong> Both the scatterplot and legend
          use different shapes (circle, square, triangle, diamond, star) in
          addition to colors for better accessibility and differentiation.
        </div>
      </div>
    `;
  },
};

/**
 * Multiple features with synchronized switching
 */
export const FeatureSwitching: Story = {
  render: () => {
    const data = generateMediumData();

    // Create a simple feature selector
    const handleFeatureChange = (e: Event) => {
      const select = e.target as HTMLSelectElement;
      const newFeature = select.value;

      // Update scatterplot
      const plot = document.getElementById("feature-switch-plot") as any;
      if (plot) {
        plot.selectedFeature = newFeature;
      }

      // Update legend manually (since auto-sync listens to events, we need to trigger update)
      const legend = document.getElementById("feature-switch-legend") as any;
      if (legend) {
        legend.selectedFeature = newFeature;

        // Update feature values for the new feature
        const featureValues = data.protein_ids.map(
          (_, i) =>
            data.features[newFeature].values[data.feature_data[newFeature][i]],
        );
        legend.featureValues = featureValues;
      }
    };

    return html`
      <div style="padding: 2rem; background: #f5f5f5; min-height: 100vh;">

        <div
          style="margin-bottom: 1rem; padding: 1rem; background: white; border: 1px solid #ccc; border-radius: 8px;"
        >
          <label style="display: flex; align-items: center; gap: 0.5rem;">
            <strong>Selected Feature:</strong>
            <select
              @change=${handleFeatureChange}
              style="padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;"
            >
              <option value="family">Family</option>
              <option value="size">Size</option>
              <option value="organism">Organism</option>
            </select>
          </label>
        </div>

        <div
          style="display: grid; grid-template-columns: 1fr 320px; gap: 1rem; align-items: start;"
        >
          <div
            style="border: 1px solid #ccc; border-radius: 8px; overflow: hidden; background: white;"
          >
            <protspace-scatterplot
              id="feature-switch-plot"
              .data=${data}
              .selectedProjectionIndex=${0}
              .selectedFeature=${"family"}
              .useCanvas=${true}
              style="display: block; height: 600px;"
            ></protspace-scatterplot>
          </div>
          <div
            style="border: 1px solid #ccc; border-radius: 8px; overflow: hidden; background: white;"
          >
            <protspace-legend
              id="feature-switch-legend"
              .data=${{ features: data.features }}
              .selectedFeature=${"family"}
              .featureValues=${data.protein_ids.map(
                (_, i) =>
                  data.features.family.values[data.feature_data.family[i]],
              )}
              .proteinIds=${data.protein_ids}
              .autoSync=${false}
              .autoHide=${true}
              scatterplot-selector="#feature-switch-plot"
            ></protspace-legend>
          </div>
        </div>
        <div
          style="margin-top: 1rem; padding: 1rem; background: #d1ecf1; border-radius: 4px; border-left: 4px solid #0c5460;"
        >
          <strong>🔄 Feature synchronization:</strong> Change the selected
          feature above and watch both the scatterplot colors and legend update
          automatically.
        </div>
      </div>
    `;
  },
};

/**
 * Null values with synchronized handling
 */
export const WithNullValues: Story = {
  render: () => {
    const data = generateDataWithNulls();
    const featureValues = data.protein_ids.map((_, i) => {
      const idx = data.feature_data.status[i];
      return data.features.status.values[idx];
    });

    return html`
      <div style="padding: 2rem; background: #f5f5f5; min-height: 100vh;">
        <div
          style="display: grid; grid-template-columns: 1fr 320px; gap: 1rem; align-items: start;"
        >
          <div
            style="border: 1px solid #ccc; border-radius: 8px; overflow: hidden; background: white;"
          >
            <protspace-scatterplot
              id="null-plot"
              .data=${data}
              .selectedProjectionIndex=${0}
              .selectedFeature=${"status"}
              .useCanvas=${true}
              style="display: block; height: 600px;"
            ></protspace-scatterplot>
          </div>
          <div
            style="border: 1px solid #ccc; border-radius: 8px; overflow: hidden; background: white;"
          >
            <protspace-legend
              .data=${{ features: data.features }}
              .selectedFeature=${"status"}
              .featureValues=${featureValues}
              .proteinIds=${data.protein_ids}
              .autoSync=${true}
              .autoHide=${true}
              scatterplot-selector="#null-plot"
            ></protspace-legend>
          </div>
        </div>
        <div
          style="margin-top: 1rem; padding: 1rem; background: #f0f0f0; border-radius: 4px;"
        >
          <strong>Null handling:</strong> Both components display null/missing
          values as "N/A" with a neutral gray color. You can hide/show N/A
          values just like any other category.
        </div>
      </div>
    `;
  },
};

/**
 * Large dataset with performance optimization
 */
export const LargeDatasetIntegration: Story = {
  render: () => {
    const data = generateLargeData();
    const featureValues = data.protein_ids.map(
      (_, i) => data.features.family.values[data.feature_data.family[i]],
    );

    return html`
      <div style="padding: 2rem; background: #f5f5f5; min-height: 100vh;">
        <div
          style="display: grid; grid-template-columns: 1fr 320px; gap: 1rem; align-items: start;"
        >
          <div
            style="border: 1px solid #ccc; border-radius: 8px; overflow: hidden; background: white;"
          >
            <protspace-scatterplot
              id="large-plot"
              .data=${data}
              .selectedProjectionIndex=${0}
              .selectedFeature=${"family"}
              .useCanvas=${true}
              style="display: block; height: 600px;"
            ></protspace-scatterplot>
          </div>
          <div
            style="border: 1px solid #ccc; border-radius: 8px; overflow: hidden; background: white;"
          >
            <protspace-legend
              .data=${{ features: data.features }}
              .selectedFeature=${"family"}
              .featureValues=${featureValues}
              .proteinIds=${data.protein_ids}
              .autoSync=${true}
              .autoHide=${true}
              scatterplot-selector="#large-plot"
            ></protspace-legend>
          </div>
        </div>
        <div
          style="margin-top: 1rem; padding: 1rem; background: #fff3cd; border-radius: 4px; border-left: 4px solid #ffc107;"
        >
          <strong>⚡ Performance:</strong> With 100k proteins, the scatterplot
          automatically uses canvas rendering for optimal performance. Try
          zooming, panning, and hiding categories - everything stays smooth!
        </div>
      </div>
    `;
  },
};

/**
 * Complete workflow with all features
 */
export const CompleteWorkflow: Story = {
  render: () => {
    const data = generateMediumData();
    const featureValues = data.protein_ids.map(
      (_, i) => data.features.family.values[data.feature_data.family[i]],
    );

    return html`
      <div style="padding: 2rem; background: #f5f5f5; min-height: 100vh;">
        <p style="margin: 0 0 1rem 0; color: #666;">
          Full-featured example showing all interactions between scatterplot and
          legend
        </p>

        <div
          style="display: grid; grid-template-columns: 1fr 320px; gap: 1rem; align-items: start;"
        >
          <div
            style="border: 1px solid #ccc; border-radius: 8px; overflow: hidden; background: white;"
          >
            <protspace-scatterplot
              id="complete-plot"
              .data=${data}
              .selectedProjectionIndex=${0}
              .selectedFeature=${"family"}
              .useShapes=${true}
              .useCanvas=${true}
              style="display: block; height: 600px;"
            ></protspace-scatterplot>
          </div>
          <div
            style="border: 1px solid #ccc; border-radius: 8px; overflow: hidden; background: white;"
          >
            <protspace-legend
              .data=${{ features: data.features }}
              .selectedFeature=${"family"}
              .featureValues=${featureValues}
              .proteinIds=${data.protein_ids}
              .includeShapes=${true}
              .includeOthers=${true}
              .autoSync=${true}
              .autoHide=${true}
              scatterplot-selector="#complete-plot"
            ></protspace-legend>
          </div>
        </div>

        <div
          style="margin-top: 1rem; display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;"
        >
          <div
            style="padding: 1rem; background: #d1ecf1; border-radius: 4px; border-left: 4px solid #0c5460;"
          >
            <strong>🖱️ Scatterplot interactions:</strong>
            <ul
              style="margin: 0.5rem 0; padding-left: 1.5rem; font-size: 0.875rem;"
            >
              <li>Hover over points for tooltips</li>
              <li>Click points to select them</li>
              <li>Scroll to zoom in/out</li>
              <li>Drag to pan around</li>
              <li>Double-click to reset zoom</li>
            </ul>
          </div>

          <div
            style="padding: 1rem; background: #d1ecf1; border-radius: 4px; border-left: 4px solid #0c5460;"
          >
            <strong>🎨 Legend interactions:</strong>
            <ul
              style="margin: 0.5rem 0; padding-left: 1.5rem; font-size: 0.875rem;"
            >
              <li>Click items to hide/show categories</li>
              <li>Double-click to isolate one category</li>
              <li>Drag items to change z-order</li>
              <li>Click gear icon for settings</li>
              <li>Use "(view)" to manage "Other"</li>
            </ul>
          </div>
        </div>

        <div
          style="margin-top: 1rem; padding: 1rem; background: #f0f0f0; border-radius: 4px;"
        >
          <strong>✨ Features enabled:</strong> Shapes, auto-sync, auto-hide,
          "Other" category
        </div>
      </div>
    `;
  },
};
