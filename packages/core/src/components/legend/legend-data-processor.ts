import type { LegendItem, OtherItem, LegendFeatureData } from "./types";
import { DEFAULT_STYLES } from "./config";

/**
 * Utility class for processing legend data and creating legend items
 */
export class LegendDataProcessor {
  /**
   * Get filtered indices based on split history for isolation mode
   */
  static getFilteredIndices(
    isolationMode: boolean,
    splitHistory: string[][],
    proteinIds: string[]
  ): Set<number> {
    const filteredIndices = new Set<number>();

    if (
      isolationMode &&
      splitHistory &&
      splitHistory.length > 0 &&
      proteinIds
    ) {
      proteinIds.forEach((id, index) => {
        // For the first split, check if the protein is in the first selection
        let isIncluded = splitHistory[0].includes(id);

        // For each subsequent split, check if the protein is also in that selection
        if (isIncluded && splitHistory.length > 1) {
          for (let i = 1; i < splitHistory.length; i++) {
            if (!splitHistory[i].includes(id)) {
              isIncluded = false;
              break;
            }
          }
        }

        if (isIncluded) {
          filteredIndices.add(index);
        }
      });
    }

    return filteredIndices;
  }

  /**
   * Count feature frequencies with optional filtering
   */
  static countFeatureFrequencies(
    featureValues: (string | null)[],
    isolationMode: boolean,
    splitHistory: string[][],
    filteredIndices: Set<number>
  ): Map<string | null, number> {
    const frequencyMap = new Map<string | null, number>();

    if (isolationMode && splitHistory && splitHistory.length > 0) {
      // Only count values from proteins that pass the split filter
      featureValues.forEach((value, index) => {
        if (filteredIndices.has(index)) {
          frequencyMap.set(value, (frequencyMap.get(value) || 0) + 1);
        }
      });
    } else {
      // Count all values when not in isolation mode
      featureValues.forEach((value) => {
        frequencyMap.set(value, (frequencyMap.get(value) || 0) + 1);
      });
    }

    return frequencyMap;
  }

  /**
   * Sort and limit items based on frequency
   */
  static sortAndLimitItems(
    frequencyMap: Map<string | null, number>,
    maxVisibleValues: number,
    isolationMode: boolean
  ): {
    topItems: Array<[string | null, number]>;
    otherItems: OtherItem[];
    otherCount: number;
  } {
    // Convert to array and sort by frequency (descending)
    const sortedItems = Array.from(frequencyMap.entries()).sort(
      (a, b) => b[1] - a[1]
    );

    // When in isolation mode, we only show the values that actually appear in the data
    const filteredSortedItems = isolationMode
      ? sortedItems.filter(([value]) => frequencyMap.has(value))
      : sortedItems;

    // Take the top N items
    const topItems = filteredSortedItems.slice(0, maxVisibleValues);

    // Get items that will go into the "Other" category (excluding null)
    const otherItemsArray = filteredSortedItems
      .slice(maxVisibleValues)
      .filter(([value]) => value !== null);

    // Store "Other" items for the dialog
    const otherItems = otherItemsArray.map(([value, count]) => ({
      value,
      count,
    }));

    // Calculate count for "Other" category
    const otherCount = otherItemsArray.reduce(
      (sum, [, count]) => sum + count,
      0
    );

    return { topItems, otherItems, otherCount };
  }

  /**
   * Create legend items from sorted data
   */
  static createLegendItems(
    topItems: Array<[string | null, number]>,
    otherCount: number,
    isolationMode: boolean,
    featureData: LegendFeatureData
  ): LegendItem[] {
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

    return items;
  }

  /**
   * Add null entry if not already included in top items
   */
  static addNullEntry(
    items: LegendItem[],
    frequencyMap: Map<string | null, number>,
    topItems: Array<[string | null, number]>,
    featureData: LegendFeatureData
  ): void {
    // Find null entry
    const nullEntry = Array.from(frequencyMap.entries()).find(
      ([value]) => value === null
    );

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
  }

  /**
   * Add extracted items that were previously extracted from "Other"
   */
  static addExtractedItems(
    items: LegendItem[],
    frequencyMap: Map<string | null, number>,
    existingLegendItems: LegendItem[]
  ): void {
    // Get previously extracted items
    const extractedItems = existingLegendItems.filter(
      (item) => item.extractedFromOther
    );

    // Add extracted items, but only if they exist in the current data
    const itemsToAdd: LegendItem[] = [];
    extractedItems.forEach((extractedItem) => {
      // Only add if not already in the list and if they exist in the current frequencies
      if (
        extractedItem.value !== null &&
        !items.some((item) => item.value === extractedItem.value) &&
        frequencyMap.has(extractedItem.value)
      ) {
        // Find the original frequency of this item
        const sortedItems = Array.from(frequencyMap.entries()).sort(
          (a, b) => b[1] - a[1]
        );
        const itemFrequency = sortedItems.find(
          ([value]) => value === extractedItem.value
        );

        if (itemFrequency) {
          itemsToAdd.push({
            ...extractedItem,
            count: itemFrequency[1],
            zOrder: items.length + itemsToAdd.length,
          });
        }
      }
    });

    // Add the extracted items
    items.push(...itemsToAdd);
  }

  /**
   * Process all legend items - main entry point
   */
  static processLegendItems(
    featureData: LegendFeatureData,
    featureValues: (string | null)[],
    proteinIds: string[],
    maxVisibleValues: number,
    isolationMode: boolean,
    splitHistory: string[][],
    existingLegendItems: LegendItem[]
  ): {
    legendItems: LegendItem[];
    otherItems: OtherItem[];
  } {
    // Get filtered indices based on split history
    const filteredIndices = this.getFilteredIndices(
      isolationMode,
      splitHistory,
      proteinIds
    );

    // Count frequencies with filtering
    const frequencyMap = this.countFeatureFrequencies(
      featureValues,
      isolationMode,
      splitHistory,
      filteredIndices
    );

    // Sort and limit items
    const { topItems, otherItems, otherCount } = this.sortAndLimitItems(
      frequencyMap,
      maxVisibleValues,
      isolationMode
    );

    // Create legend items
    const items = this.createLegendItems(
      topItems,
      otherCount,
      isolationMode,
      featureData
    );

    // Add null entry if needed
    this.addNullEntry(items, frequencyMap, topItems, featureData);

    // Add extracted items
    this.addExtractedItems(items, frequencyMap, existingLegendItems);

    return { legendItems: items, otherItems };
  }
}
