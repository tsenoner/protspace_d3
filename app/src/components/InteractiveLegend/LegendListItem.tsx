"use client";

import { LegendItem } from "./types";
import { LegendSymbol } from "./LegendSymbol";

interface LegendListItemProps {
  item: LegendItem;
  isSelected: boolean;
  draggedItem: string | null;
  onClick: (value: string | null) => void;
  onDoubleClick: (value: string | null) => void;
  onDragStart: (item: LegendItem) => void;
  onDragOver: (item: LegendItem) => void;
  onDragEnd: () => void;
  onOpenOther?: () => void;
}

export function LegendListItem({
  item,
  isSelected,
  draggedItem,
  onClick,
  onDoubleClick,
  onDragStart,
  onDragOver,
  onDragEnd,
  onOpenOther,
}: LegendListItemProps) {
  return (
    <li
      key={item.value === null ? "null" : item.value === "Other" ? "other" : item.value}
      className={`
        flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all duration-200
        ${item.isVisible ? "bg-gray-50" : "bg-gray-100 opacity-50"}
        ${draggedItem === item.value ? "bg-primary-50" : ""}
        ${isSelected ? "ring-2 ring-red-500" : ""}
        ${item.extractedFromOther ? "border-l-4 border-green-500" : ""}
        hover:bg-gray-100 active:bg-blue-100 shadow-sm hover:shadow-md
      `}
      onClick={() => onClick(item.value)}
      onDoubleClick={() => onDoubleClick(item.value)}
      draggable={true}
      onDragStart={() => onDragStart(item)}
      onDragOver={() => onDragOver(item)}
      onDragEnd={onDragEnd}
    >
      <div className="flex items-center">
        <div className="mr-3 cursor-grab p-1 rounded flex items-center" onMouseDown={(e) => e.stopPropagation()}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </div>
        <div className="mr-2">
          {item.value === "Other" || !item.isVisible ? (
            <LegendSymbol shape="circle" color={item.isVisible ? "#888" : "#ccc"} />
          ) : (
            <LegendSymbol shape={item.shape} color={item.color} size={16} isSelected={isSelected} />
          )}
        </div>
        <span>{item.value === null ? "N/A" : item.value}</span>
        {item.value === "Other" && onOpenOther && (
          <button
            className="ml-1 text-primary hover:text-[color:var(--primary-700)] text-xs font-medium"
            onClick={(e) => {
              e.stopPropagation();
              onOpenOther();
            }}
            title="Extract items from Other"
          >
            (view)
          </button>
        )}
      </div>
      <span className="text-sm text-gray-500">{item.count}</span>
    </li>
  );
}

export default LegendListItem;


