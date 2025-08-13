"use client";

import { useCallback, useState } from "react";

interface UseSelectedDropdownParams {
  selectedProteins: readonly string[];
  onRemoveHighlight: (proteinId: string) => void;
}

export function useSelectedDropdown({
  selectedProteins,
  onRemoveHighlight,
}: UseSelectedDropdownParams) {
  const [showDropdown, setShowDropdown] = useState(false);
  const disabled = selectedProteins.length === 0;

  const toggleDropdown = useCallback(() => {
    setShowDropdown((prev) => !prev);
  }, []);

  const handleRemoveClick = useCallback(
    (proteinId: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      onRemoveHighlight(proteinId);
    },
    [onRemoveHighlight]
  );

  return {
    showDropdown,
    setShowDropdown,
    disabled,
    toggleDropdown,
    handleRemoveClick,
  } as const;
}


