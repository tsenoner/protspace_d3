"use client";

import { useCallback, useRef, useState } from "react";
import { LegendItem } from "../types";

export function useLegendDnD(
  onReorder?: (updated: LegendItem[]) => void
): {
  draggedItem: string | null;
  handleDragStart: (item: LegendItem) => void;
  handleDragOver: (item: LegendItem, setItems: (updater: (prev: LegendItem[]) => LegendItem[]) => void) => void;
  handleDragEnd: () => void;
} {
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleDragStart = useCallback((item: LegendItem) => {
    setDraggedItem(item.value);
    if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);
  }, []);

  const handleDragOver = useCallback(
    (
      item: LegendItem,
      setItems: (updater: (prev: LegendItem[]) => LegendItem[]) => void
    ) => {
      if (!draggedItem || draggedItem === item.value) return;
      if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);

      dragTimeoutRef.current = setTimeout(() => {
        setItems((prev) => {
          const draggedIdx = prev.findIndex((i) => i.value === draggedItem);
          const targetIdx = prev.findIndex((i) => i.value === item.value);
          if (draggedIdx === -1 || targetIdx === -1) return prev;

          const newItems = [...prev];
          const [movedItem] = newItems.splice(draggedIdx, 1);
          newItems.splice(targetIdx, 0, movedItem);
          const updatedItems = newItems.map((i, idx) => ({ ...i, zOrder: idx }));
          onReorder?.(updatedItems);
          return updatedItems;
        });
      }, 100);
    },
    [draggedItem, onReorder]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }
  }, []);

  return { draggedItem, handleDragStart, handleDragOver, handleDragEnd } as const;
}


