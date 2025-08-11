/**
 * Control bar-related type definitions
 */

export interface ControlBarState {
  projections: string[];
  features: string[];
  selectedProjection: string;
  selectedFeature: string;
  selectionMode: boolean;
  isolationMode: boolean;
  selectedProteinsCount: number;
}

export interface ProtspaceData {
  projections?: Array<{ name: string; metadata?: { dimension?: 2 | 3 } }>;
  features?: Record<string, unknown>;
}

export interface DataChangeDetail {
  data: ProtspaceData;
}

export interface SplitStateChangeDetail {
  isolationMode: boolean;
  selectedProteinsCount: number;
}

export interface ScatterplotElementLike extends Element {
  // State properties
  selectedProjectionIndex?: number;
  selectedFeature?: string;
  selectionMode?: boolean;
  selectedProteinIds?: unknown[];

  // Split/Isolation API
  enterSplitMode?: (ids: unknown[]) => void;
  createNestedSplit?: (ids: unknown[]) => void;
  exitSplitMode?: () => void;
  isInSplitMode?: () => boolean;

  // Data access
  getCurrentData?: () => ProtspaceData | undefined;

  // Event emitting is through DOM, so we rely on add/removeEventListener from Element
}
