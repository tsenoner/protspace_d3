"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import OtherItemsDialog from "./OtherItemsDialog";
import { buildFrequencyMap, computeLegendItems, toZOrderMap } from "./utils";
import { InteractiveLegendProps, LegendItem } from "./types";
import { useLegendExport } from "./hooks/useLegendExport";
import { useLegendDnD } from "./hooks/useLegendDnD";
import LegendListItem from "./LegendListItem";

const InteractiveLegend = forwardRef<
  { downloadAsImage: () => Promise<void> },
  InteractiveLegendProps
>(
  (
    {
      featureData,
      featureValues,
      proteinIds,
      maxVisibleValues = 10,
      onToggleVisibility,
      onExtractFromOther,
      onSetZOrder,
      onOpenCustomization,
      selectedItems = [],
      className = "",
      isolationMode = false,
      splitHistory,
    },
    ref
  ) => {
    const [legendItems, setLegendItems] = useState<LegendItem[]>([]);
    const [otherItems, setOtherItems] = useState<[string | null, number][]>([]);
    const [showOtherDialog, setShowOtherDialog] = useState(false);

    // Export hook
    const { componentRef, downloadAsImage } = useLegendExport();

    // Drag-and-drop hook
    const { draggedItem, handleDragStart, handleDragOver, handleDragEnd } = useLegendDnD((updated) => {
      if (onSetZOrder) onSetZOrder(toZOrderMap(updated));
      setLegendItems(updated);
    });

    // Process data into legend items
    useEffect(() => {
      if (!featureData || !featureValues || featureValues.length === 0) {
        setOtherItems([]);
        setLegendItems([]);
        return;
      }

      const frequencyMap = buildFrequencyMap(
        featureValues,
        isolationMode,
        splitHistory,
        proteinIds
      );

      setLegendItems((previousItems) => {
        const { items, otherItems } = computeLegendItems({
          featureData: {
            values: featureData.values,
            colors: featureData.colors,
            shapes: featureData.shapes,
          },
          frequencyMap,
          maxVisibleValues,
          includeOther: !isolationMode,
          previousItems,
        });

        setOtherItems(otherItems);

        // Shallow equality check to avoid unnecessary state churn
        if (items.length === previousItems.length) {
          let allEqual = true;
          for (let i = 0; i < items.length; i++) {
            const a = items[i];
            const b = previousItems[i];
            if (
              a.value !== b.value ||
              a.isVisible !== b.isVisible ||
              a.zOrder !== b.zOrder ||
              a.color !== b.color ||
              a.shape !== b.shape ||
              a.count !== b.count
            ) {
              allEqual = false;
              break;
            }
          }
          if (allEqual) return previousItems;
        }

        return items;
      });
    }, [
      featureData,
      featureValues,
      maxVisibleValues,
      isolationMode,
      splitHistory,
      proteinIds,
    ]);

    // Handle item click (toggle visibility)
    const handleItemClick = useCallback(
      (value: string | null) => {
        // Update local state first for immediate feedback
        setLegendItems((prev) =>
          prev.map((item) =>
            item.value === value
              ? { ...item, isVisible: !item.isVisible }
              : item
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

    // Adapt DnD hook to local state setter signature
    const onDragOverItem = useCallback(
      (item: LegendItem) => handleDragOver(item, setLegendItems),
      [handleDragOver]
    );

    // Expose downloadAsImage method to parent
    useImperativeHandle(ref, () => ({
      downloadAsImage,
    }));

    // Sort items by z-order
    const sortedLegendItems = [...legendItems].sort(
      (a, b) => a.zOrder - b.zOrder
    );

    return (
      <div
        className={`interactive-legend-component p-3 border rounded-md shadow-sm bg-white ${className}`}
        ref={componentRef}
      >
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-medium">{featureData.name}</h3>
          <button
            onClick={onOpenCustomization}
            className="text-gray-500 hover:text-gray-700"
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
              <LegendListItem
                key={
                  item.value === null
                    ? "null"
                    : item.value === "Other"
                    ? "other"
                    : item.value
                }
                item={item}
                isSelected={isItemSelected}
                draggedItem={draggedItem}
                onClick={handleItemClick}
                onDoubleClick={handleItemDoubleClick}
                onDragStart={handleDragStart}
                onDragOver={onDragOverItem}
                onDragEnd={handleDragEnd}
                onOpenOther={() => setShowOtherDialog(true)}
              />
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
  }
);

InteractiveLegend.displayName = "InteractiveLegend";

export default InteractiveLegend;
