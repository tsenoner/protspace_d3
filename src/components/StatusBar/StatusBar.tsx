"use client";

interface StatusBarProps {
  totalProteins: number;
  displayedProteins: number;
  selectedProteins: number;
  projectionName: string;
}

export default function StatusBar({
  totalProteins,
  displayedProteins,
  selectedProteins,
  projectionName,
}: StatusBarProps) {
  return (
    <div className="flex items-center justify-between py-1 px-4 text-sm bg-gray-100 border-t dark:bg-gray-900 dark:border-gray-800">
      <div className="flex items-center space-x-4">
        <div>
          <span className="text-gray-500 dark:text-gray-400">Total:</span>{" "}
          <span className="font-medium">{totalProteins}</span>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Displayed:</span>{" "}
          <span className="font-medium">{displayedProteins}</span>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Selected:</span>{" "}
          <span className="font-medium">{selectedProteins}</span>
        </div>
      </div>
      <div>
        <span className="text-gray-500 dark:text-gray-400">Projection:</span>{" "}
        <span className="font-medium">{projectionName}</span>
      </div>
    </div>
  );
}
