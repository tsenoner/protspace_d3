import { LitElement, html, css } from "lit";
import { customElement, property, state, query } from "lit/decorators.js";
import * as d3 from "d3";

import type {
  VisualizationData,
  PlotDataPoint,
  ScatterplotConfig,
} from "@protspace/utils";
import { DataProcessor, getSymbolType } from "@protspace/utils";

// Default configuration
const DEFAULT_CONFIG: Required<ScatterplotConfig> = {
  width: 1100,
  height: 600,
  margin: { top: 40, right: 40, bottom: 40, left: 40 },
  pointSize: 80,
  highlightedPointSize: 120,
  selectedPointSize: 150,
  zoomExtent: [0.1, 10],
  baseOpacity: 0.8,
  selectedOpacity: 1.0,
  fadedOpacity: 0.2,
};

// Custom events
export interface ProteinClickEvent extends CustomEvent {
  detail: {
    proteinId: string;
    point: PlotDataPoint;
    modifierKeys: {
      ctrl: boolean;
      shift: boolean;
      alt: boolean;
    };
  };
}

export interface ProteinHoverEvent extends CustomEvent {
  detail: {
    proteinId: string | null;
    point?: PlotDataPoint;
  };
}

@customElement("protspace-scatterplot")
export class ProtspaceScatterplot extends LitElement {
  static styles = css`
    :host {
      /* Layout */
      --protspace-width: 100%;
      --protspace-height: 600px;
      --protspace-bg-color: #ffffff;
      --protspace-border-color: #e1e5e9;
      --protspace-border-radius: 8px;

      /* Points */
      --protspace-point-size: 80px;
      --protspace-point-size-highlighted: 120px;
      --protspace-point-size-selected: 150px;
      --protspace-point-opacity-base: 0.8;
      --protspace-point-opacity-selected: 1;
      --protspace-point-opacity-faded: 0.2;

      /* Selection */
      --protspace-selection-color: #ff5500;
      --protspace-highlight-color: #3b82f6;
      --protspace-default-stroke: #333333;
      --protspace-stroke-width-base: 1px;
      --protspace-stroke-width-highlighted: 2px;
      --protspace-stroke-width-selected: 3px;

      /* Transitions */
      --protspace-transition-duration: 0.2s;
      --protspace-transition-easing: ease-in-out;

      /* Tooltip */
      --protspace-tooltip-bg: rgba(255, 255, 255, 0.95);
      --protspace-tooltip-border: #e1e5e9;
      --protspace-tooltip-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);

      /* Brush */
      --protspace-brush-stroke: #3b82f6;
      --protspace-brush-fill: rgba(59, 130, 246, 0.15);

      display: block;
      width: var(--protspace-width);
      height: var(--protspace-height);
      position: relative;
      background: var(--protspace-bg-color);
      border: 1px solid var(--protspace-border-color);
      border-radius: var(--protspace-border-radius);
      overflow: hidden;
    }

    .container {
      width: 100%;
      height: 100%;
      position: relative;
    }

    svg {
      width: 100%;
      height: 100%;
      display: block;
    }

    .loading-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.8);
      z-index: 10;
    }

    .loading-spinner {
      width: 3rem;
      height: 3rem;
      border: 2px solid #e5e7eb;
      border-top: 2px solid #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }

    .mode-indicator {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      z-index: 10;
      padding: 0.5rem;
      background: #3b82f6;
      color: white;
      font-size: 0.75rem;
      border-radius: 0.375rem;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .tooltip {
      position: absolute;
      z-index: 20;
      padding: 0.5rem;
      background: var(--protspace-tooltip-bg);
      border: 1px solid var(--protspace-tooltip-border);
      border-radius: 0.375rem;
      box-shadow: var(--protspace-tooltip-shadow);
      font-size: 0.875rem;
      max-width: 200px;
      word-wrap: break-word;
      pointer-events: none;
    }

    .tooltip-protein-id {
      font-weight: bold;
      margin-bottom: 0.25rem;
    }

    .tooltip-feature {
      font-size: 0.75rem;
      color: #6b7280;
    }

    .tooltip-hint {
      font-size: 0.75rem;
      color: #9ca3af;
      margin-top: 0.25rem;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
  `;

  // Properties
  @property({ type: Object }) data: VisualizationData | null = null;
  @property({ type: Object }) config: Partial<ScatterplotConfig> = {};
  @property({ type: Number }) selectedProjectionIndex = 0;
  @property({ type: String }) selectedFeature = "";
  @property({ type: Array }) highlightedProteinIds: string[] = [];
  @property({ type: Array }) selectedProteinIds: string[] = [];
  @property({ type: Boolean }) isolationMode = false;
  @property({ type: Array }) splitHistory?: string[][];
  @property({ type: Boolean }) selectionMode = false;
  @property({ type: Array }) hiddenFeatureValues: string[] = [];

  // State
  @state() private _isLoading = false;
  @state() private _isTransitioning = false;
  @state() private _tooltipData: {
    x: number;
    y: number;
    protein: PlotDataPoint;
  } | null = null;
  // @ts-expect-error: _zoomTransform is set for state reactivity, value not directly read yet
  @state() private _zoomTransform: d3.ZoomTransform | null = null;

  // Refs
  @query("svg") private _svg!: SVGSVGElement;
  private _svgSelection: d3.Selection<
    SVGSVGElement,
    unknown,
    null,
    undefined
  > | null = null;
  private _mainGroup: d3.Selection<
    SVGGElement,
    unknown,
    null,
    undefined
  > | null = null;
  private _brushGroup: d3.Selection<
    SVGGElement,
    unknown,
    null,
    undefined
  > | null = null;
  private _zoom: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null;
  private _brush: d3.BrushBehavior<unknown> | null = null;

  // Computed properties
  private get _mergedConfig(): Required<ScatterplotConfig> {
    return { ...DEFAULT_CONFIG, ...this.config };
  }

  private get _plotData(): PlotDataPoint[] {
    if (!this.data) return [];

    return DataProcessor.processVisualizationData(
      this.data,
      this.selectedProjectionIndex,
      this.isolationMode,
      this.splitHistory
    );
  }

  private get _scales() {
    const config = this._mergedConfig;
    return DataProcessor.createScales(
      this._plotData,
      config.width,
      config.height,
      config.margin
    );
  }

  protected firstUpdated() {
    this._initializeSVG();
    this._initializeZoom();
    this._renderPlot();
  }

  protected updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has("selectedProjectionIndex")) {
      this._isTransitioning = true;
      setTimeout(() => {
        this._isTransitioning = false;
      }, 750);
    }

    if (changedProperties.has("selectionMode")) {
      this._updateSelectionMode();
    }

    if (
      changedProperties.has("data") ||
      changedProperties.has("selectedProjectionIndex") ||
      changedProperties.has("selectedFeature") ||
      changedProperties.has("highlightedProteinIds") ||
      changedProperties.has("selectedProteinIds") ||
      changedProperties.has("hiddenFeatureValues")
    ) {
      this._renderPlot();
    }
  }

  private _initializeSVG() {
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

    // Add reset button
    this._createResetButton();
  }

  private _initializeZoom() {
    if (!this._svgSelection) return;

    const config = this._mergedConfig;

    this._zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent(config.zoomExtent)
      .on("zoom", (event) => {
        if (this._mainGroup) {
          this._mainGroup.attr("transform", event.transform);
          if (this._brushGroup) {
            this._brushGroup.attr("transform", event.transform);
          }
          this._zoomTransform = event.transform;
        }
      });

    this._svgSelection.call(this._zoom);
  }

  private _createResetButton() {
    if (!this._svgSelection) return;

    const config = this._mergedConfig;

    const resetButton = this._svgSelection
      .append("g")
      .attr("class", "reset-view-button")
      .attr(
        "transform",
        `translate(${config.width - config.margin.right - 60}, ${
          config.margin.top + 10
        })`
      )
      .attr("cursor", "pointer")
      .on("click", () => this._resetZoom());

    // Button background
    resetButton
      .append("rect")
      .attr("width", 40)
      .attr("height", 40)
      .attr("rx", 6)
      .attr("fill", "rgba(255,255,255,0.9)")
      .attr("stroke", "#aaa")
      .attr("stroke-width", 1);

    // Reset icon
    resetButton
      .append("g")
      .attr("fill", "none")
      .attr("stroke", "#666")
      .attr("stroke-linecap", "round")
      .attr("stroke-linejoin", "round")
      .attr("transform", "translate(12, 10) scale(1.2)")
      .append("path")
      .attr(
        "d",
        "m3.98652376 1.07807068c-2.38377179 1.38514556-3.98652376 3.96636605-3.98652376 6.92192932 0 4.418278 3.581722 8 8 8s8-3.581722 8-8-3.581722-8-8-8"
      )
      .attr("transform", "matrix(0 1 1 0 0 0)")
      .attr("stroke-width", 1.2);
  }

  private _resetZoom() {
    if (this._zoom && this._svgSelection) {
      this._svgSelection
        .transition()
        .duration(750)
        .call(this._zoom.transform, d3.zoomIdentity);
    }
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
      this._dispatchProteinSelection(selectedIds, true);
    }

    // Clear brush selection
    if (this._brush && this._brushGroup) {
      this._brushGroup.call(this._brush.move, null);
    }

    // Re-enable zoom
    if (this._zoom && this._svgSelection) {
      this._svgSelection.call(this._zoom);
    }
  }

  private _renderPlot() {
    if (!this._mainGroup || !this._scales || this._plotData.length === 0) {
      this._isLoading = false;
      return;
    }

    this._isLoading = true;

    const transitionDuration = this._isTransitioning ? 750 : 250;

    // Update points using D3's enter/update/exit pattern
    const points = this._mainGroup
      .selectAll<SVGPathElement, PlotDataPoint>(".protein-point")
      .data(this._plotData, (d) => d.id);

    // Remove exiting points
    points
      .exit()
      .transition()
      .duration(transitionDuration)
      .attr("opacity", 0)
      .remove();

    // Add new points
    const enterPoints = points
      .enter()
      .append("path")
      .attr("class", "protein-point")
      .attr("d", (d) => this._getPointPath(d))
      .attr("fill", (d) => this._getPointColor(d))
      .attr("stroke", (d) => this._getStrokeColor(d))
      .attr("stroke-width", (d) => this._getStrokeWidth(d))
      .attr("opacity", 0)
      .attr(
        "transform",
        (d) => `translate(${this._scales!.x(d.x)}, ${this._scales!.y(d.y)})`
      )
      .attr("cursor", "pointer")
      .on("mouseover", (event, d) => this._handleMouseOver(event, d))
      .on("mouseout", (event, d) => this._handleMouseOut(event, d))
      .on("click", (event, d) => this._handleClick(event, d));

    // Fade in new points
    enterPoints
      .transition()
      .duration(transitionDuration)
      .attr("opacity", (d) => this._getOpacity(d));

    // Update existing points
    points
      .transition()
      .duration(transitionDuration)
      .attr("d", (d) => this._getPointPath(d))
      .attr("fill", (d) => this._getPointColor(d))
      .attr("opacity", (d) => this._getOpacity(d))
      .attr("stroke", (d) => this._getStrokeColor(d))
      .attr("stroke-width", (d) => this._getStrokeWidth(d))
      .attr(
        "transform",
        (d) => `translate(${this._scales!.x(d.x)}, ${this._scales!.y(d.y)})`
      );

    this._isLoading = false;
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

  private _getPointColor(point: PlotDataPoint): string {
    if (!this.data || !this.selectedFeature) return "#888888";

    const featureValue = point.featureValues[this.selectedFeature];
    if (featureValue === null) return "#888888";

    const feature = this.data.features[this.selectedFeature];
    if (!feature || !feature.colors) return "#888888";

    const valueIndex = feature.values.indexOf(featureValue);
    if (valueIndex === -1) return "#888888";

    return feature.colors[valueIndex] || "#888888";
  }

  private _getPointSize(point: PlotDataPoint): number {
    const config = this._mergedConfig;

    if (this.selectedProteinIds.includes(point.id)) {
      return config.selectedPointSize;
    }
    if (this.highlightedProteinIds.includes(point.id)) {
      return config.highlightedPointSize;
    }
    return config.pointSize;
  }

  private _getOpacity(point: PlotDataPoint): number {
    const config = this._mergedConfig;
    const featureValue = point.featureValues[this.selectedFeature];

    // Check if feature value is hidden
    if (
      (featureValue !== null &&
        this.hiddenFeatureValues.includes(featureValue)) ||
      (featureValue === null && this.hiddenFeatureValues.includes("null"))
    ) {
      return 0;
    }

    if (
      this.highlightedProteinIds.includes(point.id) ||
      this.selectedProteinIds.includes(point.id)
    ) {
      return config.selectedOpacity;
    }

    if (
      this.selectedProteinIds.length > 0 &&
      !this.selectedProteinIds.includes(point.id)
    ) {
      return config.fadedOpacity;
    }

    return config.baseOpacity;
  }

  private _getStrokeColor(point: PlotDataPoint): string {
    if (this.selectedProteinIds.includes(point.id)) {
      return "var(--protspace-selection-color, #FF5500)";
    }
    if (this.highlightedProteinIds.includes(point.id)) {
      return "var(--protspace-highlight-color, #3B82F6)";
    }
    return "var(--protspace-default-stroke, #333333)";
  }

  private _getStrokeWidth(point: PlotDataPoint): number {
    if (this.selectedProteinIds.includes(point.id)) {
      return 3;
    }
    if (this.highlightedProteinIds.includes(point.id)) {
      return 2;
    }
    return 1;
  }

  private _handleMouseOver(event: MouseEvent, point: PlotDataPoint) {
    // Show tooltip
    this._tooltipData = {
      x: event.pageX,
      y: event.pageY,
      protein: point,
    };

    // Dispatch hover event
    this.dispatchEvent(
      new CustomEvent("protein-hover", {
        detail: { proteinId: point.id, point },
        bubbles: true,
      }) as ProteinHoverEvent
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private _handleMouseOut(_event: MouseEvent, _point: PlotDataPoint) {
    // Hide tooltip
    this._tooltipData = null;

    // Dispatch hover event
    this.dispatchEvent(
      new CustomEvent("protein-hover", {
        detail: { proteinId: null },
        bubbles: true,
      }) as ProteinHoverEvent
    );
  }

  private _handleClick(event: MouseEvent, point: PlotDataPoint) {
    const modifierKeys = {
      ctrl: event.ctrlKey,
      shift: event.shiftKey,
      alt: event.altKey,
    };

    // Dispatch click event
    this.dispatchEvent(
      new CustomEvent("protein-click", {
        detail: { proteinId: point.id, point, modifierKeys },
        bubbles: true,
      }) as ProteinClickEvent
    );
  }

  private _dispatchProteinSelection(proteinIds: string[], isMultiple: boolean) {
    proteinIds.forEach((id) => {
      const point = this._plotData.find((p) => p.id === id);
      if (point) {
        this.dispatchEvent(
          new CustomEvent("protein-click", {
            detail: {
              proteinId: id,
              point,
              modifierKeys: { ctrl: isMultiple, shift: isMultiple, alt: false },
            },
            bubbles: true,
          }) as ProteinClickEvent
        );
      }
    });
  }

  render() {
    const config = this._mergedConfig;

    return html`
      <div class="container">
        <svg
          width="${config.width}"
          height="${config.height}"
          viewBox="0 0 ${config.width} ${config.height}"
        ></svg>

        ${this._isLoading || this._isTransitioning
          ? html`
              <div class="loading-overlay">
                <div class="loading-spinner"></div>
              </div>
            `
          : ""}
        ${this.selectionMode
          ? html`
              <div class="mode-indicator">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <rect
                    x="3"
                    y="3"
                    width="18"
                    height="18"
                    rx="1"
                    stroke-dasharray="2 1"
                  />
                  <circle cx="8" cy="8" r="1.5" fill="currentColor" />
                  <circle cx="12" cy="14" r="1.5" fill="currentColor" />
                  <circle cx="16" cy="10" r="1.5" fill="currentColor" />
                </svg>
                Selection Mode
              </div>
            `
          : ""}
        ${this.isolationMode && this.splitHistory
          ? html`
              <div class="mode-indicator" style="right: auto; left: 0.5rem;">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                Split Mode: ${this._plotData.length} proteins
              </div>
            `
          : ""}
        ${this._tooltipData
          ? html`
              <div
                class="tooltip"
                style="
            left: ${this._tooltipData.x + 10}px;
            top: ${this._tooltipData.y - 60}px;
          "
              >
                <div class="tooltip-protein-id">
                  ${this._tooltipData.protein.id}
                </div>
                <div class="tooltip-feature">
                  ${this.selectedFeature}:
                  ${this._tooltipData.protein.featureValues[
                    this.selectedFeature
                  ] || "N/A"}
                </div>
                <div class="tooltip-hint">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                  Click to view structure
                </div>
              </div>
            `
          : ""}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "protspace-scatterplot": ProtspaceScatterplot;
  }
}
