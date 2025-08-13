import React from "react";

interface StructureHeaderProps {
  title: string;
  proteinId: string;
  onClose?: () => void;
}

export function StructureHeader({ title, proteinId, onClose }: StructureHeaderProps) {
  return (
    <div className="flex justify-between items-center p-3 border-b">
      <h3 className="text-md font-medium text-gray-900">
        {title}
        <span className="ml-2 text-sm text-gray-500">{proteinId}</span>
      </h3>
      {onClose && (
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          X
        </button>
      )}
    </div>
  );
}


