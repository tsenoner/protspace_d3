import { DEFAULT_STYLES } from "./constants";
import { LegendItem } from "./types";

export function buildFrequencyMap(
  featureValues: (string | null)[],
  isolationMode: boolean,
  splitHistory?: string[][],
  proteinIds?: string[]
): Map<string | null, number> {
  const frequencyMap = new Map<string | null, number>();

  if (isolationMode && splitHistory && splitHistory.length > 0 && proteinIds) {
    const filteredIndices = new Set<number>();
    proteinIds.forEach((id, index) => {
      let isIncluded = splitHistory[0].includes(id);
      if (isIncluded && splitHistory.length > 1) {
        for (let i = 1; i < splitHistory.length; i++) {
          if (!splitHistory[i].includes(id)) {
            isIncluded = false;
            break;
          }
        }
      }
      if (isIncluded) filteredIndices.add(index);
    });

    featureValues.forEach((value, index) => {
      if (filteredIndices.has(index)) {
        frequencyMap.set(value, (frequencyMap.get(value) || 0) + 1);
      }
    });
  } else {
    featureValues.forEach((value) => {
      frequencyMap.set(value, (frequencyMap.get(value) || 0) + 1);
    });
  }

  return frequencyMap;
}

export function computeLegendItems(params: {
  featureData: {
    values: (string | null)[];
    colors: string[];
    shapes: string[];
  };
  frequencyMap: Map<string | null, number>;
  maxVisibleValues: number;
  includeOther: boolean;
  previousItems: LegendItem[];
}): { items: LegendItem[]; otherItems: [string | null, number][] } {
  const { featureData, frequencyMap, maxVisibleValues, includeOther, previousItems } = params;

  const sortedItems = Array.from(frequencyMap.entries()).sort((a, b) => b[1] - a[1]);
  const filteredSortedItems = sortedItems; // already filtered via frequencyMap

  const topItems = filteredSortedItems.slice(0, maxVisibleValues);
  const nullEntry = filteredSortedItems.find(([value]) => value === null);
  const otherItemsArray = filteredSortedItems.slice(maxVisibleValues).filter(([value]) => value !== null);
  const otherCount = otherItemsArray.reduce((sum, [, count]) => sum + count, 0);

  const items: LegendItem[] = topItems.map(([value, count], index) => {
    const valueIndex =
      value !== null ? featureData.values.indexOf(value) : featureData.values.findIndex((v) => v === null);

    return {
      value,
      color: valueIndex !== -1 ? featureData.colors[valueIndex] : DEFAULT_STYLES.null.color,
      shape: valueIndex !== -1 ? featureData.shapes[valueIndex] : DEFAULT_STYLES.null.shape,
      count,
      isVisible: true,
      zOrder: index,
    } as LegendItem;
  });

  if (includeOther && otherCount > 0) {
    items.push({
      value: "Other",
      color: DEFAULT_STYLES.other.color,
      shape: DEFAULT_STYLES.other.shape,
      count: otherCount,
      isVisible: true,
      zOrder: items.length,
    });
  }

  if (nullEntry && !topItems.some(([value]) => value === null)) {
    const valueIndex = featureData.values.findIndex((v) => v === null);
    items.push({
      value: null,
      color: valueIndex !== -1 ? featureData.colors[valueIndex] : DEFAULT_STYLES.null.color,
      shape: valueIndex !== -1 ? featureData.shapes[valueIndex] : DEFAULT_STYLES.null.shape,
      count: nullEntry[1],
      isVisible: true,
      zOrder: items.length,
    });
  }

  const extractedItems = previousItems.filter((item) => item.extractedFromOther);
  extractedItems.forEach((extractedItem) => {
    if (!items.some((item) => item.value === extractedItem.value) && frequencyMap.has(extractedItem.value)) {
      const itemFrequency = filteredSortedItems.find(([value]) => value === extractedItem.value);
      if (itemFrequency) {
        items.push({ ...extractedItem, count: itemFrequency[1], zOrder: items.length });
      }
    }
  });

  // Filter otherItems so that extracted/individually shown values are excluded and update Other count accordingly
  const individuallyShown = new Set(
    items.map((i) => i.value).filter((v): v is string => v !== null && v !== "Other")
  );
  const filteredOtherItems = otherItemsArray.filter(
    ([v]) => v !== null && !individuallyShown.has(v)
  );
  const recomputedOtherCount = filteredOtherItems.reduce((sum, [, c]) => sum + c, 0);
  const otherIdx = items.findIndex((i) => i.value === "Other");
  if (otherIdx !== -1) {
    if (recomputedOtherCount > 0) {
      items[otherIdx] = { ...items[otherIdx], count: recomputedOtherCount };
    } else {
      items.splice(otherIdx, 1);
    }
  }

  return { items, otherItems: filteredOtherItems };
}

export function toZOrderMap(items: LegendItem[]): Record<string, number> {
  return items.reduce((acc, item) => {
    if (item.value !== null) acc[item.value] = item.zOrder;
    return acc;
  }, {} as Record<string, number>);
}


