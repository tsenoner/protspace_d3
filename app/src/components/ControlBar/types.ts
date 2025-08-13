"use client";

export type ExportType = "json" | "ids" | "png" | "pdf";

export interface ControlBarProps {
  projections: string[];
  features: string[];
  selectedProjection: string;
  selectedFeature: string;
  projectionPlane?: 'xy' | 'xz' | 'yz';
  projectionDimension?: 2 | 3;
  selectionMode: boolean;
  selectedProteinsCount: number;
  onProjectionChange: (projection: string) => void;
  onFeatureChange: (feature: string) => void;
  onProjectionPlaneChange?: (plane: 'xy' | 'xz' | 'yz') => void;
  onToggleSelectionMode: () => void;
  onClearSelections: () => void;
  onExport: (type: ExportType) => void;
  onOpenFilter: () => void;
}


