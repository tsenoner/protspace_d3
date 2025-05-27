"use client";

import { useState, useEffect, useRef } from "react";
import Logo from "@/components/Logo/Logo";

interface HeaderProps {
  onSearch: (query: string) => void;
  highlightedProteins: string[];
  selectedProteins: string[];
  onRemoveHighlight: (proteinId: string) => void;
  onSaveSession: () => void;
  onLoadSession: () => void;
  availableProteinIds?: string[];
}

export default function Header({
  onSearch,
  highlightedProteins,
  selectedProteins = [],
  onRemoveHighlight,
  onSaveSession,
  onLoadSession,
  availableProteinIds = [],
}: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showHighlighted, setShowHighlighted] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Update suggestions when search query changes
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setSuggestions([]);
      return;
    }

    const filteredSuggestions = availableProteinIds
      .filter((id) => id.toLowerCase().includes(searchQuery.toLowerCase()))
      .slice(0, 10); // Limit to 10 suggestions

    setSuggestions(filteredSuggestions);
  }, [searchQuery, availableProteinIds]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
    setShowSuggestions(false);
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setSearchQuery(suggestion);
    onSearch(suggestion);
    setShowSuggestions(false);

    // Focus input after selection
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Handle keyboard navigation in suggestions
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // If no suggestions or not showing suggestions, do nothing
    if (suggestions.length === 0 || !showSuggestions) return;

    // Arrow Down
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestion((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    }
    // Arrow Up
    else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestion((prev) => (prev > 0 ? prev - 1 : 0));
    }
    // Enter
    else if (e.key === "Enter" && activeSuggestion >= 0) {
      e.preventDefault();
      handleSelectSuggestion(suggestions[activeSuggestion]);
    }
    // Escape
    else if (e.key === "Escape") {
      setShowSuggestions(false);
      setActiveSuggestion(-1);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="flex items-center justify-between px-4 py-2 bg-[#072140] border-b shadow-sm dark:bg-gray-900 dark:border-gray-800">
      {/* Logo */}
      <div className="flex items-center">
        <div className="flex items-center space-x-3">
          <Logo className="w-9 h-9 text-white" />
          <div className="flex flex-col">
            <span className="text-xl font-bold text-white">ProtSpace</span>
            <span className="text-xs text-gray-300">
              Protein Space Visualization
            </span>
          </div>
        </div>
      </div>

      {/* Search Bar with Auto-suggestion */}
      <form onSubmit={handleSearch} className="w-1/3 relative">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-4 w-4 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search protein IDs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            className="w-full py-2 pl-10 pr-4 text-white bg-[#0a2a4d] border border-gray-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setShowSuggestions(false);
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition-colors duration-200"
            >
              <svg
                className="h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Auto-suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute z-10 mt-2 w-full bg-[#0a2a4d] rounded-lg shadow-lg border border-gray-700"
          >
            <ul className="py-1 max-h-60 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <li
                  key={suggestion}
                  className={`px-4 py-2 cursor-pointer flex items-center ${
                    index === activeSuggestion
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:bg-gray-700"
                  }`}
                  onClick={() => handleSelectSuggestion(suggestion)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-2 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </form>

      {/* Session Controls */}
      <div className="flex items-center space-x-3">
        <div className="relative">
          <button
            onClick={() => setShowHighlighted(!showHighlighted)}
            disabled={
              highlightedProteins.length === 0 && selectedProteins.length === 0
            }
            className={`px-3 py-1.5 border border-gray-700 rounded-lg flex items-center space-x-1 bg-[#0a2a4d] text-white ${
              highlightedProteins.length === 0 && selectedProteins.length === 0
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-[#0d3159] transition-colors duration-200"
            }`}
          >
            <span>
              Selected (
              {new Set([...highlightedProteins, ...selectedProteins]).size})
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={showHighlighted ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"}
              />
            </svg>
          </button>

          {showHighlighted && highlightedProteins.length > 0 && (
            <div className="absolute z-10 right-0 mt-2 w-48 bg-[#0a2a4d] rounded-lg shadow-lg border border-gray-700">
              <ul className="py-1 max-h-48 overflow-y-auto">
                {Array.from(new Set(highlightedProteins)).map((protein) => (
                  <li
                    key={protein}
                    className="px-4 py-2 cursor-pointer flex items-center justify-between text-gray-300 hover:bg-gray-700"
                  >
                    <span className="truncate">{protein}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveHighlight(protein);
                      }}
                      className="text-gray-400 hover:text-white transition-colors duration-200"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <button
          onClick={onSaveSession}
          className="p-2 text-white hover:bg-[#0d3159] rounded-lg cursor-pointer transition-colors duration-200"
          title="Save Session"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
            />
          </svg>
        </button>

        <button
          onClick={onLoadSession}
          className="p-2 text-white hover:bg-[#0d3159] cursor-pointer rounded-lg transition-colors duration-200"
          title="Load Session"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </button>
      </div>
    </header>
  );
}
