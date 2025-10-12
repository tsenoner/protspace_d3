import type { PropertyValues } from 'lit';
import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import * as d3 from 'd3';

// Interfaces
interface Feature {
  values: string[];
  colors: string[];
  shapes: string[];
}

interface Projection {
  name: string;
  metadata?: Record<string, unknown>;
  data: [number, number][];
}

interface VisualizationData {
  protein_ids: string[];
  projections: Projection[];
  features: Record<string, Feature>;
  feature_data: Record<string, number[]>;
}

interface PlotDataPoint {
  id: string;
  x: number;
  y: number;
  featureValues: Record<string, string | null>;
  originalIndex: number;
}

// Constants
const DEFAULT_CONFIG = {
  width: 800,
  height: 600,
  margin: { top: 40, right: 40, bottom: 40, left: 40 },
  baseOpacity: 0.8,
  selectedOpacity: 1.0,
  fadedOpacity: 0.2,
  pointSize: 80,
  highlightedPointSize: 120,
  selectedPointSize: 150,
  zoomExtent: [0.1, 10] as [number, number],
};

const SHAPE_MAPPING: Record<string, d3.SymbolType> = {
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
};

@customElement('prot-scatter-plot')
export class ProtScatterPlot extends LitElement {
  // Define properties with static properties
  static properties = {
    // Data Properties
    data: { type: Object },
    selectedProjectionIndex: { type: Number },
    selectedFeature: { type: String },
    selectedProteinIds: { type: Array },
    highlightedProteinIds: { type: Array },
    hiddenFeatureValues: { type: Array },
    isolationMode: { type: Boolean },
    selectionMode: { type: Boolean },

    // Visual Properties
    width: { type: Number },
    height: { type: Number },
    baseOpacity: { type: Number },
    selectedOpacity: { type: Number },
    fadedOpacity: { type: Number },
  };

  // Use Light DOM for Tailwind compatibility
  createRenderRoot() {
    return this;
  }

  // Data Properties
  data: VisualizationData | null = null;
  selectedProjectionIndex = 0;
  selectedFeature = '';
  selectedProteinIds: string[] = [];
  highlightedProteinIds: string[] = [];
  hiddenFeatureValues: string[] = [];
  isolationMode = false;
  selectionMode = false;

  // Visual Properties
  width = DEFAULT_CONFIG.width;
  height = DEFAULT_CONFIG.height;
  baseOpacity = DEFAULT_CONFIG.baseOpacity;
  selectedOpacity = DEFAULT_CONFIG.selectedOpacity;
  fadedOpacity = DEFAULT_CONFIG.fadedOpacity;

  // Internal state
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;
  private mainGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
  private zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null;
  private isTransitioning = false;
  private prevProjectionIndex = 0;
  private plotData: PlotDataPoint[] = [];
  private scales: {
    x: d3.ScaleLinear<number, number>;
    y: d3.ScaleLinear<number, number>;
  } | null = null;
  private tooltipData: { x: number; y: number; protein: PlotDataPoint } | null = null;

  // Lifecycle methods
  connectedCallback() {
    super.connectedCallback();
    this.prevProjectionIndex = this.selectedProjectionIndex;
  }

  firstUpdated() {
    this.initializeSvg();
  }

  updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    // Check for projection changes
    if (
      changedProps.has('selectedProjectionIndex') &&
      this.prevProjectionIndex !== this.selectedProjectionIndex
    ) {
      this.isTransitioning = true;
      this.prevProjectionIndex = this.selectedProjectionIndex;
      // Schedule transition end after 750ms
      setTimeout(() => {
        this.isTransitioning = false;
        this.requestUpdate();
      }, 750);
    }

    // Process data
    if (
      changedProps.has('data') ||
      changedProps.has('selectedProjectionIndex') ||
      changedProps.has('isolationMode') ||
      changedProps.has('selectedProteinIds')
    ) {
      this.processData();
    }

    // Update visualization if necessary data is available
    if (this.svg && this.mainGroup && this.scales && this.plotData.length > 0) {
      // Create or update the visualization
      this.updateVisualization();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // Clean up D3 references
    if (this.svg) {
      this.svg.on('.zoom', null);
    }
    this.svg = null;
    this.mainGroup = null;
    this.zoomBehavior = null;
  }

  // D3 initialization
  private initializeSvg() {
    const svgElement = this.querySelector('svg');
    if (!svgElement) return;

    this.svg = d3.select(svgElement);

    // Create main group
    this.mainGroup = this.svg.append('g').attr('class', 'scatter-plot-container');

    // Create zoom behavior with correct typing
    this.zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent(DEFAULT_CONFIG.zoomExtent)
      .on('zoom', (event) => {
        if (this.mainGroup) {
          this.mainGroup.attr('transform', event.transform);
        }
      });

    // Apply zoom with proper type casting
    if (this.svg && this.zoomBehavior) {
      this.svg.call(
        this.zoomBehavior as unknown as (
          selection: d3.Selection<SVGSVGElement, unknown, null, undefined>
        ) => void
      );
    }

    // Add reset view button
    this.addResetViewButton();
  }

  private addResetViewButton() {
    if (!this.svg) return;

    const resetButtonGroup = this.svg
      .append('g')
      .attr('class', 'reset-view-button')
      .attr(
        'transform',
        `translate(${this.width - DEFAULT_CONFIG.margin.right - 40}, ${
          DEFAULT_CONFIG.margin.top + 10
        })`
      )
      .attr('cursor', 'pointer')
      .on('click', () => this.resetView());

    // Button background
    resetButtonGroup
      .append('rect')
      .attr('width', 34)
      .attr('height', 34)
      .attr('rx', 6)
      .attr('fill', 'rgba(255,255,255,0.9)')
      .attr('stroke', '#aaa')
      .attr('stroke-width', 1);

    // Reset icon
    resetButtonGroup
      .append('path')
      .attr('d', 'M7,17 A8,8 0 1 1 17,27 M17,27 L13,23 M17,27 L21,23')
      .attr('fill', 'none')
      .attr('stroke', '#666')
      .attr('stroke-width', 2);

    // Text label
    resetButtonGroup
      .append('text')
      .attr('x', 17)
      .attr('y', 46)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#666')
      .text('Reset View');
  }

  // Data processing
  private processData() {
    if (!this.data || !this.data.projections[this.selectedProjectionIndex]) {
      this.plotData = [];
      this.scales = null;
      return;
    }

    // Process protein data
    this.plotData = this.data.protein_ids.map((id, index) => {
      // Get coordinates from selected projection
      const coordinates = this.data!.projections[this.selectedProjectionIndex].data[index];

      // Map feature values for this protein
      const featureValues: Record<string, string | null> = {};
      Object.keys(this.data!.features).forEach((featureKey) => {
        const featureIndex = this.data!.feature_data[featureKey][index];
        featureValues[featureKey] = this.data!.features[featureKey].values[featureIndex] || null;
      });

      return {
        id,
        x: coordinates[0],
        y: coordinates[1],
        featureValues,
        originalIndex: index,
      };
    });

    // Filter data if in isolation mode
    if (this.isolationMode) {
      this.plotData = this.plotData.filter((p) => this.selectedProteinIds.includes(p.id));
    }

    // Create scales if there's data
    if (this.plotData.length > 0) {
      this.createScales();
    }
  }

  private createScales() {
    // Create scales
    const xExtent = d3.extent(this.plotData, (d) => d.x) as [number, number];
    const yExtent = d3.extent(this.plotData, (d) => d.y) as [number, number];

    // Add padding to the ranges
    const xPadding = Math.abs(xExtent[1] - xExtent[0]) * 0.05;
    const yPadding = Math.abs(yExtent[1] - yExtent[0]) * 0.05;

    this.scales = {
      x: d3
        .scaleLinear()
        .domain([xExtent[0] - xPadding, xExtent[1] + xPadding])
        .range([DEFAULT_CONFIG.margin.left, this.width - DEFAULT_CONFIG.margin.right]),

      y: d3
        .scaleLinear()
        .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
        .range([this.height - DEFAULT_CONFIG.margin.bottom, DEFAULT_CONFIG.margin.top]),
    };
  }

  // Visual properties calculation
  private getColor(protein: PlotDataPoint): string {
    if (!this.data || !this.data.features[this.selectedFeature]) return '#888';

    const featureValue = protein.featureValues[this.selectedFeature];
    if (featureValue === null) return '#888';

    const valueIndex = this.data.features[this.selectedFeature].values.indexOf(featureValue);
    return valueIndex === -1 ? '#888' : this.data.features[this.selectedFeature].colors[valueIndex];
  }

  private getShape(protein: PlotDataPoint): d3.SymbolType {
    if (!this.data || !this.data.features[this.selectedFeature]) return d3.symbolCircle;

    const featureValue = protein.featureValues[this.selectedFeature];
    if (featureValue === null) return d3.symbolCircle;

    const valueIndex = this.data.features[this.selectedFeature].values.indexOf(featureValue);
    if (valueIndex === -1) return d3.symbolCircle;

    const shapeName = this.data.features[this.selectedFeature].shapes[valueIndex];
    return SHAPE_MAPPING[shapeName] || d3.symbolCircle;
  }

  private getOpacity(protein: PlotDataPoint): number {
    // Get the feature value for this protein
    const featureValue = protein.featureValues[this.selectedFeature];

    // If this feature value is hidden, return 0
    if (featureValue !== null && this.hiddenFeatureValues.includes(featureValue)) {
      return 0;
    }

    if (
      this.highlightedProteinIds.includes(protein.id) ||
      this.selectedProteinIds.includes(protein.id)
    ) {
      return this.selectedOpacity;
    }

    if (this.selectedProteinIds.length > 0 && !this.selectedProteinIds.includes(protein.id)) {
      return this.fadedOpacity;
    }

    return this.baseOpacity;
  }

  private getSize(protein: PlotDataPoint): number {
    if (this.selectedProteinIds.includes(protein.id)) {
      return DEFAULT_CONFIG.selectedPointSize;
    }
    if (this.highlightedProteinIds.includes(protein.id)) {
      return DEFAULT_CONFIG.highlightedPointSize;
    }
    return DEFAULT_CONFIG.pointSize;
  }

  private getStrokeWidth(protein: PlotDataPoint): number {
    if (this.selectedProteinIds.includes(protein.id)) {
      return 3; // Thicker border for selected proteins
    }
    if (this.highlightedProteinIds.includes(protein.id)) {
      return 2; // Medium border for highlighted proteins
    }
    return 1; // Default border width
  }

  private getStrokeColor(protein: PlotDataPoint): string {
    if (this.selectedProteinIds.includes(protein.id)) {
      return '#FF5500'; // Orange-red border for selected proteins
    }
    if (this.highlightedProteinIds.includes(protein.id)) {
      return '#3B82F6'; // Blue border for highlighted proteins
    }
    return '#333333'; // Default dark gray border
  }

  // D3 visualization update
  private updateVisualization() {
    if (!this.mainGroup || !this.scales) return;

    // Transition duration - longer when switching projections
    const transitionDuration = this.isTransitioning ? 750 : 250;
    const t = d3.transition().duration(transitionDuration);

    // Select all points with their data
    const points = this.mainGroup
      .selectAll<SVGPathElement, PlotDataPoint>('.protein-point')
      .data(this.plotData, (d) => d.id);

    // Remove exiting points
    points.exit().transition(t).attr('opacity', 0).remove();

    // Add new points
    const enterPoints = points
      .enter()
      .append('path')
      .attr('class', 'protein-point')
      .attr('d', (d) => d3.symbol().type(this.getShape(d)).size(this.getSize(d))())
      .attr('fill', (d) => this.getColor(d))
      .attr('stroke', (d) => this.getStrokeColor(d))
      .attr('stroke-width', (d) => this.getStrokeWidth(d))
      .attr('opacity', 0) // Start invisible for transition
      .attr('transform', (d) => `translate(${this.scales!.x(d.x)}, ${this.scales!.y(d.y)})`)
      .attr('cursor', 'pointer')
      .attr('data-protein-id', (d) => d.id)
      .on('mouseover', (event, d) => this.handleProteinMouseOver(event, d))
      .on('mouseout', (event, d) => this.handleProteinMouseOut(event, d))
      .on('click', (event, d) => this.handleProteinClick(event, d));

    // Fade in new points
    enterPoints.transition(t).attr('opacity', (d) => this.getOpacity(d));

    // Update existing points
    points
      .transition(t)
      .attr('d', (d) => d3.symbol().type(this.getShape(d)).size(this.getSize(d))())
      .attr('fill', (d) => this.getColor(d))
      .attr('opacity', (d) => this.getOpacity(d))
      .attr('stroke', (d) => this.getStrokeColor(d))
      .attr('stroke-width', (d) => this.getStrokeWidth(d))
      .attr('transform', (d) => `translate(${this.scales!.x(d.x)}, ${this.scales!.y(d.y)})`);
  }

  // Event handlers
  private handleProteinMouseOver(event: MouseEvent, protein: PlotDataPoint) {
    if (!this.mainGroup) return;

    d3.select(event.currentTarget as Element)
      .transition()
      .duration(100)
      .attr('stroke-width', this.getStrokeWidth(protein) + 1);

    this.tooltipData = {
      x: event.pageX,
      y: event.pageY,
      protein,
    };

    this.requestUpdate();

    // Dispatch hover event
    this.dispatchEvent(
      new CustomEvent('protein-hover', {
        detail: { proteinId: protein.id },
        bubbles: true,
      })
    );
  }

  private handleProteinMouseOut(event: MouseEvent, protein: PlotDataPoint) {
    if (!this.mainGroup) return;

    d3.select(event.currentTarget as Element)
      .transition()
      .duration(100)
      .attr('stroke-width', this.getStrokeWidth(protein));

    this.tooltipData = null;
    this.requestUpdate();

    // Dispatch hover end event
    this.dispatchEvent(
      new CustomEvent('protein-hover', {
        detail: { proteinId: null },
        bubbles: true,
      })
    );
  }

  private handleProteinClick(event: MouseEvent, protein: PlotDataPoint) {
    if (!this.selectionMode) return;

    // Dispatch click event
    this.dispatchEvent(
      new CustomEvent('protein-click', {
        detail: { proteinId: protein.id },
        bubbles: true,
      })
    );

    // Animate the selection with a quick pulse effect
    d3.select(event.currentTarget as Element)
      .transition()
      .duration(150)
      .attr('stroke-width', 5)
      .attr('stroke-opacity', 1)
      .transition()
      .duration(150)
      .attr('stroke-width', this.getStrokeWidth(protein))
      .attr('stroke-opacity', 0.8);

    // Dispatch structure view event
    this.dispatchEvent(
      new CustomEvent('view-structure', {
        detail: { proteinId: protein.id },
        bubbles: true,
      })
    );
  }

  // Public methods
  public resetView() {
    if (this.svg && this.zoomBehavior) {
      this.svg
        .transition()
        .duration(750)
        .call(
          this.zoomBehavior.transform as unknown as (
            transition: d3.Transition<SVGSVGElement, unknown, null, undefined>,
            ...args: unknown[]
          ) => void,
          d3.zoomIdentity
        );
    }
  }

  // Render method
  render() {
    return html`
      <div class="relative w-full h-full">
        <svg
          width="${this.width}"
          height="${this.height}"
          class="bg-white border rounded-md shadow-sm dark:bg-gray-900 dark:border-gray-800"
        ></svg>

        ${this.isTransitioning || !this.plotData.length
          ? html`
              <div
                class="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 dark:bg-gray-900 dark:bg-opacity-70 z-10 rounded-md"
              >
                <div class="flex flex-col items-center">
                  <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                  <p class="mt-2 text-gray-600 dark:text-gray-300">
                    ${this.isTransitioning ? 'Changing projection...' : 'Loading data...'}
                  </p>
                </div>
              </div>
            `
          : ''}
        ${this.tooltipData
          ? html`
              <div
                class="absolute z-10 p-2 bg-white rounded shadow-md border text-sm dark:bg-gray-800 dark:border-gray-700"
                style="left: ${this.tooltipData.x + 10}px; top: ${this.tooltipData.y -
                10}px; pointer-events: none;"
              >
                <div class="font-bold">${this.tooltipData.protein.id}</div>
                <div class="text-xs">
                  ${this.selectedFeature}:
                  ${this.tooltipData.protein.featureValues[this.selectedFeature] || 'N/A'}
                </div>
              </div>
            `
          : ''}
      </div>
    `;
  }
}
