import { useMemo } from "react";

function formatNumber(value: number): string {
  return value.toLocaleString();
}

export function useStatusMetrics(params: {
  totalProteins: number;
  displayedProteins: number;
  selectedProteins: number;
}) {
  const { totalProteins, displayedProteins, selectedProteins } = params;

  const isFiltered = displayedProteins !== totalProteins;

  const formattedTotal = useMemo(
    () => formatNumber(totalProteins),
    [totalProteins]
  );

  const displayedText = useMemo(() => {
    const base = formatNumber(displayedProteins);
    if (!isFiltered || totalProteins === 0) return base;
    const percent = Math.round((displayedProteins / totalProteins) * 100);
    return `${base} (~${percent}%)`;
  }, [displayedProteins, totalProteins, isFiltered]);

  const formattedSelected = useMemo(
    () => formatNumber(selectedProteins),
    [selectedProteins]
  );

  const displayedValueClassName = isFiltered
    ? "text-[color:var(--primary-700)]"
    : undefined;

  const selectedValueClassName = selectedProteins > 0
    ? "text-orange-600"
    : undefined;

  const displayedLabel = "Displayed:";

  return {
    isFiltered,
    formattedTotal,
    displayedText,
    formattedSelected,
    displayedValueClassName,
    selectedValueClassName,
    displayedLabel,
  } as const;
}


