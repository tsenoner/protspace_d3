"use client";

import type { SearchBarProps } from "./types";
import { useSearchBar } from "./hooks/useSearchBar";

export function SearchBar({ onSearch, availableProteinIds = [] }: SearchBarProps) {
  const {
    searchQuery,
    showSuggestions,
    activeSuggestion,
    suggestions,
    formRef,
    inputRef,
    setSearchQuery,
    setShowSuggestions,
    handleSearch,
    handleSelectSuggestion,
    handleKeyDown,
  } = useSearchBar({ onSearch, availableProteinIds });

  return (
    <form ref={formRef} onSubmit={handleSearch} className="w-1/3 relative">
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
          ref={inputRef}
          type="text"
          placeholder="Search protein IDs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          className="w-full py-2 pl-10 pr-4 text-gray-900 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--primary-600)] focus:border-[color:var(--primary-600)] transition-all duration-200 placeholder-gray-500"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setShowSuggestions(false);
            }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
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

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 mt-2 w-full bg-white rounded-lg shadow-lg border border-gray-200">
          <ul className="py-1 max-h-60 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <li
                key={suggestion}
            className={`px-4 py-2 cursor-pointer flex items-center ${
                  index === activeSuggestion
                    ? "bg-[color:var(--primary-50)] text-[color:var(--primary-700)]"
                    : "text-gray-700 hover:bg-gray-100"
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
  );
}


