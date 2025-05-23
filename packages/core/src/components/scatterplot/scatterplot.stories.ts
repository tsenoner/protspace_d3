import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';
import './scatterplot'; // Import your component definition
import type { ProtspaceScatterplot } from './scatterplot';
import type { VisualizationData, Projection } from '@protspace/utils'; // Import VisualizationData and Projection

// Sample data
const sampleData: VisualizationData = { // Explicitly type sampleData
    projections: [
        {
            name: "UMAP",
            data: [ 
                [0.5, 0.5], [0.2, 0.3], [0.8, 0.7], [-0.1, -0.2], [-0.5, 0.1],
                [0.6, -0.4], [-0.3, 0.6], [0.1, 0.8], [-0.7, -0.7], [0.0, 0.0]
            ] as [number, number][] // Explicitly cast to array of tuples
        }
    ],
    protein_ids: ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "P9", "P10"],
    features: {
        "family": {
            values: ["Kinase", "Protease", "Receptor", "Other"],
            colors: ["#e41a1c", "#377eb8", "#4daf4a", "#984ea3"],
            shapes: ["circle", "square", "triangle", "diamond"]
        },
        "size_category": {
            values: ["small", "medium", "large"],
            colors: ["#ff7f00", "#ffff33", "#a65628"],
            shapes: ["circle", "circle", "circle"]
        }
    },
    feature_data: {
        "family": [0, 1, 0, 2, 1, 0, 2, 3, 3, 0],
        "size_category": [0, 1, 2, 1, 0, 2, 1, 0, 1, 2]
    },
    // sequences: {} // Assuming sequences is optional in VisualizationData, if not, add it.
};

// Define a type for the component's props to help with args typing
interface ProtspaceScatterplotProps extends Partial<ProtspaceScatterplot> {
    data?: VisualizationData | null; // Make data prop align with VisualizationData
    // Add any other specific arg types if necessary
}

const meta: Meta<ProtspaceScatterplotProps> = {
  title: 'Components/ProtSpace Scatterplot',
  component: 'protspace-scatterplot',
  tags: ['autodocs'], // Enable autodocs for this component
  argTypes: {
    data: { control: 'object' },
    selectedProjectionIndex: { control: { type: 'number', min: 0 } },
    selectedFeature: { control: 'text' },
    highlightedProteinIds: { control: 'object' },
    selectedProteinIds: { control: 'object' },
    isolationMode: { control: 'boolean' },
    selectionMode: { control: 'boolean' },
    hiddenFeatureValues: { control: 'object' },
  },
  args: { // Default args for all stories
    data: sampleData,
    selectedProjectionIndex: 0,
    selectedFeature: "family",
    highlightedProteinIds: [],
    selectedProteinIds: [],
    isolationMode: false,
    selectionMode: false,
    hiddenFeatureValues: [],
  },
};

export default meta;

type Story = StoryObj<ProtspaceScatterplotProps>;

export const Default: Story = {
  render: (args: ProtspaceScatterplotProps) => html`
    <protspace-scatterplot
      .data=${args.data}
      .selectedProjectionIndex=${args.selectedProjectionIndex}
      .selectedFeature=${args.selectedFeature}
      .highlightedProteinIds=${args.highlightedProteinIds}
      .selectedProteinIds=${args.selectedProteinIds}
      ?isolationMode=${args.isolationMode}
      ?selectionMode=${args.selectionMode}
      .hiddenFeatureValues=${args.hiddenFeatureValues}
    ></protspace-scatterplot>
  `,
};

export const Highlighted: Story = {
    args: {
        highlightedProteinIds: ["P1", "P5"],
    },
    render: (args: ProtspaceScatterplotProps) => html`
    <protspace-scatterplot
      .data=${args.data}
      .selectedProjectionIndex=${args.selectedProjectionIndex}
      .selectedFeature=${args.selectedFeature}
      .highlightedProteinIds=${args.highlightedProteinIds}
      .selectedProteinIds=${args.selectedProteinIds}
      ?isolationMode=${args.isolationMode}
      ?selectionMode=${args.selectionMode}
      .hiddenFeatureValues=${args.hiddenFeatureValues}
    ></protspace-scatterplot>
  `,
};

export const Selected: Story = {
    args: {
        selectedProteinIds: ["P2", "P3"],
    },
    render: (args: ProtspaceScatterplotProps) => html`
    <protspace-scatterplot
      .data=${args.data}
      .selectedProjectionIndex=${args.selectedProjectionIndex}
      .selectedFeature=${args.selectedFeature}
      .highlightedProteinIds=${args.highlightedProteinIds}
      .selectedProteinIds=${args.selectedProteinIds}
      ?isolationMode=${args.isolationMode}
      ?selectionMode=${args.selectionMode}
      .hiddenFeatureValues=${args.hiddenFeatureValues}
    ></protspace-scatterplot>
  `,
};

export const SelectionModeActive: Story = {
    args: {
        selectionMode: true,
    },
    render: (args: ProtspaceScatterplotProps) => html`
    <protspace-scatterplot
      .data=${args.data}
      .selectedProjectionIndex=${args.selectedProjectionIndex}
      .selectedFeature=${args.selectedFeature}
      .highlightedProteinIds=${args.highlightedProteinIds}
      .selectedProteinIds=${args.selectedProteinIds}
      ?isolationMode=${args.isolationMode}
      ?selectionMode=${args.selectionMode}
      .hiddenFeatureValues=${args.hiddenFeatureValues}
    ></protspace-scatterplot>
  `,
}; 