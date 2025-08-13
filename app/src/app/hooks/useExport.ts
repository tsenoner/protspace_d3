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
  items: LegendItem[]
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

    ctx.fillStyle = "#666";
    ctx.textAlign = "right";
    ctx.fillText(String(count), canvasWidth - legendPadding, symbolY + 5);

    ctx.fillStyle = "#333";
    ctx.textAlign = "left";
    ctx.fillText(value === null ? "N/A" : String(value), symbolX + symbolSize, symbolY + 5);

    y += legendItemHeight;
  });
}

function appendLegendToSvg(
  svg: SVGElement,
  xOffset: number,
  selectedFeature: string,
  items: LegendItem[],
  legendWidth = 200
): number {
  const legendPadding = 20;
  const legendItemHeight = 30;

  const ns = "http://www.w3.org/2000/svg";
  const legendGroup = document.createElementNS(ns, "g");
  legendGroup.setAttribute("transform", `translate(${xOffset}, 0)`);

  const titleText = document.createElementNS(ns, "text");
  titleText.setAttribute("x", String(legendWidth / 2));
  titleText.setAttribute("y", String(legendPadding + 10));
  titleText.setAttribute("text-anchor", "middle");
  titleText.setAttribute("font-weight", "bold");
  titleText.setAttribute("font-size", "16px");
  titleText.setAttribute("fill", "#333");
  titleText.textContent = selectedFeature;
  legendGroup.appendChild(titleText);

  let y = legendPadding + 40;
  const symbolSize = 20;

  items.forEach(({ value, color, shape, count }) => {
    const itemGroup = document.createElementNS(ns, "g");
    const symbolX = legendPadding + symbolSize;
    const symbolY = y;

    let symbol: SVGElement;
    switch (shape) {
      case "square": {
        const rect = document.createElementNS(ns, "rect");
        rect.setAttribute("x", String(symbolX - symbolSize / 2));
        rect.setAttribute("y", String(symbolY - symbolSize / 2));
        rect.setAttribute("width", String(symbolSize));
        rect.setAttribute("height", String(symbolSize));
        symbol = rect;
        break;
      }
      case "triangle": {
        const poly = document.createElementNS(ns, "polygon");
        poly.setAttribute(
          "points",
          `${symbolX},${symbolY - symbolSize / 2} ${symbolX - symbolSize / 2},${symbolY + symbolSize / 2} ${symbolX + symbolSize / 2},${symbolY + symbolSize / 2}`
        );
        symbol = poly;
        break;
      }
      case "diamond": {
        const poly = document.createElementNS(ns, "polygon");
        poly.setAttribute(
          "points",
          `${symbolX},${symbolY - symbolSize / 2} ${symbolX + symbolSize / 2},${symbolY} ${symbolX},${symbolY + symbolSize / 2} ${symbolX - symbolSize / 2},${symbolY}`
        );
        symbol = poly;
        break;
      }
      case "cross": {
        const path = document.createElementNS(ns, "path");
        path.setAttribute(
          "d",
          `M${symbolX - symbolSize / 2},${symbolY - symbolSize / 2} L${symbolX + symbolSize / 2},${symbolY + symbolSize / 2} M${symbolX + symbolSize / 2},${symbolY - symbolSize / 2} L${symbolX - symbolSize / 2},${symbolY + symbolSize / 2}`
        );
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", color);
        path.setAttribute("stroke-width", "3");
        itemGroup.appendChild(path);
        // Value
        const vText = document.createElementNS(ns, "text");
        vText.setAttribute("x", String(symbolX + symbolSize));
        vText.setAttribute("y", String(symbolY + 5));
        vText.setAttribute("font-size", "14px");
        vText.setAttribute("fill", "#333");
        vText.textContent = value === null ? "N/A" : String(value);
        itemGroup.appendChild(vText);
        // Count
        const cText = document.createElementNS(ns, "text");
        cText.setAttribute("x", String(legendWidth - legendPadding));
        cText.setAttribute("y", String(symbolY + 5));
        cText.setAttribute("text-anchor", "end");
        cText.setAttribute("font-size", "14px");
        cText.setAttribute("fill", "#666");
        cText.textContent = String(count);
        itemGroup.appendChild(cText);
        legendGroup.appendChild(itemGroup);
        y += 30;
        return;
      }
      default: {
        const circle = document.createElementNS(ns, "circle");
        circle.setAttribute("cx", String(symbolX));
        circle.setAttribute("cy", String(symbolY));
        circle.setAttribute("r", String(symbolSize / 2));
        symbol = circle;
      }
    }

    symbol.setAttribute("fill", color);
    symbol.setAttribute("stroke", "#333");
    symbol.setAttribute("stroke-width", "1");
    itemGroup.appendChild(symbol);

    const valueText = document.createElementNS(ns, "text");
    valueText.setAttribute("x", String(symbolX + symbolSize));
    valueText.setAttribute("y", String(symbolY + 5));
    valueText.setAttribute("font-size", "14px");
    valueText.setAttribute("fill", "#333");
    valueText.textContent = value === null ? "N/A" : String(value);
    itemGroup.appendChild(valueText);

    const countText = document.createElementNS(ns, "text");
    countText.setAttribute("x", String(legendWidth - legendPadding));
    countText.setAttribute("y", String(symbolY + 5));
    countText.setAttribute("text-anchor", "end");
    countText.setAttribute("font-size", "14px");
    countText.setAttribute("fill", "#666");
    countText.textContent = String(count);
    itemGroup.appendChild(countText);

    legendGroup.appendChild(itemGroup);
    y += 30;
  });

  svg.appendChild(legendGroup);

  const legendTitleHeight = 40;
  const legendHeight = legendPadding * 2 + legendTitleHeight + items.length * 30;
  return legendHeight;
}

export function useExport({
  visualizationData,
  selectedFeature,
  selectedProteinIds,
  hiddenFeatureValues,
}: {
  visualizationData: VisualizationData | null;
  selectedFeature: string;
  selectedProteinIds: string[];
  hiddenFeatureValues: string[];
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
          const svgElement = document
            .querySelector(".scatter-plot-container")
            ?.closest("svg") as SVGElement | null;
          if (!svgElement) {
            alert("Could not find visualization element to export.");
            return;
          }

          const svgClone = svgElement.cloneNode(true) as SVGElement;
          const originalWidth = svgElement.clientWidth;
          const originalHeight = svgElement.clientHeight;
          const scale = 2;

          svgClone.setAttribute("width", String(originalWidth * scale));
          svgClone.setAttribute("height", String(originalHeight * scale));

          const mainGroup = svgClone.querySelector(".scatter-plot-container");
          if (mainGroup) {
            mainGroup.setAttribute(
              "transform",
              `scale(${scale}) ${mainGroup.getAttribute("transform") || ""}`
            );
          }

          const toRemove = svgClone.querySelectorAll(
            ".absolute, .z-10, button, .reset-view-button, [class*='tooltip'], [class*='control']"
          );
          toRemove.forEach((el) => el.remove());

          const svgString = new XMLSerializer().serializeToString(svgClone);
          const canvas = document.createElement("canvas");
          canvas.width = originalWidth * scale;
          canvas.height = originalHeight * scale;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            alert("Could not create canvas context for export.");
            return;
          }
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          const img = new Image();
          const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
          const url = URL.createObjectURL(svgBlob);

          img.onload = async () => {
            try {
              ctx.drawImage(img, 0, 0);
              const items = buildLegendItems(
                visualizationData,
                selectedFeature,
                hiddenFeatureValues,
                10
              );
              drawLegendOnCanvas(
                ctx,
                canvas.width,
                canvas.height,
                selectedFeature,
                items
              );

              if (type === "png") {
                const dataUrl = canvas.toDataURL("image/png");
                const link = document.createElement("a");
                link.href = dataUrl;
                link.download = "protspace_visualization.png";
                link.click();
              } else {
                const jsPdfModule = await import("jspdf");
                const jsPDF = (jsPdfModule as unknown as { default: any }).default || (jsPdfModule as any);
                const isLandscape = canvas.width > canvas.height;
                const pdf = new (jsPDF as any)({ orientation: isLandscape ? "landscape" : "portrait", unit: "mm" });
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                const ratio = Math.min(pdfWidth / canvas.width, pdfHeight / canvas.height);
                const imgData = canvas.toDataURL("image/png");
                pdf.addImage(imgData, "PNG", 0, 0, canvas.width * ratio, canvas.height * ratio);
                pdf.save("protspace_visualization.pdf");
              }
            } catch (error) {
              console.error("Error in export:", error);
              alert("Export failed: " + (error as Error).message);
            } finally {
              URL.revokeObjectURL(url);
            }
          };
          img.onerror = () => {
            console.error("Failed to load SVG as image");
            URL.revokeObjectURL(url);
            alert("Failed to process the visualization for export.");
          };
          img.src = url;
          break;
        }
        case "svg": {
          const svgElement = document
            .querySelector(".scatter-plot-container")
            ?.closest("svg") as SVGElement | null;
          if (!svgElement) {
            alert("Could not find visualization element to export.");
            return;
          }

          const svgClone = svgElement.cloneNode(true) as SVGElement;
          const originalWidth = svgElement.clientWidth;
          const originalHeight = svgElement.clientHeight;
          svgClone.setAttribute("width", String(originalWidth));
          svgClone.setAttribute("height", String(originalHeight));
          svgClone.setAttribute("viewBox", `0 0 ${originalWidth} ${originalHeight}`);

          const mainGroup = svgClone.querySelector(".scatter-plot-container");
          if (mainGroup) mainGroup.removeAttribute("transform");

          const overlays = svgClone.querySelectorAll(
            ".absolute, .z-10, button, .reset-view-button, [class*='tooltip'], [class*='control']"
          );
          overlays.forEach((overlay) => overlay.remove());

          const combinedSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          const legendWidth = 200;
          const combinedWidth = originalWidth + legendWidth;
          combinedSvg.setAttribute("width", String(combinedWidth));
          combinedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");

          Array.from(svgClone.childNodes).forEach((node) => {
            combinedSvg.appendChild(node.cloneNode(true));
          });

          const items = buildLegendItems(
            visualizationData,
            selectedFeature,
            hiddenFeatureValues,
            10
          );
          const legendHeight = appendLegendToSvg(
            combinedSvg,
            originalWidth,
            selectedFeature,
            items,
            legendWidth
          );

          const combinedHeight = Math.max(originalHeight, legendHeight);
          combinedSvg.setAttribute("height", String(combinedHeight));
          combinedSvg.setAttribute("viewBox", `0 0 ${combinedWidth} ${combinedHeight}`);

          const svgData = new XMLSerializer().serializeToString(combinedSvg);
          const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
          const svgUrl = URL.createObjectURL(svgBlob);
          const link = document.createElement("a");
          link.href = svgUrl;
          link.download = "protspace_visualization.svg";
          link.click();
          setTimeout(() => URL.revokeObjectURL(svgUrl), 100);
          break;
        }
      }
    },
    [hiddenFeatureValues, selectedFeature, selectedProteinIds, visualizationData]
  );

  return { handleExport } as const;
}


