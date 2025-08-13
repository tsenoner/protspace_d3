export interface LegendItem {
  value: string | null;
  color: string;
  shape: string;
  count: number;
  isVisible: boolean;
  zOrder: number;
  extractedFromOther?: boolean;
}

export interface InteractiveLegendProps {
  featureData: {
    name: string;
    values: (string | null)[];
    colors: string[];
    shapes: string[];
  };
  featureValues: (string | null)[];
  proteinIds?: string[];
  maxVisibleValues?: number;
  onToggleVisibility?: (value: string | null) => void;
  onExtractFromOther?: (value: string) => void;
  onSetZOrder?: (zOrderMapping: Record<string, number>) => void;
  onOpenCustomization?: () => void;
  selectedItems?: string[];
  className?: string;
  isolationMode?: boolean;
  splitHistory?: string[][];
}

export interface OtherItemsDialogProps {
  otherItems: [string | null, number][];
  onExtractItem: (value: string) => void;
  onClose: () => void;
}


