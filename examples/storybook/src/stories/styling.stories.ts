/**
 * Styling stories for individual web components
 * Demonstrates various styling options, themes, and visual configurations
 */

import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "lit";
import "@protspace/core";
import {
  generateMediumData,
} from "./mock-data";

const meta: Meta = {
  title: "Styling/Component Showcase",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Comprehensive showcase of individual web component styling options, themes, and visual configurations.",
      },
    },
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj;

/**
 * Control Bar Styling Showcase
 */
export const ControlBarStyling: Story = {
  render: () => {

    return html`
      <div style="padding: 2rem; background: #f5f5f5; min-height: 100vh;">
        
        <!-- Default Styling -->
        <div style="margin-bottom: 3rem;">
          <h3 style="margin: 0 0 1rem 0; color: #555;">Default Styling</h3>
          <div style="border: 1px solid #ccc; border-radius: 8px; overflow: hidden; background: white;">
            <protspace-control-bar
              .projections=${["PCA", "t-SNE", "UMAP"]}
              .features=${["family", "size", "organism"]}
              selected-projection="PCA"
              selected-feature="family"
              selection-mode=${false}
              selected-proteins-count=${0}
              split-mode=${false}
              .splitHistory=${[]}
            ></protspace-control-bar>
          </div>
        </div>

        <!-- Active States -->
        <div style="margin-bottom: 3rem;">
          <h3 style="margin: 0 0 1rem 0; color: #555;">Active States</h3>
          <div style="border: 1px solid #ccc; border-radius: 8px; overflow: hidden; background: white;">
            <protspace-control-bar
              .projections=${["PCA", "t-SNE", "UMAP"]}
              .features=${["family", "size", "organism"]}
              selected-projection="t-SNE"
              selected-feature="size"
              selection-mode=${true}
              selected-proteins-count=${42}
              split-mode=${true}
              .splitHistory=${[["P12345", "Q67890"], ["A11111"]]}
            ></protspace-control-bar>
          </div>
        </div>

        <!-- Compact Layout -->
        <div style="margin-bottom: 3rem;">
          <h3 style="margin: 0 0 1rem 0; color: #555;">Compact Layout (Mobile)</h3>
          <div style="border: 1px solid #ccc; border-radius: 8px; overflow: hidden; background: white; max-width: 400px;">
            <protspace-control-bar
              .projections=${["PCA", "t-SNE"]}
              .features=${["family", "size"]}
              selected-projection="PCA"
              selected-feature="family"
              selection-mode=${false}
              selected-proteins-count=${0}
              split-mode=${false}
              .splitHistory=${[]}
            ></protspace-control-bar>
          </div>
        </div>

        <div style="margin-top: 2rem; padding: 1rem; background: #d1ecf1; border-radius: 4px; border-left: 4px solid #0c5460;">
          <strong>🎨 Control Bar Features:</strong>
          <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
            <li>UniProt-inspired design tokens with CSS custom properties</li>
            <li>Responsive layout that adapts to different screen sizes</li>
            <li>Active states with visual feedback</li>
            <li>Dark mode support via prefers-color-scheme</li>
            <li>Accessible focus states and hover effects</li>
          </ul>
        </div>
      </div>
    `;
  },
};

/**
 * Legend Styling Showcase
 */
export const LegendStyling: Story = {
  render: () => {
    const data = generateMediumData();
    const featureValues = data.protein_ids.map(
      (_: string, i: number) => data.features.family.values[data.feature_data.family[i]],
    );

    return html`
      <div style="padding: 2rem; background: #f5f5f5; min-height: 100vh;">
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 2rem;">
          
          <!-- Default Legend -->
          <div>
            <h3 style="margin: 0 0 1rem 0; color: #555;">Default Legend</h3>
            <protspace-legend
              .data=${{ features: data.features }}
              .selectedFeature=${"family"}
              .featureValues=${featureValues}
              .proteinIds=${data.protein_ids}
              .autoSync=${false}
              .autoHide=${false}
            ></protspace-legend>
          </div>

          <!-- With Shapes -->
          <div>
            <h3 style="margin: 0 0 1rem 0; color: #555;">With Shapes</h3>
            <protspace-legend
              .data=${{ features: data.features }}
              .selectedFeature=${"family"}
              .featureValues=${featureValues}
              .proteinIds=${data.protein_ids}
              .includeShapes=${true}
              .autoSync=${false}
              .autoHide=${false}
            ></protspace-legend>
          </div>

          <!-- With Others Category -->
          <div>
            <h3 style="margin: 0 0 1rem 0; color: #555;">With "Others" Category</h3>
            <protspace-legend
              .data=${{ features: data.features }}
              .selectedFeature=${"family"}
              .featureValues=${featureValues}
              .proteinIds=${data.protein_ids}
              .maxVisibleValues=${3}
              .includeOthers=${true}
              .autoSync=${false}
              .autoHide=${false}
            ></protspace-legend>
          </div>

          <!-- Compact Version -->
          <div>
            <h3 style="margin: 0 0 1rem 0; color: #555;">Compact Version</h3>
            <protspace-legend
              .data=${{ features: data.features }}
              .selectedFeature=${"family"}
              .featureValues=${featureValues.slice(0, 3)}
              .proteinIds=${data.protein_ids.slice(0, 50)}
              .autoSync=${false}
              .autoHide=${false}
            ></protspace-legend>
          </div>

        </div>

        <div style="margin-top: 2rem; padding: 1rem; background: #d1ecf1; border-radius: 4px; border-left: 4px solid #0c5460;">
          <strong>🎨 Legend Features:</strong>
          <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
            <li>Clean, modern design with subtle shadows and rounded corners</li>
            <li>Interactive states: hover, active, hidden, dragging</li>
            <li>Drag-and-drop visual feedback with scale and border effects</li>
            <li>Modal dialogs for "Others" category management</li>
            <li>Responsive design that works on all screen sizes</li>
            <li>Dark mode support with appropriate color adjustments</li>
          </ul>
        </div>
      </div>
    `;
  },
};

/**
 * Scatterplot Styling Showcase
 */
export const ScatterplotStyling: Story = {
  render: () => {
    const data = generateMediumData();

    return html`
      <div style="padding: 2rem; background: #f5f5f5; min-height: 100vh;">
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 2rem;">
          
          <!-- Default Styling -->
          <div>
            <h3 style="margin: 0 0 1rem 0; color: #555;">Default Styling</h3>
            <div style="border: 1px solid #ccc; border-radius: 8px; overflow: hidden; background: white;">
              <protspace-scatterplot
                .data=${data}
                .selectedProjectionIndex=${0}
                .selectedFeature=${"family"}
                .useCanvas=${true}
                style="display: block; height: 300px;"
              ></protspace-scatterplot>
            </div>
          </div>

          <!-- With Shapes -->
          <div>
            <h3 style="margin: 0 0 1rem 0; color: #555;">With Shapes</h3>
            <div style="border: 1px solid #ccc; border-radius: 8px; overflow: hidden; background: white;">
              <protspace-scatterplot
                .data=${data}
                .selectedProjectionIndex=${0}
                .selectedFeature=${"family"}
                .useShapes=${true}
                .useCanvas=${true}
                style="display: block; height: 300px;"
              ></protspace-scatterplot>
            </div>
          </div>

          <!-- Large Points -->
          <div>
            <h3 style="margin: 0 0 1rem 0; color: #555;">Large Points</h3>
            <div style="border: 1px solid #ccc; border-radius: 8px; overflow: hidden; background: white;">
              <protspace-scatterplot
                .data=${data}
                .selectedProjectionIndex=${0}
                .selectedFeature=${"family"}
                .config=${{ pointSize: 150 }}
                .useCanvas=${true}
                style="display: block; height: 300px;"
              ></protspace-scatterplot>
            </div>
          </div>

          <!-- Selection Mode -->
          <div>
            <h3 style="margin: 0 0 1rem 0; color: #555;">Selection Mode</h3>
            <div style="border: 1px solid #ccc; border-radius: 8px; overflow: hidden; background: white;">
              <protspace-scatterplot
                .data=${data}
                .selectedProjectionIndex=${0}
                .selectedFeature=${"family"}
                .selectionMode=${true}
                .useCanvas=${true}
                style="display: block; height: 300px;"
              ></protspace-scatterplot>
            </div>
          </div>

        </div>

        <div style="margin-top: 2rem; padding: 1rem; background: #d1ecf1; border-radius: 4px; border-left: 4px solid #0c5460;">
          <strong>🎨 Scatterplot Features:</strong>
          <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
            <li>CSS custom properties for easy theming and customization</li>
            <li>UniProt-inspired color palette with accessible contrast</li>
            <li>Smooth transitions and hover effects</li>
            <li>Canvas-based rendering for high performance</li>
            <li>Interactive tooltips with clean styling</li>
            <li>Selection mode with visual feedback</li>
            <li>Loading states with animated spinners</li>
          </ul>
        </div>
      </div>
    `;
  },
};

/**
 * Data Loader Styling Showcase
 */
export const DataLoaderStyling: Story = {
  render: () => {
    return html`
      <div style="padding: 2rem; background: #f5f5f5; min-height: 100vh;">
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem;">
          
          <!-- Default State -->
          <div>
            <h3 style="margin: 0 0 1rem 0; color: #555;">Default State</h3>
            <protspace-data-loader
              allow-drop=${true}
              auto-load=${false}
            ></protspace-data-loader>
          </div>

          <!-- Loading State -->
          <div>
            <h3 style="margin: 0 0 1rem 0; color: #555;">Loading State</h3>
            <protspace-data-loader
              allow-drop=${true}
              auto-load=${false}
              loading=${true}
              progress=${65}
            ></protspace-data-loader>
          </div>

          <!-- Error State -->
          <div>
            <h3 style="margin: 0 0 1rem 0; color: #555;">Error State</h3>
            <protspace-data-loader
              allow-drop=${true}
              auto-load=${false}
              error="Invalid file format. Please upload a valid Parquet file."
            ></protspace-data-loader>
          </div>

          <!-- With File Info -->
          <div>
            <h3 style="margin: 0 0 1rem 0; color: #555;">With File Info</h3>
            <protspace-data-loader
              allow-drop=${true}
              auto-load=${false}
              file-info='{"name": "protein_data.parquet", "size": 2048576}'
            ></protspace-data-loader>
          </div>

        </div>

        <div style="margin-top: 2rem; padding: 1rem; background: #d1ecf1; border-radius: 4px; border-left: 4px solid #0c5460;">
          <strong>🎨 Data Loader Features:</strong>
          <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
            <li>Clean drag-and-drop interface with visual feedback</li>
            <li>State-based styling: default, hover, loading, error</li>
            <li>Progress bar with smooth animations</li>
            <li>Responsive design for mobile and desktop</li>
            <li>Accessible color contrast and focus states</li>
            <li>File information display with proper formatting</li>
          </ul>
        </div>
      </div>
    `;
  },
};

/**
 * Dark Theme Showcase
 */
export const DarkThemeShowcase: Story = {
  render: () => {
    const data = generateMediumData();
    const featureValues = data.protein_ids.map(
      (_: string, i: number) => data.features.family.values[data.feature_data.family[i]],
    );

    return html`
      <div style="padding: 2rem; background: #1f2937; min-height: 100vh; color: #f9fafb;">
        <p style="margin: 0 0 2rem 0; color: #d1d5db;">
          All components automatically adapt to dark mode using CSS media queries.
        </p>
        
        <!-- Control Bar in Dark Mode -->
        <div style="margin-bottom: 3rem;">
          <h3 style="margin: 0 0 1rem 0; color: #d1d5db;">Control Bar (Dark Mode)</h3>
          <div style="border: 1px solid #374151; border-radius: 8px; overflow: hidden; background: #1f2937;">
            <protspace-control-bar
              .projections=${["PCA", "t-SNE", "UMAP"]}
              .features=${["family", "size", "organism"]}
              selected-projection="PCA"
              selected-feature="family"
              selection-mode=${true}
              selected-proteins-count=${25}
              split-mode=${false}
              .splitHistory=${[]}
            ></protspace-control-bar>
          </div>
        </div>

        <!-- Legend in Dark Mode -->
        <div style="margin-bottom: 3rem;">
          <h3 style="margin: 0 0 1rem 0; color: #d1d5db;">Legend (Dark Mode)</h3>
          <div style="display: flex; gap: 2rem; flex-wrap: wrap;">
            <protspace-legend
              .data=${{ features: data.features }}
              .selectedFeature=${"family"}
              .featureValues=${featureValues}
              .proteinIds=${data.protein_ids}
              .autoSync=${false}
              .autoHide=${false}
            ></protspace-legend>
            
            <protspace-legend
              .data=${{ features: data.features }}
              .selectedFeature=${"family"}
              .featureValues=${featureValues}
              .proteinIds=${data.protein_ids}
              .includeShapes=${true}
              .autoSync=${false}
              .autoHide=${false}
            ></protspace-legend>
          </div>
        </div>

        <!-- Scatterplot in Dark Mode -->
        <div style="margin-bottom: 3rem;">
          <h3 style="margin: 0 0 1rem 0; color: #d1d5db;">Scatterplot (Dark Mode)</h3>
          <div style="border: 1px solid #374151; border-radius: 8px; overflow: hidden; background: #1f2937;">
            <protspace-scatterplot
              .data=${data}
              .selectedProjectionIndex=${0}
              .selectedFeature=${"family"}
              .useShapes=${true}
              .useCanvas=${true}
              style="display: block; height: 400px;"
            ></protspace-scatterplot>
          </div>
        </div>

        <!-- Data Loader in Dark Mode -->
        <div style="margin-bottom: 3rem;">
          <h3 style="margin: 0 0 1rem 0; color: #d1d5db;">Data Loader (Dark Mode)</h3>
          <div style="max-width: 400px;">
            <protspace-data-loader
              allow-drop=${true}
              auto-load=${false}
            ></protspace-data-loader>
          </div>
        </div>

        <div style="margin-top: 2rem; padding: 1rem; background: #374151; border-radius: 4px; border-left: 4px solid #00a3e0;">
          <strong style="color: #f9fafb;">🌙 Dark Mode Features:</strong>
          <ul style="margin: 0.5rem 0; padding-left: 1.5rem; color: #d1d5db;">
            <li>Automatic detection via prefers-color-scheme media query</li>
            <li>Consistent dark color palette across all components</li>
            <li>Proper contrast ratios for accessibility</li>
            <li>Maintains visual hierarchy and readability</li>
            <li>No JavaScript required - pure CSS implementation</li>
          </ul>
        </div>
      </div>
    `;
  },
};

/**
 * Custom CSS Variables Showcase
 */
export const CustomCSSVariables: Story = {
  render: () => {
    const data = generateMediumData();
    const featureValues = data.protein_ids.map(
      (_: string, i: number) => data.features.family.values[data.feature_data.family[i]],
    );

    return html`
      <style>
        .custom-theme {
          /* Override CSS custom properties for custom theming */
          --up-primary: #e91e63;
          --up-primary-hover: #c2185b;
          --up-surface: #fce4ec;
          --up-border: #f8bbd9;
          --up-muted: #ad1457;
          
          --legend-bg: #fce4ec;
          --legend-border: #f8bbd9;
          --legend-text-color: #ad1457;
          --legend-hover-bg: #f8bbd9;
          --legend-active-bg: #f48fb1;
          
          --protspace-bg-color: #fce4ec;
          --protspace-border-color: #f8bbd9;
          --protspace-highlight-color: #e91e63;
          --protspace-selection-color: #ff5722;
        }
        
        .custom-theme protspace-control-bar,
        .custom-theme protspace-legend,
        .custom-theme protspace-scatterplot {
          /* Apply custom theme to all components */
        }
      </style>
      
      <div class="custom-theme" style="padding: 2rem; background: #fce4ec; min-height: 100vh;">
        <p style="margin: 0 0 2rem 0; color: #ad1457;">
          All components use CSS custom properties that can be easily overridden for custom theming.
        </p>
        
        <!-- Custom Themed Control Bar -->
        <div style="margin-bottom: 3rem;">
          <h3 style="margin: 0 0 1rem 0; color: #ad1457;">Custom Themed Control Bar</h3>
          <div style="border: 1px solid #f8bbd9; border-radius: 8px; overflow: hidden; background: #fce4ec;">
            <protspace-control-bar
              .projections=${["PCA", "t-SNE", "UMAP"]}
              .features=${["family", "size", "organism"]}
              selected-projection="PCA"
              selected-feature="family"
              selection-mode=${true}
              selected-proteins-count=${15}
              split-mode=${false}
              .splitHistory=${[]}
            ></protspace-control-bar>
          </div>
        </div>

        <!-- Custom Themed Legend -->
        <div style="margin-bottom: 3rem;">
          <h3 style="margin: 0 0 1rem 0; color: #ad1457;">Custom Themed Legend</h3>
          <div style="display: flex; gap: 2rem; flex-wrap: wrap;">
            <protspace-legend
              .data=${{ features: data.features }}
              .selectedFeature=${"family"}
              .featureValues=${featureValues}
              .proteinIds=${data.protein_ids}
              .autoSync=${false}
              .autoHide=${false}
            ></protspace-legend>
          </div>
        </div>

        <!-- Custom Themed Scatterplot -->
        <div style="margin-bottom: 3rem;">
          <h3 style="margin: 0 0 1rem 0; color: #ad1457;">Custom Themed Scatterplot</h3>
          <div style="border: 1px solid #f8bbd9; border-radius: 8px; overflow: hidden; background: #fce4ec;">
            <protspace-scatterplot
              .data=${data}
              .selectedProjectionIndex=${0}
              .selectedFeature=${"family"}
              .useShapes=${true}
              .useCanvas=${true}
              style="display: block; height: 400px;"
            ></protspace-scatterplot>
          </div>
        </div>

        <div style="margin-top: 2rem; padding: 1rem; background: #f8bbd9; border-radius: 4px; border-left: 4px solid #e91e63;">
          <strong style="color: #ad1457;">🎨 Custom Theming Features:</strong>
          <ul style="margin: 0.5rem 0; padding-left: 1.5rem; color: #ad1457;">
            <li>CSS custom properties for easy theme customization</li>
            <li>No need to modify component source code</li>
            <li>Consistent theming across all components</li>
            <li>Maintains accessibility and contrast ratios</li>
            <li>Can be applied globally or to specific instances</li>
          </ul>
        </div>
      </div>
    `;
  },
};

/**
 * Point Size Variables Showcase
 */
export const PointSizeVariables: Story = {
  render: () => {
    const data = generateMediumData();

    return html`
      <div style="padding: 2rem; background: #f5f5f5; min-height: 100vh;">
        <p style="margin: 0 0 2rem 0; color: #666;">
          Demonstrates different point size configurations and how they affect the scatterplot visualization.
        </p>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 2rem;">
          
          <!-- Extra Small Points -->
          <div>
            <h3 style="margin: 0 0 1rem 0; color: #555;">Extra Small Points (40px)</h3>
            <div style="border: 1px solid #ccc; border-radius: 8px; overflow: hidden; background: white;">
              <protspace-scatterplot
                .data=${data}
                .selectedProjectionIndex=${0}
                .selectedFeature=${"family"}
                .config=${{ pointSize: 40 }}
                .useCanvas=${true}
                style="display: block; height: 300px;"
              ></protspace-scatterplot>
            </div>
            <p style="margin: 0.5rem 0 0 0; font-size: 0.875rem; color: #666;">
              Ideal for dense datasets with many overlapping points
            </p>
          </div>

          <!-- Small Points -->
          <div>
            <h3 style="margin: 0 0 1rem 0; color: #555;">Small Points (60px)</h3>
            <div style="border: 1px solid #ccc; border-radius: 8px; overflow: hidden; background: white;">
              <protspace-scatterplot
                .data=${data}
                .selectedProjectionIndex=${0}
                .selectedFeature=${"family"}
                .config=${{ pointSize: 60 }}
                .useCanvas=${true}
                style="display: block; height: 300px;"
              ></protspace-scatterplot>
            </div>
            <p style="margin: 0.5rem 0 0 0; font-size: 0.875rem; color: #666;">
              Good balance between detail and density
            </p>
          </div>

          <!-- Default Points -->
          <div>
            <h3 style="margin: 0 0 1rem 0; color: #555;">Default Points (80px)</h3>
            <div style="border: 1px solid #ccc; border-radius: 8px; overflow: hidden; background: white;">
              <protspace-scatterplot
                .data=${data}
                .selectedProjectionIndex=${0}
                .selectedFeature=${"family"}
                .config=${{ pointSize: 80 }}
                .useCanvas=${true}
                style="display: block; height: 300px;"
              ></protspace-scatterplot>
            </div>
            <p style="margin: 0.5rem 0 0 0; font-size: 0.875rem; color: #666;">
              Standard size for most use cases
            </p>
          </div>

          <!-- Large Points -->
          <div>
            <h3 style="margin: 0 0 1rem 0; color: #555;">Large Points (120px)</h3>
            <div style="border: 1px solid #ccc; border-radius: 8px; overflow: hidden; background: white;">
              <protspace-scatterplot
                .data=${data}
                .selectedProjectionIndex=${0}
                .selectedFeature=${"family"}
                .config=${{ pointSize: 120 }}
                .useCanvas=${true}
                style="display: block; height: 300px;"
              ></protspace-scatterplot>
            </div>
            <p style="margin: 0.5rem 0 0 0; font-size: 0.875rem; color: #666;">
              Better visibility for presentations and detailed analysis
            </p>
          </div>

          <!-- Extra Large Points -->
          <div>
            <h3 style="margin: 0 0 1rem 0; color: #555;">Extra Large Points (180px)</h3>
            <div style="border: 1px solid #ccc; border-radius: 8px; overflow: hidden; background: white;">
              <protspace-scatterplot
                .data=${data}
                .selectedProjectionIndex=${0}
                .selectedFeature=${"family"}
                .config=${{ pointSize: 180 }}
                .useCanvas=${true}
                style="display: block; height: 300px;"
              ></protspace-scatterplot>
            </div>
            <p style="margin: 0.5rem 0 0 0; font-size: 0.875rem; color: #666;">
              Maximum visibility for sparse datasets or presentations
            </p>
          </div>

          <!-- With Shapes and Large Points -->
          <div>
            <h3 style="margin: 0 0 1rem 0; color: #555;">Large Points with Shapes (150px)</h3>
            <div style="border: 1px solid #ccc; border-radius: 8px; overflow: hidden; background: white;">
              <protspace-scatterplot
                .data=${data}
                .selectedProjectionIndex=${0}
                .selectedFeature=${"family"}
                .config=${{ pointSize: 150 }}
                .useShapes=${true}
                .useCanvas=${true}
                style="display: block; height: 300px;"
              ></protspace-scatterplot>
            </div>
            <p style="margin: 0.5rem 0 0 0; font-size: 0.875rem; color: #666;">
              Large points with shape differentiation for better accessibility
            </p>
          </div>

        </div>

        <!-- Point Size Comparison -->
        <div style="margin-top: 3rem;">
          <h3 style="margin: 0 0 1rem 0; color: #555;">Point Size Comparison</h3>
          <div style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: white; border: 1px solid #ccc; border-radius: 8px; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <div style="width: 40px; height: 40px; background: #00a3e0; border-radius: 50%;"></div>
              <span style="font-size: 0.875rem;">40px</span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <div style="width: 60px; height: 60px; background: #00a3e0; border-radius: 50%;"></div>
              <span style="font-size: 0.875rem;">60px</span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <div style="width: 80px; height: 80px; background: #00a3e0; border-radius: 50%;"></div>
              <span style="font-size: 0.875rem;">80px (default)</span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <div style="width: 120px; height: 120px; background: #00a3e0; border-radius: 50%;"></div>
              <span style="font-size: 0.875rem;">120px</span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <div style="width: 180px; height: 180px; background: #00a3e0; border-radius: 50%;"></div>
              <span style="font-size: 0.875rem;">180px</span>
            </div>
          </div>
        </div>

        <div style="margin-top: 2rem; padding: 1rem; background: #d1ecf1; border-radius: 4px; border-left: 4px solid #0c5460;">
          <strong>📏 Point Size Features:</strong>
          <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
            <li>Configurable via the <code>config.pointSize</code> property</li>
            <li>Default size is 80px for optimal balance</li>
            <li>Smaller sizes (40-60px) for dense datasets</li>
            <li>Larger sizes (120-180px) for presentations and sparse data</li>
            <li>Works with both canvas and SVG rendering modes</li>
            <li>Maintains aspect ratio and visual consistency</li>
            <li>Affects both regular and highlighted/selected states</li>
          </ul>
        </div>

        <div style="margin-top: 1rem; padding: 1rem; background: #fff3cd; border-radius: 4px; border-left: 4px solid #ffc107;">
          <strong>💡 Usage Tips:</strong>
          <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
            <li>Use smaller points when you have >1000 data points</li>
            <li>Use larger points for presentations or when showing <100 points</li>
            <li>Consider your audience's viewing distance and screen size</li>
            <li>Test different sizes to find the optimal balance for your data</li>
            <li>Larger points work well with shape differentiation for accessibility</li>
          </ul>
        </div>
      </div>
    `;
  },
};

/**
 * Responsive Design Showcase
 */
export const ResponsiveDesign: Story = {
  render: () => {
    const data = generateMediumData();
    const featureValues = data.protein_ids.map(
      (_: string, i: number) => data.features.family.values[data.feature_data.family[i]],
    );

    return html`
      <div style="padding: 2rem; background: #f5f5f5; min-height: 100vh;">
        <p style="margin: 0 0 2rem 0; color: #666;">
          All components are designed to be responsive and work well on different screen sizes.
        </p>
        
        <!-- Mobile Layout -->
        <div style="margin-bottom: 3rem;">
          <h3 style="margin: 0 0 1rem 0; color: #555;">Mobile Layout (320px)</h3>
          <div style="max-width: 320px; border: 1px solid #ccc; border-radius: 8px; overflow: hidden; background: white;">
            <protspace-control-bar
              .projections=${["PCA", "t-SNE"]}
              .features=${["family", "size"]}
              selected-projection="PCA"
              selected-feature="family"
              selection-mode=${false}
              selected-proteins-count=${0}
              split-mode=${false}
              .splitHistory=${[]}
            ></protspace-control-bar>
          </div>
        </div>

        <!-- Tablet Layout -->
        <div style="margin-bottom: 3rem;">
          <h3 style="margin: 0 0 1rem 0; color: #555;">Tablet Layout (768px)</h3>
          <div style="max-width: 768px; display: grid; grid-template-columns: 1fr 300px; gap: 1rem;">
            <div style="border: 1px solid #ccc; border-radius: 8px; overflow: hidden; background: white;">
              <protspace-scatterplot
                .data=${data}
                .selectedProjectionIndex=${0}
                .selectedFeature=${"family"}
                .useCanvas=${true}
                style="display: block; height: 300px;"
              ></protspace-scatterplot>
            </div>
            <protspace-legend
              .data=${{ features: data.features }}
              .selectedFeature=${"family"}
              .featureValues=${featureValues}
              .proteinIds=${data.protein_ids}
              .autoSync=${false}
              .autoHide=${false}
            ></protspace-legend>
          </div>
        </div>

        <!-- Desktop Layout -->
        <div style="margin-bottom: 3rem;">
          <h3 style="margin: 0 0 1rem 0; color: #555;">Desktop Layout (1200px)</h3>
          <div style="max-width: 1200px; display: grid; grid-template-columns: 1fr 350px; gap: 2rem;">
            <div style="border: 1px solid #ccc; border-radius: 8px; overflow: hidden; background: white;">
              <protspace-scatterplot
                .data=${data}
                .selectedProjectionIndex=${0}
                .selectedFeature=${"family"}
                .useShapes=${true}
                .useCanvas=${true}
                style="display: block; height: 500px;"
              ></protspace-scatterplot>
            </div>
            <div style="display: flex; flex-direction: column; gap: 1rem;">
              <protspace-legend
                .data=${{ features: data.features }}
                .selectedFeature=${"family"}
                .featureValues=${featureValues}
                .proteinIds=${data.protein_ids}
                .autoSync=${false}
                .autoHide=${false}
              ></protspace-legend>
              <protspace-data-loader
                allow-drop=${true}
                auto-load=${false}
              ></protspace-data-loader>
            </div>
          </div>
        </div>

        <div style="margin-top: 2rem; padding: 1rem; background: #d1ecf1; border-radius: 4px; border-left: 4px solid #0c5460;">
          <strong>📱 Responsive Features:</strong>
          <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
            <li>Flexible layouts that adapt to container width</li>
            <li>Mobile-first design with progressive enhancement</li>
            <li>Touch-friendly interactions on mobile devices</li>
            <li>Optimized typography and spacing for different screen sizes</li>
            <li>Grid and flexbox layouts for complex arrangements</li>
          </ul>
        </div>
      </div>
    `;
  },
};
