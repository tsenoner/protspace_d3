import React from "react";

export function ErrorOverlay({ error }: { error: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-white">
      <div className="text-center text-red-500 p-4">
        <p className="font-medium">{error}</p>
        <p className="mt-2 text-sm">
          The structure data could not be loaded. This protein may not have an available structure in AlphaFold or PDB.
        </p>
      </div>
    </div>
  );
}


