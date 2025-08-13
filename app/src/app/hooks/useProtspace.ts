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
  const [isolationMode, setIsolationMode] = useState(false);
  const [splitHistory, setSplitHistory] = useState<string[][]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [viewStructureId, setViewStructureId] = useState<string | null>(null);
  const [hiddenFeatureValues, setHiddenFeatureValues] = useState<string[]>([]);

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

  const handleToggleIsolationMode = () => {
    if (!isolationMode) {
      if (selectedProteinIds.length === 0) {
        return;
      }
      setIsolationMode(true);
      setSplitHistory((prev) => [...prev, [...selectedProteinIds]]);
      setSelectedProteinIds([]);
    } else {
      if (selectedProteinIds.length > 0) {
        setSplitHistory((prev) => [...prev, [...selectedProteinIds]]);
        setSelectedProteinIds([]);
      } else {
        setIsolationMode(false);
        setSplitHistory([]);
        setHiddenFeatureValues([]);
      }
    }
  };

  const handleSaveSession = () => {
    if (!visualizationData) return;

    const sessionData = {
      protein_ids: visualizationData.protein_ids,
      features: visualizationData.features,
      feature_data: visualizationData.feature_data,
      projections: visualizationData.projections,
      projectIndex: selectedProjectionIndex,
      feature: selectedFeature,
      selected: selectedProteinIds,
      highlighted: highlightedProteinIds,
      isolation: isolationMode,
      hidden: hiddenFeatureValues,
      selectionMode: selectionMode,
      viewStructureId: viewStructureId,
    };

    const dataStr = JSON.stringify(sessionData);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(
      dataStr
    )}`;
    const exportName = "protspace_session";
    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", `${exportName}.protspace`);
    linkElement.click();
  };

  const handleLoadSession = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".protspace,.json";

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const content = event.target?.result as string;
          const sessionData = JSON.parse(content);

          if (sessionData.protein_ids && sessionData.features) {
            if (sessionData.projectIndex !== undefined) {
              setVisualizationData({
                protein_ids: sessionData.protein_ids,
                features: sessionData.features,
                feature_data: sessionData.feature_data,
                projections: sessionData.projections,
              });

              setSelectedProjectionIndex(sessionData.projectIndex || 0);
              setSelectedFeature(sessionData.feature || "");
              setSelectedProteinIds([
                ...Array.from(new Set((sessionData.selected || []) as string[])),
              ]);
              setHighlightedProteinIds([
                ...Array.from(
                  new Set((sessionData.highlighted || []) as string[])
                ),
              ]);
              setIsolationMode(sessionData.isolation || false);
              setHiddenFeatureValues([
                ...Array.from(new Set((sessionData.hidden || []) as string[])),
              ]);
              setSelectionMode(sessionData.selectionMode || false);
              setViewStructureId(sessionData.viewStructureId || null);
            } else {
              const dataUrl = URL.createObjectURL(file);
              await loadData(dataUrl);
              URL.revokeObjectURL(dataUrl);
            }
          } else {
            const dataPath = sessionData.dataPath || "/data/example/basic.json";
            await loadData(dataPath);

            setSelectedProjectionIndex(sessionData.projectIndex || 0);
            setSelectedFeature(sessionData.feature || "");
            setSelectedProteinIds([
              ...Array.from(new Set((sessionData.selected || []) as string[])),
            ]);
            setHighlightedProteinIds([
              ...Array.from(new Set((sessionData.highlighted || []) as string[])),
            ]);
            setIsolationMode(sessionData.isolation || false);
            setHiddenFeatureValues([
              ...Array.from(new Set((sessionData.hidden || []) as string[])),
            ]);
          }
        } catch (error) {
          console.error("Error loading session:", error);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleShareSession = () => {
    handleSaveSession();
  };

  // Export handled in the page to include SVG/PNG/PDF rendering logic

  const handleImportData = (data: any) => {
    try {
      setVisualizationData(data as VisualizationData);
      setSelectedProjectionIndex(0);
      const firstFeature = data && data.features ? Object.keys(data.features)[0] : "";
      setSelectedFeature(firstFeature || "");
      setSelectedProteinIds([]);
      setHighlightedProteinIds([]);
      setIsolationMode(false);
      setSplitHistory([]);
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

  const totalProteins = visualizationData?.protein_ids.length || 0;

  const displayedProteins = useMemo(() => {
    if (!isolationMode || !splitHistory || splitHistory.length === 0) {
      return totalProteins;
    }
    if (!visualizationData) return 0;
    const displayedIds = new Set(splitHistory[0]);
    if (splitHistory.length > 1) {
      for (let i = 1; i < splitHistory.length; i++) {
        const currentSplit = splitHistory[i];
        Array.from(displayedIds).forEach((id) => {
          if (!currentSplit.includes(id)) {
            displayedIds.delete(id);
          }
        });
      }
    }
    return displayedIds.size;
  }, [isolationMode, splitHistory, totalProteins, visualizationData]);

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
    isolationMode,
    splitHistory,
    selectionMode,
    viewStructureId,
    hiddenFeatureValues,
    // setters
    setSelectedProjectionIndex,
    setSelectedFeature,
    setSelectedProteinIds,
    setHighlightedProteinIds,
    setIsolationMode,
    setSplitHistory,
    setSelectionMode,
    setViewStructureId,
    // handlers
    handleProteinClick,
    handleProteinHover,
    handleSearch,
    handleRemoveProtein,
    handleToggleIsolationMode,
    handleSaveSession,
    handleLoadSession,
    handleShareSession,
    handleToggleVisibility,
    handleExtractFromOther,
    handleSetZOrder,
    handleOpenCustomization,
    handleImportData,
    // derived
    totalProteins,
    displayedProteins,
    projectionName,
    selectedFeatureItemsSet,
  } as const;
}


