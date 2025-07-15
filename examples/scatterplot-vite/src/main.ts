import "@protspace/core"; // Registers all web components
import type { VisualizationData } from "@protspace/utils";
import type {
  ProtspaceScatterplot,
  ProtspaceLegend,
  ProtspaceStructureViewer,
  ProtspaceControlBar,
  DataLoader,
} from "@protspace/core";
import { createExporter } from "@protspace/utils";

const sampleData: VisualizationData = {
  projections: [
    {
      name: "UMAP",
      data: [
        [0.5, 0.5],
        [0.2, 0.3],
        [0.8, 0.7],
        [-0.1, -0.2],
        [-0.5, 0.1],
        [0.6, -0.4],
        [-0.3, 0.6],
        [0.1, 0.8],
        [-0.7, -0.7],
        [0.0, 0.0],
      ] as [number, number][],
    },
  ],
  protein_ids: [
    "P00533",
    "P04637",
    "P53350",
    "Q14790",
    "P42345",
    "P28482",
    "Q9Y261",
    "P15056",
    "O14965",
    "P50613",
  ],
  features: {
    family: {
      values: ["Kinase", "Protease", "Receptor", "Other"],
      colors: ["#e41a1c", "#377eb8", "#4daf4a", "#984ea3"],
      shapes: ["circle", "square", "triangle", "diamond"],
    },
    size_category: {
      values: ["small", "medium", "large"],
      colors: ["#ff7f00", "#ffff33", "#a65628"],
      shapes: ["circle", "circle", "circle"],
    },
  },
  feature_data: {
    family: [0, 1, 0, 2, 1, 0, 2, 3, 3, 0],
    size_category: [0, 1, 2, 1, 0, 2, 1, 0, 1, 2],
  },
};

// Set up data loader event listeners immediately
const dataLoader = document.getElementById("myDataLoader") as DataLoader | null;

if (dataLoader) {
  console.log("🎧 Setting up data-loaded event listener on:", dataLoader);

  // Handle successful data loading
  dataLoader.addEventListener("data-loaded", (event: Event) => {
    console.log("🔥 DATA-LOADED EVENT FIRED!", event);
    const customEvent = event as CustomEvent;
    const { data } = customEvent.detail;
    console.log("📁 Data loaded from Arrow file:", data);

    // Wait for other components to be ready before loading data
    Promise.all([
      customElements.whenDefined("protspace-scatterplot"),
      customElements.whenDefined("protspace-legend"),
      customElements.whenDefined("protspace-structure-viewer"),
      customElements.whenDefined("protspace-control-bar"),
    ]).then(() => {
      const plotElement = document.getElementById(
        "myPlot"
      ) as ProtspaceScatterplot | null;
      const legendElement = document.getElementById(
        "myLegend"
      ) as ProtspaceLegend | null;
      const structureViewer = document.getElementById(
        "myStructureViewer"
      ) as ProtspaceStructureViewer | null;
      const controlBar = document.getElementById(
        "myControlBar"
      ) as ProtspaceControlBar | null;

      if (plotElement && legendElement && structureViewer && controlBar) {
        // Create a loadNewData function in this scope
        const loadNewDataFromEvent = (newData: VisualizationData) => {
          console.log("🔄 Loading new data from event:", newData);

          // Update scatterplot with new data
          console.log("📊 Updating scatterplot with new data...");
          const oldData = plotElement.data;
          plotElement.data = newData;
          plotElement.requestUpdate("data", oldData);

          plotElement.selectedProjectionIndex = 0;
          plotElement.selectedFeature = Object.keys(newData.features)[0] || "";
          plotElement.selectedProteinIds = [];
          plotElement.selectionMode = false;
          plotElement.hiddenFeatureValues = [];
          plotElement.requestUpdate();

          console.log("📊 Scatterplot updated with:", {
            projections: newData.projections.map((p) => p.name),
            features: Object.keys(newData.features),
            proteinCount: newData.protein_ids.length,
            selectedFeature: plotElement.selectedFeature,
          });

          // Control bar will auto-sync with new data
          // Local state will be reset when variables are initialized below

          // Update legend
          setTimeout(() => {
            console.log("🏷️ Updating legend with new data...");
            legendElement.autoSync = true;
            legendElement.autoHide = true;
            legendElement.data = { features: newData.features };
            legendElement.selectedFeature =
              Object.keys(newData.features)[0] || "";

            const firstFeature = Object.keys(newData.features)[0];
            if (firstFeature) {
              const featureValues = newData.protein_ids.map((_, index) => {
                const featureIdx = newData.feature_data[firstFeature][index];
                return newData.features[firstFeature].values[featureIdx];
              });
              legendElement.featureValues = featureValues;
              legendElement.proteinIds = newData.protein_ids;
            }
            legendElement.requestUpdate();

            console.log("🏷️ Legend updated with:", {
              feature: legendElement.selectedFeature,
              dataKeys: Object.keys(newData.features),
              proteinCount: newData.protein_ids.length,
            });
          }, 200);

          console.log(
            "✅ Data loaded successfully from event with",
            newData.protein_ids.length,
            "proteins"
          );
        };

        // Load the new data
        loadNewDataFromEvent(data);
      }
    });
  });

  // Handle data loading errors
  dataLoader.addEventListener("data-load-error", (event: Event) => {
    const customEvent = event as CustomEvent;
    const { error } = customEvent.detail;
    console.error("❌ Data loading failed:", error);
    alert(`Failed to load data: ${error}`);
  });

  console.log("🎧 Event listeners attached successfully");
}

// Wait for all components to be defined for initial setup
Promise.all([
  customElements.whenDefined("protspace-scatterplot"),
  customElements.whenDefined("protspace-legend"),
  customElements.whenDefined("protspace-structure-viewer"),
  customElements.whenDefined("protspace-control-bar"),
  customElements.whenDefined("protspace-data-loader"),
]).then(() => {
  console.log("🚀 All web components defined and ready!");
  const plotElement = document.getElementById(
    "myPlot"
  ) as ProtspaceScatterplot | null;
  const legendElement = document.getElementById(
    "myLegend"
  ) as ProtspaceLegend | null;
  const structureViewer = document.getElementById(
    "myStructureViewer"
  ) as ProtspaceStructureViewer | null;
  const controlBar = document.getElementById(
    "myControlBar"
  ) as ProtspaceControlBar | null;

  // UI elements
  const selectedProteinElement = document.getElementById(
    "selectedProtein"
  ) as HTMLElement;

  if (
    plotElement &&
    legendElement &&
    structureViewer &&
    controlBar &&
    dataLoader
  ) {
    // Track state
    let hiddenValues: string[] = [];
    let selectedProteins: string[] = [];
    let selectionMode = false;
    let isolationMode = false;
    let currentData: VisualizationData = sampleData;

    // Function to load new data and reset all state
    const loadNewData = (newData: VisualizationData) => {
      console.log("🔄 Loading new data:", newData);

      // Reset all state
      hiddenValues = [];
      selectedProteins = [];
      selectionMode = false;
      isolationMode = false;
      currentData = newData;

      // Update scatterplot with new data
      console.log("📊 Updating scatterplot with new data...");
      const oldData = plotElement.data;
      plotElement.data = newData;
      // Explicitly request update for data property since LitElement might not detect object changes
      plotElement.requestUpdate("data", oldData);

      plotElement.selectedProjectionIndex = 0; // Reset to first projection
      plotElement.selectedFeature = Object.keys(newData.features)[0] || ""; // Reset to first feature
      plotElement.selectedProteinIds = [];
      plotElement.selectionMode = false;
      plotElement.hiddenFeatureValues = [];

      // Force additional update
      plotElement.requestUpdate();

      console.log("📊 Scatterplot updated with:", {
        projections: newData.projections.map((p) => p.name),
        features: Object.keys(newData.features),
        proteinCount: newData.protein_ids.length,
        selectedFeature: plotElement.selectedFeature,
      });

      // Exit split mode if active
      if (plotElement.isInSplitMode()) {
        plotElement.exitSplitMode();
      }

      // Update control bar
      setTimeout(() => {
        controlBar.autoSync = true;
        controlBar.selectedProjection = newData.projections[0]?.name || "";
        controlBar.selectedFeature = Object.keys(newData.features)[0] || "";
        controlBar.selectionMode = false;
        controlBar.isolationMode = false;
        controlBar.selectedProteinsCount = 0;
        controlBar.requestUpdate();
      }, 100);

      // Update legend with new data - using the fix we applied to the core
      setTimeout(() => {
        console.log("🏷️ Updating legend with new data...");
        legendElement.autoSync = true;
        legendElement.autoHide = true;

        // Set the data and selectedFeature directly on the legend
        // This will trigger the _updateFeatureDataFromData method we added
        legendElement.data = { features: newData.features };
        legendElement.selectedFeature = Object.keys(newData.features)[0] || "";

        // Extract feature values for the new data
        const firstFeature = Object.keys(newData.features)[0];
        if (firstFeature) {
          const featureValues = newData.protein_ids.map((_, index) => {
            const featureIdx = newData.feature_data[firstFeature][index];
            return newData.features[firstFeature].values[featureIdx];
          });

          legendElement.featureValues = featureValues;
          legendElement.proteinIds = newData.protein_ids;
        }

        // Force update the legend
        legendElement.requestUpdate();

        console.log("🏷️ Legend updated with:", {
          feature: legendElement.selectedFeature,
          dataKeys: Object.keys(newData.features),
          proteinCount: newData.protein_ids.length,
        });
      }, 200);

      // Hide structure viewer
      if (structureViewer.style.display !== "none") {
        structureViewer.style.display = "none";
      }

      updateSelectedProteinDisplay(null);
      console.log(
        "✅ Data loaded successfully with",
        newData.protein_ids.length,
        "proteins"
      );
    };

    // Initialize components with sample data
    loadNewData(sampleData);

    // Initialize control bar - auto-sync handles most initialization
    // The control bar will automatically sync with the scatterplot

    // Initialize legend - now with auto-sync enabled
    setTimeout(() => {
      legendElement.autoSync = true;
      legendElement.autoHide = true; // Automatically hide values in scatterplot
    }, 100);

    // Update legend function - simplified since legend can auto-sync
    const updateLegend = () => {
      const currentFeature = plotElement.selectedFeature;
      const currentData = plotElement.getCurrentData();
      if (
        currentFeature &&
        currentData &&
        currentData.features[currentFeature]
      ) {
        // Only update if not using auto-sync
        if (!legendElement.autoSync) {
          legendElement.data = { features: currentData.features };
          legendElement.selectedFeature = currentFeature;

          // Extract feature values for current data
          const featureValues = currentData.protein_ids.map((_, index) => {
            const featureIdx = currentData.feature_data[currentFeature][index];
            return currentData.features[currentFeature].values[featureIdx];
          });

          legendElement.featureValues = featureValues;
          legendElement.proteinIds = currentData.protein_ids;
        }
      }
    };

    // Update selected protein display
    const updateSelectedProteinDisplay = (proteinId: string | null) => {
      if (proteinId) {
        selectedProteinElement.textContent = `Selected: ${proteinId}`;
        selectedProteinElement.style.color = "#3b82f6";
      } else {
        selectedProteinElement.textContent = "No protein selected";
        selectedProteinElement.style.color = "#6b7280";
      }
    };

    // Update control bar state - simplified since auto-sync handles most updates
    const updateControlBarState = () => {
      // Control bar now auto-syncs with scatterplot, so we only need to update local state
      controlBar.selectedProteinsCount = selectedProteins.length;
    };

    // Initialize legend
    updateLegend();

    // Listen for split state changes from scatterplot
    plotElement.addEventListener("split-state-change", (event: Event) => {
      const customEvent = event as CustomEvent;
      const { isolationMode: newIsolationMode, selectedProteinsCount } =
        customEvent.detail;

      isolationMode = newIsolationMode;
      controlBar.isolationMode = isolationMode;
      controlBar.selectedProteinsCount = selectedProteinsCount;
      controlBar.requestUpdate();

      console.log(`Split state changed: ${isolationMode ? "ON" : "OFF"}`);
    });

    // Listen for data changes from scatterplot
    plotElement.addEventListener("data-change", (event: Event) => {
      const customEvent = event as CustomEvent;
      const { isFiltered } = customEvent.detail;

      updateLegend();
      console.log(`Data changed: ${isFiltered ? "Filtered" : "Full"} data`);
    });

    // Handle protein clicks from scatterplot
    plotElement.addEventListener("protein-click", (event: Event) => {
      const customEvent = event as CustomEvent;
      const { proteinId, modifierKeys } = customEvent.detail;
      console.log(`🖱️ Protein clicked: ${proteinId}`, modifierKeys);
      console.log(`📊 Current selectedProteins before:`, selectedProteins);
      console.log(
        `🎯 Current plotElement.selectedProteinIds before:`,
        plotElement.selectedProteinIds
      );

      // Handle selection based on mode and modifier keys
      if (selectionMode || modifierKeys.ctrl || modifierKeys.shift) {
        // Multi-selection mode - add to selection without clearing others
        if (selectedProteins.includes(proteinId)) {
          // Remove from selection if already selected (deselect)
          selectedProteins = selectedProteins.filter((id) => id !== proteinId);
          console.log(`❌ Deselected protein: ${proteinId} (multi-mode)`);
        } else {
          // Add to selection
          selectedProteins.push(proteinId);
          console.log(`✅ Selected protein: ${proteinId} (multi-mode)`);
        }

        // Update the scatterplot's selectedProteinIds to show visual selection
        plotElement.selectedProteinIds = [...selectedProteins];
        console.log(
          `🔄 Updated plotElement.selectedProteinIds to:`,
          plotElement.selectedProteinIds
        );

        // Force the web component to update its visual state
        plotElement.requestUpdate();

        updateControlBarState();

        if (selectedProteins.length > 0) {
          updateSelectedProteinDisplay(
            `${selectedProteins.length} proteins selected`
          );
        } else {
          updateSelectedProteinDisplay(null);
        }
      } else {
        // Single selection mode - handle single click behavior
        if (
          selectedProteins.length === 1 &&
          selectedProteins[0] === proteinId
        ) {
          // Clicking the same protein again - deselect it
          selectedProteins = [];
          plotElement.selectedProteinIds = [];
          console.log(
            `❌ Deselected protein: ${proteinId} (single mode - same protein)`
          );

          // Force the web component to update its visual state
          plotElement.requestUpdate();

          updateControlBarState();
          updateSelectedProteinDisplay(null);
        } else {
          // Select new protein or first selection
          selectedProteins = [proteinId];
          plotElement.selectedProteinIds = [...selectedProteins];
          console.log(
            `✅ Selected protein: ${proteinId} (single mode - new selection)`
          );

          // Force the web component to update its visual state
          plotElement.requestUpdate();

          updateControlBarState();
          updateSelectedProteinDisplay(proteinId);
        }
        console.log(
          `🔄 Updated plotElement.selectedProteinIds to:`,
          plotElement.selectedProteinIds
        );
      }

      console.log(`📊 Current selectedProteins after:`, selectedProteins);
      console.log(
        `🎯 Current plotElement.selectedProteinIds after:`,
        plotElement.selectedProteinIds
      );
      console.log(`---`);
    });

    // Handle protein hover from scatterplot
    plotElement.addEventListener("protein-hover", (event: Event) => {
      const customEvent = event as CustomEvent;
      const proteinId = customEvent.detail.proteinId;
      if (proteinId) {
        console.log(`Protein hovered: ${proteinId}`);
      }
    });

    // Handle legend item clicks to toggle visibility
    legendElement.addEventListener("legend-item-click", (event: Event) => {
      const customEvent = event as CustomEvent;
      const value = customEvent.detail.value;

      // Legend handles hiding automatically when autoHide=true
      // Just keep track locally for export functionality
      const valueKey = value === null ? "null" : value;

      if (hiddenValues.includes(valueKey)) {
        hiddenValues = hiddenValues.filter((v) => v !== valueKey);
      } else {
        hiddenValues = [...hiddenValues, valueKey];
      }

      console.log(
        `Toggled visibility for "${value}". Hidden values:`,
        hiddenValues
      );
    });

    // Handle structure viewer events
    structureViewer.addEventListener("structure-load", (event: Event) => {
      const customEvent = event as CustomEvent;
      const { proteinId, status, error } = customEvent.detail;
      console.log(`Structure ${proteinId}: ${status}`, error || "");

      if (status === "loaded") {
        console.log(
          `✅ Structure viewer is now visible with protein ${proteinId}`
        );
        console.log(
          `Close button should be visible in header (showCloseButton: ${structureViewer.showCloseButton})`
        );
      }

      if (status === "error") {
        console.warn(`Failed to load structure for ${proteinId}: ${error}`);
      }
    });

    structureViewer.addEventListener("structure-close", (event: Event) => {
      const customEvent = event as CustomEvent;
      const { proteinId } = customEvent.detail;
      console.log(
        `🔒 Structure viewer closed for protein: ${proteinId || "none"}`
      );
      console.log(`Structure viewer should now be hidden`);
      updateSelectedProteinDisplay(null);
    });

    // Control Bar Event Handlers
    // Note: With auto-sync enabled, the control bar now directly manages the scatterplot
    // We keep some event listeners for additional logic that auto-sync doesn't handle

    // Handle feature change for resetting hidden values
    controlBar.addEventListener("feature-change", (event: Event) => {
      const customEvent = event as CustomEvent;
      const feature = customEvent.detail.feature;
      hiddenValues = []; // Reset hidden values when switching features
      plotElement.hiddenFeatureValues = hiddenValues;
      updateLegend();
      console.log(`Switched to feature: ${feature}`);
    });

    // Handle selection mode toggle for local state
    controlBar.addEventListener("toggle-selection-mode", () => {
      selectionMode = plotElement.selectionMode; // Sync with scatterplot state
      console.log(`Selection mode: ${selectionMode ? "ON" : "OFF"}`);
    });

    // Handle isolation mode toggle for local state tracking
    controlBar.addEventListener("toggle-isolation-mode", () => {
      // Update local isolation mode state
      isolationMode = plotElement.isInSplitMode();
      selectedProteins = []; // Reset local selected proteins after split operations
      updateLegend();
      updateSelectedProteinDisplay(null);
      console.log(`Isolation mode: ${isolationMode ? "ON" : "OFF"}`);
    });

    // Handle clear selections for local state
    controlBar.addEventListener("clear-selections", () => {
      selectedProteins = [];
      updateSelectedProteinDisplay(null);
      console.log("Cleared all selections");
    });

    // Data Loader Event Handlers

    // Handle successful data loading
    console.log("🎧 Setting up data-loaded event listener on:", dataLoader);
    dataLoader.addEventListener("data-loaded", (event: Event) => {
      console.log("🔥 DATA-LOADED EVENT FIRED!", event);
      const customEvent = event as CustomEvent;
      const { data } = customEvent.detail;
      console.log("📁 Data loaded from Arrow file:", data);

      // Load the new data into all components
      loadNewData(data);
    });
    console.log("🎧 Event listener attached successfully");

    // Handle data loading errors
    dataLoader.addEventListener("data-error", (event: Event) => {
      const customEvent = event as CustomEvent;
      const { error } = customEvent.detail;
      console.error("❌ Data loading error:", error);

      // You could show a toast notification or error message here
      alert(`Failed to load data: ${error}`);
    });

    // Handle export using the new export utilities
    controlBar.addEventListener("export", async (event: Event) => {
      const customEvent = event as CustomEvent;
      const exportType = customEvent.detail.type;
      console.log(`Export requested: ${exportType}`);

      try {
        // Create exporter instance with current state
        const exporter = createExporter(
          plotElement,
          selectedProteins,
          hiddenValues,
          isolationMode
        );

        // Export options
        const exportOptions = {
          exportName: isolationMode ? "protspace_data_split" : "protspace_data",
          includeSelection: selectedProteins.length > 0,
          scaleForExport: 2,
          maxLegendItems: 10,
          backgroundColor: "white",
        };

        // Handle different export types
        switch (exportType) {
          case "json":
            exporter.exportJSON(exportOptions);
            break;
          case "ids":
            exporter.exportProteinIds(exportOptions);
            break;
          case "png":
            await exporter.exportPNG(exportOptions);
            break;
          case "pdf":
            await exporter.exportPDF(exportOptions);
            break;
          case "svg":
            exporter.exportSVG(exportOptions);
            break;
          default:
            console.warn(`Unknown export type: ${exportType}`);
        }
      } catch (error) {
        console.error("Export failed:", error);
        alert(
          `Export failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    });

    console.log("ProtSpace components loaded and connected!");
    console.log("Available proteins:", sampleData.protein_ids);
    console.log(
      "Use the control bar to change features and toggle selection modes!"
    );
  } else {
    console.error("Could not find one or more required elements.");
    console.log("Plot element:", plotElement);
    console.log("Legend element:", legendElement);
    console.log("Structure viewer:", structureViewer);
    console.log("Control bar:", controlBar);
  }
});
