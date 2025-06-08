import { LitElement, html, css, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { tableFromIPC } from 'apache-arrow';
import type { VisualizationData, Feature } from '@protspace/utils';

/**
 * Apache Arrow Data Loader Web Component
 * 
 * Loads protein data from Apache Arrow format files and converts them
 * to the ProtSpace visualization data format. Categories from columns 
 * become legend items with unique values as elements.
 */
@customElement('protspace-data-loader')
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
  src = '';

  /** Auto-load when src is provided */
  @property({ type: Boolean, attribute: 'auto-load' })
  autoLoad = false;

  /** Accept drag and drop */
  @property({ type: Boolean, attribute: 'allow-drop' })
  allowDrop = true;

  /** Required column mappings for Arrow data */
  @property({ type: Object, attribute: 'column-mappings' })
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
    if (changedProperties.has('src') && this.src && this.autoLoad) {
      this.loadFromUrl(this.src);
    }
  }

  firstUpdated() {
    this.fileInput = this.shadowRoot!.querySelector('.hidden-input') as HTMLInputElement;
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
            ? 'Loading Arrow data...' 
            : this.error 
            ? 'Error loading data' 
            : this.allowDrop 
            ? 'Drop an Arrow file here or click to browse'
            : 'Click to load Arrow file'
          }
        </div>

        ${this.fileInfo ? html`
          <div class="file-info">
            ${this.fileInfo.name} (${this.formatFileSize(this.fileInfo.size)})
          </div>
        ` : ''}

        ${this.loading ? html`
          <div class="progress">
            <div class="progress-bar" style="width: ${this.progress}%"></div>
          </div>
        ` : ''}

        ${this.error ? html`
          <div class="error-message">${this.error}</div>
        ` : ''}
      </div>

      <input 
        type="file" 
        class="hidden-input" 
        accept=".arrow,.parquet,.feather"
        @change=${this.handleFileSelect}
      />
    `;
  }

  private renderDataIcon() {
    return html`
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
      </svg>
    `;
  }

  private renderLoadingIcon() {
    return html`
      <svg viewBox="0 0 24 24" fill="currentColor" style="animation: spin 1s linear infinite">
        <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z" />
      </svg>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
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
    e.dataTransfer!.dropEffect = 'copy';
  }

  private handleDragEnter(e: DragEvent) {
    if (!this.allowDrop) return;
    e.preventDefault();
    this.setAttribute('dragging', '');
  }

  private handleDragLeave(e: DragEvent) {
    if (!this.allowDrop) return;
    e.preventDefault();
    this.removeAttribute('dragging');
  }

  private handleDrop(e: DragEvent) {
    if (!this.allowDrop) return;
    e.preventDefault();
    this.removeAttribute('dragging');

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
   * Load Arrow data from a URL
   */
  async loadFromUrl(url: string) {
    this.setLoading(true);
    this.error = null;

    try {
      this.progress = 10;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
      }

      this.progress = 30;
      const arrayBuffer = await response.arrayBuffer();
      
      this.progress = 60;
      const table = tableFromIPC([arrayBuffer]);
      
      this.progress = 80;
      const visualizationData = this.convertArrowToVisualizationData(table);
      
      this.progress = 100;
      this.dispatchDataLoaded(visualizationData);
      
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Unknown error occurred';
      this.dispatchError(this.error);
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Load Arrow data from a File object
   */
  async loadFromFile(file: File) {
    this.setLoading(true);
    this.error = null;
    this.fileInfo = { name: file.name, size: file.size };

    try {
      this.progress = 10;
      const arrayBuffer = await file.arrayBuffer();
      
      this.progress = 40;
      const table = tableFromIPC([arrayBuffer]);
      
      this.progress = 70;
      const visualizationData = this.convertArrowToVisualizationData(table);
      
      this.progress = 100;
      this.dispatchDataLoaded(visualizationData);
      
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Unknown error occurred';
      this.dispatchError(this.error);
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Convert Apache Arrow table to ProtSpace VisualizationData format
   */
  private convertArrowToVisualizationData(table: any): VisualizationData {
    const schema = table.schema;
    const numRows = table.numRows;
    
    // Extract column names
    const columnNames = schema.fields.map((field: any) => field.name);
    
    // Find required columns with fallbacks
    const proteinIdCol = this.columnMappings.proteinId || this.findColumn(columnNames, ['protein_id', 'id', 'protein', 'uniprot']);
    const xCol = this.columnMappings.projection_x || this.findColumn(columnNames, ['x', 'umap_1', 'pc1', 'tsne_1']);
    const yCol = this.columnMappings.projection_y || this.findColumn(columnNames, ['y', 'umap_2', 'pc2', 'tsne_2']);
    
    if (!proteinIdCol || !xCol || !yCol) {
      throw new Error(`Required columns not found. Need protein ID, x, and y coordinates. Found columns: ${columnNames.join(', ')}`);
    }

    // Extract protein IDs
    const protein_ids: string[] = [];
    for (let i = 0; i < numRows; i++) {
      protein_ids.push(table.get(i).get(proteinIdCol).toString());
    }

    // Extract projection data
    const projectionData: [number, number][] = [];
    for (let i = 0; i < numRows; i++) {
      const row = table.get(i);
      projectionData.push([
        parseFloat(row.get(xCol)),
        parseFloat(row.get(yCol))
      ]);
    }

    // Create projection
    const projectionName = this.columnMappings.projectionName || this.inferProjectionName(xCol, yCol);
    const projections = [{
      name: projectionName,
      data: projectionData
    }];

    // Extract categorical features (columns that are not protein_id, x, y)
    const featureColumns = columnNames.filter((col: string) => 
      col !== proteinIdCol && col !== xCol && col !== yCol
    );

    const features: Record<string, Feature> = {};
    const feature_data: Record<string, number[]> = {};

    // Process each categorical column
    for (const featureCol of featureColumns) {
      const values: (string | null)[] = [];
      const rawValues: (string | null)[] = [];
      
      // Extract all values for this feature
      for (let i = 0; i < numRows; i++) {
        const value = table.get(i).get(featureCol);
        const stringValue = value === null || value === undefined ? null : value.toString();
        rawValues.push(stringValue);
      }

      // Find unique values and create mappings
      const uniqueValues = [...new Set(rawValues)];
      const valueToIndex = new Map<string | null, number>();
      
      uniqueValues.forEach((value, index) => {
        valueToIndex.set(value, index);
        values.push(value);
      });

      // Create colors and shapes for each unique value
      const colors = this.generateColors(uniqueValues.length);
      const shapes = this.generateShapes(uniqueValues.length);

      // Map each protein to its feature value index
      const featureDataArray: number[] = [];
      for (let i = 0; i < numRows; i++) {
        const value = rawValues[i];
        featureDataArray.push(valueToIndex.get(value) || 0);
      }

      features[featureCol] = { values, colors, shapes };
      feature_data[featureCol] = featureDataArray;
    }

    return {
      protein_ids,
      projections,
      features,
      feature_data
    };
  }

  /**
   * Find a column by trying multiple possible names
   */
  private findColumn(columnNames: string[], candidates: string[]): string | null {
    for (const candidate of candidates) {
      const found = columnNames.find(col => 
        col.toLowerCase().includes(candidate.toLowerCase())
      );
      if (found) return found;
    }
    return null;
  }

  /**
   * Infer projection name from column names
   */
  private inferProjectionName(xCol: string, yCol: string): string {
    if (xCol.toLowerCase().includes('umap') || yCol.toLowerCase().includes('umap')) {
      return 'UMAP';
    }
    if (xCol.toLowerCase().includes('pca') || xCol.toLowerCase().includes('pc')) {
      return 'PCA';
    }
    if (xCol.toLowerCase().includes('tsne')) {
      return 't-SNE';
    }
    return 'Projection';
  }

  /**
   * Generate colors for categorical values
   */
  private generateColors(count: number): string[] {
    const colors: string[] = [];
    for (let i = 0; i < count; i++) {
      const hue = (i * 360 / count) % 360;
      colors.push(`hsla(${hue}, 70%, 50%, 0.8)`);
    }
    return colors;
  }

  /**
   * Generate shapes for categorical values
   */
  private generateShapes(count: number): string[] {
    const shapeOptions = ['circle', 'square', 'triangle', 'diamond', 'cross', 'star', 'plus', 'times', 'wye', 'asterisk'];
    const shapes: string[] = [];
    for (let i = 0; i < count; i++) {
      shapes.push(shapeOptions[i % shapeOptions.length]);
    }
    return shapes;
  }

  private setLoading(loading: boolean) {
    this.loading = loading;
    if (loading) {
      this.setAttribute('loading', '');
      this.progress = 0;
    } else {
      this.removeAttribute('loading');
      this.progress = 0;
    }
  }

  private dispatchDataLoaded(data: VisualizationData) {
    this.dispatchEvent(new CustomEvent('data-loaded', {
      detail: { data },
      bubbles: true,
      composed: true
    }));
  }

  private dispatchError(error: string) {
    this.dispatchEvent(new CustomEvent('data-error', {
      detail: { error },
      bubbles: true,
      composed: true
    }));
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'protspace-data-loader': DataLoader;
  }
}