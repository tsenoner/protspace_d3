"use client";

import { memo } from "react";
import type { JSX } from "react";
import type { StatusBarProps } from "./StatusBar.types";
import { Metric } from "./Metric";
import { useStatusMetrics } from "./hooks/useStatusMetrics";

function StatusBarComponent({
  totalProteins,
  displayedProteins,
  selectedProteins,
  projectionName,
}: StatusBarProps): JSX.Element {
  const {
    isFiltered,
    formattedTotal,
    displayedText,
    formattedSelected,
    displayedValueClassName,
    selectedValueClassName,
    displayedLabel,
  } = useStatusMetrics({
    totalProteins,
    displayedProteins,
    selectedProteins,
  });

  return (
    <div className="flex items-center justify-between py-2 px-4 text-sm bg-gray-50/80 backdrop-blur-sm border-t border-gray-200">
      <div className="flex items-center space-x-6">
        <Metric label="Total:" value={formattedTotal} />

        <Metric
          label={displayedLabel}
          value={displayedText}
          valueClassName={displayedValueClassName}
        />

        <Metric
          label="Selected:"
          value={formattedSelected}
          valueClassName={selectedValueClassName}
        />
      </div>

      <div className="flex items-center space-x-2">
        <span className="text-gray-500">Projection:</span>
        <span className="font-medium text-gray-900">
          {projectionName}
        </span>
      </div>
    </div>
  );
}

const StatusBar = memo(StatusBarComponent) as (
  props: StatusBarProps
) => JSX.Element;
export default StatusBar;
