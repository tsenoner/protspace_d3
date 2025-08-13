"use client";
import { useStructureViewer } from "./hooks/useStructureViewer";
import { StructureHeader } from "./StructureHeader";
import { LoadingOverlay } from "./LoadingOverlay";
import { ErrorOverlay } from "./ErrorOverlay";

interface StructureViewerProps {
  proteinId: string | null;
  onClose?: () => void;
  title?: string;
}

export default function StructureViewer({
  proteinId,
  onClose,
  title = "Protein Structure",
}: StructureViewerProps) {
  const { isLoading, error, containerRef } = useStructureViewer(proteinId);

  if (!proteinId) return null;

  // Error-only card keeps previous UX
  if (error) {
    return (
      <div className="w-full bg-white rounded-md shadow-sm mt-4">
        <StructureHeader title={title} proteinId={proteinId} onClose={onClose} />
        <div className="text-center text-red-500 p-4">
          <p className="font-medium">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-md shadow-sm mt-4">
      <StructureHeader title={title} proteinId={proteinId} onClose={onClose} />
      <div className="w-full h-80 relative border-0 rounded-b-md">
        {isLoading && <LoadingOverlay />}
        {error && <ErrorOverlay error={error} />}
        <div ref={containerRef} className="w-full h-full" />
      </div>
      <div className="p-2 text-xs text-gray-500 bg-gray-50 rounded-b-md">
        <p>
          <strong>Tip:</strong> Left-click and drag to rotate. Click and drag to move. Scroll to zoom.
        </p>
      </div>
    </div>
  );
}
