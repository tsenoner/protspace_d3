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
  private cachedScreenX: Float32Array | null = null;
  private cachedScreenY: Float32Array | null = null;
  private cachedLen: number = 0;
  private cachedScaleSig: string | null = null;
  private cachedPointsRef: PlotDataPoint[] | null = null;
  private styleSignature: string | null = null;
  private groupsCache: Array<{
    isCircle: boolean;
    path?: Path2D;
    color: string;
    strokeColor: string;
    strokeWidth: number;
    opacity: number;
    basePointSize: number; // radius-like size before zoom adjustment
    indices: Uint32Array;
  }> | null = null;

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

  setStyleSignature(signature: string | null) {
    if (this.styleSignature !== signature) {
      this.styleSignature = signature;
      this.groupsCache = null;
    }
  }

  invalidateStyleCache() {
    this.groupsCache = null;
  }

  invalidatePositionCache() {
    this.cachedScreenX = null;
    this.cachedScreenY = null;
    this.cachedScaleSig = null;
    this.cachedPointsRef = null;
    this.cachedLen = 0;
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

    // Precompute and cache screen-space positions (before zoom transform)
    const scaleSig = `${scales.x.domain().join(',')}|${scales.x.range().join(',')}|${scales.y.domain().join(',')}|${scales.y.range().join(',')}`;
    const needsPos =
      !this.cachedScreenX ||
      !this.cachedScreenY ||
      this.cachedLen !== pointsData.length ||
      this.cachedScaleSig !== scaleSig ||
      this.cachedPointsRef !== pointsData;
    if (needsPos) {
      this.cachedScreenX = new Float32Array(pointsData.length);
      this.cachedScreenY = new Float32Array(pointsData.length);
      for (let i = 0; i < pointsData.length; i++) {
        const p = pointsData[i];
        this.cachedScreenX[i] = scales.x(p.x);
        this.cachedScreenY[i] = scales.y(p.y);
      }
      this.cachedLen = pointsData.length;
      this.cachedScaleSig = scaleSig;
      this.cachedPointsRef = pointsData;
    }

    // Build or reuse style groups cache
    if (!this.groupsCache) {
      // Batch points by style and shape, store indices
      const tempGroups = new Map<string, { meta: any; idx: number[] }>();
      for (let i = 0; i < pointsData.length; i++) {
        const point = pointsData[i];
        const opacity = this.style.getOpacity(point);
        if (opacity === 0) continue;
        const color = this.style.getColor(point);
        const size = Math.sqrt(this.style.getPointSize(point)) / 3;
        const strokeColor = this.style.getStrokeColor(point);
        const strokeWidth = this.style.getStrokeWidth(point);
        const shape = this.style.getShape(point);
        const isCircle = shape === d3.symbolCircle;
        const area = Math.pow(size * 3, 2);
        const pathString = isCircle ? null : d3.symbol().type(shape).size(area)()!;
        const shapeKey = isCircle ? "circle" : `path:${pathString}`;
        const key = `${color}_${size}_${strokeColor}_${strokeWidth}_${opacity}_${shapeKey}`;
        let entry = tempGroups.get(key);
        if (!entry) {
          entry = {
            meta: {
              isCircle,
              path: isCircle ? undefined : new Path2D(pathString!),
              color,
              strokeColor,
              strokeWidth,
              opacity,
              basePointSize: size,
            },
            idx: [],
          };
          tempGroups.set(key, entry);
        }
        entry.idx.push(i);
      }
      this.groupsCache = Array.from(tempGroups.values()).map((g) => ({
        isCircle: g.meta.isCircle,
        path: g.meta.path,
        color: g.meta.color,
        strokeColor: g.meta.strokeColor,
        strokeWidth: g.meta.strokeWidth,
        opacity: g.meta.opacity,
        basePointSize: g.meta.basePointSize,
        indices: Uint32Array.from(g.idx),
      }));
    }

    const exp = this.getSizeScaleExponent();
    const invKExp = 1 / Math.pow(transform.k, exp);

    for (const group of this.groupsCache) {
      if (group.indices.length === 0) continue;
      const pointSize = Math.max(0.5, group.basePointSize / Math.pow(transform.k, exp));
      ctx.globalAlpha = group.opacity;
      ctx.fillStyle = group.color;
      ctx.strokeStyle = group.strokeColor;
      ctx.lineWidth = group.strokeWidth / transform.k;

      if (group.isCircle) {
        ctx.beginPath();
        for (let i = 0; i < group.indices.length; i++) {
          const idx = group.indices[i];
          const x = this.cachedScreenX![idx];
          const y = this.cachedScreenY![idx];
          ctx.moveTo(x + pointSize, y);
          ctx.arc(x, y, pointSize, 0, 2 * Math.PI);
        }
        ctx.fill();
        if (group.strokeWidth > 0) {
          ctx.save();
          ctx.globalAlpha = 0.35 * group.opacity;
          ctx.stroke();
          ctx.restore();
        }
      } else {
        const shapePath = group.path!;
        const combinedPath = new Path2D();
        for (let i = 0; i < group.indices.length; i++) {
          const idx = group.indices[i];
          const x = this.cachedScreenX![idx];
          const y = this.cachedScreenY![idx];
          const m = new DOMMatrix().translateSelf(x, y).scaleSelf(invKExp, invKExp);
          // @ts-ignore addPath with matrix is available on modern browsers
          combinedPath.addPath(shapePath, m);
        }
        ctx.fill(combinedPath);
        if (group.strokeWidth > 0) {
          ctx.save();
          ctx.globalAlpha = 0.35 * group.opacity;
          ctx.stroke(combinedPath);
          ctx.restore();
        }
      }
    }

    ctx.restore();
  }
}


