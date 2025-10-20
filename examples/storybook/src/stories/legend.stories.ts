/**
 * Storybook stories for the Legend component
 * Demonstrates legend features, interactions, and customization
 */

import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "lit";
import "@protspace/core";
import {
  MINIMAL_DATA,
  generateMediumData,
  generateManyFeaturesData,
  generateDataWithNulls,
} from "./mock-data";

const meta: Meta = {
  title: "Components/Legend",
  component: "protspace-legend",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Interactive legend component with support for hiding/showing values, drag-and-drop reordering, and automatic 'Other' category grouping.",
      },
    },
  },
  argTypes: {
    featureName: {
      control: "text",
      description: "Name of the feature to display",
    },
    maxVisibleValues: {
      control: { type: "number", min: 3, max: 20 },
      description:
        "Maximum number of values to display individually. Values below this threshold are grouped into the 'Other' category (configurable, not fixed at 10).",
    },
    includeOthers: {
      control: "boolean",
      description: "Show 'Other' category for values below the maxVisibleValues threshold",
    },
    includeShapes: {
      control: "boolean",
      description: "Show shape symbols in addition to colors",
    },
    autoSync: {
      control: "boolean",
      description: "Automatically sync with scatterplot",
    },
    autoHide: {
      control: "boolean",
      description: "Automatically hide points when legend items are toggled",
    },
  },
};

export default meta;
type Story = StoryObj;

/**
 * Basic legend with minimal data
 */
export const Basic: Story = {
  args: {
    data: { features: MINIMAL_DATA.features },
    selectedFeature: "family",
    featureValues: MINIMAL_DATA.protein_ids.map(
      (_, i) =>
        MINIMAL_DATA.features.family.values[
          MINIMAL_DATA.feature_data.family[i]
        ],
    ),
    proteinIds: MINIMAL_DATA.protein_ids,
    autoSync: false,
    autoHide: false,
  },
  render: (args) => html`
    <div
      style="width: 300px; border: 1px solid #ccc; border-radius: 8px; overflow: hidden;"
    >
      <protspace-legend
        .data=${args.data}
        .selectedFeature=${args.selectedFeature}
        .featureValues=${args.featureValues}
        .proteinIds=${args.proteinIds}
        .autoSync=${args.autoSync}
        .autoHide=${args.autoHide}
      ></protspace-legend>
    </div>
  `,
};

/**
 * Full legend with medium dataset
 */
export const MediumDataset: Story = {
  args: {
    data: (() => {
      const data = generateMediumData();
      return { features: data.features };
    })(),
    selectedFeature: "family",
    featureValues: (() => {
      const data = generateMediumData();
      return data.protein_ids.map(
        (_, i) => data.features.family.values[data.feature_data.family[i]],
      );
    })(),
    proteinIds: generateMediumData().protein_ids,
    autoSync: false,
    autoHide: false,
  },
  render: (args) => html`
    <div
      style="width: 300px; border: 1px solid #ccc; border-radius: 8px; overflow: hidden;"
    >
      <protspace-legend
        .data=${args.data}
        .selectedFeature=${args.selectedFeature}
        .featureValues=${args.featureValues}
        .proteinIds=${args.proteinIds}
        .autoSync=${args.autoSync}
        .autoHide=${args.autoHide}
      ></protspace-legend>
    </div>
    <div
      style="margin-top: 1rem; padding: 1rem; background: #f0f0f0; border-radius: 4px; max-width: 300px;"
    >
      <strong>Dataset:</strong> 100 proteins across 5 families<br />
      <strong>Counts:</strong> Each legend item shows the number of proteins
    </div>
  `,
};

/**
 * Interactive features - click to toggle, drag to reorder
 */
export const InteractiveFeatures: Story = {
  args: {
    data: (() => {
      const data = generateMediumData();
      return { features: data.features };
    })(),
    selectedFeature: "family",
    featureValues: (() => {
      const data = generateMediumData();
      return data.protein_ids.map(
        (_, i) => data.features.family.values[data.feature_data.family[i]],
      );
    })(),
    proteinIds: generateMediumData().protein_ids,
    autoSync: false,
    autoHide: false,
  },
  render: (args) => html`
    <div
      style="width: 300px; border: 1px solid #ccc; border-radius: 8px; overflow: hidden;"
    >
      <protspace-legend
        .data=${args.data}
        .selectedFeature=${args.selectedFeature}
        .featureValues=${args.featureValues}
        .proteinIds=${args.proteinIds}
        .autoSync=${args.autoSync}
        .autoHide=${args.autoHide}
        @legend-item-click=${(e: CustomEvent) => {
          console.log("Legend item clicked:", e.detail);
        }}
        @legend-zorder-change=${(e: CustomEvent) => {
          console.log("Z-order changed:", e.detail.zOrderMapping);
        }}
      ></protspace-legend>
    </div>
    <div
      style="margin-top: 1rem; padding: 1rem; background: #d1ecf1; border-radius: 4px; max-width: 300px; border-left: 4px solid #0c5460;"
    >
      <strong>💡 Interactions:</strong>
      <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
        <li>Click to hide/show items</li>
        <li>Double-click to isolate</li>
        <li>Drag to reorder (controls z-order in plot)</li>
      </ul>
      Events logged to console.
    </div>
  `,
};

/**
 * "Other" category management - grouping and extraction
 */
export const OtherCategoryManagement: Story = {
  args: {
    data: (() => {
      const data = generateManyFeaturesData();
      return { features: data.features };
    })(),
    selectedFeature: "family",
    featureValues: (() => {
      const data = generateManyFeaturesData();
      return data.protein_ids.map(
        (_, i) => data.features.family.values[data.feature_data.family[i]],
      );
    })(),
    proteinIds: generateManyFeaturesData().protein_ids,
    maxVisibleValues: 8,
    includeOthers: true,
    autoSync: false,
    autoHide: false,
  },
  render: (args) => html`
    <div
      style="width: 300px; border: 1px solid #ccc; border-radius: 8px; overflow: hidden;"
    >
      <protspace-legend
        .data=${args.data}
        .selectedFeature=${args.selectedFeature}
        .featureValues=${args.featureValues}
        .proteinIds=${args.proteinIds}
        .maxVisibleValues=${args.maxVisibleValues}
        .includeOthers=${args.includeOthers}
        .autoSync=${args.autoSync}
        .autoHide=${args.autoHide}
        @legend-item-click=${(e: CustomEvent) => {
          if (e.detail.action === "extract") {
            console.log("Extracted from Other:", e.detail.value);
          }
        }}
      ></protspace-legend>
    </div>
    <div
      style="margin-top: 1rem; padding: 1rem; background: #fff3cd; border-radius: 4px; max-width: 300px; border-left: 4px solid #ffc107;"
    >
      <strong>📦 "Other" category:</strong> Values below the top ${args.maxVisibleValues} (configurable via <code>maxVisibleValues</code>) are grouped. Click "(view)" to extract individual items.
    </div>
  `,
};

/**
 * Shape options - toggle shapes on/off
 */
export const ShapeOptions: Story = {
  args: {
    data: (() => {
      const data = generateMediumData();
      return { features: data.features };
    })(),
    selectedFeature: "family",
    featureValues: (() => {
      const data = generateMediumData();
      return data.protein_ids.map(
        (_, i) => data.features.family.values[data.feature_data.family[i]],
      );
    })(),
    proteinIds: generateMediumData().protein_ids,
    includeShapes: true,
    autoSync: false,
    autoHide: false,
  },
  render: (args) => html`
    <div
      style="width: 300px; border: 1px solid #ccc; border-radius: 8px; overflow: hidden;"
    >
      <protspace-legend
        .data=${args.data}
        .selectedFeature=${args.selectedFeature}
        .featureValues=${args.featureValues}
        .proteinIds=${args.proteinIds}
        .includeShapes=${args.includeShapes}
        .autoSync=${args.autoSync}
        .autoHide=${args.autoHide}
      ></protspace-legend>
    </div>
    <div
      style="margin-top: 1rem; padding: 1rem; background: #f0f0f0; border-radius: 4px; max-width: 300px;"
    >
      <strong>Shape mode:</strong> Toggle <code>includeShapes</code> to show shapes (circle, square, triangle, diamond, star) or color only
    </div>
  `,
};

/**
 * Settings dialog customization
 */
export const SettingsDialog: Story = {
  args: {
    data: (() => {
      const data = generateManyFeaturesData();
      return { features: data.features };
    })(),
    selectedFeature: "family",
    featureValues: (() => {
      const data = generateManyFeaturesData();
      return data.protein_ids.map(
        (_, i) => data.features.family.values[data.feature_data.family[i]],
      );
    })(),
    proteinIds: generateManyFeaturesData().protein_ids,
    maxVisibleValues: 10,
    includeOthers: true,
    includeShapes: true,
    autoSync: false,
    autoHide: false,
  },
  render: (args) => html`
    <div
      style="width: 300px; border: 1px solid #ccc; border-radius: 8px; overflow: hidden;"
    >
      <protspace-legend
        .data=${args.data}
        .selectedFeature=${args.selectedFeature}
        .featureValues=${args.featureValues}
        .proteinIds=${args.proteinIds}
        .maxVisibleValues=${args.maxVisibleValues}
        .includeOthers=${args.includeOthers}
        .includeShapes=${args.includeShapes}
        .autoSync=${args.autoSync}
        .autoHide=${args.autoHide}
      ></protspace-legend>
    </div>
    <div
      style="margin-top: 1rem; padding: 1rem; background: #d1ecf1; border-radius: 4px; max-width: 300px; border-left: 4px solid #0c5460;"
    >
      <strong>⚙️ Settings:</strong><br />
      Click the gear icon to customize:
      <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
        <li>Max legend items</li>
        <li>Shape size</li>
        <li>Include "Other" category</li>
        <li>Include shapes</li>
        <li>Sort order (by size or alphabetically)</li>
      </ul>
    </div>
  `,
};

/**
 * With null/missing values
 */
export const WithNullValues: Story = {
  args: {
    data: (() => {
      const data = generateDataWithNulls();
      return { features: data.features };
    })(),
    selectedFeature: "status",
    featureValues: (() => {
      const data = generateDataWithNulls();
      return data.protein_ids.map((_, i) => {
        const idx = data.feature_data.status[i];
        return data.features.status.values[idx];
      });
    })(),
    proteinIds: generateDataWithNulls().protein_ids,
    autoSync: false,
    autoHide: false,
  },
  render: (args) => html`
    <div
      style="width: 300px; border: 1px solid #ccc; border-radius: 8px; overflow: hidden;"
    >
      <protspace-legend
        .data=${args.data}
        .selectedFeature=${args.selectedFeature}
        .featureValues=${args.featureValues}
        .proteinIds=${args.proteinIds}
        .autoSync=${args.autoSync}
        .autoHide=${args.autoHide}
      ></protspace-legend>
    </div>
    <div
      style="margin-top: 1rem; padding: 1rem; background: #f0f0f0; border-radius: 4px; max-width: 300px;"
    >
      <strong>Null handling:</strong> Missing/null values are displayed as "N/A"
      in the legend with a neutral gray color
    </div>
  `,
};

/**
 * Multiple features comparison
 */
export const MultipleFeatures: Story = {
  args: {
    data: (() => {
      const data = generateMediumData();
      return { features: data.features };
    })(),
  },
  render: (args) => {
    const data = generateMediumData();
    return html`
      <div
        style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;"
      >
        ${Object.keys(args.data.features).map((feature) => {
          const featureValues = data.protein_ids.map(
            (_, i) =>
              data.features[feature].values[data.feature_data[feature][i]],
          );
          return html`
            <div>
              <h3
                style="margin: 0 0 0.5rem 0; text-align: center; font-size: 1rem;"
              >
                ${feature}
              </h3>
              <div
                style="border: 1px solid #ccc; border-radius: 8px; overflow: hidden;"
              >
                <protspace-legend
                  .data=${args.data}
                  .selectedFeature=${feature}
                  .featureValues=${featureValues}
                  .proteinIds=${data.protein_ids}
                  .autoSync=${false}
                  .autoHide=${false}
                ></protspace-legend>
              </div>
            </div>
          `;
        })}
      </div>
    `;
  },
};

/**
 * Compact legend with limited space
 */
export const Compact: Story = {
  args: {
    data: (() => {
      const data = generateMediumData();
      return { features: data.features };
    })(),
    selectedFeature: "family",
    featureValues: (() => {
      const data = generateMediumData();
      return data.protein_ids.map(
        (_, i) => data.features.family.values[data.feature_data.family[i]],
      );
    })(),
    proteinIds: generateMediumData().protein_ids,
    maxVisibleValues: 5,
    includeOthers: true,
    shapeSize: 12,
    autoSync: false,
    autoHide: false,
  },
  render: (args) => html`
    <div
      style="width: 200px; border: 1px solid #ccc; border-radius: 8px; overflow: hidden;"
    >
      <protspace-legend
        .data=${args.data}
        .selectedFeature=${args.selectedFeature}
        .featureValues=${args.featureValues}
        .proteinIds=${args.proteinIds}
        .maxVisibleValues=${args.maxVisibleValues}
        .includeOthers=${args.includeOthers}
        .shapeSize=${args.shapeSize}
        .autoSync=${args.autoSync}
        .autoHide=${args.autoHide}
      ></protspace-legend>
    </div>
    <div
      style="margin-top: 1rem; padding: 1rem; background: #f0f0f0; border-radius: 4px; max-width: 200px;"
    >
      <strong>Compact mode:</strong> Smaller width (200px) with reduced max
      items and smaller shape size
    </div>
  `,
};

/**
 * Empty state
 */
export const EmptyState: Story = {
  args: {
    data: null,
    selectedFeature: "",
    featureValues: [],
    proteinIds: [],
    autoSync: false,
    autoHide: false,
  },
  render: (args) => html`
    <div
      style="width: 300px; border: 1px solid #ccc; border-radius: 8px; overflow: hidden;"
    >
      <protspace-legend
        .data=${args.data}
        .selectedFeature=${args.selectedFeature}
        .featureValues=${args.featureValues}
        .proteinIds=${args.proteinIds}
        .autoSync=${args.autoSync}
        .autoHide=${args.autoHide}
      ></protspace-legend>
    </div>
  `,
};
