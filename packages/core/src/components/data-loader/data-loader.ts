import { LitElement, html, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { parquetReadObjects } from "hyparquet";
import type { VisualizationData } from "@protspace/utils";
import { dataLoaderStyles } from "./data-loader.styles";
import { readFileOptimized } from "./utils/file-io";
import { isParquetBundle, extractRowsFromParquetBundle } from "./utils/bundle";
import { convertParquetToVisualizationDataOptimized } from "./utils/conversion";

/**
 * Parquet Data Loader Web Component
 *
 * Loads protein data from Parquet (.parquet) format files and converts them
 * to the ProtSpace visualization data format. Categories from columns
 * become legend items with unique values as elements.
 */
@customElement("protspace-data-loader")
export class DataLoader extends LitElement {
  static styles = dataLoaderStyles;

  /** URL or File object for the Arrow data source */
  @property({ type: String })
  src = "";

  /** Auto-load when src is provided */
  @property({ type: Boolean, attribute: "auto-load" })
  autoLoad = false;

  /** Accept drag and drop */
  @property({ type: Boolean, attribute: "allow-drop" })
  allowDrop = true;

  /** Required column mappings for Arrow data */
  @property({ type: Object, attribute: "column-mappings" })
  columnMappings: {
    proteinId?: string;
    projection_x?: string;
    projection_y?: string;
    projectionName?: string;
  } = {};

  @state()
  private loading = false;

  @state()
  private progress = 0;

  @state()
  private error: string | null = null;

  @state()
  private fileInfo: { name: string; size: number } | null = null;

  private fileInput!: HTMLInputElement;

  connectedCallback() {
    super.connectedCallback();
    if (this.autoLoad && this.src) {
      this.loadFromUrl(this.src);
    }
  }

  updated(changedProperties: PropertyValues) {
    if (changedProperties.has("src") && this.src && this.autoLoad) {
      this.loadFromUrl(this.src);
    }
  }

  firstUpdated() {
    this.fileInput = this.shadowRoot!.querySelector(
      ".hidden-input"
    ) as HTMLInputElement;
  }

  render() {
    return html`
      <div
        class="drop-zone"
        @click=${this.handleClick}
        @dragover=${this.handleDragOver}
        @drop=${this.handleDrop}
        @dragenter=${this.handleDragEnter}
        @dragleave=${this.handleDragLeave}
      >
        <div class="icon">
          ${this.loading ? this.renderLoadingIcon() : this.renderDataIcon()}
        </div>

        <div class="message">
          ${this.loading
            ? "Loading Parquet data..."
            : this.error
            ? "Error loading data"
            : this.allowDrop
            ? "Drop a Parquet or ParquetBundle file here or click to browse"
            : "Click to load Parquet or ParquetBundle file"}
        </div>

        ${this.fileInfo
          ? html`
              <div class="file-info">
                ${this.fileInfo.name}
                (${this.formatFileSize(this.fileInfo.size)})
              </div>
            `
          : ""}
        ${this.loading
          ? html`
              <div class="progress">
                <div
                  class="progress-bar"
                  style="width: ${this.progress}%"
                ></div>
              </div>
            `
          : ""}
        ${this.error
          ? html` <div class="error-message">${this.error}</div> `
          : ""}
      </div>

      <input
        type="file"
        class="hidden-input"
        accept=".parquet,.parquetbundle"
        @change=${this.handleFileSelect}
      />
    `;
  }

  private renderDataIcon() {
    return html`
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path
          d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"
        />
      </svg>
    `;
  }

  private renderLoadingIcon() {
    return html`
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        style="animation: spin 1s linear infinite"
      >
        <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z" />
      </svg>
      <style>
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      </style>
    `;
  }

  private handleClick() {
    if (!this.loading) {
      this.fileInput.click();
    }
  }

  private handleDragOver(e: DragEvent) {
    if (!this.allowDrop) return;
    e.preventDefault();
    e.dataTransfer!.dropEffect = "copy";
  }

  private handleDragEnter(e: DragEvent) {
    if (!this.allowDrop) return;
    e.preventDefault();
    this.setAttribute("dragging", "");
  }

  private handleDragLeave(e: DragEvent) {
    if (!this.allowDrop) return;
    e.preventDefault();
    this.removeAttribute("dragging");
  }

  private handleDrop(e: DragEvent) {
    if (!this.allowDrop) return;
    e.preventDefault();
    this.removeAttribute("dragging");

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      this.loadFromFile(files[0]);
    }
  }

  private handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.loadFromFile(file);
    }
  }

  /**
   * Load Parquet data from a URL
   */
  async loadFromUrl(url: string) {
    this.setLoading(true);
    this.error = null;

    try {
      this.progress = 10;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch: ${response.status} ${response.statusText}`
        );
      }

      this.progress = 30;
      const arrayBuffer = await response.arrayBuffer();

      this.progress = 60;
      const table = await parquetReadObjects({ file: arrayBuffer });

      this.progress = 80;
      const visualizationData = await convertParquetToVisualizationDataOptimized(table);

      this.progress = 100;
      this.dispatchDataLoaded(visualizationData);
    } catch (error) {
      this.error =
        error instanceof Error ? error.message : "Unknown error occurred";
      this.dispatchError(this.error);
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Load Parquet data from a File object with performance optimizations
   */
  async loadFromFile(file: File) {
    this.setLoading(true);
    this.error = null;
    this.fileInfo = { name: file.name, size: file.size };

    // Performance optimization: disable inspection files for large files
    const disableInspection = file.size > 50 * 1024 * 1024; // 50MB threshold

    try {
      this.progress = 10;

      // Optimize ArrayBuffer reading for large files
      const arrayBuffer = await readFileOptimized(file);

      this.progress = 30;

      // Check if this is a parquetbundle file
      if (file.name.endsWith(".parquetbundle") || isParquetBundle(arrayBuffer)) {
        const extractedData = await extractRowsFromParquetBundle(arrayBuffer, { disableInspection });
        this.progress = 70;
        const visualizationData = await convertParquetToVisualizationDataOptimized(extractedData);
        this.progress = 100;
        this.dispatchDataLoaded(visualizationData);
      } else {
        // Regular parquet file
        this.progress = 40;
        const table = await parquetReadObjects({ file: arrayBuffer });
        this.progress = 70;
        const visualizationData = await convertParquetToVisualizationDataOptimized(table);
        this.progress = 100;
        this.dispatchDataLoaded(visualizationData);
      }

    } catch (error) {
      this.error =
        error instanceof Error ? error.message : "Unknown error occurred";
      this.dispatchError(this.error);
    } finally {
      this.setLoading(false);
    }
  }

  private setLoading(loading: boolean) {
    this.loading = loading;
    if (loading) {
      this.setAttribute("loading", "");
      this.progress = 0;
    } else {
      this.removeAttribute("loading");
      this.progress = 0;
    }
  }

  private dispatchDataLoaded(data: VisualizationData) {
    this.dispatchEvent(
      new CustomEvent("data-loaded", {
        detail: { data },
        bubbles: true,
        composed: true,
      })
    );
  }

  private dispatchError(error: string) {
    this.dispatchEvent(
      new CustomEvent("data-error", {
        detail: { error },
        bubbles: true,
        composed: true,
      })
    );
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "protspace-data-loader": DataLoader;
  }
}
