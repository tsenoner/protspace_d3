"use client";

export type ExportType = "json" | "ids" | "png" | "pdf";

export interface ControlBarProps {
  projections: string[];
  features: string[];
  selectedProjection: string;
  selectedFeature: string;
  selectionMode: boolean;
  selectedProteinsCount: number;
  onProjectionChange: (projection: string) => void;
  onFeatureChange: (feature: string) => void;
  onToggleSelectionMode: () => void;
  onClearSelections: () => void;
  onExport: (type: ExportType) => void;
  onOpenFilter: () => void;
}


