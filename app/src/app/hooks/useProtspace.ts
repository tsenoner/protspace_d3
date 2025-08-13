"use client";

import * as d3 from "d3";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { VisualizationData } from "@protspace/utils";

export function useProtspace() {
  const [visualizationData, setVisualizationData] =
    useState<VisualizationData | null>(null);
  const [selectedProjectionIndex, setSelectedProjectionIndex] = useState(0);
  const [selectedFeature, setSelectedFeature] = useState("");
  const [selectedProteinIds, setSelectedProteinIds] = useState<string[]>([]);
  const [highlightedProteinIds, setHighlightedProteinIds] = useState<string[]>(
    []
  );
  
  const [selectionMode, setSelectionMode] = useState(false);
  const [viewStructureId, setViewStructureId] = useState<string | null>(null);
  const [hiddenFeatureValues, setHiddenFeatureValues] = useState<string[]>([]);
  const [otherLegendValues, setOtherLegendValues] = useState<string[]>([]);
  const [useShapes, setUseShapes] = useState<boolean>(false);

  // Load data when component mounts
  const loadData = async (dataPath?: string) => {
    try {
      interface RawFeatureItem {
        label: string | null;
        color: string;
        shape: string;
        visible: string;
      }

      interface RawFeature {
        other_visible: boolean;
        items: RawFeatureItem[];
      }

      interface RawData {
        protein_ids: string[];
        features: Record<string, RawFeature>;
        feature_data: Record<string, number[]>;
        projections: {
          name: string;
          metadata?: Record<string, unknown>;
          data: [number, number][];
        }[];
      }

      const rawData = (await d3.json(
        dataPath || "/data/example/basic.json"
      )) as RawData;

      const transformedData: VisualizationData = {
        protein_ids: rawData.protein_ids,
        projections: rawData.projections,
        feature_data: rawData.feature_data,
        features: {},
      };

      Object.keys(rawData.features).forEach((featureKey) => {
        const featureItems = rawData.features[featureKey].items;
        const values = featureItems.map((item) => item.label);
        const colors = featureItems.map((item) => item.color);
        const shapes = featureItems.map((item) => item.shape);

        transformedData.features[featureKey] = {
          values,
          colors,
          shapes,
        };
      });

      setVisualizationData(transformedData);

      if (transformedData && transformedData.features) {
        setSelectedFeature(Object.keys(transformedData.features)[0]);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Selection handlers
  const handleProteinClick = (proteinId: string, event?: React.MouseEvent) => {
    if (!selectionMode) {
      setHighlightedProteinIds([proteinId]);
    }

    setSelectedProteinIds((prevIds) => {
      if (prevIds.includes(proteinId)) {
        setHighlightedProteinIds((prev) => prev.filter((id) => id !== proteinId));
        if (viewStructureId === proteinId) {
          setViewStructureId(null);
        }
        return prevIds.filter((id) => id !== proteinId);
      }

      if (event && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
        if (!selectionMode) {
          setViewStructureId(proteinId);
          setHighlightedProteinIds([proteinId]);
        }
        return [proteinId];
      }

      if (!selectionMode) {
        setViewStructureId(proteinId);
        setHighlightedProteinIds((prev) =>
          prev.includes(proteinId) ? prev : [...prev, proteinId]
        );
      }
      return [...prevIds, proteinId];
    });
  };

  const handleProteinHover = () => {
    return;
  };

  const handleSearch = (query: string) => {
    if (!visualizationData || !query.trim()) return;

    let searchResults = visualizationData.protein_ids.filter(
      (id) => id.toLowerCase() === query.toLowerCase()
    );

    if (searchResults.length === 0) {
      searchResults = visualizationData.protein_ids.filter((id) =>
        id.toLowerCase().includes(query.toLowerCase())
      );
    }

    if (searchResults.length > 0) {
      if (searchResults.length === 1) {
        const matchedId = searchResults[0];
        if (!selectedProteinIds.includes(matchedId)) {
          setSelectedProteinIds((prev) => [...prev, matchedId]);
          setHighlightedProteinIds((prev) =>
            prev.includes(matchedId) ? prev : [...prev, matchedId]
          );
        }
        setViewStructureId(matchedId);
      } else {
        setHighlightedProteinIds((prev) => {
          const uniqueHighlights = new Set([...prev]);
          searchResults.forEach((id) => {
            uniqueHighlights.add(id);
          });
          return Array.from(uniqueHighlights);
        });
      }
    } else {
      // no-op: keep current selection/highlights
    }
  };

  const handleRemoveProtein = (proteinId: string) => {
    setHighlightedProteinIds((prev) => [
      ...Array.from(new Set(prev.filter((id) => id !== proteinId))),
    ]);
    setSelectedProteinIds((prev) => [
      ...Array.from(new Set(prev.filter((id) => id !== proteinId))),
    ]);
  };

  

  const handleImportData = (data: any) => {
    try {
      setVisualizationData(data as VisualizationData);
      setSelectedProjectionIndex(0);
      const firstFeature = data && data.features ? Object.keys(data.features)[0] : "";
      setSelectedFeature(firstFeature || "");
      setSelectedProteinIds([]);
      setHighlightedProteinIds([]);
      
      setHiddenFeatureValues([]);
      setSelectionMode(false);
      setViewStructureId(null);
    } catch (e) {
      console.error("Failed to import visualization data", e);
    }
  };

  const handleToggleVisibility = useCallback((value: string | null) => {
    const valueToToggle = value === null ? "null" : value;
    setTimeout(() => {
      setHiddenFeatureValues((prev) => {
        if (prev.includes(valueToToggle)) {
          return prev.filter((v) => v !== valueToToggle);
        } else {
          return [...prev, valueToToggle];
        }
      });
    }, 0);
  }, []);

  const handleExtractFromOther = (value: string) => {
    console.log(`Extracted value from Other category: ${value}`);
  };

  const handleSetZOrder = (zOrderMapping: Record<string, number>) => {
    console.log("Z-order mapping updated:", zOrderMapping);
  };

  const handleOpenCustomization = () => {
    alert("Legend customization would open a modal dialog here.");
  };

  // Auto-reset legend visibility when all categories become hidden
  useEffect(() => {
    if (!visualizationData || !selectedFeature) return;
    const feature = visualizationData.features[selectedFeature];
    if (!feature || !Array.isArray(feature.values) || feature.values.length === 0) return;
    if (!hiddenFeatureValues || hiddenFeatureValues.length === 0) return;

    const hidden = new Set(hiddenFeatureValues);
    const normalizedKeys = feature.values.map((v) =>
      v === null ? "null" : typeof v === "string" && v.trim() === "" ? "" : String(v)
    );
    const allHidden = normalizedKeys.length > 0 && normalizedKeys.every((k) => hidden.has(k));
    if (allHidden) {
      setHiddenFeatureValues([]);
    }
  }, [visualizationData, selectedFeature, hiddenFeatureValues]);

  const totalProteins = visualizationData?.protein_ids.length || 0;

  const displayedProteins = useMemo(() => {
    return totalProteins;
  }, [totalProteins]);

  const projectionName =
    visualizationData?.projections[selectedProjectionIndex]?.name || "";

  const selectedFeatureItemsSet = useMemo(() => {
    if (!selectedProteinIds.length || !visualizationData || !selectedFeature)
      return new Set<string>();

    const result = new Set<string>();
    selectedProteinIds.forEach((id) => {
      const index = visualizationData.protein_ids.indexOf(id);
      if (index !== -1) {
        const featureValue =
          visualizationData.feature_data[selectedFeature][index];
        const value = visualizationData.features[selectedFeature].values[
          featureValue
        ];

        if (value !== null) {
          result.add(value);
        } else if (selectedProteinIds.length > 0) {
          result.add("null");
        }
      }
    });
    return result;
  }, [selectedProteinIds, visualizationData, selectedFeature]);

  return {
    // state
    visualizationData,
    selectedProjectionIndex,
    selectedFeature,
    selectedProteinIds,
    highlightedProteinIds,
    selectionMode,
    viewStructureId,
    hiddenFeatureValues,
    otherLegendValues,
    useShapes,
    // setters
    setSelectedProjectionIndex,
    setSelectedFeature,
    setSelectedProteinIds,
    setHighlightedProteinIds,
    setSelectionMode,
    setViewStructureId,
    // handlers
    handleProteinClick,
    handleProteinHover,
    handleSearch,
    handleRemoveProtein,
    handleToggleVisibility,
    handleExtractFromOther,
    handleSetZOrder,
    handleOpenCustomization,
    handleImportData,
    setOtherLegendValues,
    setUseShapes,
    // derived
    totalProteins,
    displayedProteins,
    projectionName,
    selectedFeatureItemsSet,
  } as const;
}


