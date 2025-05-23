import '@protspace/core'; // Registers <protspace-scatterplot>
import type { VisualizationData } from '@protspace/utils';
import type { ProtspaceScatterplot } from '@protspace/core'; // Corrected type import

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

customElements.whenDefined('protspace-scatterplot').then(() => {
    const plotElement = document.getElementById('myPlot') as ProtspaceScatterplot | null;

    if (plotElement) {
        plotElement.data = sampleData;
        plotElement.selectedProjectionIndex = 0;
        plotElement.selectedFeature = "family";

        console.log("ProtSpace Scatterplot component loaded and data assigned via Vite example.");

        setTimeout(() => {
            if (plotElement.selectedFeature === "family") {
                console.log("Switching selected feature to size_category");
                plotElement.selectedFeature = "size_category";
            } else {
                console.log("Switching selected feature to family");
                plotElement.selectedFeature = "family";
            }
        }, 5000);
    } else {
        console.error("Could not find the scatterplot element.");
    }
}); 