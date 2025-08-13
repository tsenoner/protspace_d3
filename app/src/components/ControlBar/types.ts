"use client";

export type ExportType = "json" | "ids" | "png" | "svg" | "pdf";

export interface ControlBarProps {
  projections: string[];
  features: string[];
  selectedProjection: string;
  selectedFeature: string;
  selectionMode: boolean;
  isolationMode: boolean;
  selectedProteinsCount: number;
  onProjectionChange: (projection: string) => void;
  onFeatureChange: (feature: string) => void;
  onToggleSelectionMode: () => void;
  onToggleIsolationMode: () => void;
  onClearSelections: () => void;
  onExport: (type: ExportType) => void;
}


