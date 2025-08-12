import { LitElement, html } from "lit";
import { customElement, property, state, query } from "lit/decorators.js";
import * as d3 from "d3";
import type { VisualizationData, PlotDataPoint, ScatterplotConfig } from "@protspace/utils";
import { DataProcessor } from "@protspace/utils";
import { scatterplotStyles } from "./scatter-plot.styles";
import { DEFAULT_CONFIG } from "./config";
import { createStyleGetters } from "./style-getters";
import { CanvasRenderer } from "./canvas-renderer";
import { QuadtreeIndex } from "./quadtree-index";

// Default configuration moved to config.ts

/**
 * High-performance canvas-based scatterplot component for up to 100k points.
 * Uses canvas for rendering and SVG overlay for interactions.
 */
@customElement("protspace-scatterplot")
export class ProtspaceScatterplot extends LitElement {
  static styles = scatterplotStyles;

  // Properties
  @property({ type: Object }) data: VisualizationData | null = null;
  @property({ type: Number }) selectedProjectionIndex = 0;
  @property({ type: String }) projectionPlane: 'xy' | 'xz' | 'yz' = 'xy';
  @property({ type: String }) selectedFeature = "family";
  @property({ type: Array }) highlightedProteinIds: string[] = [];
  @property({ type: Array }) selectedProteinIds: string[] = [];
  @property({ type: Boolean }) selectionMode = false;
  @property({ type: Array }) hiddenFeatureValues: string[] = [];
  @property({ type: Array }) otherFeatureValues: string[] = [];
  @property({ type: Boolean }) useShapes: boolean = false;
  @property({ type: Object }) config: Partial<ScatterplotConfig> = {};
  @property({ type: Boolean }) useCanvas = true;
  @property({ type: Boolean }) enableVirtualization = false;

  // State
  @state() private _plotData: PlotDataPoint[] = [];
  @state() private _tooltipData: { x: number; y: number; protein: PlotDataPoint } | null = null;
  @state() private _mergedConfig = DEFAULT_CONFIG;
  @state() private _transform = d3.zoomIdentity;
  

  // Queries
  @query("canvas") private _canvas?: HTMLCanvasElement;
  @query("svg") private _svg!: SVGSVGElement;

  // Internal
  private _quadtreeIndex: QuadtreeIndex = new QuadtreeIndex();
  private resizeObserver: ResizeObserver;
  private _zoom: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null;
  private _svgSelection: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;
  private _mainGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
  private _brushGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
  private _brush: d3.BrushBehavior<unknown> | null = null;
  private _renderTimeout: number | null = null;
  private _canvasRenderer: CanvasRenderer | null = null;

  // Computed properties
  private get _scales() {
    const config = this._mergedConfig;
    return DataProcessor.createScales(
      this._plotData,
      config.width,
      config.height,
      config.margin
    );
  }

  constructor() {
    super();
    this.resizeObserver = new ResizeObserver(() => this._updateSizeAndRender());
  }

  connectedCallback() {
    super.connectedCallback();
    this.resizeObserver.observe(this);
  }

  disconnectedCallback() {
    this.resizeObserver.disconnect();
    super.disconnectedCallback();
  }

  updated(changedProperties: Map<string, any>) {
    // Clear any pending render timeout to avoid inconsistent states
    if (this._renderTimeout) {
      clearTimeout(this._renderTimeout);
      this._renderTimeout = null;
    }

    if (changedProperties.has("data") || changedProperties.has("selectedProjectionIndex") || changedProperties.has('projectionPlane')) {
      this._processData();
      this._buildQuadtree();
      
      // Dispatch data-change event for auto-sync with control bar and other components
      if (changedProperties.has("data") && this.data) {
        this.dispatchEvent(new CustomEvent("data-change", {
          detail: { data: this.data },
          bubbles: true,
          composed: true,
        }));
      }
    }
    if (changedProperties.has("config")) {
      const prev = this._mergedConfig;
      this._mergedConfig = { ...DEFAULT_CONFIG, ...prev, ...this.config };
    }
    if (
      changedProperties.has('selectedFeature') ||
      changedProperties.has('hiddenFeatureValues') ||
      changedProperties.has('otherFeatureValues')
    ) {
      this._buildQuadtree();
    }
    if (changedProperties.has("selectionMode")) {
      this._updateSelectionMode();
    }
    this._renderPlot();
  }

  firstUpdated() {
    this._initializeInteractions();
    this._updateSizeAndRender();
    if (this._canvas) {
      this._canvasRenderer = new CanvasRenderer(
        this._canvas,
        () => this._scales,
        () => this._transform,
        {
          getColor: (p: PlotDataPoint) => this._getColor(p),
          getPointSize: (p: PlotDataPoint) => this._getPointSize(p),
          getOpacity: (p: PlotDataPoint) => this._getOpacity(p),
          getStrokeColor: (p: PlotDataPoint) => this._getStrokeColor(p),
          getStrokeWidth: (p: PlotDataPoint) => this._getStrokeWidth(p),
          getShape: (p: PlotDataPoint) => this._getPointShape(p),
        }
      );
    }
  }

  private _processData() {
    const dataToUse = this.data;
    if (!dataToUse) return;
    this._plotData = DataProcessor.processVisualizationData(
      dataToUse,
      this.selectedProjectionIndex,
      false,
      undefined,
      this.projectionPlane
    );
  }

  private _buildQuadtree() {
    if (!this._plotData.length || !this._scales) return;
    const visiblePoints = this._plotData.filter((d) => this._getOpacity(d) > 0);
    this._quadtreeIndex.setScales(this._scales);
    this._quadtreeIndex.rebuild(visiblePoints);
  }

  private _initializeInteractions() {
    if (!this._svg) return;
    
    this._svgSelection = d3.select(this._svg);
    
    // Clear existing content
    this._svgSelection.selectAll("*").remove();
    
    // Create main container group
    this._mainGroup = this._svgSelection
      .append("g")
      .attr("class", "scatter-plot-container");
    
    // Create brush group
    this._brushGroup = this._svgSelection
      .append("g")
      .attr("class", "brush-container");

    this._zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent(this._mergedConfig.zoomExtent)
      .on("zoom", (event) => {
        this._transform = event.transform;
        if (this._mainGroup) {
          this._mainGroup.attr("transform", event.transform);
        }
        if (this._brushGroup) {
          this._brushGroup.attr("transform", event.transform);
        }
        // Debounce canvas rendering
        if (this.useCanvas && this._canvas) {
          if (this._renderTimeout) {
            clearTimeout(this._renderTimeout);
          }
          this._renderTimeout = window.setTimeout(() => {
            this._renderCanvas();
            this._renderTimeout = null;
          }, 200); // 200ms delay
        }
      });
    this._svgSelection.call(this._zoom);
    this._svgSelection.on("dblclick.zoom", null);
    this._svgSelection.on("dblclick.reset", (event: MouseEvent) => {
      event.preventDefault();
      this.resetZoom();
    });
  }

  private _updateSizeAndRender() {
    const width = this.clientWidth || 800;
    const height = this.clientHeight || 600;
    
    if (this._canvas) {
      if (!this._canvasRenderer) {
        this._canvasRenderer = new CanvasRenderer(
          this._canvas,
          () => this._scales,
          () => this._transform,
          {
            getColor: (p: PlotDataPoint) => this._getColor(p),
            getPointSize: (p: PlotDataPoint) => this._getPointSize(p),
            getOpacity: (p: PlotDataPoint) => this._getOpacity(p),
            getStrokeColor: (p: PlotDataPoint) => this._getStrokeColor(p),
            getStrokeWidth: (p: PlotDataPoint) => this._getStrokeWidth(p),
            getShape: (p: PlotDataPoint) => this._getPointShape(p),
          }
        );
      }
      this._canvasRenderer.setupHighDPICanvas(width, height);
    }
    
    if (this._svg) {
      this._svg.setAttribute("width", width.toString());
      this._svg.setAttribute("height", height.toString());
    }
    
    this._mergedConfig = { ...this._mergedConfig, width, height };
    this._renderPlot();
  }

  // HiDPI setup and quality moved to CanvasRenderer

  private _updateSelectionMode() {
    if (!this._svgSelection || !this._brushGroup || !this._scales) return;

    // Clear existing brush
    this._brushGroup.selectAll("*").remove();

    if (this.selectionMode) {
      // Disable zoom
      if (this._zoom) {
        this._svgSelection.on(".zoom", null);
      }

      // Create brush
      const config = this._mergedConfig;
      this._brush = d3
        .brush()
        .extent([
          [config.margin.left, config.margin.top],
          [
            config.width - config.margin.right,
            config.height - config.margin.bottom,
          ],
        ])
        .on("end", (event) => this._handleBrushEnd(event));

      this._brushGroup.call(this._brush);
    } else {
      // Re-enable zoom
      if (this._zoom) {
        this._svgSelection.call(this._zoom);
        this._svgSelection.on("dblclick.zoom", null);
        this._svgSelection.on("dblclick.reset", (event: MouseEvent) => {
          event.preventDefault();
          this.resetZoom();
        });
      }
      this._brush = null;
    }
  }

  private _handleBrushEnd(event: d3.D3BrushEvent<unknown>) {
    if (!event.selection || !this._scales) return;

    const [[x0, y0], [x1, y1]] = event.selection as [
      [number, number],
      [number, number]
    ];
    const selectedIds: string[] = [];

    this._plotData.forEach((d) => {
      if (this._getOpacity(d) === 0) return;
      const pointX = this._scales!.x(d.x);
      const pointY = this._scales!.y(d.y);

      if (pointX >= x0 && pointX <= x1 && pointY >= y0 && pointY <= y1) {
        selectedIds.push(d.id);
      }
    });

    if (selectedIds.length > 0) {
      this.selectedProteinIds = [...selectedIds];
      this._dispatchProteinSelection(selectedIds, true);
    }

    // Clear brush selection
    setTimeout(() => {
      if (this._brush && this._brushGroup) {
        this._brushGroup.call(this._brush.move, null);
      }
      if (this._zoom && this._svgSelection && !this.selectionMode) {
        this._svgSelection.call(this._zoom);
      }
    }, 100);
  }

  private _renderPlot() {
    if (!this._scales || this._plotData.length === 0) {
      return;
    }

    // Always prefer canvas for better performance
    if (this._canvas && this.useCanvas) {
      this._renderCanvas();
      // Setup canvas event handling for interactions
      this._setupCanvasEventHandling();
    } else {
      // Fallback to SVG only if canvas is explicitly disabled
      if (this._mainGroup) {
        this._renderSVG();
      }
    }
  }

  private _renderCanvas() {
    if (!this._canvasRenderer || !this._scales) return;
    this._canvasRenderer.render(this._plotData);
    this._mainGroup?.selectAll(".protein-point").remove();
  }

  private _renderSVG() {
    if (!this._mainGroup || !this._scales) return;

    const dataSize = this._plotData.length;
    const config = this._mergedConfig;
    const useSimpleShapes = dataSize > config.maxPointsForComplexShapes || config.useSimpleShapes;
    const enableTransitions = config.enableTransitions && dataSize < config.largeDatasetThreshold;

    // Clear any existing points
    this._mainGroup.selectAll(".protein-point").remove();

    // Create points
    const points = this._mainGroup
      .selectAll(".protein-point")
      .data(this._plotData, (d: any) => d.id);

    const enterPoints = points
      .enter()
      .append(useSimpleShapes ? "circle" : "path")
      .attr("class", "protein-point")
      .attr("cursor", "pointer")
      .on("mouseover", (event, d) => this._handleMouseOver(event, d))
      .on("mouseout", (event, d) => this._handleMouseOut(event, d))
      .on("click", (event, d) => this._handleClick(event, d));

    if (useSimpleShapes) {
      enterPoints
        .attr("r", (d) => Math.sqrt(this._getPointSize(d)) / 3)
        .attr("cx", (d) => this._scales!.x(d.x))
        .attr("cy", (d) => this._scales!.y(d.y));
    } else {
      enterPoints
        .attr("d", (d) => this._getPointPath(d))
        .attr("transform", (d) => `translate(${this._scales!.x(d.x)}, ${this._scales!.y(d.y)})`);
    }

    enterPoints
      .attr("fill", (d) => this._getColor(d))
      .attr("stroke", (d) => this._getStrokeColor(d))
      .attr("stroke-width", (d) => this._getStrokeWidth(d))
      .attr("opacity", enableTransitions ? 0 : (d) => this._getOpacity(d));

    if (enableTransitions) {
      enterPoints
        .transition()
        .duration(config.transitionDuration)
        .attr("opacity", (d) => this._getOpacity(d));
    }
  }

  private _getPointPath(point: PlotDataPoint): string {
    const shape = this._getPointShape(point);
    const size = this._getPointSize(point);
    return d3.symbol().type(shape).size(size)()!;
  }

  private _getPointShape(point: PlotDataPoint): d3.SymbolType {
    const getters = this._getStyleGetters();
    return getters.getPointShape(point);
  }

  private _getColor(point: PlotDataPoint): string {
    const getters = this._getStyleGetters();
    return getters.getColor(point);
  }

  private _getPointSize(point: PlotDataPoint): number {
    const getters = this._getStyleGetters();
    return getters.getPointSize(point);
  }

  private _getOpacity(point: PlotDataPoint): number {
    const getters = this._getStyleGetters();
    return getters.getOpacity(point);
  }

  private _getStrokeColor(point: PlotDataPoint): string {
    const getters = this._getStyleGetters();
    return getters.getStrokeColor(point);
  }

  private _getStrokeWidth(point: PlotDataPoint): number {
    const getters = this._getStyleGetters();
    return getters.getStrokeWidth(point);
  }

  private _getStyleGetters() {
    return createStyleGetters(this.data, {
      selectedProteinIds: this.selectedProteinIds,
      highlightedProteinIds: this.highlightedProteinIds,
      selectedFeature: this.selectedFeature,
      hiddenFeatureValues: this.hiddenFeatureValues,
      otherFeatureValues: this.otherFeatureValues,
      useShapes: this.useShapes,
      sizes: {
        base: this._mergedConfig.pointSize,
        highlighted: this._mergedConfig.highlightedPointSize,
        selected: this._mergedConfig.selectedPointSize,
      },
      opacities: {
        base: this._mergedConfig.baseOpacity,
        selected: this._mergedConfig.selectedOpacity,
        faded: this._mergedConfig.fadedOpacity,
      },
    });
  }

  private _getLocalPointerPosition(event: MouseEvent): { x: number; y: number } {
    const rect = this.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  private _handleMouseOver(event: MouseEvent, point: PlotDataPoint) {
    const { x, y } = this._getLocalPointerPosition(event);
    this._tooltipData = { x, y, protein: point };

    this.dispatchEvent(new CustomEvent("protein-hover", {
      detail: { proteinId: point.id, point },
      bubbles: true,
    }));
  }

  private _handleMouseOut(_event: MouseEvent, _point: PlotDataPoint) {
    this._tooltipData = null;
    this.dispatchEvent(new CustomEvent("protein-hover", {
      detail: { proteinId: null },
      bubbles: true,
    }));
  }

  private _handleClick(event: MouseEvent, point: PlotDataPoint) {
    this.dispatchEvent(new CustomEvent("protein-click", {
      detail: {
        proteinId: point.id,
        point,
        modifierKeys: { ctrl: event.ctrlKey, shift: event.shiftKey, alt: event.altKey },
      },
      bubbles: true,
    }));
  }

  private _dispatchProteinSelection(proteinIds: string[], isMultiple: boolean) {
    proteinIds.forEach(id => {
      const point = this._plotData.find(p => p.id === id);
      if (point) {
        this.dispatchEvent(new CustomEvent("protein-click", {
          detail: {
            proteinId: id,
            point,
            modifierKeys: { ctrl: isMultiple, shift: isMultiple, alt: false },
          },
          bubbles: true,
        }));
      }
    });
  }

  /**
   * Setup event handling for canvas-based rendering
   */
  private _setupCanvasEventHandling(): void {
    if (!this._svgSelection) return;

    // Use event delegation on the SVG overlay for canvas interactions
    this._svgSelection
      .on("mousemove.canvas", (event) => this._handleCanvasMouseMove(event))
      .on("click.canvas", (event) => this._handleCanvasClick(event))
      .on("mouseout.canvas", () => this._handleCanvasMouseOut());
  }

  /**
   * Handle mouse move events for canvas rendering
   */
  private _handleCanvasMouseMove(event: MouseEvent): void {
    if (!this._scales) return;

    const [mouseX, mouseY] = d3.pointer(event);
    
    // Transform mouse coordinates to data space
    const dataX = (mouseX - this._transform.x) / this._transform.k;
    const dataY = (mouseY - this._transform.y) / this._transform.k;

    // Find nearest point using spatial index
    const searchRadius = 15 / this._transform.k; // Search radius adjusted for zoom
    const nearestPoint = this._quadtreeIndex.findNearest(dataX, dataY, searchRadius);

    if (nearestPoint) {
      // Calculate actual distance to verify it's within the point
      const pointX = this._scales.x(nearestPoint.x);
      const pointY = this._scales.y(nearestPoint.y);
      const distance = Math.sqrt(
        Math.pow(dataX - pointX, 2) + Math.pow(dataY - pointY, 2)
      );
      const pointRadius = Math.sqrt(this._getPointSize(nearestPoint)) / 3;

      if (distance <= pointRadius) {
        this._handleMouseOver(event, nearestPoint);
        return;
      }
    }

    // No point found, clear tooltip if it exists
    if (this._tooltipData) {
      this._tooltipData = null;
    }
  }

  /**
   * Handle click events for canvas rendering
   */
  private _handleCanvasClick(event: MouseEvent): void {
    if (!this._scales) return;

    const [mouseX, mouseY] = d3.pointer(event);
    
    // Transform mouse coordinates to data space
    const dataX = (mouseX - this._transform.x) / this._transform.k;
    const dataY = (mouseY - this._transform.y) / this._transform.k;

    // Find nearest point using spatial index
    const searchRadius = 15 / this._transform.k;
    const nearestPoint = this._quadtreeIndex.findNearest(dataX, dataY, searchRadius);

    if (nearestPoint) {
      // Calculate actual distance to verify it's within the point
      const pointX = this._scales.x(nearestPoint.x);
      const pointY = this._scales.y(nearestPoint.y);
      const distance = Math.sqrt(
        Math.pow(dataX - pointX, 2) + Math.pow(dataY - pointY, 2)
      );
      const pointRadius = Math.sqrt(this._getPointSize(nearestPoint)) / 3;

      if (distance <= pointRadius) {
        this._handleClick(event, nearestPoint);
      }
    }
  }

  /**
   * Handle mouse out events for canvas rendering
   */
  private _handleCanvasMouseOut(): void {
    if (this._tooltipData) {
      this._tooltipData = null;
    }
  }

  // Public API Methods (these were missing in the original but are required by main.ts)
  configurePerformance(dataSize: number, mode: string = "auto") {
    const config = { ...this._mergedConfig };
    
    if (mode === "fast" || dataSize > config.fastRenderingThreshold) {
      this.useCanvas = true;
      this.enableVirtualization = true;
      config.enableTransitions = false;
      config.useSimpleShapes = true;
    } else if (mode === "auto" || dataSize > config.largeDatasetThreshold) {
      this.useCanvas = true; // Always prefer canvas for better performance
      config.enableTransitions = false;
    } else {
      this.useCanvas = true; // Canvas is fast even for small datasets
      config.enableTransitions = false; // Canvas doesn't use transitions
      config.useSimpleShapes = false;
    }
    
    this._mergedConfig = config;
    this.requestUpdate();
  }

  getCurrentData(): VisualizationData | null {
    return this.data;
  }

  resetZoom() {
    if (this._zoom && this._svgSelection) {
      this._svgSelection
        .transition()
        .duration(750)
        .call(this._zoom.transform, d3.zoomIdentity);
    }
  }

  render() {
    const config = this._mergedConfig;
    
    return html`
      <div class="container">
        <!-- Canvas for high-performance rendering (always visible for better performance) -->
        <canvas 
          style="position: absolute; top: 0; left: 0; pointer-events: none; z-index: 1;">
        </canvas>
        
        <!-- SVG overlay for interactions and UI elements -->
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 ${config.width} ${config.height}"
          style="position: absolute; top: 0; left: 0; max-width: ${config.width}px; max-height: ${config.height}px; z-index: 2; background: transparent;">
        </svg>
        
        ${this._tooltipData ? html`
          <div class="tooltip" style="left: ${this._tooltipData.x + 10}px; top: ${this._tooltipData.y - 60}px; z-index: 10;">
            <div class="tooltip-protein-id">${this._tooltipData.protein.id}</div>
            <div class="tooltip-feature">${this.selectedFeature}: ${this._tooltipData.protein.featureValues[this.selectedFeature] || "N/A"}</div>
          </div>
        ` : ""}
        ${this.selectionMode ? html`
          <div class="mode-indicator" style="z-index: 10;">Selection Mode</div>
        ` : ""}
        
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "protspace-scatterplot": ProtspaceScatterplot;
  }
}