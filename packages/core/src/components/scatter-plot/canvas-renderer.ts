import * as d3 from "d3";
import type { PlotDataPoint } from "@protspace/utils";

export interface CanvasStyleGetters {
  getColor: (point: PlotDataPoint) => string;
  getPointSize: (point: PlotDataPoint) => number;
  getOpacity: (point: PlotDataPoint) => number;
  getStrokeColor: (point: PlotDataPoint) => string;
  getStrokeWidth: (point: PlotDataPoint) => number;
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private getScales: () => { x: d3.ScaleLinear<number, number>; y: d3.ScaleLinear<number, number> } | null;
  private getTransform: () => d3.ZoomTransform;
  private style: CanvasStyleGetters;

  constructor(
    canvas: HTMLCanvasElement,
    getScales: () => { x: d3.ScaleLinear<number, number>; y: d3.ScaleLinear<number, number> } | null,
    getTransform: () => d3.ZoomTransform,
    style: CanvasStyleGetters
  ) {
    this.canvas = canvas;
    this.getScales = getScales;
    this.getTransform = getTransform;
    this.style = style;
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

    // Batch points by style
    const pointGroups = new Map<string, PlotDataPoint[]>();
    for (const point of pointsData) {
      const opacity = this.style.getOpacity(point);
      if (opacity === 0) continue;
      const color = this.style.getColor(point);
      const size = Math.sqrt(this.style.getPointSize(point)) / 3;
      const strokeColor = this.style.getStrokeColor(point);
      const strokeWidth = this.style.getStrokeWidth(point);
      const key = `${color}_${size}_${strokeColor}_${strokeWidth}_${opacity}`;
      const arr = pointGroups.get(key);
      if (arr) arr.push(point);
      else pointGroups.set(key, [point]);
    }

    pointGroups.forEach((groupPoints, styleKey) => {
      if (groupPoints.length === 0) return;
      const [color, sizeStr, strokeColor, strokeWidthStr, opacityStr] = styleKey.split("_");
      const pointSize = parseFloat(sizeStr);
      const lineWidth = parseFloat(strokeWidthStr);
      const opacity = parseFloat(opacityStr);
      ctx.globalAlpha = opacity;
      ctx.fillStyle = color;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth / transform.k;

      ctx.beginPath();
      for (const p of groupPoints) {
        const x = scales.x(p.x);
        const y = scales.y(p.y);
        ctx.moveTo(x + pointSize, y);
        ctx.arc(x, y, pointSize, 0, 2 * Math.PI);
      }
      ctx.fill();
      if (lineWidth > 0) ctx.stroke();
    });

    ctx.restore();
  }
}


