"use client";

interface ProjectionSelectProps {
  projections: string[];
  selectedProjection: string;
  onChange: (projection: string) => void;
}

export function ProjectionSelect({
  projections,
  selectedProjection,
  onChange,
}: ProjectionSelectProps) {
  return (
    <div className="flex items-center space-x-2">
      <label
        htmlFor="projection-select"
        className="text-sm font-medium text-gray-700"
      >
        Projection:
      </label>
      <select
        id="projection-select"
        aria-label="Projection"
        value={selectedProjection}
        onChange={(e) => onChange(e.target.value)}
        className="py-1 px-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--primary-600)] focus:border-[color:var(--primary-600)]"
      >
        {projections.map((projection) => (
          <option key={projection} value={projection}>
            {projection}
          </option>
        ))}
      </select>
    </div>
  );
}



