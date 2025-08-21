"use client";

interface FeatureSelectProps {
  features: string[];
  selectedFeature: string;
  onChange: (feature: string) => void;
}

export function FeatureSelect({
  features,
  selectedFeature,
  onChange,
}: FeatureSelectProps) {
  return (
    <div className="flex items-center space-x-2">
      <label
        htmlFor="feature-select"
        className="text-sm font-medium text-gray-700"
      >
        Color by:
      </label>
      <select
        id="feature-select"
        aria-label="Color by"
        value={selectedFeature}
        onChange={(e) => onChange(e.target.value)}
        className="py-1.5 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--primary-600)] focus:border-[color:var(--primary-600)] transition-all duration-200 hover:border-gray-400"
      >
        {features.map((feature) => (
          <option key={feature} value={feature}>
            {feature}
          </option>
        ))}
      </select>
    </div>
  );
}



