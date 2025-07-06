/**
 * Export utilities for ProtSpace visualizations
 */

export interface ExportableData {
  protein_ids: string[];
  features: Record<
    string,
    {
      values: (string | null)[];
      colors: string[];
      shapes: string[];
    }
  >;
  feature_data: Record<string, number[]>;
  projections?: Array<{ name: string }>;
}

export interface ExportableElement extends Element {
  getCurrentData(): ExportableData | null;
  selectedFeature: string;
  selectedProteinIds?: string[];
}

export interface ExportOptions {
  includeSelection?: boolean;
  exportName?: string;
  scaleForExport?: number;
  maxLegendItems?: number;
  backgroundColor?: string;
}

export class ProtSpaceExporter {
  private element: ExportableElement;
  private selectedProteins: string[];
  private hiddenValues: string[];
  private isolationMode: boolean;

  constructor(
    element: ExportableElement,
    selectedProteins: string[] = [],
    hiddenValues: string[] = [],
    isolationMode: boolean = false
  ) {
    this.element = element;
    this.selectedProteins = selectedProteins;
    this.hiddenValues = hiddenValues;
    this.isolationMode = isolationMode;
  }

  /**
   * Export current data as JSON
   */
  exportJSON(options: ExportOptions = {}): void {
    const data = this.element.getCurrentData();
    if (!data) {
      console.error("No data available for export");
      return;
    }

    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(
      dataStr
    )}`;
    const exportName =
      options.exportName ||
      (this.isolationMode ? "protspace_data_split" : "protspace_data");

    this.downloadFile(dataUri, `${exportName}.json`);
  }

  /**
   * Export protein IDs as text file
   */
  exportProteinIds(options: ExportOptions = {}): void {
    const data = this.element.getCurrentData();
    if (!data) {
      console.error("No data available for export");
      return;
    }

    const ids =
      options.includeSelection && this.selectedProteins.length > 0
        ? this.selectedProteins
        : data.protein_ids || [];

    const idsStr = ids.join("\n");
    const idsUri = `data:text/plain;charset=utf-8,${encodeURIComponent(
      idsStr
    )}`;
    const fileName = options.includeSelection
      ? "selected_protein_ids.txt"
      : "protein_ids.txt";

    this.downloadFile(idsUri, fileName);
  }

  /**
   * Export visualization as PNG
   */
  async exportPNG(options: ExportOptions = {}): Promise<void> {
    const svgElement = this.findSVGElement();
    if (!svgElement) {
      console.error("Could not find SVG element for export");
      return;
    }

    try {
      const canvas = await this.createCanvasFromSVG(svgElement, options);
      const dataUrl = canvas.toDataURL("image/png");
      this.downloadFile(dataUrl, "protspace_visualization.png");
    } catch (error) {
      console.error("PNG export failed:", error);
      throw error;
    }
  }

  /**
   * Export visualization as PDF (simplified approach)
   */
  async exportPDF(options: ExportOptions = {}): Promise<void> {
    const svgElement = this.findSVGElement();
    if (!svgElement) {
      console.error("Could not find SVG element for export");
      return;
    }

    try {
      const canvas = await this.createCanvasFromSVG(svgElement, options);
      const dataUrl = canvas.toDataURL("image/png");

      // Create a new window with the image for PDF printing
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head><title>ProtSpace Visualization</title></head>
            <body style="margin:0;padding:20px;text-align:center;">
              <h2>ProtSpace Visualization</h2>
              <img src="${dataUrl}" style="max-width:100%;height:auto;" />
              <p><a href="${dataUrl}" download="protspace_visualization.png">Download PNG</a></p>
            </body>
          </html>
        `);
        newWindow.document.close();
      } else {
        // Fallback to PNG download
        this.downloadFile(dataUrl, "protspace_visualization.png");
        alert(
          "PDF export opened in new window. If blocked, PNG download was triggered instead."
        );
      }
    } catch (error) {
      console.error("PDF export failed:", error);
      throw error;
    }
  }

  /**
   * Export visualization as SVG
   */
  exportSVG(options: ExportOptions = {}): void {
    const svgElement = this.findSVGElement();
    if (!svgElement) {
      console.error("Could not find SVG element for export");
      return;
    }

    try {
      const svgClone = this.prepareSVGForExport(svgElement);
      const svgData = new XMLSerializer().serializeToString(svgClone);
      const svgBlob = new Blob([svgData], {
        type: "image/svg+xml;charset=utf-8",
      });
      const svgUrl = URL.createObjectURL(svgBlob);

      const fileName = options.exportName
        ? `${options.exportName}.svg`
        : "protspace_visualization.svg";
      this.downloadFile(svgUrl, fileName);

      // Cleanup
      setTimeout(() => {
        URL.revokeObjectURL(svgUrl);
      }, 100);
    } catch (error) {
      console.error("SVG export failed:", error);
      throw error;
    }
  }

  /**
   * Find SVG element in the DOM or shadow DOM
   */
  private findSVGElement(): SVGElement | null {
    // Try to find SVG element inside the web component
    if (this.element.shadowRoot) {
      const svgElement = this.element.shadowRoot.querySelector("svg");
      if (svgElement) return svgElement;
    }

    // Try regular DOM
    const svgElement = this.element.querySelector("svg");
    if (svgElement) return svgElement;

    // Fallback: try to find any SVG in the document
    return document.querySelector("svg");
  }

  /**
   * Create canvas from SVG element
   */
  private async createCanvasFromSVG(
    svgElement: SVGElement,
    options: ExportOptions
  ): Promise<HTMLCanvasElement> {
    const svgClone = this.prepareSVGForExport(svgElement);
    const originalWidth = svgElement.clientWidth || 800;
    const originalHeight = svgElement.clientHeight || 600;
    const scale = options.scaleForExport || 2;

    // Set higher resolution for export
    svgClone.setAttribute("width", (originalWidth * scale).toString());
    svgClone.setAttribute("height", (originalHeight * scale).toString());

    // Scale the main visualization group
    const possibleSelectors = [
      ".scatter-plot-container",
      ".visualization-container",
      ".scatterplot-main",
      "g[class*='scatter']",
      "g[class*='plot']",
      "g[transform]",
    ];

    for (const selector of possibleSelectors) {
      const mainGroup = svgClone.querySelector(selector);
      if (mainGroup) {
        const currentTransform = mainGroup.getAttribute("transform") || "";
        mainGroup.setAttribute(
          "transform",
          `scale(${scale}) ${currentTransform}`
        );
        break;
      }
    }

    // Convert SVG to string
    const svgString = new XMLSerializer().serializeToString(svgClone);
    const svgBlob = new Blob([svgString], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);

    // Create canvas
    const canvas = document.createElement("canvas");
    canvas.width = originalWidth * scale;
    canvas.height = originalHeight * scale;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Could not create canvas context");
    }

    // Fill with background color
    ctx.fillStyle = options.backgroundColor || "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Create image from SVG
    const img = new Image();

    return new Promise((resolve, reject) => {
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        this.drawLegendOnCanvas(ctx, canvas, options);
        URL.revokeObjectURL(url);
        resolve(canvas);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load SVG as image"));
      };

      img.src = url;
    });
  }

  /**
   * Prepare SVG for export by removing interactive elements
   */
  private prepareSVGForExport(svgElement: SVGElement): SVGElement {
    const svgClone = svgElement.cloneNode(true) as SVGElement;
    const originalWidth = svgElement.clientWidth || 800;
    const originalHeight = svgElement.clientHeight || 600;

    // Set dimensions
    svgClone.setAttribute("width", originalWidth.toString());
    svgClone.setAttribute("height", originalHeight.toString());
    svgClone.setAttribute("viewBox", `0 0 ${originalWidth} ${originalHeight}`);

    // Remove interactive elements
    const elementsToRemove = svgClone.querySelectorAll(
      ".absolute, .z-10, button, .reset-view-button, [class*='tooltip'], [class*='control'], [style*='cursor: pointer']"
    );
    elementsToRemove.forEach((el) => el.remove());

    return svgClone;
  }

  /**
   * Draw legend on canvas
   */
  private drawLegendOnCanvas(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    options: ExportOptions
  ): void {
    const currentFeature = this.element.selectedFeature;
    const data = this.element.getCurrentData();

    if (!currentFeature || !data?.features[currentFeature]) {
      return;
    }

    const featureData = data.features[currentFeature];
    const maxItems = options.maxLegendItems || 10;

    // Calculate legend items
    const featureValueMap = new Map();

    data.protein_ids.forEach((_, idx) => {
      const featureIdx = data.feature_data[currentFeature][idx];
      const value = featureData.values[featureIdx];
      const color = featureData.colors[featureIdx];
      const shape = featureData.shapes[featureIdx];

      const valueKey = value === null ? "null" : value;

      if (!featureValueMap.has(valueKey)) {
        featureValueMap.set(valueKey, { value, color, shape, count: 1 });
      } else {
        featureValueMap.get(valueKey).count += 1;
      }
    });

    // Filter and sort legend items
    const visibleItems = Array.from(featureValueMap.values())
      .filter((item) => {
        const valueStr = item.value === null ? "null" : item.value;
        return !this.hiddenValues.includes(valueStr);
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, maxItems);

    // Draw legend
    const legendPadding = 20;
    const legendItemHeight = 30;
    const legendWidth = 200;
    const legendHeight = Math.min(
      canvas.height,
      legendPadding * 2 + visibleItems.length * legendItemHeight + 40
    );

    // Background
    ctx.fillStyle = "#f9f9f9";
    ctx.fillRect(canvas.width - legendWidth, 0, legendWidth, legendHeight);

    // Border
    ctx.strokeStyle = "#ddd";
    ctx.lineWidth = 1;
    ctx.strokeRect(canvas.width - legendWidth, 0, legendWidth, legendHeight);

    // Title
    ctx.font = "bold 16px Arial";
    ctx.fillStyle = "#333";
    ctx.textAlign = "center";
    ctx.fillText(
      currentFeature,
      canvas.width - legendWidth / 2,
      legendPadding + 10
    );

    // Legend items
    ctx.font = "14px Arial";
    ctx.textAlign = "left";

    let y = legendPadding + 40;

    visibleItems.forEach((item) => {
      const { value, color, shape, count } = item;
      const symbolSize = 20;
      const symbolX = canvas.width - legendWidth + legendPadding + symbolSize;
      const symbolY = y;

      ctx.fillStyle = color;
      this.drawShape(ctx, shape, symbolX, symbolY, symbolSize);

      // Count
      ctx.fillStyle = "#666";
      ctx.textAlign = "right";
      ctx.fillText(count.toString(), canvas.width - legendPadding, symbolY + 5);

      // Label
      ctx.fillStyle = "#333";
      ctx.textAlign = "left";
      ctx.fillText(
        value === null ? "N/A" : value.toString(),
        symbolX + symbolSize,
        symbolY + 5
      );

      y += legendItemHeight;
    });
  }

  /**
   * Draw shape on canvas
   */
  private drawShape(
    ctx: CanvasRenderingContext2D,
    shape: string,
    x: number,
    y: number,
    size: number
  ): void {
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;

    switch (shape) {
      case "circle":
        ctx.beginPath();
        ctx.arc(x, y, size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;
      case "square":
        ctx.fillRect(x - size / 2, y - size / 2, size, size);
        ctx.strokeRect(x - size / 2, y - size / 2, size, size);
        break;
      case "triangle":
        ctx.beginPath();
        ctx.moveTo(x, y - size / 2);
        ctx.lineTo(x - size / 2, y + size / 2);
        ctx.lineTo(x + size / 2, y + size / 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      case "diamond":
        ctx.beginPath();
        ctx.moveTo(x, y - size / 2);
        ctx.lineTo(x + size / 2, y);
        ctx.lineTo(x, y + size / 2);
        ctx.lineTo(x - size / 2, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      default:
        // Default to circle
        ctx.beginPath();
        ctx.arc(x, y, size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }
  }

  /**
   * Download file helper
   */
  private downloadFile(url: string, filename: string): void {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
  }
}

/**
 * Convenience function to create an exporter instance
 */
export function createExporter(
  element: ExportableElement,
  selectedProteins: string[] = [],
  hiddenValues: string[] = [],
  isolationMode: boolean = false
): ProtSpaceExporter {
  return new ProtSpaceExporter(
    element,
    selectedProteins,
    hiddenValues,
    isolationMode
  );
}

/**
 * Quick export functions for common use cases
 */
export const exportUtils = {
  /**
   * Export data as JSON
   */
  exportJSON: (element: ExportableElement, options?: ExportOptions) => {
    const exporter = createExporter(element);
    exporter.exportJSON(options);
  },

  /**
   * Export protein IDs
   */
  exportProteinIds: (
    element: ExportableElement,
    selectedProteins?: string[],
    options?: ExportOptions
  ) => {
    const exporter = createExporter(element, selectedProteins);
    exporter.exportProteinIds(options);
  },

  /**
   * Export as PNG
   */
  exportPNG: async (element: ExportableElement, options?: ExportOptions) => {
    const exporter = createExporter(element);
    return exporter.exportPNG(options);
  },

  /**
   * Export as PDF
   */
  exportPDF: async (element: ExportableElement, options?: ExportOptions) => {
    const exporter = createExporter(element);
    return exporter.exportPDF(options);
  },

  /**
   * Export as SVG
   */
  exportSVG: (element: ExportableElement, options?: ExportOptions) => {
    const exporter = createExporter(element);
    exporter.exportSVG(options);
  },
};
