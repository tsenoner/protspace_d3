"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";

interface HeaderProps {
  onSearch: (query: string) => void;
  highlightedProteins: string[];
  onRemoveHighlight: (proteinId: string) => void;
  onSaveSession: () => void;
  onLoadSession: () => void;
  onShareSession: () => void;
  availableProteinIds?: string[]; // For auto-suggestion
}

export default function Header({
  onSearch,
  highlightedProteins,
  onRemoveHighlight,
  onSaveSession,
  onLoadSession,
  onShareSession,
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
    <header className="flex items-center justify-between px-4 py-2 bg-white border-b shadow-sm dark:bg-gray-900 dark:border-gray-800">
      {/* Logo */}
      <div className="flex items-center">
        <Image
          src="/protspaceLogo.svg"
          alt="ProtSpace Logo"
          width={32}
          height={32}
          className="mr-2"
        />
        <span className="text-lg font-semibold">ProtSpace</span>
      </div>

      {/* Search Bar with Auto-suggestion */}
      <form onSubmit={handleSearch} className="w-1/3 relative">
        <div className="relative">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search protein IDs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            className="w-full py-1 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
          />
          <button
            type="submit"
            className="absolute inset-y-0 right-0 px-3 flex items-center bg-blue-500 text-white rounded-r-md hover:bg-blue-600"
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
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </button>
        </div>

        {/* Auto-suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700"
          >
            <ul className="py-1 max-h-60 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <li
                  key={suggestion}
                  className={`px-3 py-2 cursor-pointer flex items-center ${
                    index === activeSuggestion
                      ? "bg-blue-100 dark:bg-blue-900"
                      : "hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => handleSelectSuggestion(suggestion)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-gray-500 mr-2"
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
      <div className="flex items-center space-x-2">
        <div className="relative">
          <button
            onClick={() => setShowHighlighted(!showHighlighted)}
            className="px-3 py-1 border border-gray-300 rounded-md flex items-center space-x-1 dark:border-gray-700 dark:bg-gray-800"
          >
            <span>Selected ({new Set(highlightedProteins).size})</span>
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
            <div className="absolute z-10 right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
              <ul className="py-1 max-h-48 overflow-y-auto">
                {[...new Set(highlightedProteins)].map((protein) => (
                  <li
                    key={protein}
                    className="px-3 py-1 cursor-pointer flex items-center justify-between"
                  >
                    <span className="truncate">{protein}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveHighlight(protein);
                      }}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
          className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
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
          className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
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
              d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
            />
          </svg>
        </button>

        <button
          onClick={onShareSession}
          className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          title="Share Session"
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
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
        </button>
      </div>
    </header>
  );
}
