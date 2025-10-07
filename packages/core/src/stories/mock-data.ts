/**
 * Mock data utilities for Storybook stories
 * Provides realistic test data matching the VisualizationData interface
 */

import type { VisualizationData } from "@protspace/utils";

/**
 * Generate a random 2D projection point within bounds
 */
function randomPoint(min = -1, max = 1): [number, number] {
  return [min + Math.random() * (max - min), min + Math.random() * (max - min)];
}

/**
 * Generate a clustered point around a center with some variance
 */
function clusteredPoint(
  center: [number, number],
  variance = 0.2,
): [number, number] {
  return [
    center[0] + (Math.random() - 0.5) * variance,
    center[1] + (Math.random() - 0.5) * variance,
  ];
}

/**
 * Minimal sample data for basic demos (10 proteins)
 */
export const MINIMAL_DATA: VisualizationData = {
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
      values: ["Kinase", "Protease", "Receptor", "Transporter"],
      colors: ["#e41a1c", "#377eb8", "#4daf4a", "#984ea3"],
      shapes: ["circle", "square", "triangle", "diamond"],
    },
    size: {
      values: ["Small", "Medium", "Large"],
      colors: ["#ff7f00", "#ffff33", "#a65628"],
      shapes: ["circle", "circle", "circle"],
    },
  },
  feature_data: {
    family: [0, 1, 0, 2, 1, 0, 2, 3, 3, 0],
    size: [0, 1, 2, 1, 0, 2, 1, 0, 1, 2],
  },
};

/**
 * Generate a medium-sized dataset (100 proteins) with realistic clusters
 */
export function generateMediumData(): VisualizationData {
  const proteinCount = 100;
  const families = ["Kinase", "Protease", "Receptor", "Transporter", "Channel"];
  const sizes = ["Small", "Medium", "Large"];

  // Define cluster centers for each family
  const clusterCenters: Record<string, [number, number]> = {
    Kinase: [-0.6, 0.6],
    Protease: [0.7, 0.5],
    Receptor: [-0.5, -0.5],
    Transporter: [0.6, -0.6],
    Channel: [0.0, 0.0],
  };

  const protein_ids: string[] = [];
  const projectionData: [number, number][] = [];
  const familyData: number[] = [];
  const sizeData: number[] = [];

  for (let i = 0; i < proteinCount; i++) {
    // Generate protein ID
    protein_ids.push(`PROT${String(i).padStart(5, "0")}`);

    // Assign to a family (weighted distribution)
    const familyIdx = i % families.length;
    familyData.push(familyIdx);

    // Generate clustered position based on family
    const center = clusterCenters[families[familyIdx]];
    projectionData.push(clusteredPoint(center, 0.3));

    // Random size
    sizeData.push(Math.floor(Math.random() * sizes.length));
  }

  return {
    projections: [
      { name: "UMAP", data: projectionData },
      {
        name: "PCA",
        data: projectionData.map(
          ([x, y]) => [x * 0.8, y * 1.2] as [number, number],
        ),
      },
    ],
    protein_ids,
    features: {
      family: {
        values: families,
        colors: ["#e41a1c", "#377eb8", "#4daf4a", "#984ea3", "#ff7f00"],
        shapes: ["circle", "square", "triangle", "diamond", "star"],
      },
      size: {
        values: sizes,
        colors: ["#66c2a5", "#fc8d62", "#8da0cb"],
        shapes: ["circle", "circle", "circle"],
      },
    },
    feature_data: {
      family: familyData,
      size: sizeData,
    },
  };
}

/**
 * Generate a large dataset (100,000 proteins) for performance testing
 */
export function generateLargeData(): VisualizationData {
  const proteinCount = 100000;
  const families = [
    "Kinase",
    "Protease",
    "Receptor",
    "Transporter",
    "Channel",
    "Oxidoreductase",
    "Transferase",
    "Hydrolase",
  ];
  const sizes = ["Small", "Medium", "Large", "Very Large"];
  const organisms = ["Human", "Mouse", "Yeast", "E. coli", "Arabidopsis"];

  // Define cluster centers
  const clusterCenters: [number, number][] = [
    [-0.8, 0.8],
    [0.8, 0.8],
    [-0.8, -0.8],
    [0.8, -0.8],
    [0.0, 0.8],
    [0.0, -0.8],
    [-0.8, 0.0],
    [0.8, 0.0],
  ];

  const protein_ids: string[] = [];
  const projectionData: [number, number][] = [];
  const familyData: number[] = [];
  const sizeData: number[] = [];
  const organismData: number[] = [];

  for (let i = 0; i < proteinCount; i++) {
    protein_ids.push(`PRO${String(i).padStart(6, "0")}`);

    const familyIdx = i % families.length;
    familyData.push(familyIdx);

    const center = clusterCenters[familyIdx];
    projectionData.push(clusteredPoint(center, 0.25));

    sizeData.push(Math.floor(Math.random() * sizes.length));
    organismData.push(Math.floor(Math.random() * organisms.length));
  }

  return {
    projections: [
      { name: "UMAP", data: projectionData },
      {
        name: "t-SNE",
        data: projectionData.map(([x, y]) => [y, -x] as [number, number]),
      },
      {
        name: "PCA",
        data: projectionData.map(
          ([x, y]) => [x * 1.1, y * 0.9] as [number, number],
        ),
      },
    ],
    protein_ids,
    features: {
      family: {
        values: families,
        colors: [
          "#e41a1c",
          "#377eb8",
          "#4daf4a",
          "#984ea3",
          "#ff7f00",
          "#ffff33",
          "#a65628",
          "#f781bf",
        ],
        shapes: [
          "circle",
          "square",
          "triangle",
          "diamond",
          "star",
          "circle",
          "square",
          "triangle",
        ],
      },
      size: {
        values: sizes,
        colors: ["#66c2a5", "#fc8d62", "#8da0cb", "#e78ac3"],
        shapes: ["circle", "circle", "circle", "circle"],
      },
      organism: {
        values: organisms,
        colors: ["#8dd3c7", "#ffffb3", "#bebada", "#fb8072", "#80b1d3"],
        shapes: ["circle", "circle", "circle", "circle", "circle"],
      },
    },
    feature_data: {
      family: familyData,
      size: sizeData,
      organism: organismData,
    },
  };
}

/**
 * Data with many feature values to test "Other" category
 */
export function generateManyFeaturesData(): VisualizationData {
  const proteinCount = 200;

  // Generate 20 different families (to test "Other" bucket)
  const families = Array.from({ length: 20 }, (_, i) => `Family_${i + 1}`);
  const colors = Array.from(
    { length: 20 },
    () =>
      `#${Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0")}`,
  );

  const protein_ids: string[] = [];
  const projectionData: [number, number][] = [];
  const familyData: number[] = [];

  // Create a steep power-law distribution
  // First 5 families get most proteins, rest get very few
  const baseCounts = [
    40,
    30,
    25,
    20,
    15, // Top 5 families (130 proteins)
    10,
    8,
    6,
    5,
    4, // Next 5 families (33 proteins)
    3,
    3,
    2,
    2,
    2, // Next 5 families (12 proteins)
    1,
    1,
    1,
    1,
    1, // Last 5 families (5 proteins) - will go to "Other"
  ];

  for (let i = 0; i < families.length; i++) {
    const count = baseCounts[i] || 1;
    for (let j = 0; j < count; j++) {
      protein_ids.push(`PROT${String(protein_ids.length).padStart(5, "0")}`);
      projectionData.push(randomPoint(-1, 1));
      familyData.push(i);
    }
  }

  return {
    projections: [{ name: "UMAP", data: projectionData }],
    protein_ids,
    features: {
      family: {
        values: families,
        colors,
        shapes: families.map(() => "circle"),
      },
    },
    feature_data: {
      family: familyData,
    },
  };
}

/**
 * Generate data with overlapping clusters to demonstrate z-order
 */
export function generateOverlappingData(): VisualizationData {
  const proteinCount = 150;
  const families = ["Kinase", "Protease", "Receptor"];

  // Define three overlapping cluster centers
  const clusterCenters: [number, number][] = [
    [0.0, 0.0], // Kinase - center
    [0.15, 0.15], // Protease - slightly offset
    [-0.15, 0.15], // Receptor - slightly offset other direction
  ];

  const protein_ids: string[] = [];
  const projectionData: [number, number][] = [];
  const familyData: number[] = [];

  // Create 50 points per cluster with tight clustering (lots of overlap)
  for (let familyIdx = 0; familyIdx < families.length; familyIdx++) {
    for (let i = 0; i < 50; i++) {
      protein_ids.push(`PROT${String(protein_ids.length).padStart(5, "0")}`);
      // Very tight clustering for maximum overlap
      projectionData.push(clusteredPoint(clusterCenters[familyIdx], 0.4));
      familyData.push(familyIdx);
    }
  }

  return {
    projections: [{ name: "UMAP", data: projectionData }],
    protein_ids,
    features: {
      family: {
        values: families,
        colors: ["#e41a1c", "#377eb8", "#4daf4a"],
        shapes: ["circle", "square", "triangle"],
      },
    },
    feature_data: {
      family: familyData,
    },
  };
}

/**
 * Data with null/missing values to test N/A handling
 */
export function generateDataWithNulls(): VisualizationData {
  const data = generateMediumData();

  // Add a feature with some null values
  const statusValues = ["Active", "Inactive", "Unknown", null];
  const statusColors = ["#2ecc71", "#e74c3c", "#95a5a6", "#888888"];

  data.features.status = {
    values: statusValues as (string | null)[],
    colors: statusColors,
    shapes: ["circle", "circle", "circle", "circle"],
  };

  // Assign status with some nulls
  data.feature_data.status = data.protein_ids.map((_, i) => {
    if (i % 7 === 0) return 3; // null
    return i % 3;
  });

  return data;
}
