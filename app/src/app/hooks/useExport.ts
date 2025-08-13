"use client";

import { useCallback } from "react";
import type { ExportType } from "@/components/ControlBar/types";
import type { VisualizationData } from "@/components/Scatterplot/types";

type LegendItem = {
  value: string | null;
  color: string;
  shape: string;
  count: number;
};

function buildLegendItems(
  data: VisualizationData,
  selectedFeature: string,
  hiddenFeatureValues: string[],
  maxItems: number
): LegendItem[] {
  const featureInfo = data.features[selectedFeature];
  const indices = data.feature_data[selectedFeature];
  if (!featureInfo || !indices) return [];

  const counts = new Map<string | null, number>();
  for (let i = 0; i < data.protein_ids.length; i += 1) {
    const vi = indices[i];
    const value = featureInfo.values[vi] ?? null;
    counts.set(value, (counts.get(value) || 0) + 1);
  }

  const hidden = new Set(hiddenFeatureValues);
  const items: LegendItem[] = [];
  counts.forEach((count, value) => {
    const key = value === null ? "null" : String(value);
    if (hidden.has(key)) return;
    const idx = featureInfo.values.indexOf(value);
    const color = idx >= 0 ? featureInfo.colors[idx] : "#888";
    const shape = idx >= 0 ? featureInfo.shapes[idx] : "circle";
    items.push({ value, color, shape, count });
  });

  items.sort((a, b) => b.count - a.count);
  return items.slice(0, Math.max(0, maxItems));
}

function drawLegendOnCanvas(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  selectedFeature: string,
  items: LegendItem[],
  includeShapes: boolean
): void {
  const legendPadding = 20;
  const legendItemHeight = 30;
  const legendWidth = 200;

  const legendHeight = Math.min(
    canvasHeight,
    legendPadding * 2 + items.length * legendItemHeight + 40
  );

  ctx.fillStyle = "#f9f9f9";
  ctx.fillRect(canvasWidth - legendWidth, 0, legendWidth, legendHeight);

  ctx.strokeStyle = "#ddd";
  ctx.lineWidth = 1;
  ctx.strokeRect(canvasWidth - legendWidth, 0, legendWidth, legendHeight);

  ctx.font = "bold 16px Arial";
  ctx.fillStyle = "#333";
  ctx.textAlign = "center";
  ctx.fillText(selectedFeature, canvasWidth - legendWidth / 2, legendPadding + 10);

  ctx.font = "14px Arial";
  ctx.textAlign = "left";

  let y = legendPadding + 40;
  const symbolSize = 20;

  items.forEach((item) => {
    const { value, color, shape, count } = item;
    const symbolX = canvasWidth - legendWidth + legendPadding + symbolSize;
    const symbolY = y;

    if (includeShapes) {
      ctx.fillStyle = color;
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1;
      switch (shape) {
        case "circle":
          ctx.beginPath();
          ctx.arc(symbolX, symbolY, symbolSize / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          break;
        case "square":
          ctx.fillRect(
            symbolX - symbolSize / 2,
            symbolY - symbolSize / 2,
            symbolSize,
            symbolSize
          );
          ctx.strokeRect(
            symbolX - symbolSize / 2,
            symbolY - symbolSize / 2,
            symbolSize,
            symbolSize
          );
          break;
        case "triangle":
          ctx.beginPath();
          ctx.moveTo(symbolX, symbolY - symbolSize / 2);
          ctx.lineTo(symbolX - symbolSize / 2, symbolY + symbolSize / 2);
          ctx.lineTo(symbolX + symbolSize / 2, symbolY + symbolSize / 2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;
        case "diamond":
          ctx.beginPath();
          ctx.moveTo(symbolX, symbolY - symbolSize / 2);
          ctx.lineTo(symbolX + symbolSize / 2, symbolY);
          ctx.lineTo(symbolX, symbolY + symbolSize / 2);
          ctx.lineTo(symbolX - symbolSize / 2, symbolY);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;
        case "cross":
          ctx.beginPath();
          ctx.moveTo(symbolX - symbolSize / 2, symbolY - symbolSize / 2);
          ctx.lineTo(symbolX + symbolSize / 2, symbolY + symbolSize / 2);
          ctx.moveTo(symbolX + symbolSize / 2, symbolY - symbolSize / 2);
          ctx.lineTo(symbolX - symbolSize / 2, symbolY + symbolSize / 2);
          ctx.lineWidth = 3;
          ctx.strokeStyle = color;
          ctx.stroke();
          break;
        case "star":
          ctx.beginPath();
          for (let j = 0; j < 5; j += 1) {
            const x1 = symbolX + Math.cos((Math.PI * 2 * j) / 5) * (symbolSize / 2);
            const y1 = symbolY + Math.sin((Math.PI * 2 * j) / 5) * (symbolSize / 2);
            const x2 = symbolX + Math.cos((Math.PI * 2 * j + Math.PI) / 5) * (symbolSize / 4);
            const y2 = symbolY + Math.sin((Math.PI * 2 * j + Math.PI) / 5) * (symbolSize / 4);
            if (j === 0) ctx.moveTo(x1, y1);
            else ctx.lineTo(x1, y1);
            ctx.lineTo(x2, y2);
          }
          ctx.closePath();
          ctx.fill();
          break;
        default:
          ctx.beginPath();
          ctx.arc(symbolX, symbolY, symbolSize / 2, 0, Math.PI * 2);
          ctx.fill();
      }
    } else {
      // simple swatch
      ctx.save();
      ctx.fillStyle = color || "#888";
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(symbolX, symbolY, symbolSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    ctx.fillStyle = "#666";
    ctx.textAlign = "right";
    ctx.fillText(String(count), canvasWidth - legendPadding, symbolY + 5);

    ctx.fillStyle = "#333";
    ctx.textAlign = "left";
    ctx.fillText(value === null ? "N/A" : String(value), symbolX + symbolSize, symbolY + 5);

    y += legendItemHeight;
  });
}

export function useExport({
  visualizationData,
  selectedFeature,
  selectedProteinIds,
  hiddenFeatureValues,
  useShapes,
}: {
  visualizationData: VisualizationData | null;
  selectedFeature: string;
  selectedProteinIds: string[];
  hiddenFeatureValues: string[];
  useShapes: boolean;
}) {
  const handleExport = useCallback(
    (type: ExportType) => {
      if (!visualizationData) return;

      switch (type) {
        case "json": {
          const dataStr = JSON.stringify(visualizationData);
          const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
          const link = document.createElement("a");
          link.setAttribute("href", dataUri);
          link.setAttribute("download", "protspace_data.json");
          link.click();
          break;
        }
        case "ids": {
          const ids =
            selectedProteinIds.length > 0
              ? selectedProteinIds
              : visualizationData.protein_ids;
          const idsStr = ids.join("\n");
          const idsUri = `data:text/plain;charset=utf-8,${encodeURIComponent(idsStr)}`;
          const link = document.createElement("a");
          link.setAttribute("href", idsUri);
          link.setAttribute("download", "protein_ids.txt");
          link.click();
          break;
        }
        case "png":
        case "pdf": {
          const container = document.querySelector(
            '[data-ps-scatterplot="true"]'
          ) as HTMLElement | null;
          if (!container) {
            alert("Could not find visualization element to export.");
            return;
          }

          (async () => {
            const { default: html2canvas } = await import("html2canvas-pro");
            const scatterCanvas = await html2canvas(container, {
              backgroundColor: "#ffffff",
              scale: 2,
              useCORS: true,
              allowTaint: false,
              logging: false,
              width: container.clientWidth,
              height: container.clientHeight,
              scrollX: 0,
              scrollY: 0,
              ignoreElements: (el) =>
                (el as HTMLElement).hasAttribute?.("data-ps-export-ignore") === true,
            });

            // Build legend
            const items = buildLegendItems(
              visualizationData,
              selectedFeature,
              hiddenFeatureValues,
              10
            );

            // Compose output
            const combinedWidth = Math.round(scatterCanvas.width * 1.1);
            const combinedHeight = scatterCanvas.height;
            const legendWidth = combinedWidth - scatterCanvas.width;

            const outCanvas = document.createElement("canvas");
            outCanvas.width = combinedWidth;
            outCanvas.height = combinedHeight;
            const outCtx = outCanvas.getContext("2d");
            if (!outCtx) {
              alert("Could not create canvas context for export.");
              return;
            }
            // Background
            outCtx.fillStyle = "#ffffff";
            outCtx.fillRect(0, 0, combinedWidth, combinedHeight);
            // Draw scatter
            outCtx.drawImage(scatterCanvas, 0, 0);
            // Draw legend area
            const legendCanvas = document.createElement("canvas");
            legendCanvas.width = Math.max(100, legendWidth);
            legendCanvas.height = combinedHeight;
            const legendCtx = legendCanvas.getContext("2d");
            if (legendCtx) {
              // fill bg
              legendCtx.fillStyle = "#ffffff";
              legendCtx.fillRect(0, 0, legendCanvas.width, legendCanvas.height);
              drawLegendOnCanvas(
                legendCtx,
                legendCanvas.width,
                legendCanvas.height,
                selectedFeature,
                items,
                Boolean(useShapes)
              );
              outCtx.drawImage(legendCanvas, scatterCanvas.width, 0);
            }

            if (type === "png") {
              const dataUrl = outCanvas.toDataURL("image/png");
              const link = document.createElement("a");
              link.href = dataUrl;
              link.download = "protspace_visualization.png";
              link.click();
            } else {
              const { default: jsPDF } = await import("jspdf");
              const scatterImg = scatterCanvas.toDataURL("image/png", 1.0);
              const legendImg = legendCanvas.toDataURL("image/png", 1.0);
              const scatterRatio = scatterCanvas.width / scatterCanvas.height;
              const legendRatio = legendCanvas.width / legendCanvas.height;

              const pdf: any = new (jsPDF as any)({ orientation: scatterRatio > 1 ? "landscape" : "portrait", unit: "mm", format: "a4" });
              const title = "ProtSpace Visualization";
              const dateStr = new Date().toISOString().replace("T", " ").replace(/\..+$/, "");

              const pdfWidth = pdf.internal.pageSize.getWidth();
              const pdfHeight = pdf.internal.pageSize.getHeight();
              const margin = 15;
              const headerHeight = 10;
              const footerHeight = 8;
              const contentLeft = margin;
              const contentTop = margin + headerHeight;
              const contentWidth = pdfWidth - 2 * margin;
              const contentHeight = pdfHeight - 2 * margin - headerHeight - footerHeight;
              const gap = 6;

              // Header
              pdf.setFontSize(12);
              pdf.text(title, contentLeft, margin + 6);
              pdf.setFontSize(9);
              const origin = (typeof window !== "undefined" && (window as any)?.location?.origin) || "";
              pdf.text(`${dateStr}${origin ? `  •  ${origin}` : ""}`, pdfWidth - margin, margin + 6, { align: "right" });

              // Target widths ~90% scatter, ~10% legend
              const legendTargetW = (contentWidth - gap) * 0.1;
              const scatterTargetW = contentWidth - gap - legendTargetW;
              let sW = scatterTargetW;
              let sH = sW / scatterRatio;
              let lW = legendTargetW;
              let lH = lW / legendRatio;
              const maxH = Math.max(sH, lH);
              if (maxH > contentHeight) {
                const scale = contentHeight / maxH;
                sW *= scale;
                sH *= scale;
                lW *= scale;
                lH *= scale;
              }
              const y = contentTop + (contentHeight - Math.max(sH, lH)) / 2;
              const xScatter = contentLeft;
              const xLegend = xScatter + sW + gap;
              pdf.addImage(scatterImg, "PNG", xScatter, y, sW, sH);
              pdf.addImage(legendImg, "PNG", xLegend, y, lW, lH);

              // Footer
              pdf.setFontSize(9);
              pdf.text("Page 1 of 1", pdfWidth - margin, pdfHeight - margin, { align: "right" });

              const stamped = new Date().toISOString().replace(/[:T]/g, "-").replace(/\..+$/, "");
              pdf.save(`protspace_visualization_${stamped}.pdf`);
            }
          })().catch((err) => {
            console.error("Export failed", err);
            alert("Export failed: " + (err as Error).message);
          });
          break;
        }
      }
    },
    [hiddenFeatureValues, selectedFeature, selectedProteinIds, useShapes, visualizationData]
  );

  return { handleExport } as const;
}


