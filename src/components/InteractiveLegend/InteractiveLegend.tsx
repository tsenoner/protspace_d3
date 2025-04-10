"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";

// Define the same SHAPE_MAPPING as in ImprovedScatterplot.tsx for consistency
const SHAPE_MAPPING = {
  asterisk: d3.symbolAsterisk,
  circle: d3.symbolCircle,
  cross: d3.symbolCross,
  diamond: d3.symbolDiamond,
  plus: d3.symbolPlus,
  square: d3.symbolSquare,
  star: d3.symbolStar,
  triangle: d3.symbolTriangle,
  wye: d3.symbolWye,
  times: d3.symbolTimes,
} as const;

// Add these constants at the top of the file after imports
const DEFAULT_STYLES = {
  other: {
    color: "#888888",
    shape: "circle",
  },
  null: {
    color: "#888888",
    shape: "circle",
  },
};

export interface LegendItem {
  value: string | null;
  color: string;
  shape: string;
  count: number;
  isVisible: boolean;
  // Add z-order for controlling the layering of items
  zOrder: number;
  // Flag for items that were extracted from "Other"
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
  maxVisibleValues?: number;
  onToggleVisibility?: (value: string | null) => void;
  onExtractFromOther?: (value: string) => void;
  onSetZOrder?: (zOrderMapping: Record<string, number>) => void;
  onOpenCustomization?: () => void;
  selectedItems?: string[];
  className?: string;
  isolationMode?: boolean;
}

interface OtherItemsDialogProps {
  otherItems: [string | null, number][];
  onExtractItem: (value: string) => void;
  onClose: () => void;
}

// Component for dialog to extract values from "Other" category
const OtherItemsDialog: React.FC<OtherItemsDialogProps> = ({
  otherItems,
  onExtractItem,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">
            Extract from &apos;Other&apos; category
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Select items to extract from the &apos;Other&apos; category.
            Extracted items will appear individually in the legend.
          </p>
        </div>

        <ul className="divide-y divide-gray-200 dark:divide-gray-700 mb-4 max-h-60 overflow-y-auto">
          {otherItems.map(([value, count]) => (
            <li
              key={value === null ? "null" : value}
              className="py-2 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700 px-2 rounded"
            >
              <div className="flex items-center">
                <span>{value === null ? "N/A" : value}</span>
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                  ({count})
                </span>
              </div>
              <button
                onClick={() => value !== null && onExtractItem(value)}
                className="text-blue-500 hover:text-blue-600 text-sm font-medium"
              >
                Extract
              </button>
            </li>
          ))}
        </ul>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const InteractiveLegend: React.FC<InteractiveLegendProps> = ({
  featureData,
  featureValues,
  maxVisibleValues = 10,
  onToggleVisibility,
  onExtractFromOther,
  onSetZOrder,
  onOpenCustomization,
  selectedItems = [],
  className = "",
  isolationMode = false,
}) => {
  const [legendItems, setLegendItems] = useState<LegendItem[]>([]);
  const [otherItems, setOtherItems] = useState<[string | null, number][]>([]);
  const [showOtherDialog, setShowOtherDialog] = useState(false);

  // Drag state
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Process data into legend items
  useEffect(() => {
    if (!featureData || !featureValues || featureValues.length === 0) {
      setLegendItems([]);
      return;
    }

    // Create a map of value frequencies
    const frequencyMap = new Map<string | null, number>();
    featureValues.forEach((value) => {
      frequencyMap.set(value, (frequencyMap.get(value) || 0) + 1);
    });

    // Convert to array and sort by frequency (descending)
    const sortedItems = Array.from(frequencyMap.entries()).sort(
      (a, b) => b[1] - a[1]
    ); // Sort by count, descending

    // When in isolation mode, we only show the values that actually appear in the data
    // This makes the legend more relevant to what's currently displayed
    const filteredSortedItems = isolationMode
      ? sortedItems.filter(([value]) => frequencyMap.has(value))
      : sortedItems;

    // Take the top N items
    const topItems = filteredSortedItems.slice(0, maxVisibleValues);

    // Find null entry
    const nullEntry = filteredSortedItems.find(([value]) => value === null);

    // Get items that will go into the "Other" category (excluding null)
    const otherItemsArray = filteredSortedItems
      .slice(maxVisibleValues)
      .filter(([value]) => value !== null);

    // Store "Other" items for the dialog
    setOtherItems(otherItemsArray);

    // Calculate count for "Other" category
    const otherCount = otherItemsArray.reduce(
      (sum, [, count]) => sum + count,
      0
    );

    // Create legend items with z-order
    const items: LegendItem[] = topItems.map(([value, count], index) => {
      const valueIndex =
        value !== null
          ? featureData.values.indexOf(value)
          : featureData.values.findIndex((v) => v === null);

      return {
        value,
        color:
          valueIndex !== -1
            ? featureData.colors[valueIndex]
            : DEFAULT_STYLES.null.color,
        shape:
          valueIndex !== -1
            ? featureData.shapes[valueIndex]
            : DEFAULT_STYLES.null.shape,
        count,
        isVisible: true,
        zOrder: index,
      };
    });

    // Add "Other" if needed and if we're not in isolation mode
    // In isolation mode, we generally want to show all values explicitly
    if (otherCount > 0 && !isolationMode) {
      items.push({
        value: "Other",
        color: DEFAULT_STYLES.other.color,
        shape: DEFAULT_STYLES.other.shape,
        count: otherCount,
        isVisible: true,
        zOrder: items.length,
      });
    }

    // Add null if not already included in top items
    if (nullEntry && !topItems.some(([value]) => value === null)) {
      const valueIndex = featureData.values.findIndex((v) => v === null);
      items.push({
        value: null,
        color:
          valueIndex !== -1
            ? featureData.colors[valueIndex]
            : DEFAULT_STYLES.null.color,
        shape:
          valueIndex !== -1
            ? featureData.shapes[valueIndex]
            : DEFAULT_STYLES.null.shape,
        count: nullEntry[1],
        isVisible: true,
        zOrder: items.length,
      });
    }

    // Get previously extracted items
    const extractedItems = legendItems.filter(
      (item) => item.extractedFromOther
    );

    // Add extracted items, but only if they exist in the current data (important for isolation mode)
    extractedItems.forEach((extractedItem) => {
      // Only add if not already in the list and if they exist in the current frequencies
      if (
        !items.some((item) => item.value === extractedItem.value) &&
        frequencyMap.has(extractedItem.value)
      ) {
        // Find the original frequency of this item
        const itemFrequency = filteredSortedItems.find(
          ([value]) => value === extractedItem.value
        );

        if (itemFrequency) {
          items.push({
            ...extractedItem,
            count: itemFrequency[1],
            zOrder: items.length,
          });
        }
      }
    });

    // Set items state
    setLegendItems(items);
  }, [featureData, featureValues, maxVisibleValues, isolationMode]);

  // Handle item click (toggle visibility)
  const handleItemClick = useCallback(
    (value: string | null) => {
      // Update local state first for immediate feedback
      setLegendItems((prev) =>
        prev.map((item) =>
          item.value === value ? { ...item, isVisible: !item.isVisible } : item
        )
      );

      // Then call the parent handler
      if (onToggleVisibility) {
        onToggleVisibility(value);
      }
    },
    [onToggleVisibility]
  );

  // Handle item double-click (show only this or show all)
  const handleItemDoubleClick = useCallback(
    (value: string | null) => {
      // Get the clicked item
      const clickedItem = legendItems.find((item) => item.value === value);
      if (!clickedItem) return;

      // Check if it's the only visible item
      const visibleItems = legendItems.filter((item) => item.isVisible);
      const isOnlyVisible =
        visibleItems.length === 1 && visibleItems[0].value === value;

      // Case 1: It's the only visible item - show all
      if (isOnlyVisible) {
        setLegendItems((prev) =>
          prev.map((item) => ({ ...item, isVisible: true }))
        );

        // Notify parent for each item
        if (onToggleVisibility) {
          legendItems.forEach((item) => {
            if (!item.isVisible) {
              onToggleVisibility(item.value);
            }
          });
        }
      }
      // Case 2: Show only this item
      else {
        setLegendItems((prev) =>
          prev.map((item) => ({
            ...item,
            isVisible: item.value === value,
          }))
        );

        // Notify parent for each item that changes
        if (onToggleVisibility) {
          legendItems.forEach((item) => {
            if (item.value !== value && item.isVisible) {
              onToggleVisibility(item.value);
            } else if (item.value === value && !item.isVisible) {
              onToggleVisibility(item.value);
            }
          });
        }
      }
    },
    [legendItems, onToggleVisibility]
  );

  // Handle extract from Other
  const handleExtractFromOther = useCallback(
    (value: string) => {
      // Find this item in otherItems
      const itemToExtract = otherItems.find(([v]) => v === value);
      if (!itemToExtract) return;

      // Find the valueIndex for color and shape
      const valueIndex = featureData.values.indexOf(value);

      // Create a new legend item
      const newItem: LegendItem = {
        value,
        color: valueIndex !== -1 ? featureData.colors[valueIndex] : "#888",
        shape: valueIndex !== -1 ? featureData.shapes[valueIndex] : "circle",
        count: itemToExtract[1],
        isVisible: true,
        zOrder: legendItems.length,
        extractedFromOther: true,
      };

      // Add to the legend items
      setLegendItems((prev) => [...prev, newItem]);

      // Close the dialog
      setShowOtherDialog(false);

      // Notify parent
      if (onExtractFromOther) {
        onExtractFromOther(value);
      }
    },
    [otherItems, featureData, legendItems.length, onExtractFromOther]
  );

  // Simple drag and drop implementation
  const handleDragStart = useCallback((item: LegendItem) => {
    setDraggedItem(item.value);

    // Clear any existing timeout
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
    }
  }, []);

  const handleDragOver = useCallback(
    (item: LegendItem) => {
      if (!draggedItem || draggedItem === item.value) return;

      // Use a debounced approach to prevent too many re-renders
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }

      dragTimeoutRef.current = setTimeout(() => {
        setLegendItems((prev) => {
          // Find the indices
          const draggedIdx = prev.findIndex((i) => i.value === draggedItem);
          const targetIdx = prev.findIndex((i) => i.value === item.value);
          if (draggedIdx === -1 || targetIdx === -1) return prev;

          // Create a new array with the item moved
          const newItems = [...prev];
          const [movedItem] = newItems.splice(draggedIdx, 1);
          newItems.splice(targetIdx, 0, movedItem);

          // Update z-order
          const updatedItems = newItems.map((item, idx) => ({
            ...item,
            zOrder: idx,
          }));

          // Notify parent of z-order change
          if (onSetZOrder) {
            const zOrderMap = updatedItems.reduce((acc, item) => {
              if (item.value !== null) {
                acc[item.value] = item.zOrder;
              }
              return acc;
            }, {} as Record<string, number>);

            onSetZOrder(zOrderMap);
          }

          return updatedItems;
        });
      }, 100);
    },
    [draggedItem, onSetZOrder]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);

    // Clear timeout if any
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }
  }, []);

  // Symbol rendering function using D3 symbols for consistency with scatterplot
  const renderSymbol = (
    shape: string | null,
    color: string,
    size = 16,
    isSelected = false
  ) => {
    const halfSize = size / 2;

    // Safely handle null or undefined shape
    const shapeKey = (
      shape || "circle"
    ).toLowerCase() as keyof typeof SHAPE_MAPPING;

    // Get the D3 symbol type (default to circle if not found)
    const symbolType = SHAPE_MAPPING[shapeKey] || d3.symbolCircle;

    // Generate the SVG path using D3
    const path = d3
      .symbol()
      .type(symbolType)
      .size(size * 8)(); // Size multiplier to make it fit well in the legend

    // Some symbol types should be rendered as outlines only
    const isOutlineOnly =
      shapeKey === "plus" ||
      shapeKey === "asterisk" ||
      String(shapeKey).includes("_stroke");

    // Determine stroke width based on selection state
    const strokeWidth = isSelected ? 2 : 1;

    // Determine stroke color based on selection state
    const strokeColor = isSelected ? "#3B82F6" : "#333";

    // Render the symbol
    return (
      <svg width={size} height={size} className="inline-block">
        <g transform={`translate(${halfSize}, ${halfSize})`}>
          <path
            d={path || ""}
            fill={isOutlineOnly ? "none" : color}
            stroke={isOutlineOnly ? color : strokeColor}
            strokeWidth={isOutlineOnly ? 2 : strokeWidth}
          />
        </g>
      </svg>
    );
  };

  // Sort items by z-order
  const sortedLegendItems = [...legendItems].sort(
    (a, b) => a.zOrder - b.zOrder
  );

  return (
    <div
      className={`p-3 border rounded-md shadow-sm bg-white dark:bg-gray-800 dark:border-gray-700 ${className}`}
    >
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-medium">{featureData.name}</h3>
        <button
          onClick={onOpenCustomization}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          title="Customize Legend"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
      </div>

      <ul className="space-y-2">
        {sortedLegendItems.map((item) => {
          // Determine if this item is selected from outside
          // Handle both null and string values correctly
          const isItemSelected =
            // Only consider a null item selected if "null" is explicitly in the selectedItems array
            // AND there's actually a selected protein in the set (ensuring it's not just showing as selected by default)
            (item.value === null &&
              selectedItems.includes("null") &&
              selectedItems.length > 0) ||
            // For regular values, standard check excluding "Other"
            (item.value !== null &&
              item.value !== "Other" &&
              selectedItems.includes(item.value));

          return (
            <li
              key={
                item.value === null
                  ? "null"
                  : item.value === "Other"
                  ? "other"
                  : item.value
              }
              className={`
                flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all duration-200
                ${
                  item.isVisible
                    ? "bg-gray-50 dark:bg-gray-800"
                    : "bg-gray-100 dark:bg-gray-700 opacity-50"
                }
                ${
                  draggedItem === item.value
                    ? "bg-blue-50 dark:bg-blue-900/30"
                    : ""
                }

                ${
                  isItemSelected
                    ? "ring-2 ring-blue-500 dark:ring-blue-400"
                    : ""
                }
                ${
                  item.extractedFromOther
                    ? "border-l-4 border-green-500 dark:border-green-400"
                    : ""
                }
                hover:bg-gray-100 dark:hover:bg-gray-700
                active:bg-blue-100 dark:active:bg-blue-900/50
                shadow-sm hover:shadow-md
              `}
              onClick={() => handleItemClick(item.value)}
              onDoubleClick={() => handleItemDoubleClick(item.value)}
              draggable={true}
              onDragStart={() => handleDragStart(item)}
              onDragOver={() => handleDragOver(item)}
              onDragEnd={handleDragEnd}
            >
              <div className="flex items-center">
                <div
                  className="mr-3 cursor-grab p-1 rounded flex items-center"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 8h16M4 16h16"
                    />
                  </svg>
                </div>
                <div className="mr-2">
                  {item.value === "Other" || !item.isVisible
                    ? renderSymbol("circle", item.isVisible ? "#888" : "#ccc")
                    : renderSymbol(item.shape, item.color, 16, isItemSelected)}
                </div>
                <span>
                  {item.value === null
                    ? "N/A"
                    : item.value === "Other"
                    ? item.value
                    : item.value}
                </span>
                {item.value === "Other" && (
                  <button
                    className="ml-1 text-blue-500 hover:text-blue-600 text-xs font-medium"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowOtherDialog(true);
                    }}
                    title="Extract items from Other"
                  >
                    (view)
                  </button>
                )}
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {item.count}
              </span>
            </li>
          );
        })}
      </ul>

      {/* Dialog for "Other" items */}
      {showOtherDialog && (
        <OtherItemsDialog
          otherItems={otherItems}
          onExtractItem={handleExtractFromOther}
          onClose={() => setShowOtherDialog(false)}
        />
      )}
    </div>
  );
};

export default InteractiveLegend;
