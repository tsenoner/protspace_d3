"use client";

import { memo } from "react";
import type { JSX } from "react";

interface MetricProps {
  label: string;
  value: string | number;
  valueClassName?: string;
}

function MetricBase({ label, value, valueClassName }: MetricProps): JSX.Element {
  return (
    <div className="flex items-center space-x-2">
      <span className="text-gray-500">{label}</span>
      <span className={`font-medium text-gray-900 ${valueClassName ?? ""}`}>
        {value}
      </span>
    </div>
  );
}

export const Metric = memo(MetricBase) as (props: MetricProps) => JSX.Element;


