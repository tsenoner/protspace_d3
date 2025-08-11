/**
 * Export utilities for ProtSpace visualizations
 */

// PDF generation libraries are imported dynamically for better browser compatibility
declare const window: any;

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
  private isolationMode: boolean;

  constructor(
    element: ExportableElement,
    selectedProteins: string[] = [],
    isolationMode: boolean = false
  ) {
    this.element = element;
    this.selectedProteins = selectedProteins;
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
   * Export visualization as PNG - downloads scatterplot and legend as separate files
   */
  async exportPNG(options: ExportOptions = {}): Promise<void> {
    try {
      // Export scatterplot using screenshot
      await this.exportScatterplotScreenshot(options);

      // Export legend using screenshot
      await this.exportLegendScreenshot(options);

      console.log(
        "PNG export completed: scatterplot and legend exported as separate files"
      );
    } catch (error) {
      console.error("PNG export failed:", error);
      throw error;
    }
  }

  /**
   * Export scatterplot as PNG using screenshot
   */
  private async exportScatterplotScreenshot(
    options: ExportOptions = {}
  ): Promise<void> {
    // Find the protspace-scatterplot web component
    const scatterplotElement = document.querySelector("protspace-scatterplot");
    if (!scatterplotElement) {
      console.error("Could not find protspace-scatterplot element");
      return;
    }

    // Import html2canvas-pro dynamically for better color function support
    const { default: html2canvas } = await import("html2canvas-pro");

    // Configure html2canvas-pro options for high quality
    const canvasOptions = {
      backgroundColor: options.backgroundColor || "#ffffff",
      scale: options.scaleForExport || 2,
      useCORS: true,
      allowTaint: false,
      logging: false,
      width: scatterplotElement.clientWidth,
      height: scatterplotElement.clientHeight,
      scrollX: 0,
      scrollY: 0,
    };

    console.log("Capturing scatterplot screenshot...");

    // Capture the scatterplot element
    const canvas = await html2canvas(
      scatterplotElement as HTMLElement,
      canvasOptions
    );

    // Export as PNG
    const dataUrl = canvas.toDataURL("image/png");
    const fileName = options.exportName
      ? `${options.exportName}_scatterplot.png`
      : "protspace_scatterplot.png";

    this.downloadFile(dataUrl, fileName);
    console.log("Scatterplot PNG exported successfully");
  }

  /**
   * Export legend as PNG using screenshot
   */
  private async exportLegendScreenshot(
    options: ExportOptions = {}
  ): Promise<void> {
    // Find the protspace-legend web component
    const legendElement = document.querySelector("protspace-legend");
    if (!legendElement) {
      console.log("No legend element found, skipping legend export");
      return;
    }

    // Import html2canvas-pro dynamically for better color function support
    const { default: html2canvas } = await import("html2canvas-pro");

    // Configure html2canvas-pro options for high quality
    const canvasOptions = {
      backgroundColor: options.backgroundColor || "#ffffff",
      scale: options.scaleForExport || 2,
      useCORS: true,
      allowTaint: false,
      logging: false,
      width: legendElement.clientWidth,
      height: legendElement.clientHeight,
      scrollX: 0,
      scrollY: 0,
    };

    console.log("Capturing legend screenshot...");

    // Capture the legend element
    const canvas = await html2canvas(
      legendElement as HTMLElement,
      canvasOptions
    );

    // Export as PNG
    const dataUrl = canvas.toDataURL("image/png");
    const fileName = options.exportName
      ? `${options.exportName}_legend.png`
      : "protspace_legend.png";

    this.downloadFile(dataUrl, fileName);
    console.log("Legend PNG exported successfully");
  }

  /**
   * Export visualization as PDF - downloads scatterplot and legend as separate files
   */
  async exportPDF(options: ExportOptions = {}): Promise<void> {
    try {
      // Export scatterplot as PDF using screenshot
      await this.exportScatterplotPDF(options);

      // Export legend as PDF using screenshot
      await this.exportLegendPDF(options);

      console.log(
        "PDF export completed: scatterplot and legend exported as separate files"
      );
    } catch (error) {
      console.error("PDF export failed:", error);
      throw error;
    }
  }

  /**
   * Export scatterplot as PDF using screenshot
   */
  private async exportScatterplotPDF(
    options: ExportOptions = {}
  ): Promise<void> {
    // Find the protspace-scatterplot web component
    const scatterplotElement = document.querySelector("protspace-scatterplot");
    if (!scatterplotElement) {
      console.error("Could not find protspace-scatterplot element");
      return;
    }

    // Import required libraries
    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import("jspdf"),
      import("html2canvas-pro"),
    ]);

    // Configure html2canvas-pro options for high quality
    const canvasOptions = {
      backgroundColor: options.backgroundColor || "#ffffff",
      scale: options.scaleForExport || 2,
      useCORS: true,
      allowTaint: false,
      logging: false,
      width: scatterplotElement.clientWidth,
      height: scatterplotElement.clientHeight,
      scrollX: 0,
      scrollY: 0,
    };

    console.log("Capturing scatterplot for PDF...");

    // Capture the scatterplot element
    const canvas = await html2canvas(
      scatterplotElement as HTMLElement,
      canvasOptions
    );

    // Create PDF
    const imgData = canvas.toDataURL("image/png", 1.0);
    const imgAspectRatio = canvas.width / canvas.height;

    // Create PDF in appropriate orientation
    const pdf = new jsPDF({
      orientation: imgAspectRatio > 1 ? "landscape" : "portrait",
      unit: "mm",
      format: "a4",
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pdfWidth - 2 * margin;
    const maxHeight = pdfHeight - 2 * margin;

    let imgWidth, imgHeight;
    const pageAspectRatio = maxWidth / maxHeight;

    if (imgAspectRatio > pageAspectRatio) {
      imgWidth = maxWidth;
      imgHeight = maxWidth / imgAspectRatio;
    } else {
      imgHeight = maxHeight;
      imgWidth = maxHeight * imgAspectRatio;
    }

    const x = (pdfWidth - imgWidth) / 2;
    const y = (pdfHeight - imgHeight) / 2;

    pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);

    const fileName = options.exportName
      ? `${options.exportName}_scatterplot.pdf`
      : "protspace_scatterplot.pdf";

    pdf.save(fileName);
    console.log("Scatterplot PDF exported successfully");
  }

  /**
   * Export legend as PDF using screenshot
   */
  private async exportLegendPDF(options: ExportOptions = {}): Promise<void> {
    // Find the protspace-legend web component
    const legendElement = document.querySelector("protspace-legend");
    if (!legendElement) {
      console.log("No legend element found, skipping legend PDF export");
      return;
    }

    // Import required libraries
    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import("jspdf"),
      import("html2canvas-pro"),
    ]);

    // Configure html2canvas-pro options for high quality
    const canvasOptions = {
      backgroundColor: options.backgroundColor || "#ffffff",
      scale: options.scaleForExport || 2,
      useCORS: true,
      allowTaint: false,
      logging: false,
      width: legendElement.clientWidth,
      height: legendElement.clientHeight,
      scrollX: 0,
      scrollY: 0,
    };

    console.log("Capturing legend for PDF...");

    // Capture the legend element
    const canvas = await html2canvas(
      legendElement as HTMLElement,
      canvasOptions
    );

    // Create PDF
    const imgData = canvas.toDataURL("image/png", 1.0);
    const imgAspectRatio = canvas.width / canvas.height;

    // Create PDF in appropriate orientation
    const pdf = new jsPDF({
      orientation: imgAspectRatio > 1 ? "landscape" : "portrait",
      unit: "mm",
      format: "a4",
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pdfWidth - 2 * margin;
    const maxHeight = pdfHeight - 2 * margin;

    let imgWidth, imgHeight;
    const pageAspectRatio = maxWidth / maxHeight;

    if (imgAspectRatio > pageAspectRatio) {
      imgWidth = maxWidth;
      imgHeight = maxWidth / imgAspectRatio;
    } else {
      imgHeight = maxHeight;
      imgWidth = maxHeight * imgAspectRatio;
    }

    const x = (pdfWidth - imgWidth) / 2;
    const y = (pdfHeight - imgHeight) / 2;

    pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);

    const fileName = options.exportName
      ? `${options.exportName}_legend.pdf`
      : "protspace_legend.pdf";

    pdf.save(fileName);
    console.log("Legend PDF exported successfully");
  }

  /**
   * Export visualization as SVG - downloads scatterplot and legend as separate files
   */
  exportSVG(options: ExportOptions = {}): void {
    try {
      // Export combined scatterplot + legend SVG
      this.exportCombinedSVG(options);

      console.log(
        "SVG export completed: scatterplot and legend exported as a combined file"
      );
    } catch (error) {
      console.error("SVG export failed:", error);
      throw error;
    }
  }

  /**
   * Export combined scatterplot and legend as a single SVG file
   */
  private exportCombinedSVG(options: ExportOptions = {}): void {
    console.log("🔍 Starting combined SVG export...");

    // Find the protspace-scatterplot web component
    const scatterplotElement = document.querySelector("protspace-scatterplot");
    if (!scatterplotElement) {
      console.error("❌ Could not find protspace-scatterplot element");
      return;
    }

    // Find SVG within the scatterplot component
    let scatterplotSvg: SVGElement | null = null;

    // Check shadow DOM first
    if (scatterplotElement.shadowRoot) {
      scatterplotSvg = scatterplotElement.shadowRoot.querySelector("svg");
    }

    // Fallback to regular DOM
    if (!scatterplotSvg) {
      scatterplotSvg = scatterplotElement.querySelector("svg");
    }

    if (!scatterplotSvg) {
      console.error("❌ Could not find SVG within scatterplot element");
      return;
    }

    console.log("📊 Scatterplot SVG found");

    // Clone and prepare scatterplot SVG for export
    const scatterplotClone = this.prepareSVGForExport(scatterplotSvg);
    const originalWidth = scatterplotSvg.clientWidth || 800;
    const originalHeight = scatterplotSvg.clientHeight || 600;

    // Find the protspace-legend web component
    const legendElement = document.querySelector("protspace-legend");
    let legendSvg: SVGElement | null = null;

    if (legendElement) {
      // Check shadow DOM first
      if (legendElement.shadowRoot) {
        legendSvg = legendElement.shadowRoot.querySelector("svg");
      }

      // Fallback to regular DOM
      if (!legendSvg) {
        legendSvg = legendElement.querySelector("svg");
      }

      if (legendSvg) {
        console.log("🏷️ Legend SVG found");
      } else {
        console.log("⚠️ No legend SVG found, will export scatterplot only");
      }
    } else {
      console.log("⚠️ No legend element found, will export scatterplot only");
    }

    // Create combined SVG
    const combinedSvg = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );

    // Set up legend dimensions and positioning
    const legendWidth = 300;
    const legendMargin = 20;
    const combinedWidth = originalWidth + legendWidth + legendMargin;

    // Calculate legend height based on data
    const legendData = legendElement
      ? this.extractLegendData(legendElement)
      : null;
    const legendHeight = legendData ? 40 + legendData.length * 32 + 32 : 200; // header + items + padding
    const combinedHeight = Math.max(originalHeight, legendHeight);

    combinedSvg.setAttribute("width", combinedWidth.toString());
    combinedSvg.setAttribute("height", combinedHeight.toString());
    combinedSvg.setAttribute(
      "viewBox",
      `0 0 ${combinedWidth} ${combinedHeight}`
    );
    combinedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");

    // Add white background
    const background = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect"
    );
    background.setAttribute("width", "100%");
    background.setAttribute("height", "100%");
    background.setAttribute("fill", options.backgroundColor || "white");
    combinedSvg.appendChild(background);

    // Add scatterplot content
    const scatterplotGroup = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "g"
    );
    scatterplotGroup.setAttribute("transform", "translate(0, 0)");

    // Copy all children from scatterplot SVG
    Array.from(scatterplotClone.children).forEach((child) => {
      scatterplotGroup.appendChild(child.cloneNode(true));
    });

    combinedSvg.appendChild(scatterplotGroup);

    // Add legend if found
    if (legendElement) {
      const legendGroup = this.buildLegendSVG(
        legendElement,
        originalWidth + legendMargin
      );
      if (legendGroup) {
        combinedSvg.appendChild(legendGroup);
      }
    }

    // Serialize and export
    const svgData = new XMLSerializer().serializeToString(combinedSvg);
    console.log("📊 Combined SVG data length:", svgData.length);

    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
    const svgUrl = URL.createObjectURL(svgBlob);

    const fileName = options.exportName
      ? `${options.exportName}_combined.svg`
      : "protspace_combined.svg";

    this.downloadFile(svgUrl, fileName);

    // Cleanup
    setTimeout(() => {
      URL.revokeObjectURL(svgUrl);
    }, 100);
  }

  /**
   * Build legend SVG from the HTML legend component
   */
  private buildLegendSVG(
    legendElement: Element,
    xOffset: number
  ): SVGElement | null {
    console.log("🔍 Building legend SVG from HTML element...");

    // Get the legend data from the element
    const legendData = this.extractLegendData(legendElement);
    if (!legendData || legendData.length === 0) {
      console.log("⚠️ No legend data found");
      return null;
    }

    // Create SVG group for the legend
    const legendGroup = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "g"
    );
    legendGroup.setAttribute("transform", `translate(${xOffset}, 0)`);

    // Legend styling constants
    const legendWidth = 280;
    const itemHeight = 32;
    const symbolSize = 16;
    const padding = 16;
    const headerHeight = 40;

    // Add legend background
    const background = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect"
    );
    background.setAttribute("x", "0");
    background.setAttribute("y", "0");
    background.setAttribute("width", legendWidth.toString());
    background.setAttribute(
      "height",
      (headerHeight + legendData.length * itemHeight + padding * 2).toString()
    );
    background.setAttribute("fill", "white");
    background.setAttribute("stroke", "#e1e5e9");
    background.setAttribute("stroke-width", "1");
    background.setAttribute("rx", "8");
    legendGroup.appendChild(background);

    // Add legend header
    const header = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text"
    );
    header.setAttribute("x", padding.toString());
    header.setAttribute("y", (padding + 16).toString());
    header.setAttribute("font-family", "Arial, sans-serif");
    header.setAttribute("font-size", "14px");
    header.setAttribute("font-weight", "500");
    header.setAttribute("fill", "#374151");
    header.textContent = legendData[0]?.feature || "Legend";
    legendGroup.appendChild(header);

    // Add legend items
    let yPos = headerHeight + padding;
    legendData.forEach((item, _) => {
      const itemGroup = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "g"
      );
      itemGroup.setAttribute("transform", `translate(0, ${yPos})`);

      // Add symbol
      const symbol = this.createLegendSymbol(
        item.shape,
        item.color,
        symbolSize
      );
      symbol.setAttribute(
        "transform",
        `translate(${padding + symbolSize / 2}, ${symbolSize / 2})`
      );
      itemGroup.appendChild(symbol);

      // Add text
      const text = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text"
      );
      text.setAttribute("x", (padding + symbolSize + 12).toString());
      text.setAttribute("y", (symbolSize / 2 + 4).toString());
      text.setAttribute("font-family", "Arial, sans-serif");
      text.setAttribute("font-size", "12px");
      text.setAttribute("fill", "#374151");
      text.textContent = item.value === null ? "N/A" : item.value;
      itemGroup.appendChild(text);

      // Add count
      const count = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text"
      );
      count.setAttribute("x", (legendWidth - padding - 8).toString());
      count.setAttribute("y", (symbolSize / 2 + 4).toString());
      count.setAttribute("font-family", "Arial, sans-serif");
      count.setAttribute("font-size", "12px");
      count.setAttribute("fill", "#6b7280");
      count.setAttribute("text-anchor", "end");
      count.textContent = item.count.toString();
      itemGroup.appendChild(count);

      legendGroup.appendChild(itemGroup);
      yPos += itemHeight;
    });

    console.log(
      "✅ Legend SVG built successfully with",
      legendData.length,
      "items"
    );
    return legendGroup;
  }

  /**
   * Create a symbol for the legend
   */
  private createLegendSymbol(
    shape: string,
    color: string,
    size: number
  ): SVGElement {
    const symbol = document.createElementNS("http://www.w3.org/2000/svg", "g");

    // Use simple shapes for export
    let path: SVGElement;

    switch (shape?.toLowerCase()) {
      case "square":
        path = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        path.setAttribute("x", (-size / 2).toString());
        path.setAttribute("y", (-size / 2).toString());
        path.setAttribute("width", size.toString());
        path.setAttribute("height", size.toString());
        break;
      case "triangle":
        path = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "polygon"
        );
        path.setAttribute(
          "points",
          `0,${-size / 2} ${size / 2},${size / 2} ${-size / 2},${size / 2}`
        );
        break;
      case "diamond":
        path = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "polygon"
        );
        path.setAttribute(
          "points",
          `0,${-size / 2} ${size / 2},0 0,${size / 2} ${-size / 2},0`
        );
        break;
      case "cross":
      case "plus":
        path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const crossSize = size * 0.4;
        path.setAttribute(
          "d",
          `M0,${-crossSize} L0,${crossSize} M${-crossSize},0 L${crossSize},0`
        );
        path.setAttribute("stroke", color);
        path.setAttribute("stroke-width", "2");
        path.setAttribute("fill", "none");
        symbol.appendChild(path);
        return symbol;
      default:
        // Default to circle
        path = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        path.setAttribute("cx", "0");
        path.setAttribute("cy", "0");
        path.setAttribute("r", (size / 2).toString());
    }

    path.setAttribute("fill", color || "#888");
    path.setAttribute("stroke", "#333");
    path.setAttribute("stroke-width", "1");
    symbol.appendChild(path);

    return symbol;
  }

  /**
   * Extract legend data from the HTML legend component
   */
  private extractLegendData(legendElement: Element): Array<{
    feature: string;
    value: string;
    color: string;
    shape: string;
    count: number;
  }> | null {
    console.log("🔍 Extracting legend data...");

    const legendData: Array<{
      feature: string;
      value: string;
      color: string;
      shape: string;
      count: number;
    }> = [];

    // Get the legend component instance
    const legendComponent = legendElement as any;

    // Try to get data from the component's properties
    if (
      legendComponent.legendItems &&
      Array.isArray(legendComponent.legendItems)
    ) {
      legendComponent.legendItems.forEach((item: any) => {
        legendData.push({
          feature:
            legendComponent.featureData?.name ||
            legendComponent.featureName ||
            "Legend",
          value: item.value || "Unknown",
          color: item.color || "#888",
          shape: item.shape || "circle",
          count: item.count || 0,
        });
      });
    } else {
      // Fallback: try to extract from DOM
      const legendItems = legendElement.querySelectorAll(".legend-item");
      legendItems.forEach((item: Element) => {
        const textElement = item.querySelector(".legend-text");
        const countElement = item.querySelector(".legend-count");
        const symbolElement = item.querySelector(
          ".legend-symbol path, .legend-symbol circle, .legend-symbol rect"
        );

        if (textElement && countElement) {
          legendData.push({
            feature: "Legend",
            value: textElement.textContent || "Unknown",
            color: symbolElement?.getAttribute("fill") || "#888",
            shape: this.getShapeFromElement(symbolElement),
            count: parseInt(countElement.textContent || "0"),
          });
        }
      });
    }

    console.log("🏷️ Extracted", legendData.length, "legend items");
    return legendData.length > 0 ? legendData : null;
  }

  /**
   * Get shape name from SVG element
   */
  private getShapeFromElement(element: Element | null): string {
    if (!element) return "circle";

    switch (element.tagName.toLowerCase()) {
      case "rect":
        return "square";
      case "polygon":
        const points = element.getAttribute("points") || "";
        if (points.includes("0,") && points.split(",").length === 6) {
          return "triangle";
        }
        return "diamond";
      case "path":
        return "cross";
      default:
        return "circle";
    }
  }

  /**
   * Prepare SVG for export by removing interactive elements and setting proper dimensions
   */
  private prepareSVGForExport(svgElement: SVGElement): SVGElement {
    const svgClone = svgElement.cloneNode(true) as SVGElement;

    // Get original dimensions from SVG attributes or computed values
    const originalWidth =
      parseInt(svgElement.getAttribute("width") || "0") ||
      svgElement.clientWidth ||
      svgElement.getBoundingClientRect().width ||
      800;
    const originalHeight =
      parseInt(svgElement.getAttribute("height") || "0") ||
      svgElement.clientHeight ||
      svgElement.getBoundingClientRect().height ||
      600;

    // Set dimensions on the clone
    svgClone.setAttribute("width", originalWidth.toString());
    svgClone.setAttribute("height", originalHeight.toString());

    // Preserve or set viewBox
    const viewBox =
      svgElement.getAttribute("viewBox") ||
      `0 0 ${originalWidth} ${originalHeight}`;
    svgClone.setAttribute("viewBox", viewBox);

    // Remove interactive elements
    const elementsToRemove = svgClone.querySelectorAll(
      ".absolute, .z-10, button, .reset-view-button, [class*='tooltip'], [class*='control'], [style*='cursor: pointer']"
    );
    elementsToRemove.forEach((el) => el.remove());

    return svgClone;
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
  isolationMode: boolean = false
): ProtSpaceExporter {
  return new ProtSpaceExporter(element, selectedProteins, isolationMode);
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
