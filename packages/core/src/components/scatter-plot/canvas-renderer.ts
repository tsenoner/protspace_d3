import * as d3 from "d3";
import type { PlotDataPoint } from "@protspace/utils";

export interface CanvasStyleGetters {
  getColor: (point: PlotDataPoint) => string;
  getPointSize: (point: PlotDataPoint) => number;
  getOpacity: (point: PlotDataPoint) => number;
  getStrokeColor: (point: PlotDataPoint) => string;
  getStrokeWidth: (point: PlotDataPoint) => number;
  getShape: (point: PlotDataPoint) => d3.SymbolType;
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private getScales: () => { x: d3.ScaleLinear<number, number>; y: d3.ScaleLinear<number, number> } | null;
  private getTransform: () => d3.ZoomTransform;
  private style: CanvasStyleGetters;
  private getSizeScaleExponent: () => number = () => 1;

  constructor(
    canvas: HTMLCanvasElement,
    getScales: () => { x: d3.ScaleLinear<number, number>; y: d3.ScaleLinear<number, number> } | null,
    getTransform: () => d3.ZoomTransform,
    style: CanvasStyleGetters,
    getSizeScaleExponent?: () => number
  ) {
    this.canvas = canvas;
    this.getScales = getScales;
    this.getTransform = getTransform;
    this.style = style;
    if (getSizeScaleExponent) this.getSizeScaleExponent = getSizeScaleExponent;
  }

  setupHighDPICanvas(width: number, height: number) {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    const ctx = this.canvas.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
      this.applyCanvasQualitySettings(ctx);
    }
  }

  applyCanvasQualitySettings(ctx: CanvasRenderingContext2D) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }

  render(pointsData: PlotDataPoint[]) {
    const scales = this.getScales();
    if (!scales) return;

    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const transform = this.getTransform();
    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.k, transform.k);

    // Batch points by style and shape
    const pointGroups = new Map<string, PlotDataPoint[]>();
    const groupMeta = new Map<string, { isCircle: boolean; path?: Path2D }>();
    for (const point of pointsData) {
      const opacity = this.style.getOpacity(point);
      if (opacity === 0) continue;
      const color = this.style.getColor(point);
      const size = Math.sqrt(this.style.getPointSize(point)) / 3;
      const strokeColor = this.style.getStrokeColor(point);
      const strokeWidth = this.style.getStrokeWidth(point);
      const shape = this.style.getShape(point);
      const isCircle = shape === d3.symbolCircle;
      // Convert our radius-like size back to d3.symbol size (area)
      const area = Math.pow(size * 3, 2);
      const pathString = isCircle ? null : d3.symbol().type(shape).size(area)()!;
      const shapeKey = isCircle ? "circle" : `path:${pathString}`;
      const key = `${color}_${size}_${strokeColor}_${strokeWidth}_${opacity}_${shapeKey}`;
      const arr = pointGroups.get(key);
      if (arr) arr.push(point);
      else pointGroups.set(key, [point]);
      if (!groupMeta.has(key)) {
        groupMeta.set(key, { isCircle, path: isCircle ? undefined : new Path2D(pathString!) });
      }
    }

    pointGroups.forEach((groupPoints, styleKey) => {
      if (groupPoints.length === 0) return;
      const parts = styleKey.split("_");
      const color = parts[0];
      const sizeStr = parts[1];
      const strokeColor = parts[2];
      const strokeWidthStr = parts[3];
      const opacityStr = parts[4];
      const basePointSize = parseFloat(sizeStr);
      const exp = this.getSizeScaleExponent();
      const pointSize = Math.max(0.5, basePointSize / Math.pow(transform.k, exp));
      const lineWidth = parseFloat(strokeWidthStr);
      const opacity = parseFloat(opacityStr);
      ctx.globalAlpha = opacity;
      ctx.fillStyle = color;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth / transform.k;

      const meta = groupMeta.get(styleKey)!;
      if (meta.isCircle) {
        // Fast path for circles
        ctx.beginPath();
        for (const p of groupPoints) {
          const x = scales.x(p.x);
          const y = scales.y(p.y);
          ctx.moveTo(x + pointSize, y);
          ctx.arc(x, y, pointSize, 0, 2 * Math.PI);
        }
        ctx.fill();
        if (lineWidth > 0) ctx.stroke();
      } else {
        // Use Path2D constructed from d3 symbol path for non-circle shapes
        const shapePath = meta.path!;

        for (const p of groupPoints) {
          const x = scales.x(p.x);
          const y = scales.y(p.y);
          ctx.save();
          ctx.translate(x, y);
          // Counteract global zoom proportionally so shapes keep readable size
          const invKExp = 1 / Math.pow(transform.k, this.getSizeScaleExponent());
          ctx.scale(invKExp, invKExp);
          ctx.fill(shapePath);
          if (lineWidth > 0) ctx.stroke(shapePath);
          ctx.restore();
        }
      }
    });

    ctx.restore();
  }
}


