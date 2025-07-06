// Shared types for ProtSpace components
// This file ensures type consistency between web components and React wrappers

export interface VisualizationData {
  projections: Array<{
    name: string;
    data: [number, number][];
  }>;
  protein_ids: string[];
  features: Record<
    string,
    {
      values: (string | null)[];
      colors: string[];
      shapes: string[];
    }
  >;
  feature_data: Record<string, number[]>;
}

export interface ProtspaceControlBarProps {
  projections: string[];
  features: string[];
  selectedProjection: string;
  selectedFeature: string;
  selectionMode: boolean;
  isolationMode: boolean;
  selectedProteinsCount: number;
}

export interface ProtspaceControlBarEvents {
  "projection-change": { projection: string };
  "feature-change": { feature: string };
  "toggle-selection-mode": void;
  "toggle-isolation-mode": void;
  "clear-selections": void;
  export: { type: "json" | "ids" | "png" | "svg" | "pdf" };
}

export interface ProtspaceScatterplotProps {
  data: VisualizationData;
  selectedProjectionIndex: number;
  selectedFeature: string;
  selectedProteinIds: string[];
  selectionMode: boolean;
  hiddenFeatureValues: string[];
}

export interface ProtspaceScatterplotEvents {
  "protein-click": { proteinId: string; modifierKeys: Record<string, boolean> };
  "protein-hover": { proteinId: string | null };
  "data-change": { isFiltered: boolean };
  "split-state-change": {
    isolationMode: boolean;
    selectedProteinsCount: number;
  };
}

export interface ProtspaceLegendProps {
  data: { features: VisualizationData["features"] };
  selectedFeature: string;
  featureValues: (string | null)[];
  proteinIds: string[];
  autoSync: boolean;
  autoHide: boolean;
}

export interface ProtspaceLegendEvents {
  "legend-item-click": { value: string | null };
}

export interface ProtspaceStructureViewerProps {
  proteinId: string | null;
  showCloseButton: boolean;
}

export interface ProtspaceStructureViewerEvents {
  "structure-load": {
    proteinId: string;
    status: "loading" | "loaded" | "error";
    error?: string;
  };
  "structure-close": { proteinId: string | null };
}

export interface ProtspaceDataLoaderProps {
  acceptedFormats: string[];
  maxFileSize: number;
  multiple: boolean;
}

export interface ProtspaceDataLoaderEvents {
  "data-loaded": { data: VisualizationData };
  "data-load-error": { error: string };
}

// Helper type to extract event handler types
export type EventHandlerMap<T> = {
  [K in keyof T]: T[K] extends void
    ? () => void
    : (event: CustomEvent<T[K]>) => void;
};

// Helper type to convert kebab-case to camelCase
type KebabToCamel<S extends string> =
  S extends `${infer P1}-${infer P2}${infer P3}`
    ? `${P1}${Capitalize<KebabToCamel<`${P2}${P3}`>>}`
    : S;

// Helper type for component props with event handlers
export type ComponentPropsWithHandlers<TProps, TEvents> = TProps & {
  [K in keyof TEvents as `on${Capitalize<
    KebabToCamel<string & K>
  >}`]?: EventHandlerMap<TEvents>[K];
};
