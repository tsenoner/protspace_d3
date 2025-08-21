"use client";

import Logo from "@/components/Logo/Logo";
import { SearchBar } from "./SearchBar";
import { SelectedDropdown } from "./SelectedDropdown";
import { SessionButtons } from "./SessionButtons";
import type { HeaderProps } from "./types";

export function Header({
  onSearch,
  selectedProteins = [],
  onRemoveHighlight,
  onDataImported,
  availableProteinIds = [],
}: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-2 bg-primary border-b shadow-sm border-primary">
      <div className="flex items-center">
        <div className="flex items-center space-x-3">
          <Logo className="w-9 h-9 text-white" />
          <div className="flex flex-col">
            <span className="text-xl font-bold text-white">ProtSpace</span>
            <span className="text-xs text-primary-100">Protein Space Visualization</span>
          </div>
        </div>
      </div>

      <SearchBar onSearch={onSearch} availableProteinIds={availableProteinIds} />

      <div className="flex items-center space-x-3">
        <SelectedDropdown
          selectedProteins={selectedProteins}
          onRemoveHighlight={onRemoveHighlight}
        />
        <SessionButtons
          onDataImported={onDataImported}
        />
      </div>
    </header>
  );
}
