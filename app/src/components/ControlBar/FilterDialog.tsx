"use client";

import { useEffect, useMemo, useState } from "react";

interface FilterDialogProps {
  features: string[];
  getFeatureValues: (feature: string) => string[];
  initialState: {
    enabledByFeature: Record<string, boolean>;
    allowedValuesByFeature: Record<string, Set<string>>;
  };
  onClose: () => void;
  onApply: (state: {
    enabledByFeature: Record<string, boolean>;
    allowedValuesByFeature: Record<string, Set<string>>;
  }) => void;
}

export default function FilterDialog({
  features,
  getFeatureValues,
  initialState,
  onClose,
  onApply,
}: FilterDialogProps) {
  const [enabledByFeature, setEnabledByFeature] = useState<Record<string, boolean>>(
    initialState.enabledByFeature || {}
  );
  const [allowedValuesByFeature, setAllowedValuesByFeature] = useState<Record<string, Set<string>>>(
    initialState.allowedValuesByFeature || {}
  );
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Ensure all features exist in state
    setEnabledByFeature((prev) => {
      const next: Record<string, boolean> = { ...prev };
      for (const f of features) if (!(f in next)) next[f] = false;
      return next;
    });
    setAllowedValuesByFeature((prev) => {
      const next: Record<string, Set<string>> = { ...prev };
      for (const f of features) if (!(f in next)) next[f] = new Set<string>();
      return next;
    });
  }, [features]);

  const canApply = useMemo(() => {
    // Can apply if any enabled feature has at least one value chosen
    for (const f of features) {
      if (enabledByFeature[f]) {
        const set = allowedValuesByFeature[f] || new Set<string>();
        if (set.size > 0) return true;
      }
    }
    return false;
  }, [features, enabledByFeature, allowedValuesByFeature]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-md shadow-lg w-full max-w-3xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Configure Filter</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="max-h-[60vh] overflow-auto pr-2">
          {features.map((feature) => {
            const allValues = getFeatureValues(feature);
            const isEnabled = Boolean(enabledByFeature[feature]);
            const selected = allowedValuesByFeature[feature] || new Set<string>();
            return (
              <div key={feature} className="border rounded-md p-3 mb-3 relative">
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setEnabledByFeature((prev) => ({ ...prev, [feature]: checked }));
                        if (!checked) {
                          setOpenMenus((prev) => ({ ...prev, [feature]: false }));
                        }
                      }}
                    />
                    <span className="font-medium">{feature}</span>
                  </label>

                  <div className="ml-4">
                    <button
                      type="button"
                      disabled={!isEnabled}
                      onClick={() => setOpenMenus((prev) => ({ ...prev, [feature]: !prev[feature] }))}
                      className={`px-2 py-1 border rounded-md flex items-center ${
                        isEnabled ? "hover:bg-gray-100" : "opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <span className="mr-2 text-sm">
                        {selected.size > 0 ? `${selected.size} selected` : "Select values"}
                      </span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9l6 6 6-6" />
                      </svg>
                    </button>

                    {openMenus[feature] && isEnabled && (
                      <div className="absolute right-3 mt-2 w-72 bg-white border rounded-md shadow-lg z-50">
                        <div className="flex items-center justify-between p-2 border-b">
                          <button
                            className="text-xs px-2 py-1 border rounded-md hover:bg-gray-100"
                            onClick={() =>
                              setAllowedValuesByFeature((prev) => ({ ...prev, [feature]: new Set(allValues) }))
                            }
                          >
                            Select all
                          </button>
                          <button
                            className="text-xs px-2 py-1 border rounded-md hover:bg-gray-100"
                            onClick={() => setAllowedValuesByFeature((prev) => ({ ...prev, [feature]: new Set<string>() }))}
                          >
                            None
                          </button>
                        </div>
                        <div className="max-h-60 overflow-auto p-2">
                          {allValues.map((v) => {
                            const checked = selected.has(v);
                            return (
                              <label key={v} className="flex items-center space-x-2 py-1 px-1 hover:bg-gray-50 rounded">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => {
                                    const isChecked = e.target.checked;
                                    setAllowedValuesByFeature((prev) => {
                                      const next = new Set(prev[feature] || new Set<string>());
                                      if (isChecked) next.add(v);
                                      else next.delete(v);
                                      return { ...prev, [feature]: next };
                                    });
                                  }}
                                />
                                <span className="text-sm">{v}</span>
                              </label>
                            );
                          })}
                        </div>
                        <div className="p-2 border-t text-right">
                          <button
                            className="text-sm px-3 py-1 border rounded-md hover:bg-gray-100"
                            onClick={() => setOpenMenus((prev) => ({ ...prev, [feature]: false }))}
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Choose which values to include for this feature when filtering.
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-end space-x-2 mt-4">
          <button onClick={onClose} className="px-3 py-1 border rounded-md">Cancel</button>
          <button
            disabled={!canApply}
            onClick={() => onApply({ enabledByFeature, allowedValuesByFeature })}
            className={`px-3 py-1 rounded-md text-white ${canApply ? "bg-[color:var(--primary-600)] hover:bg-[color:var(--primary-700)]" : "bg-gray-300"}`}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}


