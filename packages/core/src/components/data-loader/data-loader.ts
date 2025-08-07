import { LitElement, html, css, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { parquetReadObjects } from "hyparquet";
import type { VisualizationData, Feature } from "@protspace/utils";

/**
 * Parquet Data Loader Web Component
 *
 * Loads protein data from Parquet (.parquet) format files and converts them
 * to the ProtSpace visualization data format. Categories from columns
 * become legend items with unique values as elements.
 */
@customElement("protspace-data-loader")
export class DataLoader extends LitElement {
  static styles = css`
    :host {
      display: block;
      padding: 1rem;
      border: 2px dashed #ccc;
      border-radius: 8px;
      text-align: center;
      background: #fafafa;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    :host(:hover) {
      border-color: #666;
      background: #f0f0f0;
    }

    :host([loading]) {
      border-color: #007acc;
      background: #e6f3ff;
      cursor: wait;
    }

    :host([error]) {
      border-color: #d32f2f;
      background: #ffebee;
    }

    .drop-zone {
      padding: 2rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }

    .icon {
      width: 48px;
      height: 48px;
      opacity: 0.5;
    }

    .message {
      font-size: 1.1rem;
      color: #666;
      max-width: 400px;
    }

    .file-info {
      font-size: 0.9rem;
      color: #888;
      margin-top: 0.5rem;
    }

    .progress {
      width: 100%;
      max-width: 300px;
      height: 4px;
      background: #e0e0e0;
      border-radius: 2px;
      overflow: hidden;
      margin-top: 1rem;
    }

    .progress-bar {
      height: 100%;
      background: #007acc;
      transition: width 0.3s ease;
    }

    .error-message {
      color: #d32f2f;
      font-size: 0.9rem;
      margin-top: 0.5rem;
    }

    .hidden-input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }
  `;

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
      const visualizationData =
        await this.convertParquetToVisualizationDataOptimized(table);

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
      const arrayBuffer = await this.readFileOptimized(file);

      this.progress = 30;

      // Check if this is a parquetbundle file
      if (
        file.name.endsWith(".parquetbundle") ||
        this.isParquetBundle(arrayBuffer)
      ) {
        console.log("🔍 Detected parquetbundle format, extracting...");
        const extractedData = await this.extractFromParquetBundle(
          arrayBuffer,
          disableInspection
        );
        this.progress = 70;
        const visualizationData =
          await this.convertParquetToVisualizationDataOptimized(extractedData);
        this.progress = 100;
        this.dispatchDataLoaded(visualizationData);
      } else {
        // Regular parquet file
        this.progress = 40;
        const table = await parquetReadObjects({ file: arrayBuffer });
        this.progress = 70;
        const visualizationData =
          await this.convertParquetToVisualizationDataOptimized(table);
        this.progress = 100;
        this.dispatchDataLoaded(visualizationData);
      }

      console.log("✅ Data conversion completed successfully");
      console.log("📊 About to dispatch data-loaded event...");
      console.log("✅ dispatchDataLoaded called successfully");
    } catch (error) {
      this.error =
        error instanceof Error ? error.message : "Unknown error occurred";
      this.dispatchError(this.error);
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Optimized file reading with chunking for large files
   */
  private async readFileOptimized(file: File): Promise<ArrayBuffer> {
    // For small files, use the normal approach
    if (file.size < 10 * 1024 * 1024) {
      // 10MB
      return file.arrayBuffer();
    }

    // For large files, read in chunks to avoid blocking
    const chunkSize = 8 * 1024 * 1024; // 8MB chunks
    const chunks: Uint8Array[] = [];
    let offset = 0;

    while (offset < file.size) {
      const chunk = file.slice(offset, Math.min(offset + chunkSize, file.size));
      const chunkBuffer = await chunk.arrayBuffer();
      chunks.push(new Uint8Array(chunkBuffer));
      offset += chunkSize;

      // Yield control to prevent UI blocking
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    // Combine chunks efficiently
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let position = 0;

    for (const chunk of chunks) {
      result.set(chunk, position);
      position += chunk.length;
    }

    return result.buffer;
  }

  /**
   * Check if the file is a parquetbundle format
   */
  private isParquetBundle(arrayBuffer: ArrayBuffer): boolean {
    const uint8Array = new Uint8Array(arrayBuffer);
    const delimiter = new TextEncoder().encode("---PARQUET_DELIMITER---");

    // Look for the delimiter in the first part of the file
    for (let i = 0; i <= uint8Array.length - delimiter.length; i++) {
      let match = true;
      for (let j = 0; j < delimiter.length; j++) {
        if (uint8Array[i + j] !== delimiter[j]) {
          match = false;
          break;
        }
      }
      if (match) {
        console.log("🎯 Found parquet bundle delimiter at position:", i);
        return true;
      }
    }
    return false;
  }

  /**
   * Extract data from parquetbundle format
   */
  private async extractFromParquetBundle(
    arrayBuffer: ArrayBuffer,
    disableInspection: boolean
  ): Promise<Record<string, any>[]> {
    console.log("🔧 Extracting from parquetbundle format...");

    const uint8Array = new Uint8Array(arrayBuffer);
    const delimiter = new TextEncoder().encode("---PARQUET_DELIMITER---");

    // Find all delimiter positions
    const delimiterPositions: number[] = [];
    for (let i = 0; i <= uint8Array.length - delimiter.length; i++) {
      let match = true;
      for (let j = 0; j < delimiter.length; j++) {
        if (uint8Array[i + j] !== delimiter[j]) {
          match = false;
          break;
        }
      }
      if (match) {
        delimiterPositions.push(i);
      }
    }

    if (delimiterPositions.length !== 2) {
      throw new Error(
        `Expected 2 delimiters in parquetbundle, found ${delimiterPositions.length}`
      );
    }

    console.log("📍 Found delimiters at positions:", delimiterPositions);

    // Split into 3 parts according to ProtSpace format
    const selectedFeaturesBuffer = uint8Array.slice(
      0,
      delimiterPositions[0]
    ).buffer;
    const projectionsMetadataBuffer = uint8Array.slice(
      delimiterPositions[0] + delimiter.length,
      delimiterPositions[1]
    ).buffer;
    const projectionsDataBuffer = uint8Array.slice(
      delimiterPositions[1] + delimiter.length
    ).buffer;

    console.log("📦 Split bundle into 3 parts:", {
      selectedFeatures: selectedFeaturesBuffer.byteLength + " bytes",
      projectionsMetadata: projectionsMetadataBuffer.byteLength + " bytes",
      projectionsData: projectionsDataBuffer.byteLength + " bytes",
    });

    try {
      // Read all three parts
      const selectedFeaturesData = await parquetReadObjects({
        file: selectedFeaturesBuffer,
      });
      console.log("📋 Selected Features:", {
        rows: selectedFeaturesData.length,
        columns:
          selectedFeaturesData.length > 0
            ? Object.keys(selectedFeaturesData[0])
            : [],
        sample: selectedFeaturesData.slice(0, 2),
      });

      const projectionsMetadataData = await parquetReadObjects({
        file: projectionsMetadataBuffer,
      });
      console.log("📊 Projections Metadata:", {
        rows: projectionsMetadataData.length,
        columns:
          projectionsMetadataData.length > 0
            ? Object.keys(projectionsMetadataData[0])
            : [],
        sample: projectionsMetadataData.slice(0, 2),
      });

      const projectionsData = await parquetReadObjects({
        file: projectionsDataBuffer,
      });
      console.log("📈 Projections Data:", {
        rows: projectionsData.length,
        columns:
          projectionsData.length > 0 ? Object.keys(projectionsData[0]) : [],
        sample: projectionsData.slice(0, 3),
      });

      // Create downloadable files for inspection
      if (!disableInspection) {
        this.createInspectionFiles(
          selectedFeaturesBuffer,
          projectionsMetadataBuffer,
          projectionsDataBuffer,
          selectedFeaturesData,
          projectionsMetadataData,
          projectionsData
        );
      }

      // Merge projections data with features data for visualization
      console.log("🔗 Merging projection coordinates with feature data...");
      const mergedData = this.mergeProjectionsWithFeatures(
        projectionsData,
        selectedFeaturesData
      );

      console.log("✅ Final merged data:", {
        rows: mergedData.length,
        columns: mergedData.length > 0 ? Object.keys(mergedData[0]) : [],
        sample: mergedData.slice(0, 2),
      });

      return mergedData;
    } catch (error) {
      console.error("❌ Failed to process parquet bundle parts:", error);
      throw new Error(`Failed to process parquet bundle: ${error}`);
    }
  }

  /**
   * Merge projections data with features data based on protein identifiers
   */
  private mergeProjectionsWithFeatures(
    projectionsData: Record<string, any>[],
    featuresData: Record<string, any>[]
  ): Record<string, any>[] {
    console.log("🔗 Merging projections with features...");

    // Create a map of features by protein ID for fast lookup
    const featuresMap = new Map<string, Record<string, any>>();

    // Try different possible ID column names in features
    const featureIdColumn = this.findColumn(
      featuresData.length > 0 ? Object.keys(featuresData[0]) : [],
      ["protein_id", "identifier", "id", "uniprot", "entry"]
    );

    if (!featureIdColumn && featuresData.length > 0) {
      console.warn(
        "⚠️ No ID column found in features data, using first column"
      );
    }

    const finalFeatureIdColumn =
      featureIdColumn ||
      (featuresData.length > 0 ? Object.keys(featuresData[0])[0] : null);

    if (finalFeatureIdColumn) {
      for (const feature of featuresData) {
        const proteinId = feature[finalFeatureIdColumn];
        if (proteinId) {
          featuresMap.set(proteinId.toString(), feature);
        }
      }
      console.log(
        `📋 Created features map with ${featuresMap.size} entries using column '${finalFeatureIdColumn}'`
      );
    }

    // Find projection ID column
    const projectionIdColumn = this.findColumn(
      projectionsData.length > 0 ? Object.keys(projectionsData[0]) : [],
      ["identifier", "protein_id", "id", "uniprot", "entry"]
    );

    if (!projectionIdColumn) {
      console.warn("⚠️ No ID column found in projections data");
      return projectionsData; // Return as-is if no merge possible
    }

    console.log(
      `🎯 Using '${projectionIdColumn}' from projections and '${finalFeatureIdColumn}' from features for merging`
    );

    // Merge the data
    const mergedData: Record<string, any>[] = [];

    for (const projection of projectionsData) {
      const proteinId = projection[projectionIdColumn];
      const features = proteinId ? featuresMap.get(proteinId.toString()) : null;

      // Create merged row
      const mergedRow = {
        ...projection, // Keep all projection data (identifier, projection_name, x, y, z)
        ...(features || {}), // Add features if found
      };

      mergedData.push(mergedRow);
    }

    console.log(
      `✅ Merged ${mergedData.length} rows with projection coordinates and features`
    );
    return mergedData;
  }



  /**
   * Create downloadable files for inspection in VS Code/Cursor
   */
  private createInspectionFiles(
    part1Buffer: ArrayBuffer,
    part2Buffer: ArrayBuffer,
    part3Buffer: ArrayBuffer,
    part1Data: Record<string, any>[],
    part2Data: Record<string, any>[],
    part3Data: Record<string, any>[]
  ) {
    console.log("💾 Creating inspection files for download...");

    try {
      // Create blob URLs for downloading the individual parquet files
      const part1Blob = new Blob([part1Buffer], {
        type: "application/octet-stream",
      });
      const part2Blob = new Blob([part2Buffer], {
        type: "application/octet-stream",
      });
      const part3Blob = new Blob([part3Buffer], {
        type: "application/octet-stream",
      });

      const part1Url = URL.createObjectURL(part1Blob);
      const part2Url = URL.createObjectURL(part2Blob);
      const part3Url = URL.createObjectURL(part3Blob);

      // Create download links
      const downloadContainer = document.createElement("div");
      downloadContainer.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 10000;
        background: white; border: 2px solid #333; border-radius: 8px;
        padding: 15px; font-family: Arial, sans-serif; font-size: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3); max-width: 300px;
      `;

      downloadContainer.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 10px;">📥 Bundle Parts for Inspection</div>
        <div style="margin-bottom: 5px;">
          <a href="${part1Url}" download="selected_features.parquet" style="color: #0066cc;">
            📄 Part 1: selected_features.parquet (${part1Data.length} rows)
          </a>
        </div>
        <div style="margin-bottom: 5px;">
          <a href="${part2Url}" download="projections_metadata.parquet" style="color: #0066cc;">
            📊 Part 2: projections_metadata.parquet (${part2Data.length} rows)
          </a>
        </div>
        <div style="margin-bottom: 10px;">
          <a href="${part3Url}" download="projections_data.parquet" style="color: #0066cc;">
            📈 Part 3: projections_data.parquet (${part3Data.length} rows)
          </a>
        </div>
        <button onclick="this.parentElement.remove()" style="
          background: #ff4444; color: white; border: none; 
          padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 11px;
        ">Close</button>
      `;

      document.body.appendChild(downloadContainer);

      // Auto-remove after 30 seconds
      setTimeout(() => {
        if (downloadContainer.parentElement) {
          downloadContainer.remove();
        }
        URL.revokeObjectURL(part1Url);
        URL.revokeObjectURL(part2Url);
        URL.revokeObjectURL(part3Url);
      }, 30000);

      console.log("✅ Inspection files ready for download");
    } catch (error) {
      console.error("❌ Failed to create inspection files:", error);
    }
  }

  /**
   * Convert Parquet data to ProtSpace VisualizationData format with performance optimizations
   */
  private async convertParquetToVisualizationDataOptimized(
    rows: Record<string, any>[]
  ): Promise<VisualizationData> {
    console.log(
      "🔄 Converting parquet data to visualization format (optimized)..."
    );

    if (!rows || rows.length === 0) {
      throw new Error("No data rows found in parquet file");
    }

    const dataSize = rows.length;
    console.log(`📊 Processing ${dataSize} rows with optimization...`);

    // For small datasets, use the regular method
    if (dataSize < 10000) {
      return this.convertParquetToVisualizationData(rows);
    }

    // For large datasets, use chunked processing
    return this.convertLargeDatasetOptimized(rows);
  }

  /**
   * Optimized conversion for large datasets using chunking
   */
  private async convertLargeDatasetOptimized(
    rows: Record<string, any>[]
  ): Promise<VisualizationData> {
    console.log("⚡ Using large dataset optimization...");

    // Extract column names from first row
    const columnNames = Object.keys(rows[0]);
    console.log("📊 Parquet columns found:", columnNames.length, "columns");

    // Check if this is the new ProtSpace bundle format
    const hasProjectionName = columnNames.includes("projection_name");
    const hasXYCoordinates =
      columnNames.includes("x") && columnNames.includes("y");

    if (hasProjectionName && hasXYCoordinates) {
      console.log("✅ Using optimized bundle format processing");
      return this.convertBundleFormatDataOptimized(rows, columnNames);
    } else {
      console.log("📊 Using optimized legacy format processing");
      return this.convertLegacyFormatDataOptimized(rows, columnNames);
    }
  }

  /**
   * Optimized bundle format conversion with chunking
   */
  private async convertBundleFormatDataOptimized(
    rows: Record<string, any>[],
    columnNames: string[]
  ): Promise<VisualizationData> {
    const chunkSize = 5000; // Process 5000 rows at a time
    const totalRows = rows.length;

    console.log(
      `🎯 Converting bundle format data in chunks (${chunkSize} rows per chunk)...`
    );

    // Find protein ID column
    const proteinIdCol =
      this.findColumn(columnNames, [
        "identifier",
        "protein_id",
        "id",
        "protein",
        "uniprot",
      ]) || columnNames[0];

    // Use Map for better performance with large datasets
    const projectionGroups = new Map<string, Record<string, any>[]>();
    const uniqueProteinIdsSet = new Set<string>();

    // Process data in chunks to avoid blocking the UI
    for (let i = 0; i < totalRows; i += chunkSize) {
      const chunk = rows.slice(i, Math.min(i + chunkSize, totalRows));

      // Process chunk
      for (const row of chunk) {
        const projectionName = row.projection_name || "Unknown";
        if (!projectionGroups.has(projectionName)) {
          projectionGroups.set(projectionName, []);
        }
        projectionGroups.get(projectionName)!.push(row);

        const proteinId = row[proteinIdCol]?.toString();
        if (proteinId) {
          uniqueProteinIdsSet.add(proteinId);
        }
      }

      // Yield control every chunk to prevent UI blocking
      if (i % (chunkSize * 4) === 0) {
        // Every 4 chunks
        await new Promise((resolve) => setTimeout(resolve, 0));
        console.log(
          `📈 Processed ${Math.min(
            i + chunkSize,
            totalRows
          )}/${totalRows} rows...`
        );
      }
    }

    const uniqueProteinIds = Array.from(uniqueProteinIdsSet);
    console.log(`🧬 Found ${uniqueProteinIds.length} unique proteins`);

    // Create projections with optimized coordinate mapping
    const projections = [];
    for (const [projectionName, projectionRows] of projectionGroups.entries()) {
      // Use Map for O(1) lookup instead of O(n) search
      const coordMap = new Map<string, [number, number]>();

      for (const row of projectionRows) {
        const proteinId = row[proteinIdCol]?.toString() || "";
        const x = parseFloat(row.x) || 0;
        const y = parseFloat(row.y) || 0;
        coordMap.set(proteinId, [x, y]);
      }

      // Build projection data efficiently
      const projectionData: [number, number][] = new Array(
        uniqueProteinIds.length
      );
      for (let i = 0; i < uniqueProteinIds.length; i++) {
        projectionData[i] = coordMap.get(uniqueProteinIds[i]) || [0, 0];
      }

      const formattedName = this.formatProjectionName(projectionName);
      projections.push({
        name: formattedName,
        data: projectionData,
      });

      // Yield control after each projection
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    // Extract features with optimized processing
    const features = await this.extractFeaturesOptimized(
      rows,
      columnNames,
      proteinIdCol,
      uniqueProteinIds
    );

    const result = {
      protein_ids: uniqueProteinIds,
      projections,
      features: features.features,
      feature_data: features.feature_data,
    };

    console.log("✅ Optimized bundle format conversion completed:", {
      protein_count: result.protein_ids.length,
      projection_count: result.projections.length,
      feature_count: Object.keys(result.features).length,
    });

    return result;
  }

  /**
   * Optimized feature extraction with chunking
   */
  private async extractFeaturesOptimized(
    rows: Record<string, any>[],
    columnNames: string[],
    proteinIdCol: string,
    uniqueProteinIds: string[]
  ): Promise<{
    features: Record<string, Feature>;
    feature_data: Record<string, number[]>;
  }> {
    // Exclude coordinate and ID columns
    const allIdColumns = new Set([
      "projection_name",
      "x",
      "y",
      "z",
      "identifier",
      "protein_id",
      "id",
      "uniprot",
      "entry",
      proteinIdCol,
    ]);

    const featureColumns = columnNames.filter((col) => !allIdColumns.has(col));
    console.log(`🏷️ Processing ${featureColumns.length} feature columns...`);

    const features: Record<string, Feature> = {};
    const feature_data: Record<string, number[]> = {};

    const chunkSize = 10000;
    const totalRows = rows.length;

    for (const featureCol of featureColumns) {
      console.log(`🔍 Processing feature: ${featureCol}`);

      // Use Map for better performance
      const featureMap = new Map<string, string | null>();
      const valueCountMap = new Map<string | null, number>();

      // Process data in chunks
      for (let i = 0; i < totalRows; i += chunkSize) {
        const chunk = rows.slice(i, Math.min(i + chunkSize, totalRows));

        for (const row of chunk) {
          const proteinId = row[proteinIdCol]?.toString() || "";
          const value = row[featureCol];
          const stringValue =
            value === null || value === undefined ? null : value.toString();

          featureMap.set(proteinId, stringValue);
          valueCountMap.set(
            stringValue,
            (valueCountMap.get(stringValue) || 0) + 1
          );
        }

        // Yield control periodically
        if (i % (chunkSize * 5) === 0) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }

      // Get unique values and create efficient mappings
      const uniqueValues = Array.from(valueCountMap.keys());
      const valueToIndex = new Map<string | null, number>();
      uniqueValues.forEach((value, index) => {
        valueToIndex.set(value, index);
      });

      // Generate colors and shapes efficiently
      const colors = this.generateColors(uniqueValues.length);
      const shapes = this.generateShapes(uniqueValues.length);

      // Create feature data array efficiently
      const featureDataArray = new Array<number>(uniqueProteinIds.length);
      for (let i = 0; i < uniqueProteinIds.length; i++) {
        const value = featureMap.get(uniqueProteinIds[i]) || null;
        featureDataArray[i] = valueToIndex.get(value) || 0;
      }

      features[featureCol] = { values: uniqueValues, colors, shapes };
      feature_data[featureCol] = featureDataArray;

      // Yield control after each feature
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    return { features, feature_data };
  }

  /**
   * Optimized legacy format conversion (placeholder - implement if needed)
   */
  private async convertLegacyFormatDataOptimized(
    rows: Record<string, any>[],
    columnNames: string[]
  ): Promise<VisualizationData> {
    // For now, fall back to the regular method
    // Can be optimized later if needed
    console.log(
      "⚠️ Using regular legacy conversion (optimization not yet implemented)"
    );
    return this.convertLegacyFormatData(rows, columnNames);
  }

  /**
   * Convert Parquet data to ProtSpace VisualizationData format
   */
  private convertParquetToVisualizationData(
    rows: Record<string, any>[]
  ): VisualizationData {
    console.log("🔄 Converting parquet data to visualization format...");

    if (!rows || rows.length === 0) {
      throw new Error("No data rows found in parquet file");
    }

    // Extract column names from first row
    const columnNames = Object.keys(rows[0]);
    console.log("📊 Parquet columns found:", columnNames);
    console.log("🔍 Sample row for analysis:", rows[0]);

    // Check if this is the new ProtSpace bundle format (has projection_name, x, y columns)
    const hasProjectionName = columnNames.includes("projection_name");
    const hasXYCoordinates =
      columnNames.includes("x") && columnNames.includes("y");

    if (hasProjectionName && hasXYCoordinates) {
      console.log(
        "✅ Detected new ProtSpace bundle format with projection_name and x,y coordinates"
      );
      return this.convertBundleFormatData(rows, columnNames);
    } else {
      console.log("📊 Using legacy projection pair detection");
      return this.convertLegacyFormatData(rows, columnNames);
    }
  }

  /**
   * Convert new ProtSpace bundle format data
   */
  private convertBundleFormatData(
    rows: Record<string, any>[],
    columnNames: string[]
  ): VisualizationData {
    console.log("🎯 Converting bundle format data...");

    // Find protein ID column
    const proteinIdCol =
      this.findColumn(columnNames, [
        "identifier",
        "protein_id",
        "id",
        "protein",
        "uniprot",
      ]) || columnNames[0];

    console.log(`🏷️ Using '${proteinIdCol}' as protein ID column`);

    // Group data by projection type
    const projectionGroups = new Map<string, Record<string, any>[]>();
    for (const row of rows) {
      const projectionName = row.projection_name || "Unknown";
      console.log(
        `🔍 Processing row with projection_name: "${projectionName}"`
      );
      if (!projectionGroups.has(projectionName)) {
        projectionGroups.set(projectionName, []);
      }
      projectionGroups.get(projectionName)!.push(row);
    }

    console.log("📊 Found projections:", Array.from(projectionGroups.keys()));
    console.log(
      "📊 Projection sizes:",
      Array.from(projectionGroups.entries()).map(
        ([name, data]) => `${name}: ${data.length} points`
      )
    );

    // Extract unique protein IDs (they might be duplicated across projections)
    const uniqueProteinIds = Array.from(
      new Set(
        rows.map((row) => {
          const value = row[proteinIdCol];
          return value ? value.toString() : "";
        })
      )
    );

    console.log(`🧬 Found ${uniqueProteinIds.length} unique proteins`);

    // Create projections array
    const projections = [];
    for (const [projectionName, projectionRows] of projectionGroups.entries()) {
      const projectionData: [number, number][] = [];

      // Create a map for faster lookup
      const coordMap = new Map<string, [number, number]>();
      for (const row of projectionRows) {
        const proteinId = row[proteinIdCol]?.toString() || "";
        const x = parseFloat(row.x) || 0;
        const y = parseFloat(row.y) || 0;
        coordMap.set(proteinId, [x, y]);
      }

      // Ensure all proteins have coordinates (fill missing with [0,0])
      for (const proteinId of uniqueProteinIds) {
        const coords = coordMap.get(proteinId) || [0, 0];
        projectionData.push(coords);
      }

      console.log(`📈 Projection '${projectionName}':`, {
        points: projectionData.length,
        xRange: [
          Math.min(...projectionData.map((p) => p[0])),
          Math.max(...projectionData.map((p) => p[0])),
        ],
        yRange: [
          Math.min(...projectionData.map((p) => p[1])),
          Math.max(...projectionData.map((p) => p[1])),
        ],
        sample: projectionData.slice(0, 3),
      });

      const formattedName = this.formatProjectionName(projectionName);
      console.log(
        `🏷️ Formatting projection name: "${projectionName}" → "${formattedName}"`
      );

      projections.push({
        name: formattedName,
        data: projectionData,
      });
    }

    // Extract features (exclude coordinate and ID columns)
    // After merging, we may have multiple ID columns from both projections and features data
    const allIdColumns = new Set([
      "projection_name",
      "x",
      "y",
      "z", // Coordinate and projection columns
      "identifier",
      "protein_id",
      "id",
      "uniprot",
      "entry", // All possible ID columns
      proteinIdCol, // The detected protein ID column
    ]);

    const featureColumns = columnNames.filter((col) => !allIdColumns.has(col));

    console.log(
      "🏷️ Feature columns (after excluding all ID columns):",
      featureColumns
    );
    console.log(
      "🚫 Excluded columns:",
      Array.from(allIdColumns).filter((col) => columnNames.includes(col))
    );

    const features: Record<string, Feature> = {};
    const feature_data: Record<string, number[]> = {};

    // Use the first projection's data as the base for features (they should be the same across projections)
    const baseProjectionData = projectionGroups.values().next().value || rows;

    for (const featureCol of featureColumns) {
      // Create a map of feature values by protein ID
      const featureMap = new Map<string, string | null>();

      for (const row of baseProjectionData) {
        const proteinId = row[proteinIdCol]?.toString() || "";
        const value = row[featureCol];
        const stringValue =
          value === null || value === undefined ? null : value.toString();
        featureMap.set(proteinId, stringValue);
      }

      // Get unique values and create mappings
      const allValues = Array.from(featureMap.values());
      const uniqueValues = Array.from(new Set(allValues));
      const valueToIndex = new Map<string | null, number>();

      uniqueValues.forEach((value, index) => {
        valueToIndex.set(value, index);
      });

      console.log(
        `🏷️ Feature '${featureCol}': ${uniqueValues.length} unique values:`,
        uniqueValues.slice(0, 5)
      );

      // Create colors and shapes
      const colors = this.generateColors(uniqueValues.length);
      const shapes = this.generateShapes(uniqueValues.length);

      console.log(
        `🎨 Generated colors for '${featureCol}':`,
        colors.slice(0, 3)
      );
      console.log(
        `🔺 Generated shapes for '${featureCol}':`,
        shapes.slice(0, 3)
      );

      // Map feature values to indices for all proteins
      const featureDataArray: number[] = uniqueProteinIds.map((proteinId) => {
        const value = featureMap.get(proteinId) || null;
        return valueToIndex.get(value) || 0;
      });

      features[featureCol] = { values: uniqueValues, colors, shapes };
      feature_data[featureCol] = featureDataArray;

      console.log(`📊 Feature data mapping for '${featureCol}':`, {
        sampleMappings: featureDataArray.slice(0, 5),
        sampleProteins: uniqueProteinIds.slice(0, 5),
        sampleValues: featureDataArray
          .slice(0, 5)
          .map((idx) => uniqueValues[idx]),
      });
    }

    const result = {
      protein_ids: uniqueProteinIds,
      projections,
      features,
      feature_data,
    };

    console.log("✅ Bundle format conversion completed:", {
      protein_count: result.protein_ids.length,
      projection_count: result.projections.length,
      feature_count: Object.keys(result.features).length,
      projection_names: result.projections.map((p) => p.name),
      feature_names: Object.keys(result.features),
    });

    return result;
  }

  /**
   * Convert legacy format data (for backwards compatibility)
   */
  private convertLegacyFormatData(
    rows: Record<string, any>[],
    columnNames: string[]
  ): VisualizationData {
    console.log("📊 Converting legacy format data...");

    // Find protein ID column
    const proteinIdCol = this.findColumn(columnNames, [
      "identifier",
      "protein_id",
      "id",
      "protein",
      "uniprot",
    ]);

    const finalProteinIdCol = proteinIdCol || columnNames[0];

    if (!finalProteinIdCol) {
      throw new Error(
        `Protein ID column not found. Available columns: ${columnNames.join(
          ", "
        )}`
      );
    }

    // Find projection pairs using the existing logic
    const projectionPairs = this.findProjectionPairs(columnNames);
    console.log("🎯 Found projection pairs:", projectionPairs);

    if (projectionPairs.length === 0) {
      console.warn(
        "⚠️ No standard projection pairs found, analyzing all numeric columns..."
      );
      // Try to find any numeric columns that could be coordinates
      const numericColumns = columnNames.filter((col) => {
        const sampleValue = rows[0][col];
        return (
          typeof sampleValue === "number" || !isNaN(parseFloat(sampleValue))
        );
      });
      console.log("🔢 Numeric columns found:", numericColumns);

      if (numericColumns.length === 0) {
        throw new Error(
          `No projection coordinate pairs found. Available columns: ${columnNames.join(
            ", "
          )}`
        );
      }
    }

    // Continue with the rest of the legacy conversion logic...
    // (keeping the existing logic for backwards compatibility)

    // Extract protein IDs - ensure we have a valid column
    const protein_ids: string[] = rows.map((row) => {
      const value = row[finalProteinIdCol];
      return value ? value.toString() : "";
    });

    console.log(
      "Extracted protein IDs:",
      protein_ids.slice(0, 3),
      "... (showing first 3)"
    );

    // Create projections for each coordinate pair
    const projections = [];
    for (const pair of projectionPairs) {
      const projectionData: [number, number][] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const xValue = row[pair.xCol];
        const yValue = row[pair.yCol];
        const x = parseFloat(xValue);
        const y = parseFloat(yValue);

        if (isNaN(x) || isNaN(y)) {
          console.warn(
            `Invalid coordinates at row ${i} for projection ${pair.name}:`,
            { xValue, yValue, x, y }
          );
        }

        projectionData.push([x, y]);
      }

      console.log(
        `Projection '${pair.name}' data sample:`,
        projectionData.slice(0, 3),
        "... (showing first 3)"
      );

      projections.push({
        name: pair.name,
        data: projectionData,
      });
    }

    // Extract categorical features (columns that are not protein_id or projection coordinates)
    const usedColumns = new Set([
      finalProteinIdCol,
      ...projectionPairs.flatMap((p) => [p.xCol, p.yCol]),
    ]);
    const featureColumns = columnNames.filter(
      (col: string) => !usedColumns.has(col)
    );

    console.log("Feature columns:", featureColumns);

    const features: Record<string, Feature> = {};
    const feature_data: Record<string, number[]> = {};

    // Process each categorical column
    for (const featureCol of featureColumns) {
      const rawValues: (string | null)[] = rows.map((row) => {
        const value = row[featureCol];
        return value === null || value === undefined ? null : value.toString();
      });

      // Find unique values and create mappings
      const uniqueValues = Array.from(new Set(rawValues));
      const valueToIndex = new Map<string | null, number>();
      const values: (string | null)[] = [];

      uniqueValues.forEach((value, index) => {
        valueToIndex.set(value, index);
        values.push(value);
      });

      console.log(
        `Feature '${featureCol}' has ${uniqueValues.length} unique values:`,
        uniqueValues
      );

      // Create colors and shapes for each unique value
      const colors = this.generateColors(uniqueValues.length);
      const shapes = this.generateShapes(uniqueValues.length);

      // Map each protein to its feature value index
      const featureDataArray: number[] = rawValues.map(
        (value) => valueToIndex.get(value) || 0
      );

      features[featureCol] = { values, colors, shapes };
      feature_data[featureCol] = featureDataArray;
    }

    const result = {
      protein_ids,
      projections,
      features,
      feature_data,
    };

    console.log("Final VisualizationData structure:", {
      protein_count: result.protein_ids.length,
      projection_count: result.projections.length,
      feature_count: Object.keys(result.features).length,
      projection_names: result.projections.map((p) => p.name),
      feature_names: Object.keys(result.features),
    });

    return result;
  }

  /**
   * Find a column by trying multiple possible names
   */
  private findColumn(
    columnNames: string[],
    candidates: string[]
  ): string | null {
    for (const candidate of candidates) {
      const found = columnNames.find((col) =>
        col.toLowerCase().includes(candidate.toLowerCase())
      );
      if (found) return found;
    }
    return null;
  }

  /**
   * Find all projection coordinate pairs in the column names
   */
  private findProjectionPairs(
    columnNames: string[]
  ): Array<{ name: string; xCol: string; yCol: string }> {
    const pairs: Array<{ name: string; xCol: string; yCol: string }> = [];

    // Group columns by potential projection names
    const projectionGroups = new Map<string, { x?: string; y?: string }>();

    console.log("Analyzing columns for projections:", columnNames);

    for (const col of columnNames) {
      const lowerCol = col.toLowerCase();

      console.log(`Processing column: ${col} (lowercase: ${lowerCol})`);

      // Skip non-coordinate columns
      if (
        lowerCol.includes("protein") ||
        lowerCol.includes("id") ||
        (!lowerCol.includes("_x") &&
          !lowerCol.includes("_y") &&
          !lowerCol.includes("1") &&
          !lowerCol.includes("2"))
      ) {
        console.log(`  Skipping non-coordinate column: ${col}`);
        continue;
      }

      // Extract projection name and coordinate type
      let projectionName = "";
      let coordType = "";

      if (lowerCol.includes("_x") || lowerCol.includes("_y")) {
        // Handle format like "umap2_esm2_x", "pca_x", etc.
        const parts = col.split("_");
        coordType = parts[parts.length - 1].toLowerCase(); // 'x' or 'y'
        projectionName = parts.slice(0, -1).join("_"); // everything before the last '_'
        console.log(
          `  Format _x/_y: projectionName="${projectionName}", coordType="${coordType}"`
        );
      } else if (lowerCol.includes("1") || lowerCol.includes("2")) {
        // Handle format like "umap_1", "pc1", "tsne_1", etc.
        if (lowerCol.includes("1")) {
          coordType = "x";
          projectionName = col.replace(/[_]?1/g, "");
        } else if (lowerCol.includes("2")) {
          coordType = "y";
          projectionName = col.replace(/[_]?2/g, "");
        }
        console.log(
          `  Format 1/2: projectionName="${projectionName}", coordType="${coordType}"`
        );
      }

      if (projectionName && coordType) {
        console.log(
          `  Adding to group: ${projectionName} -> ${coordType} = ${col}`
        );
        if (!projectionGroups.has(projectionName)) {
          projectionGroups.set(projectionName, {});
        }

        const group = projectionGroups.get(projectionName)!;
        if (coordType === "x") {
          group.x = col;
        } else if (coordType === "y") {
          group.y = col;
        }
      } else {
        console.log(`  Could not extract projection info from: ${col}`);
      }
    }

    console.log(
      "Projection groups found:",
      Array.from(projectionGroups.entries())
    );

    // Create pairs from complete groups
    for (const [projectionName, group] of Array.from(projectionGroups)) {
      console.log(`Checking group ${projectionName}:`, group);
      if (group.x && group.y) {
        const pair = {
          name: this.formatProjectionName(projectionName),
          xCol: group.x,
          yCol: group.y,
        };
        pairs.push(pair);
        console.log(`  Created pair:`, pair);
      } else {
        console.log(
          `  Incomplete group ${projectionName}: missing ${
            !group.x ? "x" : "y"
          } coordinate`
        );
      }
    }

    // Fallback: if no pairs found, try the original single-projection logic
    if (pairs.length === 0) {
      console.log("No pairs found, trying fallback logic...");
      const xCol = this.findColumn(columnNames, [
        "x",
        "umap_1",
        "pc1",
        "tsne_1",
      ]);
      const yCol = this.findColumn(columnNames, [
        "y",
        "umap_2",
        "pc2",
        "tsne_2",
      ]);

      if (xCol && yCol) {
        pairs.push({
          name: this.inferProjectionName(xCol, yCol),
          xCol,
          yCol,
        });
      }
    }

    console.log("Final projection pairs:", pairs);
    return pairs;
  }

  /**
   * Format projection name for display
   */
  private formatProjectionName(name: string): string {
    console.log(`🔄 formatProjectionName input: "${name}"`);

    // Handle specific cases first
    if (name.toUpperCase() === "PCA_2") return "PCA 2";
    if (name.toUpperCase() === "PCA_3") return "PCA 3";

    // Handle other PCA variants
    if (name.match(/^PCA_?\d+$/i)) {
      const number = name.replace(/^PCA_?/i, "");
      return `PCA ${number}`;
    }

    // Convert names like "umap2_esm2" to "UMAP2 ESM2"
    const result = name
      .split("_")
      .map((part) => {
        if (part.toLowerCase().includes("umap"))
          return "UMAP" + part.replace(/umap/i, "");
        if (part.toLowerCase().includes("pca"))
          return "PCA" + part.replace(/pca/i, "");
        if (part.toLowerCase().includes("tsne"))
          return "t-SNE" + part.replace(/tsne/i, "");
        // Handle numeric suffixes better
        if (/^\d+$/.test(part)) {
          return part; // Keep numbers as is
        }
        return part.toUpperCase();
      })
      .join(" ");

    console.log(`🔄 formatProjectionName output: "${result}"`);
    return result;
  }

  /**
   * Infer projection name from column names
   */
  private inferProjectionName(xCol: string, yCol: string): string {
    if (
      xCol.toLowerCase().includes("umap") ||
      yCol.toLowerCase().includes("umap")
    ) {
      return "UMAP";
    }
    if (
      xCol.toLowerCase().includes("pca") ||
      xCol.toLowerCase().includes("pc")
    ) {
      return "PCA";
    }
    if (xCol.toLowerCase().includes("tsne")) {
      return "t-SNE";
    }
    return "Projection";
  }

  /**
   * Generate colors for categorical values
   */
  private generateColors(count: number): string[] {
    if (count <= 0) return [];

    const colors: string[] = [];

    // Use a predefined color palette for better consistency
    const colorPalette = [
      "#1f77b4",
      "#ff7f0e",
      "#2ca02c",
      "#d62728",
      "#9467bd",
      "#8c564b",
      "#e377c2",
      "#7f7f7f",
      "#bcbd22",
      "#17becf",
      "#aec7e8",
      "#ffbb78",
      "#98df8a",
      "#ff9896",
      "#c5b0d5",
      "#c49c94",
      "#f7b6d3",
      "#c7c7c7",
      "#dbdb8d",
      "#9edae5",
    ];

    for (let i = 0; i < count; i++) {
      if (i < colorPalette.length) {
        colors.push(colorPalette[i]);
      } else {
        // Generate HSL colors for additional values
        const hue = ((i * 360) / count) % 360;
        const saturation = 70 + (i % 3) * 10; // Vary saturation slightly
        const lightness = 50 + (i % 2) * 15; // Vary lightness slightly
        colors.push(`hsla(${hue}, ${saturation}%, ${lightness}%, 0.8)`);
      }
    }

    console.log(`🎨 Generated ${colors.length} colors for ${count} values`);
    return colors;
  }

  /**
   * Generate shapes for categorical values
   */
  private generateShapes(count: number): string[] {
    if (count <= 0) return [];

    const shapeOptions = [
      "circle",
      "square",
      "triangle",
      "diamond",
      "cross",
      "star",
      "plus",
      "times",
      "wye",
      "asterisk",
    ];

    const shapes: string[] = [];
    for (let i = 0; i < count; i++) {
      shapes.push(shapeOptions[i % shapeOptions.length]);
    }

    console.log(`🔺 Generated ${shapes.length} shapes for ${count} values`);
    return shapes;
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
