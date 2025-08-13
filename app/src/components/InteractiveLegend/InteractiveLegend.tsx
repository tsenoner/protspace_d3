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
import LegendSettingsDialog from "./LegendSettingsDialog";
import { LEGEND_DEFAULTS } from "./constants";

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
      hiddenFeatureValues = [],
      onToggleVisibility,
      onExtractFromOther,
      onSetZOrder,
      onOpenCustomization,
      onOtherValuesChange,
      onUseShapesChange,
      onPointSizesChange,
      selectedItems = [],
      className = "",
      isolationMode = false,
      splitHistory,
      includeOthers = !isolationMode,
      includeShapes = false,
      shapeSize,
    },
    ref
  ) => {
    const [legendItems, setLegendItems] = useState<LegendItem[]>([]);
    const [otherItems, setOtherItems] = useState<[string | null, number][]>([]);
    const [showOtherDialog, setShowOtherDialog] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [localMaxVisible, setLocalMaxVisible] = useState<number>(maxVisibleValues);
    const [localIncludeOthers, setLocalIncludeOthers] = useState<boolean>(includeOthers);
    const [localIncludeShapes, setLocalIncludeShapes] = useState<boolean>(includeShapes);
    const [localShapeSize, setLocalShapeSize] = useState<number>(shapeSize ?? LEGEND_DEFAULTS.symbolSize);
    const hiddenValuesRef = useRef<string[]>(hiddenFeatureValues);
    const lastOtherValuesEmittedRef = useRef<string>("__init__");
    const lastUseShapesEmittedRef = useRef<boolean | null>(null);

    // Export hook
    const { componentRef, downloadAsImage } = useLegendExport();

    // Drag-and-drop hook
    const { draggedItem, handleDragStart, handleDragOver, handleDragEnd } = useLegendDnD((updated) => {
      if (onSetZOrder) onSetZOrder(toZOrderMap(updated));
      setLegendItems(updated);
    });

    // Helper to recompute items from current inputs
    const recomputeLegend = useCallback(() => {
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
          maxVisibleValues: localMaxVisible,
          includeOther: localIncludeOthers && !isolationMode,
          previousItems,
        });

        setOtherItems(otherItems);

        const hiddenSet = new Set(hiddenValuesRef.current);
        const areAllOtherHidden = otherItems.length > 0 && otherItems.every(([v]) => v !== null && hiddenSet.has(v));
        const itemsWithVisibility = items.map((it) => ({
          ...it,
          isVisible:
            it.value === "Other"
              ? !areAllOtherHidden
              : !hiddenSet.has(it.value === null ? "null" : (it.value as string)),
        }));

        return itemsWithVisibility;
      });
    }, [featureData, featureValues, isolationMode, splitHistory, proteinIds, localMaxVisible, localIncludeOthers, localIncludeShapes]);

    // Process data into legend items
    useEffect(() => {
      recomputeLegend();
    }, [
      recomputeLegend,
    ]);

    // Emit Other concrete values to parent after state commits
    useEffect(() => {
      if (!onOtherValuesChange) return;
      const concrete = otherItems.map(([v]) => (v === null ? "null" : (v as string)));
      // Always emit concrete Other membership to keep Scatterplot styling consistent,
      // independent of whether the legend shows the Other bucket
      const signature = JSON.stringify(concrete);
      if (signature === lastOtherValuesEmittedRef.current) return;
      lastOtherValuesEmittedRef.current = signature;
      onOtherValuesChange(concrete);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [otherItems, localIncludeOthers]);

    // Emit useShapes flag to parent after state commits
    useEffect(() => {
      if (!onUseShapesChange) return;
      if (lastUseShapesEmittedRef.current === localIncludeShapes) return;
      lastUseShapesEmittedRef.current = localIncludeShapes;
      onUseShapesChange(localIncludeShapes);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [localIncludeShapes]);

    // Keep a ref of hidden feature values for computing visibility on recompute
    useEffect(() => {
      hiddenValuesRef.current = hiddenFeatureValues;
      setLegendItems((prev) => {
        const hiddenSet = new Set(hiddenFeatureValues);
        const areAllOtherHidden = otherItems.length > 0 && otherItems.every(([v]) => v !== null && hiddenSet.has(v));
        return prev.map((it) => ({
          ...it,
          isVisible:
            it.value === "Other"
              ? !areAllOtherHidden
              : !hiddenSet.has(it.value === null ? "null" : (it.value as string)),
        }));
      });
    }, [hiddenFeatureValues]);

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
          if (value === "Other") {
            const otherConcrete = otherItems
              .map(([v]) => v)
              .filter((v): v is string => v !== null);
            if (otherConcrete.length === 0) return;
            const hiddenSet = new Set(hiddenValuesRef.current);
            const allHidden = otherConcrete.every((v) => hiddenSet.has(v));
            // If all hidden, show all; otherwise hide all
            for (const v of otherConcrete) {
              const isHidden = hiddenSet.has(v);
              if (allHidden && isHidden) onToggleVisibility(v);
              if (!allHidden && !isHidden) onToggleVisibility(v);
            }
          } else {
            onToggleVisibility(value);
          }
        }
      },
      [onToggleVisibility, otherItems]
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

        // Recompute to update Other bucket and counts
        recomputeLegend();
      },
      [otherItems, featureData, legendItems.length, onExtractFromOther, recomputeLegend]
    );

    // Handle drop on an item to support merging extracted values back into Other
    const handleDropOnItem = useCallback(
      (target: LegendItem) => {
        if (target.value !== "Other") return;
        // Find any dragged item in state via draggedItem ref from hook is not exposed; rely on removing any extracted being reordered onto Other:
        // Simplify: if there is exactly one extracted item selected as dragged, use draggedItem value
        // Our hook tracks draggedItem name; reusing it here via closure
        const dragged = draggedItem;
        if (!dragged) return;
        const draggedEntry = legendItems.find((i) => i.value === dragged);
        if (!draggedEntry || !draggedEntry.extractedFromOther || !draggedEntry.value) return;
        // Remove extracted item and trigger recompute
        setLegendItems((prev) => prev.filter((i) => i.value !== draggedEntry.value));
        recomputeLegend();
      },
      [draggedItem, legendItems, recomputeLegend]
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
            onClick={() => {
              setShowOtherDialog(false);
              setSettingsOpen(true);
            }}
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
                includeShapes={localIncludeShapes}
                onDropOn={handleDropOnItem}
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

        {/* Settings dialog */}
        <LegendSettingsDialog
          open={settingsOpen}
          maxVisibleValues={localMaxVisible}
          includeOthers={localIncludeOthers}
          includeShapes={localIncludeShapes}
          shapeSize={localShapeSize}
          onClose={() => setSettingsOpen(false)}
          onSave={({ maxVisibleValues: mv, includeOthers: io, includeShapes: is, shapeSize: ss }) => {
            setSettingsOpen(false);
            // Store locally and recompute
            setLocalMaxVisible(mv);
            setLocalIncludeOthers(io);
            setLocalIncludeShapes(is);
            setLocalShapeSize(ss);
            recomputeLegend();
            // Emit point sizes for scatterplot based on shape size input
            if (onPointSizesChange) {
              const base = Math.max(10, Math.round(ss * LEGEND_DEFAULTS.symbolSizeMultiplier));
              const highlighted = Math.round(base * 1.5);
              const selected = Math.round(base * 1.875);
              onPointSizesChange({ pointSize: base, highlightedPointSize: highlighted, selectedPointSize: selected });
            }
          }}
        />
      </div>
    );
  }
);

InteractiveLegend.displayName = "InteractiveLegend";

export default InteractiveLegend;
