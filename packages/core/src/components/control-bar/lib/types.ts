/**
 * Control bar-related type definitions
 */

import type { VisualizationData } from "@protspace/utils";

export interface ControlBarState {
  projections: string[];
  features: string[];
  selectedProjection: string;
  selectedFeature: string;
  selectionMode: boolean;
  selectedProteinsCount: number;
}

// VisualizationData with extended projections metadata
export type ProtspaceData = Omit<VisualizationData, 'projections'> & {
  projections: Array<{ name: string; metadata?: { dimension?: 2 | 3 } }>;
};

export interface DataChangeDetail {
  data: ProtspaceData;
}

export interface ScatterplotElementLike extends Element {
  // State properties
  selectedProjectionIndex?: number;
  selectedFeature?: string;
  selectionMode?: boolean;
  selectedProteinIds?: unknown[];

  // Data access
  getCurrentData?: () => VisualizationData | null;

  // Split functionality
  isSplitMode?: () => boolean;
  getSplitHistory?: () => string[][];
  splitDataBySelection?: () => void;
  resetSplit?: () => void;

  // Event emitting is through DOM, so we rely on add/removeEventListener from Element
}
