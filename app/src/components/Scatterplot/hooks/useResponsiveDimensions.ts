"use client";

import { useEffect, useState, RefObject } from "react";

type Dimensions = { width: number; height: number };

export function useResponsiveDimensions(
  containerRef: RefObject<HTMLElement>,
  initial: Dimensions,
  min: Dimensions = { width: 300, height: 200 }
) {
  const [dimensions, setDimensions] = useState<Dimensions>(initial);

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({
            width: Math.max(width, min.width),
            height: Math.max(height, min.height),
          });
        }
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [containerRef, min.height, min.width]);

  return { dimensions } as const;
}


