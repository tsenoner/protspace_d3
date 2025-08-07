import { LitElement, html } from "lit";
import { customElement, property, state, query } from "lit/decorators.js";
import * as d3 from "d3";
import type { VisualizationData, PlotDataPoint, ScatterplotConfig } from "@protspace/utils";
import { DataProcessor, getSymbolType } from "@protspace/utils";
import { scatterplotStyles } from "./scatterplot.styles";

// Default configuration
const DEFAULT_CONFIG: Required<ScatterplotConfig> = {
  width: 800,
  height: 600,
  margin: { top: 40, right: 40, bottom: 40, left: 40 },
  pointSize: 80,
  highlightedPointSize: 120,
  selectedPointSize: 150,
  zoomExtent: [0.1, 10],
  baseOpacity: 0.8,
  selectedOpacity: 1.0,
  fadedOpacity: 0.2,
  transitionDuration: 250,
  largeDatasetThreshold: 5000,
  fastRenderingThreshold: 10000,
  enableTransitions: false,
  useSimpleShapes: false,
  maxPointsForComplexShapes: 2000,
};

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
  @property({ type: String }) selectedFeature = "family";
  @property({ type: Array }) highlightedProteinIds: string[] = [];
  @property({ type: Array }) selectedProteinIds: string[] = [];
  @property({ type: Boolean }) isolationMode = false;
  @property({ type: Boolean }) selectionMode = false;
  @property({ type: Array }) hiddenFeatureValues: string[] = [];
  @property({ type: Object }) config: Partial<ScatterplotConfig> = {};
  @property({ type: Boolean }) useCanvas = true;
  @property({ type: Boolean }) enableVirtualization = false;

  // State
  @state() private _plotData: PlotDataPoint[] = [];
  @state() private _tooltipData: { x: number; y: number; protein: PlotDataPoint } | null = null;
  @state() private _mergedConfig = DEFAULT_CONFIG;
  @state() private _transform = d3.zoomIdentity;
  @state() private _splitMode = false;
  @state() private _splitHistory: string[][] = [];
  @state() private _currentData: VisualizationData | null = null;

  // Internal split state
  @state() private _internalSplitHistory: string[][] = [];
  @state() private _internalIsolationMode = false;

  // Queries
  @query("canvas") private _canvas?: HTMLCanvasElement;
  @query("svg") private _svg!: SVGSVGElement;

  // Internal
  private _quadtree: d3.Quadtree<PlotDataPoint> | null = null;
  private resizeObserver: ResizeObserver;
  private _zoom: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null;
  private _svgSelection: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;
  private _mainGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
  private _brushGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
  private _brush: d3.BrushBehavior<unknown> | null = null;
  private _renderTimeout: number | null = null; // Added for debouncing

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

    if (changedProperties.has("data") || changedProperties.has("selectedProjectionIndex")) {
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
      this._mergedConfig = { ...DEFAULT_CONFIG, ...this.config };
    }
    if (changedProperties.has("selectionMode")) {
      this._updateSelectionMode();
    }
    this._renderPlot();
  }

  firstUpdated() {
    this._initializeInteractions();
    this._updateSizeAndRender();
  }

  private _processData() {
    const dataToUse = this._currentData || this.data;
    if (!dataToUse) return;
    this._plotData = DataProcessor.processVisualizationData(dataToUse, this.selectedProjectionIndex, this._internalIsolationMode, this._internalSplitHistory);
  }

  private _buildQuadtree() {
    if (!this._plotData.length || !this._scales) return;
    this._quadtree = d3.quadtree<PlotDataPoint>()
      .x(d => this._scales!.x(d.x))
      .y(d => this._scales!.y(d.y))
      .addAll(this._plotData);
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
  }

  private _updateSizeAndRender() {
    const width = this.clientWidth || 800;
    const height = this.clientHeight || 600;
    
    if (this._canvas) {
      this._setupHighDPICanvas(this._canvas, width, height);
    }
    
    if (this._svg) {
      this._svg.setAttribute("width", width.toString());
      this._svg.setAttribute("height", height.toString());
    }
    
    this._mergedConfig = { ...this._mergedConfig, width, height };
    this._renderPlot();
  }

  /**
   * Setup high-DPI canvas for crisp rendering on retina displays
   */
  private _setupHighDPICanvas(canvas: HTMLCanvasElement, width: number, height: number) {
    const dpr = window.devicePixelRatio || 1;
    
    // Set the internal canvas dimensions based on device pixel ratio
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    
    // Set the CSS size to maintain layout
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    
    // Scale the context to account for device pixel ratio
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
      
      // Enable anti-aliasing and image smoothing for better quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Set line cap and join for better stroke rendering
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
    
    console.log(`🖥️ Canvas setup: ${width}x${height}px (${canvas.width}x${canvas.height} internal, DPR: ${dpr})`);
  }

  /**
   * Apply high-quality rendering settings to canvas context
   */
  private _applyCanvasQualitySettings(ctx: CanvasRenderingContext2D) {
    // Enable anti-aliasing and image smoothing for better quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Set line cap and join for better stroke rendering
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }

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

    const dataSize = this._plotData.length;
    console.log(`🎯 Rendering ${dataSize} data points using canvas...`);

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
    if (!this._canvas || !this._scales) return;
    
    const ctx = this._canvas.getContext("2d");
    if (!ctx) return;

    // Clear the entire canvas (using internal dimensions)
    ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    
    // Apply zoom/pan transform
    ctx.save();
    ctx.translate(this._transform.x, this._transform.y);
    ctx.scale(this._transform.k, this._transform.k);

    // Ensure high-quality rendering settings are applied
    this._applyCanvasQualitySettings(ctx);

    // Group points by style for batch rendering (much faster)
    const pointGroups = new Map<string, PlotDataPoint[]>();
    
    this._plotData.forEach(point => {
      const opacity = this._getOpacity(point);
      if (opacity === 0) return; // Skip hidden points
      
      const color = this._getColor(point);
      const size = Math.sqrt(this._getPointSize(point)) / 3;
      const strokeColor = this._getStrokeColor(point);
      const strokeWidth = this._getStrokeWidth(point);
      const key = `${color}_${size}_${strokeColor}_${strokeWidth}_${opacity}`;
      
      if (!pointGroups.has(key)) {
        pointGroups.set(key, []);
      }
      pointGroups.get(key)!.push(point);
    });

    // Render each group in a batch for better performance
    pointGroups.forEach((points, styleKey) => {
      if (points.length === 0) return;
      
      const [color, size, strokeColor, strokeWidth, opacity] = styleKey.split('_');
      const pointSize = parseFloat(size);
      const lineWidth = parseFloat(strokeWidth);
      
      ctx.globalAlpha = parseFloat(opacity);
      ctx.fillStyle = color;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth / this._transform.k; // Adjust stroke width for zoom
      
      // Draw all points in this group
      ctx.beginPath();
      points.forEach(point => {
        const x = this._scales!.x(point.x);
        const y = this._scales!.y(point.y);
        ctx.moveTo(x + pointSize, y);
        ctx.arc(x, y, pointSize, 0, 2 * Math.PI);
      });
      ctx.fill();
      
      if (lineWidth > 0) {
        ctx.stroke();
      }
    });

    ctx.restore();

    // Clear SVG elements when using canvas
    this._mainGroup?.selectAll(".protein-point").remove();
    
    console.log(`✅ Canvas rendering completed for ${this._plotData.length} points`);
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
    if (!this.data || !this.selectedFeature) return d3.symbolCircle;

    const featureValue = point.featureValues[this.selectedFeature];
    if (featureValue === null) return d3.symbolCircle;

    const feature = this.data.features[this.selectedFeature];
    if (!feature || !feature.shapes) return d3.symbolCircle;

    const valueIndex = feature.values.indexOf(featureValue);
    if (valueIndex === -1) return d3.symbolCircle;

    const shapeName = feature.shapes[valueIndex];
    return getSymbolType(shapeName);
  }

  private _getColor(point: PlotDataPoint): string {
    if (!this.data || !this.selectedFeature) return "#888888";
    const featureValue = point.featureValues[this.selectedFeature];
    if (featureValue === null) return "#888888";
    const feature = this.data.features[this.selectedFeature];
    return feature.colors[feature.values.indexOf(featureValue)] || "#888888";
  }

  private _getPointSize(point: PlotDataPoint): number {
    if (this.selectedProteinIds.includes(point.id)) return this._mergedConfig.selectedPointSize;
    if (this.highlightedProteinIds.includes(point.id)) return this._mergedConfig.highlightedPointSize;
    return this._mergedConfig.pointSize;
  }

  private _getOpacity(point: PlotDataPoint): number {
    const config = this._mergedConfig;
    const featureValue = point.featureValues[this.selectedFeature];
    if (
      (featureValue !== null && this.hiddenFeatureValues.includes(featureValue)) ||
      (featureValue === null && this.hiddenFeatureValues.includes("null"))
    ) return 0;
    if (this.highlightedProteinIds.includes(point.id) || this.selectedProteinIds.includes(point.id)) {
      return config.selectedOpacity;
    }
    if (this.selectedProteinIds.length > 0 && !this.selectedProteinIds.includes(point.id)) {
      return config.fadedOpacity;
    }
    return config.baseOpacity;
  }

  private _getStrokeColor(point: PlotDataPoint): string {
    if (this.selectedProteinIds.includes(point.id)) return "var(--protspace-selection-color, #FF5500)";
    if (this.highlightedProteinIds.includes(point.id)) return "var(--protspace-highlight-color, #3B82F6)";
    return "var(--protspace-default-stroke, #333333)";
  }

  private _getStrokeWidth(point: PlotDataPoint): number {
    if (this.selectedProteinIds.includes(point.id)) return 3;
    if (this.highlightedProteinIds.includes(point.id)) return 2;
    return 1;
  }

  private _handleMouseOver(event: MouseEvent, point: PlotDataPoint) {
    this._tooltipData = {
      x: event.pageX,
      y: event.pageY,
      protein: point,
    };

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
    if (!this._quadtree || !this._scales) return;

    const [mouseX, mouseY] = d3.pointer(event);
    
    // Transform mouse coordinates to data space
    const dataX = (mouseX - this._transform.x) / this._transform.k;
    const dataY = (mouseY - this._transform.y) / this._transform.k;

    // Find nearest point using spatial index
    const searchRadius = 15 / this._transform.k; // Search radius adjusted for zoom
    const nearestPoint = this._quadtree.find(dataX, dataY, searchRadius);

    if (nearestPoint) {
      // Calculate actual distance to verify it's within the point
      const pointX = this._scales.x(nearestPoint.x);
      const pointY = this._scales.y(nearestPoint.y);
      const distance = Math.sqrt(
        Math.pow(dataX - pointX, 2) + Math.pow(dataY - pointY, 2)
      );
      const pointRadius = Math.sqrt(this._getPointSize(nearestPoint)) / 3 / this._transform.k;

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
    if (!this._quadtree || !this._scales) return;

    const [mouseX, mouseY] = d3.pointer(event);
    
    // Transform mouse coordinates to data space
    const dataX = (mouseX - this._transform.x) / this._transform.k;
    const dataY = (mouseY - this._transform.y) / this._transform.k;

    // Find nearest point using spatial index
    const searchRadius = 15 / this._transform.k;
    const nearestPoint = this._quadtree.find(dataX, dataY, searchRadius);

    if (nearestPoint) {
      // Calculate actual distance to verify it's within the point
      const pointX = this._scales.x(nearestPoint.x);
      const pointY = this._scales.y(nearestPoint.y);
      const distance = Math.sqrt(
        Math.pow(dataX - pointX, 2) + Math.pow(dataY - pointY, 2)
      );
      const pointRadius = Math.sqrt(this._getPointSize(nearestPoint)) / 3 / this._transform.k;

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
      console.log(`⚡ Configured for FAST performance mode (${dataSize} points) - Canvas enabled`);
    } else if (mode === "auto" || dataSize > config.largeDatasetThreshold) {
      this.useCanvas = true; // Always prefer canvas for better performance
      config.enableTransitions = false;
      console.log(`⚖️ Configured for BALANCED performance mode (${dataSize} points) - Canvas enabled`);
    } else {
      this.useCanvas = true; // Canvas is fast even for small datasets
      config.enableTransitions = false; // Canvas doesn't use transitions
      config.useSimpleShapes = false;
      console.log(`✨ Configured for QUALITY performance mode (${dataSize} points) - Canvas enabled`);
    }
    
    this._mergedConfig = config;
    this.requestUpdate();
  }

  getCurrentData(): VisualizationData | null {
    return this._currentData || this.data;
  }

  isInSplitMode(): boolean {
    return this._splitMode;
  }

  enterSplitMode(selectedIds: string[]) {
    this._splitMode = true;
    this._splitHistory.push([...selectedIds]);
    this.dispatchEvent(new CustomEvent("split-state-change", {
      detail: { splitMode: true, selectedIds, splitHistory: this._splitHistory },
      bubbles: true,
    }));
    this.requestUpdate();
  }

  createNestedSplit(selectedIds: string[]) {
    if (this._splitMode) {
      this._splitHistory.push([...selectedIds]);
      this.dispatchEvent(new CustomEvent("split-state-change", {
        detail: { splitMode: true, selectedIds, splitHistory: this._splitHistory },
        bubbles: true,
      }));
      this.requestUpdate();
    }
  }

  exitSplitMode() {
    this._splitMode = false;
    this._splitHistory = [];
    this._currentData = null;
    this.dispatchEvent(new CustomEvent("split-state-change", {
      detail: { splitMode: false, selectedIds: [], splitHistory: [] },
      bubbles: true,
    }));
    this.requestUpdate();
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
        ${this._splitMode ? html`
          <div class="mode-indicator" style="z-index: 10;">Split Mode</div>
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