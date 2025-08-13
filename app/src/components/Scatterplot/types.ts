import type React from "react";
// Types shared by the Scatterplot component and its utilities

export interface Feature {
  values: (string | null)[];
  colors: string[];
  shapes: string[];
}

export interface Projection {
  name: string;
  metadata?: Record<string, unknown> & { dimension?: 2 | 3 };
  data: Array<[number, number] | [number, number, number]>; // Allow 2D or 3D
}

export interface VisualizationData {
  protein_ids: string[];
  projections: Projection[];
  features: Record<string, Feature>;
  feature_data: Record<string, number[]>;
}

export interface PlotDataPoint {
  id: string;
  x: number;
  y: number;
  featureValues: Record<string, string | null>;
  originalIndex: number;
}

export interface ScatterplotProps {
  data: VisualizationData | null;
  width?: number;
  height?: number;
  resolutionScale?: number;
  selectedProjectionIndex: number;
  selectedFeature: string;
  highlightedProteinIds: string[];
  selectedProteinIds: string[];
  selectionMode: boolean;
  hiddenFeatureValues?: string[];
  otherFeatureValues?: string[];
  useShapes?: boolean;
  pointSize?: number;
  highlightedPointSize?: number;
  selectedPointSize?: number;
  baseOpacity?: number;
  selectedOpacity?: number;
  fadedOpacity?: number;
  className?: string;
  onProteinClick?: (proteinId: string, event?: React.MouseEvent) => void;
  onProteinHover?: (proteinId: string | null) => void;
  onViewStructure?: (proteinId: string | null) => void;
  customColoring?: CustomColoring;
}

export interface CustomColoring {
  filter: {
    enabledByFeature: Record<string, boolean>;
    allowedValuesByFeature: Record<string, Set<string>>;
  };
  customColors: {
    filtered: string;
    other: string;
  };
  hiddenClasses?: string[]; // e.g., ["Filtered Proteins"] or ["Other Proteins"]
}


