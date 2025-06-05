import '@protspace/core'; // Registers <protspace-scatterplot> and <protspace-legend>
import type { VisualizationData } from '@protspace/utils';
import type { ProtspaceScatterplot, ProtspaceLegend } from '@protspace/core'; // Import both component types

const sampleData: VisualizationData = {
    projections: [
        {
            name: "UMAP",
            data: [ 
                [0.5, 0.5], [0.2, 0.3], [0.8, 0.7], [-0.1, -0.2], [-0.5, 0.1],
                [0.6, -0.4], [-0.3, 0.6], [0.1, 0.8], [-0.7, -0.7], [0.0, 0.0]
            ] as [number, number][]
        }
    ],
    protein_ids: ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "P9", "P10"],
    features: {
        "family": {
            values: ["Kinase", "Protease", "Receptor", "Other"],
            colors: ["#e41a1c", "#377eb8", "#4daf4a", "#984ea3"],
            shapes: ["circle", "square", "triangle", "diamond"]
        },
        "size_category": {
            values: ["small", "medium", "large"],
            colors: ["#ff7f00", "#ffff33", "#a65628"],
            shapes: ["circle", "circle", "circle"]
        }
    },
    feature_data: {
        "family": [0, 1, 0, 2, 1, 0, 2, 3, 3, 0],
        "size_category": [0, 1, 2, 1, 0, 2, 1, 0, 1, 2]
    },
    // sequences: {} // Assuming sequences is optional and can be omitted
};

// Wait for both components to be defined
Promise.all([
    customElements.whenDefined('protspace-scatterplot'),
    customElements.whenDefined('protspace-legend')
]).then(() => {
    const plotElement = document.getElementById('myPlot') as ProtspaceScatterplot | null;
    const legendElement = document.getElementById('myLegend') as ProtspaceLegend | null;

    if (plotElement && legendElement) {
        // Track hidden feature values
        let hiddenValues: string[] = [];

        // Initialize both components with the same data
        plotElement.data = sampleData;
        plotElement.selectedProjectionIndex = 0;
        plotElement.selectedFeature = "family";

        // Setup legend
        const updateLegend = () => {
            const currentFeature = plotElement.selectedFeature;
            if (currentFeature && sampleData.features[currentFeature]) {
                legendElement.featureName = currentFeature;
                legendElement.featureData = sampleData.features[currentFeature];
                
                // Extract feature values for current data
                const featureValues = sampleData.protein_ids.map((_, index) => {
                    const featureIdx = sampleData.feature_data[currentFeature][index];
                    return sampleData.features[currentFeature].values[featureIdx];
                });
                
                legendElement.featureValues = featureValues;
                legendElement.hiddenValues = hiddenValues;
            }
        };

        // Update legend initially
        updateLegend();

        // Handle legend item clicks to toggle visibility
        legendElement.addEventListener('legend-item-click', (event: any) => {
            const value = event.detail.value;
            const valueKey = value === null ? "null" : value;
            
            if (hiddenValues.includes(valueKey)) {
                // Show the feature value
                hiddenValues = hiddenValues.filter(v => v !== valueKey);
            } else {
                // Hide the feature value
                hiddenValues = [...hiddenValues, valueKey];
            }
            
            // Update both components
            plotElement.hiddenFeatureValues = hiddenValues;
            legendElement.hiddenValues = hiddenValues;
            
            console.log(`Toggled visibility for "${value}". Hidden values:`, hiddenValues);
        });

        // Setup UI controls
        const featureSelect = document.getElementById('featureSelect') as HTMLSelectElement;
        const resetButton = document.getElementById('resetButton') as HTMLButtonElement;

        // Handle feature selection
        featureSelect.addEventListener('change', (event) => {
            const target = event.target as HTMLSelectElement;
            plotElement.selectedFeature = target.value;
            hiddenValues = []; // Reset hidden values when switching features
            plotElement.hiddenFeatureValues = hiddenValues;
            updateLegend();
            console.log(`Switched to feature: ${target.value}`);
        });

        // Handle reset button
        resetButton.addEventListener('click', () => {
            plotElement.resetZoom();
            console.log('Reset zoom view');
        });

        console.log("ProtSpace Scatterplot and Legend components loaded and connected!");
    } else {
        console.error("Could not find the scatterplot or legend elements.");
    }
}); 