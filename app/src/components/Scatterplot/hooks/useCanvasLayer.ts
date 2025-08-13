"use client";

import { useEffect } from "react";
import * as d3 from "d3";
import { PlotDataPoint } from "../types";

type Factories = {
  getColor: (d: PlotDataPoint) => string;
  getShape: (d: PlotDataPoint) => d3.SymbolType;
  getOpacity: (d: PlotDataPoint) => number;
  getStrokeWidth: (d: PlotDataPoint) => number;
  getStrokeColor: (d: PlotDataPoint) => string;
  getSize: (d: PlotDataPoint) => number;
};

export function useCanvasLayer(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  width: number,
  height: number,
  resolutionScale: number,
  scales: { x: d3.ScaleLinear<number, number>; y: d3.ScaleLinear<number, number> } | null,
  transform: d3.ZoomTransform | null,
  plotData: PlotDataPoint[],
  factories: Factories
) {
  // HiDPI sizing
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const dpr = (window.devicePixelRatio || 1) * Math.max(1, resolutionScale || 1);
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
  }, [canvasRef, width, height, resolutionScale]);

  // Render
  useEffect(() => {
    if (!canvasRef.current || !scales) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear and apply transform
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    ctx.save();
    const t = transform ?? d3.zoomIdentity;
    ctx.translate(t.x, t.y);
    ctx.scale(t.k, t.k);

    const { getColor, getShape, getOpacity, getSize, getStrokeColor, getStrokeWidth } = factories;

    // Batch by style+shape for fewer state changes
    const pointGroups = new Map<string, PlotDataPoint[]>();
    const groupMeta = new Map<string, { isCircle: boolean; path?: Path2D }>();

    for (const point of plotData) {
      const opacity = getOpacity(point);
      if (opacity <= 0) continue;
      const color = getColor(point);
      const sizeArea = getSize(point); // d3.symbol size = area in px^2
      const r = Math.sqrt(sizeArea) / 3; // match SVG symbol circle conversion used elsewhere
      const strokeColor = getStrokeColor(point);
      const strokeWidth = getStrokeWidth(point);
      const shape = getShape(point);
      const isCircle = shape === d3.symbolCircle;
      const pathString = isCircle ? null : d3.symbol().type(shape).size(sizeArea)()!;
      const shapeKey = isCircle ? "circle" : `path:${pathString}`;
      const key = `${color}_${r}_${strokeColor}_${strokeWidth}_${opacity}_${shapeKey}`;
      const arr = pointGroups.get(key);
      if (arr) arr.push(point);
      else pointGroups.set(key, [point]);
      if (!groupMeta.has(key)) groupMeta.set(key, { isCircle, path: isCircle ? undefined : new Path2D(pathString!) });
    }

    pointGroups.forEach((groupPoints, key) => {
      if (groupPoints.length === 0) return;
      const [color, rStr, strokeColor, strokeWidthStr, opacityStr] = key.split("_", 5);
      const r = parseFloat(rStr);
      const lineWidth = parseFloat(strokeWidthStr);
      const opacity = parseFloat(opacityStr);

      ctx.globalAlpha = opacity;
      ctx.fillStyle = color;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth / (transform?.k || 1);

      const meta = groupMeta.get(key)!;
      if (meta.isCircle) {
        ctx.beginPath();
        for (const p of groupPoints) {
          const x = scales.x(p.x);
          const y = scales.y(p.y);
          ctx.moveTo(x + r, y);
          ctx.arc(x, y, r, 0, Math.PI * 2);
        }
        ctx.fill();
        if (ctx.lineWidth > 0) ctx.stroke();
      } else {
        const path = meta.path!;
        for (const p of groupPoints) {
          const x = scales.x(p.x);
          const y = scales.y(p.y);
          ctx.save();
          ctx.translate(x, y);
          ctx.fill(path);
          if (ctx.lineWidth > 0) ctx.stroke(path);
          ctx.restore();
        }
      }
    });

    ctx.restore();
  }, [canvasRef, scales, transform, plotData, factories]);
}


