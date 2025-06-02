import { LitElement, html, css } from "lit";
import { customElement, property, state, query } from "lit/decorators.js";

// Define the Molstar types
interface MolstarViewer {
  loadPdb: (pdbId: string) => Promise<void>;
  loadStructureFromUrl: (
    url: string,
    format?: string,
    options?: Record<string, unknown>
  ) => Promise<void>;
  dispose: () => void;
}

declare global {
  interface Window {
    molstar: {
      Viewer: {
        create: (
          target: string | HTMLElement,
          options?: {
            layoutIsExpanded?: boolean;
            layoutShowControls?: boolean;
            layoutShowRemoteState?: boolean;
            layoutShowSequence?: boolean;
            layoutShowLog?: boolean;
            layoutShowLeftPanel?: boolean;
            viewportShowExpand?: boolean;
            viewportShowSelectionMode?: boolean;
            viewportShowAnimation?: boolean;
            pdbProvider?: string;
            emdbProvider?: string;
          }
        ) => Promise<MolstarViewer>;
      };
    };
  }
}

// Custom events
export interface StructureLoadEvent extends CustomEvent {
  detail: {
    proteinId: string;
    status: "loading" | "loaded" | "error";
    error?: string;
  };
}

@customElement("protspace-structure-viewer")
export class ProtspaceStructureViewer extends LitElement {
  static styles = css`
    :host {
      --protspace-viewer-width: 100%;
      --protspace-viewer-height: 400px;
      --protspace-viewer-bg: #ffffff;
      --protspace-viewer-border: #e1e5e9;
      --protspace-viewer-border-radius: 8px;
      --protspace-viewer-header-bg: #f8fafc;
      --protspace-viewer-text: #374151;
      --protspace-viewer-text-muted: #6b7280;
      --protspace-viewer-error: #ef4444;
      --protspace-viewer-loading: #3b82f6;

      display: block;
      width: var(--protspace-viewer-width);
      background: var(--protspace-viewer-bg);
      border: 1px solid var(--protspace-viewer-border);
      border-radius: var(--protspace-viewer-border-radius);
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      background: var(--protspace-viewer-header-bg);
      border-bottom: 1px solid var(--protspace-viewer-border);
    }

    .title {
      font-size: 1rem;
      font-weight: 500;
      color: var(--protspace-viewer-text);
      margin: 0;
    }

    .protein-id {
      font-size: 0.875rem;
      color: var(--protspace-viewer-text-muted);
      margin-left: 0.5rem;
    }

    .close-button {
      background: none;
      border: none;
      font-size: 1.25rem;
      color: var(--protspace-viewer-text-muted);
      cursor: pointer;
      padding: 0.25rem;
      line-height: 1;
      border-radius: 0.25rem;
      transition: color 0.2s;
    }

    .close-button:hover {
      color: var(--protspace-viewer-text);
      background: rgba(0, 0, 0, 0.05);
    }

    .viewer-container {
      position: relative;
      width: 100%;
      height: var(--protspace-viewer-height);
      background: var(--protspace-viewer-bg);
    }

    .loading-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.9);
      z-index: 10;
    }

    .loading-spinner {
      width: 2.5rem;
      height: 2.5rem;
      border: 2px solid #e5e7eb;
      border-top: 2px solid var(--protspace-viewer-loading);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 1rem;
    }

    .loading-text {
      color: var(--protspace-viewer-text-muted);
      font-size: 0.875rem;
    }

    .error-container {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: var(--protspace-viewer-bg);
      z-index: 10;
      padding: 2rem;
      text-align: center;
    }

    .error-title {
      color: var(--protspace-viewer-error);
      font-weight: 600;
      margin-bottom: 0.5rem;
    }

    .error-message {
      color: var(--protspace-viewer-text-muted);
      font-size: 0.875rem;
      line-height: 1.5;
    }

    .viewer-content {
      width: 100%;
      height: 100%;
    }

    .tips {
      padding: 0.5rem 1rem;
      background: #f8fafc;
      border-top: 1px solid var(--protspace-viewer-border);
      font-size: 0.75rem;
      color: var(--protspace-viewer-text-muted);
    }

    .tips strong {
      font-weight: 600;
    }

    @keyframes spin {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }

    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      :host {
        --protspace-viewer-bg: #1f2937;
        --protspace-viewer-border: #374151;
        --protspace-viewer-header-bg: #111827;
        --protspace-viewer-text: #f9fafb;
        --protspace-viewer-text-muted: #9ca3af;
      }
    }
  `;

  // Properties
  @property({ type: String }) proteinId: string | null = null;
  @property({ type: String }) title = "Protein Structure";
  @property({ type: Boolean }) showHeader = true;
  @property({ type: Boolean }) showCloseButton = true;
  @property({ type: Boolean }) showTips = true;
  @property({ type: String }) height = "400px";

  // Auto-sync properties
  @property({ type: String, attribute: "scatterplot-selector" })
  scatterplotSelector: string = "protspace-scatterplot";
  @property({ type: Boolean, attribute: "auto-sync" })
  autoSync: boolean = true;
  @property({ type: Boolean, attribute: "auto-show" })
  autoShow: boolean = true; // Automatically show/hide based on selections

  // State
  @state() private _isLoading = false;
  @state() private _error: string | null = null;
  @state() private _viewer: MolstarViewer | null = null;
  private _scatterplotElement: Element | null = null;

  // Refs
  @query(".viewer-content") private _viewerContainer!: HTMLElement;

  protected updated(changedProperties: Map<string | number | symbol, unknown>) {
    if (changedProperties.has("proteinId")) {
      if (this.proteinId) {
        this._loadStructure();
      } else {
        this._cleanup();
      }
    }
    if (changedProperties.has("height")) {
      this.style.setProperty("--protspace-viewer-height", this.height);
    }
  }

  connectedCallback() {
    super.connectedCallback();

    if (this.autoSync) {
      this._setupAutoSync();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._cleanup();

    if (this._scatterplotElement) {
      this._scatterplotElement.removeEventListener(
        "protein-click",
        this._handleProteinClick.bind(this)
      );
    }
  }

  private _setupAutoSync() {
    // Find scatterplot element
    setTimeout(() => {
      this._scatterplotElement = document.querySelector(
        this.scatterplotSelector
      );
      if (this._scatterplotElement) {
        // Listen for protein clicks
        this._scatterplotElement.addEventListener(
          "protein-click",
          this._handleProteinClick.bind(this)
        );

        // Initially hide if autoShow is enabled
        if (this.autoShow && !this.proteinId) {
          this.style.display = "none";
        }
      }
    }, 100);
  }

  private _handleProteinClick(event: Event) {
    const customEvent = event as CustomEvent;
    const { proteinId, modifierKeys } = customEvent.detail;

    // Only respond to single clicks (not multi-selection)
    if (!modifierKeys.ctrl && !modifierKeys.shift && this.autoShow) {
      // Show structure viewer and load protein
      this.proteinId = proteinId;
      this.style.display = "block";
      console.log(`Auto-loading structure for protein: ${proteinId}`);
    }
  }

  // Public methods for external control
  public hide() {
    if (this.autoShow) {
      this.style.display = "none";
      this.proteinId = null;
      this._cleanup();
      this._dispatchCloseEvent();
    }
  }

  public show(proteinId?: string) {
    if (this.autoShow) {
      this.style.display = "block";
      if (proteinId) {
        this.proteinId = proteinId;
      }
    }
  }

  public close() {
    // Internal close functionality
    this.proteinId = null;
    this._cleanup();
    if (this.autoShow) {
      this.style.display = "none";
    }
    this._dispatchCloseEvent();
  }

  public loadProtein(proteinId: string) {
    // Public method to load a specific protein
    this.proteinId = proteinId;
    if (this.autoShow) {
      this.style.display = "block";
    }
  }

  private async _loadStructure() {
    if (!this.proteinId) {
      this._cleanup();
      return;
    }

    this._isLoading = true;
    this._error = null;

    // Dispatch loading event
    this._dispatchStructureEvent("loading");

    try {
      // Clean up any existing viewer
      this._cleanup();

      // Format protein ID (remove version numbers if any)
      const formattedId = this.proteinId.split(".")[0];

      // Load Molstar resources
      await this._loadMolstarResources();

      // Wait for the container to be available
      await this.updateComplete;
      if (!this._viewerContainer) {
        throw new Error("Viewer container not available");
      }

      // Create viewer
      this._viewer = await window.molstar?.Viewer.create(
        this._viewerContainer,
        {
          layoutIsExpanded: false,
          layoutShowControls: false,
          layoutShowRemoteState: false,
          layoutShowSequence: false,
          layoutShowLog: false,
          layoutShowLeftPanel: false,
          viewportShowExpand: false,
          viewportShowSelectionMode: false,
          viewportShowAnimation: false,
        }
      );

      // Try AlphaFold first
      try {
        const alphafoldUrl = `https://alphafold.ebi.ac.uk/files/AF-${formattedId}-F1-model_v4.pdb`;

        // Check if AlphaFold structure exists
        const response = await fetch(alphafoldUrl, { method: "HEAD" });
        if (!response.ok) {
          throw new Error(
            `AlphaFold structure not available for ${formattedId}`
          );
        }

        await this._viewer.loadStructureFromUrl(alphafoldUrl, "pdb");
        this._isLoading = false;
        this._dispatchStructureEvent("loaded");
      } catch (alphafoldError) {
        console.warn("AlphaFold loading failed:", alphafoldError);

        // Fallback to PDB
        try {
          await this._viewer.loadPdb(formattedId);
          this._isLoading = false;
          this._dispatchStructureEvent("loaded");
        } catch (pdbError) {
          throw new Error(
            `Failed to load structure from both AlphaFold and PDB: ${pdbError}`
          );
        }
      }
    } catch (error) {
      console.error("Structure loading error:", error);
      this._error =
        error instanceof Error ? error.message : "Failed to load structure";
      this._isLoading = false;
      this._dispatchStructureEvent("error", this._error);
    }
  }

  private async _loadMolstarResources(): Promise<void> {
    // Load script if not already loaded
    if (!document.getElementById("molstar-script")) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.id = "molstar-script";
        script.src =
          "https://cdn.jsdelivr.net/npm/molstar@3.44.0/build/viewer/molstar.js";
        script.async = true;
        script.onload = () => resolve();
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    // Load styles if not already loaded
    if (!document.getElementById("molstar-style")) {
      await new Promise<void>((resolve, reject) => {
        const link = document.createElement("link");
        link.id = "molstar-style";
        link.rel = "stylesheet";
        link.href =
          "https://cdn.jsdelivr.net/npm/molstar@3.44.0/build/viewer/molstar.css";
        link.onload = () => resolve();
        link.onerror = reject;
        document.head.appendChild(link);
      });
    }
  }

  private _cleanup() {
    if (this._viewer) {
      try {
        this._viewer.dispose();
      } catch (error) {
        console.warn("Error disposing viewer:", error);
      }
      this._viewer = null;
    }

    if (this._viewerContainer) {
      this._viewerContainer.innerHTML = "";
    }
  }

  private _dispatchStructureEvent(
    status: "loading" | "loaded" | "error",
    error?: string
  ) {
    this.dispatchEvent(
      new CustomEvent("structure-load", {
        detail: {
          proteinId: this.proteinId!,
          status,
          error,
        },
        bubbles: true,
      }) as StructureLoadEvent
    );
  }

  private _dispatchCloseEvent() {
    this.dispatchEvent(
      new CustomEvent("structure-close", {
        detail: {
          proteinId: this.proteinId,
        },
        bubbles: true,
      })
    );
  }

  private _handleClose() {
    this.close(); // Use internal close method
  }

  render() {
    if (!this.proteinId) {
      return html``;
    }

    return html`
      ${this.showHeader
        ? html`
            <div class="header">
              <div>
                <span class="title">${this.title}</span>
                <span class="protein-id">${this.proteinId}</span>
              </div>
              ${this.showCloseButton
                ? html`
                    <button class="close-button" @click=${this._handleClose}>
                      ✕
                    </button>
                  `
                : ""}
            </div>
          `
        : ""}

      <div class="viewer-container">
        ${this._isLoading
          ? html`
              <div class="loading-overlay">
                <div class="loading-spinner"></div>
                <div class="loading-text">Loading protein structure...</div>
              </div>
            `
          : ""}
        ${this._error
          ? html`
              <div class="error-container">
                <div class="error-title">${this._error}</div>
                <div class="error-message">
                  The structure data could not be loaded. This protein may not
                  have an available structure in AlphaFold or PDB.
                </div>
              </div>
            `
          : ""}

        <div class="viewer-content"></div>
      </div>

      ${this.showTips && !this._error
        ? html`
            <div class="tips">
              <strong>Tip:</strong> Left-click and drag to rotate. Click and
              drag to move. Scroll to zoom.
            </div>
          `
        : ""}
    `;
  }
}

// Global type declarations
declare global {
  interface HTMLElementTagNameMap {
    "protspace-structure-viewer": ProtspaceStructureViewer;
  }
}
