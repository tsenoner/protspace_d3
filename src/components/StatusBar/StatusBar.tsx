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
    <div className="flex items-center justify-between py-2 px-4 text-sm bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm border-t border-gray-200 dark:border-gray-800">
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2">
          <span className="text-gray-500 dark:text-gray-400">Total:</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {totalProteins}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-gray-500 dark:text-gray-400">Displayed:</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {displayedProteins}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-gray-500 dark:text-gray-400">Selected:</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {selectedProteins}
          </span>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <span className="text-gray-500 dark:text-gray-400">Projection:</span>
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {projectionName}
        </span>
      </div>
    </div>
  );
}
