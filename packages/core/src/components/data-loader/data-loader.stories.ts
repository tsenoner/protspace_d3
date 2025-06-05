import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './data-loader.js';
import { tableFromArrays, tableToIPC } from 'apache-arrow';

const meta: Meta = {
  title: 'Components/DataLoader',
  component: 'protspace-data-loader',
  parameters: {
    docs: {
      description: {
        component: `
The DataLoader component enables loading protein data from Apache Arrow format files.
It automatically converts Arrow data to ProtSpace visualization format, extracting
categorical columns as legend features.

## Features
- Drag & drop Arrow files
- File upload via click
- URL loading
- Automatic column mapping
- Category extraction for legends
- Progress indication
- Error handling
        `,
      },
    },
  },
  argTypes: {
    src: {
      control: 'text',
      description: 'URL to load Arrow data from',
    },
    autoLoad: {
      control: 'boolean',
      description: 'Auto-load when src is provided',
    },
    allowDrop: {
      control: 'boolean',
      description: 'Enable drag and drop functionality',
    },
    columnMappings: {
      control: 'object',
      description: 'Custom column name mappings',
    },
  },
};

export default meta;
type Story = StoryObj;

// Mock Arrow data creation helper
function createMockArrowFile(): ArrayBuffer {
  // Create sample protein data
  const proteinIds = ['P12345', 'Q67890', 'A0A123', 'O14567', 'P98765', 'Q11111'];
  const umapX = [1.23, -0.45, 0.67, -1.89, 2.34, -0.12];
  const umapY = [-0.56, 1.78, -2.13, 0.89, -1.45, 2.67];
  const functions = ['enzyme', 'toxin', 'enzyme', 'structural', 'toxin', 'enzyme'];
  const organisms = ['human', 'snake', 'human', 'mouse', 'spider', 'human'];
  const families = ['PLA2', '3FTx', 'SVMP', 'structural', '3FTx', 'PLA2'];

  // Create Arrow table
  const table = tableFromArrays({
    protein_id: proteinIds,
    umap_1: umapX,
    umap_2: umapY,
    function: functions,
    organism: organisms,
    family: families,
  });

  // Serialize to ArrayBuffer
  const ipcBytes = tableToIPC(table);
  return ipcBytes.buffer;
}

// Create a Blob URL for the mock data
let mockDataUrl: string | null = null;

function getMockDataUrl(): string {
  if (!mockDataUrl) {
    const arrayBuffer = createMockArrowFile();
    const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' });
    mockDataUrl = URL.createObjectURL(blob);
  }
  return mockDataUrl;
}

export const Default: Story = {
  args: {
    allowDrop: true,
    autoLoad: false,
  },
  render: (args) => html`
    <protspace-data-loader
      ?auto-load=${args.autoLoad}
      ?allow-drop=${args.allowDrop}
      src=${args.src || ''}
      .columnMappings=${args.columnMappings || {}}
      @data-loaded=${(e: CustomEvent) => {
        console.log('Data loaded:', e.detail.data);
        // Show a success message
        const message = document.createElement('div');
        message.style.cssText = `
          position: absolute;
          top: 10px;
          right: 10px;
          background: #4caf50;
          color: white;
          padding: 8px 16px;
          border-radius: 4px;
          font-size: 14px;
          z-index: 1000;
        `;
        message.textContent = `Loaded ${e.detail.data.protein_ids.length} proteins with ${Object.keys(e.detail.data.features).length} features`;
        document.body.appendChild(message);
        setTimeout(() => message.remove(), 3000);
      }}
      @data-error=${(e: CustomEvent) => {
        console.error('Data loading error:', e.detail.error);
        // Show an error message
        const message = document.createElement('div');
        message.style.cssText = `
          position: absolute;
          top: 10px;
          right: 10px;
          background: #f44336;
          color: white;
          padding: 8px 16px;
          border-radius: 4px;
          font-size: 14px;
          z-index: 1000;
        `;
        message.textContent = `Error: ${e.detail.error}`;
        document.body.appendChild(message);
        setTimeout(() => message.remove(), 5000);
      }}
    ></protspace-data-loader>
    
    <div style="margin-top: 1rem; padding: 1rem; background: #f5f5f5; border-radius: 4px;">
      <h4>Instructions:</h4>
      <ul>
        <li>Click the component to upload an Arrow file</li>
        <li>Drag and drop an Arrow file onto the component</li>
        <li>Use the "Load Sample Data" story to see automatic loading</li>
      </ul>
      <p><strong>Expected columns:</strong> protein_id, x/y coordinates, categorical features</p>
    </div>
  `,
};

export const WithSampleData: Story = {
  args: {
    allowDrop: true,
    autoLoad: true,
  },
  render: (args) => html`
    <protspace-data-loader
      src=${getMockDataUrl()}
      ?auto-load=${args.autoLoad}
      ?allow-drop=${args.allowDrop}
      @data-loaded=${(e: CustomEvent) => {
        const data = e.detail.data;
        console.log('Sample data loaded:', data);
        
        // Display the loaded data structure
        const display = document.getElementById('data-display');
        if (display) {
          display.innerHTML = `
            <h4>Loaded Data Structure:</h4>
            <pre style="background: #f0f0f0; padding: 1rem; border-radius: 4px; overflow-x: auto;">
Proteins: ${data.protein_ids.length}
Projections: ${data.projections.length} (${data.projections.map((p: any) => p.name).join(', ')})
Features: ${Object.keys(data.features).length} (${Object.keys(data.features).join(', ')})

Sample proteins: ${data.protein_ids.slice(0, 3).join(', ')}...

Feature details:
${Object.entries(data.features).map(([name, feature]: [string, any]) => 
  `  ${name}: ${feature.values.filter((v: any) => v !== null).slice(0, 3).join(', ')}${feature.values.length > 3 ? '...' : ''}`
).join('\n')}
            </pre>
          `;
        }
      }}
      @data-error=${(e: CustomEvent) => {
        console.error('Error loading sample data:', e.detail.error);
      }}
    ></protspace-data-loader>
    
    <div id="data-display" style="margin-top: 1rem;"></div>
    
    <div style="margin-top: 1rem; padding: 1rem; background: #e3f2fd; border-radius: 4px;">
      <h4>Sample Data Info:</h4>
      <p>This story loads mock protein data with:</p>
      <ul>
        <li><strong>6 proteins</strong> with UniProt-style IDs</li>
        <li><strong>UMAP projection</strong> with 2D coordinates</li>
        <li><strong>3 categorical features:</strong> function, organism, family</li>
      </ul>
      <p>The data demonstrates automatic column detection and feature extraction.</p>
    </div>
  `,
};

export const CustomColumnMapping: Story = {
  args: {
    allowDrop: true,
    autoLoad: false,
    columnMappings: {
      proteinId: 'uniprot_accession',
      projection_x: 'embedding_x',
      projection_y: 'embedding_y',
      projectionName: 't-SNE',
    },
  },
  render: (args) => html`
    <protspace-data-loader
      ?auto-load=${args.autoLoad}
      ?allow-drop=${args.allowDrop}
      .columnMappings=${args.columnMappings}
      @data-loaded=${(e: CustomEvent) => {
        console.log('Data with custom mapping loaded:', e.detail.data);
      }}
    ></protspace-data-loader>
    
    <div style="margin-top: 1rem; padding: 1rem; background: #fff3e0; border-radius: 4px;">
      <h4>Custom Column Mapping:</h4>
      <p>This configuration expects Arrow files with these column names:</p>
      <ul>
        <li><strong>uniprot_accession</strong> → protein IDs</li>
        <li><strong>embedding_x</strong> → x coordinates</li>
        <li><strong>embedding_y</strong> → y coordinates</li>
        <li><strong>Projection name:</strong> t-SNE</li>
      </ul>
      <p>Use this when your Arrow files have non-standard column names.</p>
    </div>
  `,
};

export const LoadingStates: Story = {
  render: () => html`
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
      <div>
        <h4>Normal State</h4>
        <protspace-data-loader allow-drop="true"></protspace-data-loader>
      </div>
      
      <div>
        <h4>Loading State (Simulated)</h4>
        <protspace-data-loader loading="true" allow-drop="true"></protspace-data-loader>
      </div>
    </div>
    
    <div style="margin-top: 2rem;">
      <h4>Error State (Simulated)</h4>
      <protspace-data-loader error="true" allow-drop="true"></protspace-data-loader>
    </div>
    
    <div style="margin-top: 1rem; padding: 1rem; background: #f5f5f5; border-radius: 4px;">
      <p><strong>Note:</strong> The loading and error states shown here are simulated for visual reference. 
      In actual usage, these states are automatically managed during file loading operations.</p>
    </div>
  `,
};

export const DropZoneOnly: Story = {
  args: {
    allowDrop: true,
    autoLoad: false,
  },
  render: (args) => html`
    <protspace-data-loader
      ?auto-load=${args.autoLoad}
      ?allow-drop=${args.allowDrop}
      style="width: 100%; min-height: 200px;"
      @data-loaded=${(e: CustomEvent) => {
        console.log('Dropped data loaded:', e.detail.data);
      }}
    ></protspace-data-loader>
    
    <div style="margin-top: 1rem; padding: 1rem; background: #e8f5e8; border-radius: 4px;">
      <h4>Drag & Drop Demo:</h4>
      <p>This component is optimized for drag and drop workflow:</p>
      <ul>
        <li>Drag an Arrow file (.arrow, .parquet, .feather) from your file system</li>
        <li>Drop it onto the dashed border area</li>
        <li>Watch automatic parsing and data extraction</li>
      </ul>
      <p><strong>Tip:</strong> You can also click to browse files if drag & drop isn't available.</p>
    </div>
  `,
};