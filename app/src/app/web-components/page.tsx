"use client";

import { useState, useEffect } from "react";
import ProtspaceWebComponent from "@/components/WebComponent/ProtspaceWebComponent";
import ImprovedScatterplot, {
  VisualizationData,
} from "@/components/Scatterplot/ImprovedScatterplot";

export default function WebComponentsDemo() {
  const [visualizationData, setVisualizationData] =
    useState<VisualizationData | null>(null);
  const [selectedProjectionIndex, setSelectedProjectionIndex] = useState(0);
  const [selectedFeature, setSelectedFeature] = useState("");
  const [selectedProteinIds, setSelectedProteinIds] = useState<string[]>([]);
  const [highlightedProteinIds, setHighlightedProteinIds] = useState<string[]>(
    []
  );
  const [useWebComponent, setUseWebComponent] = useState(false);

  // Load data (you can replace this with your actual data loading logic)
  useEffect(() => {
    // This is a placeholder - replace with your actual data loading
    const loadData = async () => {
      try {
        // Load your visualization data here
        // setVisualizationData(await fetchData());
        console.log("Load your visualization data here");
      } catch (error) {
        console.error("Failed to load data:", error);
      }
    };

    loadData();
  }, []);

  const handleProteinClick = (
    proteinId: string,
    event?: React.MouseEvent | CustomEvent
  ) => {
    console.log("Protein clicked:", proteinId, event);
    setSelectedProteinIds((prev) => {
      if (prev.includes(proteinId)) {
        return prev.filter((id) => id !== proteinId);
      } else {
        return [...prev, proteinId];
      }
    });
  };

  const handleProteinHover = (proteinId: string | null) => {
    console.log("Protein hovered:", proteinId);
    setHighlightedProteinIds(proteinId ? [proteinId] : []);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Web Components vs React Components Demo
          </h1>
          <p className="text-gray-600 mb-6">
            This page demonstrates how to use the Lit-based web component from
            your core package alongside the React-based component in your
            Next.js app.
          </p>

          <div className="flex items-center space-x-4 mb-6">
            <button
              onClick={() => setUseWebComponent(false)}
              className={`px-4 py-2 rounded-md ${
                !useWebComponent
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              React Component
            </button>
            <button
              onClick={() => setUseWebComponent(true)}
              className={`px-4 py-2 rounded-md ${
                useWebComponent
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Web Component (Lit)
            </button>
          </div>

          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <h3 className="text-lg font-semibold mb-2">
              Currently showing:{" "}
              {useWebComponent ? "Lit Web Component" : "React Component"}
            </h3>
            <p className="text-sm text-gray-600">
              {useWebComponent
                ? "This uses the protspace-scatterplot web component from your @protspace/core package"
                : "This uses the React-based ImprovedScatterplot component"}
            </p>
          </div>

          {/* Development controls - remove these in production */}
          <div className="bg-blue-50 p-4 rounded-lg shadow mb-6">
            <h3 className="text-lg font-semibold mb-2">Development Controls</h3>
            <div className="space-y-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Projection Index:
                </label>
                <input
                  type="number"
                  min="0"
                  value={selectedProjectionIndex}
                  onChange={(e) =>
                    setSelectedProjectionIndex(Number(e.target.value))
                  }
                  className="mt-1 block w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Selected Feature:
                </label>
                <input
                  type="text"
                  value={selectedFeature}
                  onChange={(e) => setSelectedFeature(e.target.value)}
                  placeholder="Enter feature name"
                  className="mt-1 block w-48 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() => {
                  // Example of loading mock data
                  const mockData: VisualizationData = {
                    protein_ids: ["protein1", "protein2", "protein3"],
                    projections: [
                      {
                        name: "Mock Projection",
                        data: [
                          [0, 0],
                          [1, 1],
                          [2, 2],
                        ],
                      },
                    ],
                    features: {
                      mockFeature: {
                        values: ["A", "B", "C"],
                        colors: ["#ff0000", "#00ff00", "#0000ff"],
                        shapes: ["circle", "square", "triangle"],
                      },
                    },
                    feature_data: {
                      mockFeature: [0, 1, 2],
                    },
                  };
                  setVisualizationData(mockData);
                  setSelectedFeature("mockFeature");
                }}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
              >
                Load Mock Data
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="h-96 w-full border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
            {visualizationData ? (
              useWebComponent ? (
                <ProtspaceWebComponent
                  data={visualizationData}
                  selectedProjectionIndex={selectedProjectionIndex}
                  selectedFeature={selectedFeature}
                  selectedProteinIds={selectedProteinIds}
                  highlightedProteinIds={highlightedProteinIds}
                  onProteinClick={handleProteinClick}
                  onProteinHover={handleProteinHover}
                  className="w-full h-full"
                />
              ) : (
                <ImprovedScatterplot
                  data={visualizationData}
                  selectedProjectionIndex={selectedProjectionIndex}
                  selectedFeature={selectedFeature}
                  selectedProteinIds={selectedProteinIds}
                  highlightedProteinIds={highlightedProteinIds}
                  isolationMode={false}
                  selectionMode={false}
                  onProteinClick={handleProteinClick}
                  onProteinHover={handleProteinHover}
                  className="w-full h-full"
                />
              )
            ) : (
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-500">
                  No data loaded. Please load your visualization data to see the
                  components in action.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Integration Guide</h2>

          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                1. Web Component Approach
              </h3>
              <p className="text-gray-600 mb-2">
                The web component approach uses your Lit-based component from
                the core package:
              </p>
              <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-x-auto">
                {`import ProtspaceWebComponent from '@/components/WebComponent/ProtspaceWebComponent';

<ProtspaceWebComponent
  data={visualizationData}
  selectedProjectionIndex={selectedProjectionIndex}
  selectedFeature={selectedFeature}
  onProteinClick={handleProteinClick}
  onProteinHover={handleProteinHover}
/>`}
              </pre>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                2. Benefits of Web Components
              </h3>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Framework agnostic - can be used in any web framework</li>
                <li>Encapsulated styling and behavior</li>
                <li>Consistent across different parts of your application</li>
                <li>Shared between your core package and Next.js app</li>
                <li>Custom CSS properties for easy theming</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                3. Next Steps
              </h3>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>
                  Build your core package:{" "}
                  <code className="bg-gray-200 px-1 rounded">
                    npm run build
                  </code>
                </li>
                <li>
                  Import the web component wrapper in your pages/components
                </li>
                <li>
                  Replace React components with web components where desired
                </li>
                <li>Customize styling using CSS custom properties</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
