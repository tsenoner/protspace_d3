"use client";

import { useState, useEffect } from "react";
import * as d3 from "d3";
import ProtspaceLegendWebComponent from "@/components/WebComponent/ProtspaceLegendWebComponent";
import type { VisualizationData } from "@protspace/utils";

export default function LegendDemo() {
  const [visualizationData, setVisualizationData] =
    useState<VisualizationData | null>(null);
  const [selectedFeature, setSelectedFeature] = useState("");
  const [featureValues, setFeatureValues] = useState<(string | null)[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [maxVisibleValues, setMaxVisibleValues] = useState(10);

  // Load sample data
  useEffect(() => {
    const loadData = async () => {
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

        const rawData = (await d3.json("/data/example/basic.json")) as RawData;

        // Transform the data
        const transformedData: VisualizationData = {
          protein_ids: rawData.protein_ids,
          projections: rawData.projections,
          feature_data: rawData.feature_data,
          features: {},
        };

        // Process features
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

        // Set first feature as selected
        if (transformedData.features) {
          const firstFeature = Object.keys(transformedData.features)[0];
          setSelectedFeature(firstFeature);

          // Generate sample feature values for demo
          const sampleValues: (string | null)[] = [];
          for (let i = 0; i < transformedData.protein_ids.length; i++) {
            const featureIndex = transformedData.feature_data[firstFeature][i];
            sampleValues.push(
              featureIndex !== undefined
                ? transformedData.features[firstFeature].values[featureIndex]
                : null
            );
          }
          setFeatureValues(sampleValues);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };

    loadData();
  }, []);

  const handleFeatureChange = (featureName: string) => {
    if (!visualizationData || !visualizationData.features[featureName]) return;

    setSelectedFeature(featureName);

    // Generate feature values for the selected feature
    const newFeatureValues: (string | null)[] = [];
    for (let i = 0; i < visualizationData.protein_ids.length; i++) {
      const featureIndex = visualizationData.feature_data[featureName][i];
      newFeatureValues.push(
        featureIndex !== undefined
          ? visualizationData.features[featureName].values[featureIndex]
          : null
      );
    }
    setFeatureValues(newFeatureValues);
  };

  const handleLegendItemClick = (
    value: string | null,
    action: "toggle" | "isolate" | "extract"
  ) => {
    console.log(`Legend item clicked: ${value}, action: ${action}`);

    if (action === "toggle") {
      // Toggle selection
      const valueKey = value === null ? "null" : value;
      if (selectedItems.includes(valueKey)) {
        setSelectedItems(selectedItems.filter((item) => item !== valueKey));
      } else {
        setSelectedItems([...selectedItems, valueKey]);
      }
    } else if (action === "isolate") {
      // Isolate this item
      const valueKey = value === null ? "null" : value;
      if (selectedItems.length === 1 && selectedItems[0] === valueKey) {
        // If it's the only selected item, show all
        setSelectedItems([]);
      } else {
        // Show only this item
        setSelectedItems([valueKey]);
      }
    } else if (action === "extract") {
      console.log(`Extracted item from Other: ${value}`);
    }
  };

  const handleLegendZOrderChange = (zOrderMapping: Record<string, number>) => {
    console.log("Z-order changed:", zOrderMapping);
  };

  const handleLegendCustomize = () => {
    console.log("Legend customize clicked");
    alert("Customize legend functionality would open here!");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Legend Web Component Demo
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Controls */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Controls</h2>

              {/* Feature Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selected Feature
                </label>
                <select
                  value={selectedFeature}
                  onChange={(e) => handleFeatureChange(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  {visualizationData &&
                    Object.keys(visualizationData.features).map((feature) => (
                      <option key={feature} value={feature}>
                        {feature}
                      </option>
                    ))}
                </select>
              </div>

              {/* Max Visible Values */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Visible Values: {maxVisibleValues}
                </label>
                <input
                  type="range"
                  min="3"
                  max="20"
                  value={maxVisibleValues}
                  onChange={(e) => setMaxVisibleValues(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Selected Items */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selected Items ({selectedItems.length})
                </label>
                <div className="bg-gray-100 p-2 rounded text-sm">
                  {selectedItems.length > 0 ? selectedItems.join(", ") : "None"}
                </div>
              </div>

              {/* Clear Selection */}
              <button
                onClick={() => setSelectedItems([])}
                className="w-full px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 mb-4"
              >
                Clear Selection
              </button>

              {/* Mock Data Button */}
              <button
                onClick={() => {
                  const mockData: VisualizationData = {
                    protein_ids: [
                      "protein1",
                      "protein2",
                      "protein3",
                      "protein4",
                      "protein5",
                    ],
                    projections: [
                      {
                        name: "Mock Projection",
                        data: [
                          [0, 0],
                          [1, 1],
                          [2, 2],
                          [3, 3],
                          [4, 4],
                        ],
                      },
                    ],
                    features: {
                      category: {
                        values: ["TypeA", "TypeB", "TypeC"],
                        colors: ["#ff0000", "#00ff00", "#0000ff"],
                        shapes: ["circle", "square", "triangle"],
                      },
                      size: {
                        values: ["small", "medium", "large"],
                        colors: ["#ffcc00", "#ff6600", "#cc0000"],
                        shapes: ["circle", "circle", "circle"],
                      },
                    },
                    feature_data: {
                      category: [0, 1, 2, 0, 1],
                      size: [0, 1, 2, 1, 0],
                    },
                  };
                  setVisualizationData(mockData);
                  setSelectedFeature("category");
                  setFeatureValues([
                    "TypeA",
                    "TypeB",
                    "TypeC",
                    "TypeA",
                    "TypeB",
                  ]);
                }}
                className="w-full px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
              >
                Load Mock Data
              </button>
            </div>
          </div>

          {/* Legend Component */}
          <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Interactive Legend</h2>

              {visualizationData ? (
                <ProtspaceLegendWebComponent
                  data={visualizationData}
                  selectedFeature={selectedFeature}
                  featureValues={featureValues}
                  proteinIds={visualizationData.protein_ids}
                  maxVisibleValues={maxVisibleValues}
                  selectedItems={selectedItems}
                  isolationMode={false}
                  onLegendItemClick={handleLegendItemClick}
                  onLegendZOrderChange={handleLegendZOrderChange}
                  onLegendCustomize={handleLegendCustomize}
                  className="border border-gray-200 rounded"
                />
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Loading data...
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="mt-6 bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">How to use:</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>
                  • <strong>Single click</strong> legend items to toggle
                  visibility
                </li>
                <li>
                  • <strong>Double click</strong> to isolate an item or show all
                </li>
                <li>
                  • <strong>Drag</strong> items to reorder them
                </li>
                <li>
                  • <strong>Click &quot;view&quot;</strong> on &quot;Other&quot;
                  category to extract specific items
                </li>
                <li>
                  • <strong>Settings icon</strong> to customize the legend
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
