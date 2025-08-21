import type { VisualizationData as CoreVisualizationData } from "@protspace/utils";

export interface HeaderProps {
  onSearch: (query: string) => void;
  selectedProteins: readonly string[];
  onRemoveHighlight: (proteinId: string) => void;
  onDataImported: (data: CoreVisualizationData) => void;
  availableProteinIds?: readonly string[];
}

export interface SearchBarProps {
  onSearch: (query: string) => void;
  availableProteinIds?: readonly string[];
}

export interface SelectedDropdownProps {
  selectedProteins: readonly string[];
  onRemoveHighlight: (proteinId: string) => void;
}

export interface SessionButtonsProps {
  onDataImported: (data: CoreVisualizationData) => void;
}


